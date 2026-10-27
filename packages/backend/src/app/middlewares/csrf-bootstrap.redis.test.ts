import type { Redis } from 'ioredis'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import {
    cleanupTestRedis,
    createTestRedis,
    hasRedis,
} from '../../test-support/redis-test-client.js'

// Login CSRF against a real Redis: a browser without a cookie first calls
// GET /api/main/init (session_web → csrf_guard → auth_guard), gets 401 with a
// session cookie and a CSRF token, and only then can POST /api/auth/login
// (session_web → csrf_guard) get past the guard. A missing cookie does not mean a
// missing session: session_web creates an anonymous one with its own token.

const { PREFIX, ORIGIN } = vi.hoisted(() => {
    process.env['APP_KEY'] ??= 'k'.repeat(16) + '3f9a1c7e5b2d4f60'
    process.env['CSRF_ENFORCE'] = 'true'
    process.env['CSRF_STRICT_ORIGIN'] = 'true'
    process.env['CSRF_ALLOWED_ORIGINS'] = 'https://app.test'
    return { PREFIX: `test:${crypto.randomUUID()}:`, ORIGIN: 'https://app.test' }
})

const silent = {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    child: (): unknown => silent,
}
vi.mock('#logger', () => ({ default: silent }))
vi.mock('#vendor/utils/logger.js', () => ({ default: silent }))
vi.mock('#config/redis.js', async (importActual) => {
    const actual = await importActual<{ default: object }>()
    return { default: { ...actual.default, keyPrefix: PREFIX } }
})
vi.mock('#database/redis.js', async () => {
    const { Redis: Client } = await import('ioredis')
    const { mainRedisOptions } = await import('#database/redis-main-options.js')
    const { createRedisHealth, createWithRedis } = await import('#database/redis-health.js')
    const { host: _host, port: _port, ...contract } = mainRedisOptions
    const client = new Client(process.env['REDIS_TEST_URL'] ?? 'redis://127.0.0.1:6379', {
        ...contract,
        keyPrefix: PREFIX,
        lazyConnect: true,
    })
    const redisHealth = createRedisHealth(client, {
        logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
    })
    return {
        default: client,
        redisHealth,
        withRedis: createWithRedis(client, redisHealth),
    }
})

const { default: client, redisHealth } = (await import('#database/redis.js')) as unknown as {
    default: Redis
    redisHealth: { stop(): void }
}
const { default: sessionConfig } = await import('#config/session.js')
const { default: executeMiddlewares } =
    await import('#vendor/utils/middlewares/core/execute-httpMiddlewares.js')
const { default: createContext } = await import('#vendor/utils/context/http-context.js')
const { createResponseData } = await import('#vendor/utils/network/response-data.js')

const admin = createTestRedis(PREFIX)

interface RequestInput {
    method: 'get' | 'post'
    middlewares: string[]
    headers?: [string, string][]
    cookie?: string | undefined
}

const request = async ({ method, middlewares, headers = [], cookie }: RequestInput) => {
    const responseData = createResponseData()
    const context = createContext(
        {
            method,
            ip: '127.0.0.1',
            params: {},
            payload: {},
            query: null,
            headers: new Map(headers),
            contentType: 'application/json',
            cookies: new Map(cookie === undefined ? [] : [[sessionConfig.cookieName, cookie]]),
            isJson: true,
            files: null,
            hasFile: () => false,
        },
        responseData,
    )
    const passed = await executeMiddlewares(middlewares, context)
    return {
        passed,
        status: responseData.status,
        payload: responseData.payload as Record<string, unknown> | null,
        cookie: responseData.cookies.get(sessionConfig.cookieName)?.value,
    }
}

const init = () =>
    request({ method: 'get', middlewares: ['session_web', 'csrf_guard', 'auth_guard'] })

const login = (headers: [string, string][], cookie?: string) =>
    request({ method: 'post', middlewares: ['session_web', 'csrf_guard'], headers, cookie })

beforeAll(async () => {
    if (!hasRedis) return
    await admin.connect()
    await client.connect()
})
afterAll(async () => {
    if (!hasRedis) return
    await cleanupTestRedis(admin)
    redisHealth.stop()
    client.disconnect(false)
    await admin.quit()
})

describe.skipIf(!hasRedis)('login CSRF bootstrap', () => {
    it('init without a cookie answers 401 with a session cookie and a CSRF token', async () => {
        const response = await init()

        expect(response.passed).toBe(false)
        expect(response.status).toBe(401)
        expect(response.cookie).toEqual(expect.any(String))
        expect(response.payload?.['csrfToken']).toMatch(/^[A-Za-z0-9_-]{43}$/)
    })

    it('login with the bootstrap cookie and token passes the guard', async () => {
        const bootstrap = await init()
        const token = String(bootstrap.payload?.['csrfToken'])

        const response = await login(
            [
                ['origin', ORIGIN],
                ['sec-fetch-site', 'same-origin'],
                ['x-csrf-token', token],
            ],
            bootstrap.cookie,
        )

        expect(response.passed).toBe(true)
    })

    it('rejects login without a cookie and token even from the own origin', async () => {
        const response = await login([['origin', ORIGIN]])

        expect(response.passed).toBe(false)
        expect(response.status).toBe(403)
        expect(response.payload).toMatchObject({ code: 'csrf_invalid', reason: 'token_mismatch' })
        // The 403 still carries the token of the session it just created.
        expect(response.payload?.['csrfToken']).toMatch(/^[A-Za-z0-9_-]{43}$/)
    })

    it('rejects login from a foreign origin even with a valid cookie and token', async () => {
        const bootstrap = await init()

        const response = await login(
            [
                ['origin', 'https://evil.example'],
                ['x-csrf-token', String(bootstrap.payload?.['csrfToken'])],
            ],
            bootstrap.cookie,
        )

        expect(response.status).toBe(403)
        expect(response.payload).toMatchObject({ reason: 'origin_mismatch' })
    })

    it('rejects a cross-site login before looking at the token', async () => {
        const bootstrap = await init()

        const response = await login(
            [
                ['origin', ORIGIN],
                ['sec-fetch-site', 'cross-site'],
                ['x-csrf-token', String(bootstrap.payload?.['csrfToken'])],
            ],
            bootstrap.cookie,
        )

        expect(response.status).toBe(403)
        expect(response.payload).toMatchObject({ reason: 'fetch_site_cross_site' })
    })

    it('rejects a login without Origin and Referer', async () => {
        const bootstrap = await init()

        const response = await login(
            [['x-csrf-token', String(bootstrap.payload?.['csrfToken'])]],
            bootstrap.cookie,
        )

        expect(response.status).toBe(403)
        expect(response.payload).toMatchObject({ reason: 'origin_mismatch' })
    })
})
