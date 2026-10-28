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
        context,
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

/** A mutation through session_web → csrf_guard with the given cookie and token. */
const mutate = (cookie: string | undefined, token: string) =>
    login(
        [
            ['origin', ORIGIN],
            ['x-csrf-token', token],
        ],
        cookie,
    )

describe.skipIf(!hasRedis)('session rotation on login', () => {
    it('deletes the anonymous session; its cookie and token stop working', async () => {
        const bootstrap = await init()
        const anonToken = String(bootstrap.payload?.['csrfToken'])
        const anonKey = `session:anon_session:${String(bootstrap.context.session.sessionInfo?.id)}`
        expect(await admin.exists(anonKey)).toBe(1)

        const signIn = await mutate(bootstrap.cookie, anonToken)
        expect(signIn.passed).toBe(true)
        await signIn.context.auth.login('42', 'rotationUserToken01')
        const userToken = String(signIn.context.session.sessionInfo?.data.csrfToken)
        const userCookie = signIn.context.responseData.cookies.get(sessionConfig.cookieName)?.value

        expect(await admin.exists(anonKey)).toBe(0)
        expect(userToken).not.toBe(anonToken)
        expect(userCookie).not.toBe(bootstrap.cookie)

        // The old cookie now opens a fresh anonymous session with another token,
        // so a mutation signed with the old token is rejected.
        const replay = await mutate(bootstrap.cookie, anonToken)
        expect(replay.status).toBe(403)
        expect(replay.payload).toMatchObject({ reason: 'token_mismatch' })
        expect(replay.payload?.['csrfToken']).not.toBe(anonToken)

        // The new cookie and token work.
        const next = await mutate(userCookie, userToken)
        expect(next.passed).toBe(true)
        expect(next.context.auth.getUserId()).toBe('42')
    })

    it('renewing a signed-in session (password change) replaces ID and token', async () => {
        const bootstrap = await init()
        const signIn = await mutate(bootstrap.cookie, String(bootstrap.payload?.['csrfToken']))
        await signIn.context.auth.login('43', 'renewUserToken0001')
        const firstCookie = signIn.context.responseData.cookies.get(sessionConfig.cookieName)?.value
        const firstToken = String(signIn.context.session.sessionInfo?.data.csrfToken)
        const firstId = String(signIn.context.session.sessionInfo?.id)

        // What authService.renewSession does after a password change.
        const change = await mutate(firstCookie, firstToken)
        expect(change.passed).toBe(true)
        await change.context.auth.login('43', 'renewUserToken0001')
        const renewedCookie = change.context.responseData.cookies.get(
            sessionConfig.cookieName,
        )?.value
        const renewedToken = String(change.context.session.sessionInfo?.data.csrfToken)

        expect(change.context.session.sessionInfo?.id).not.toBe(firstId)
        expect(renewedToken).not.toBe(firstToken)
        expect(await admin.exists(`session:renewUserToken0001:${firstId}`)).toBe(0)

        expect((await mutate(renewedCookie, renewedToken)).passed).toBe(true)
        const stale = await mutate(firstCookie, firstToken)
        expect(stale.status).toBe(403)
        expect(stale.payload).toMatchObject({ reason: 'token_mismatch' })
    })

    it('session helpers called after login address the new session', async () => {
        const bootstrap = await init()
        const signIn = await mutate(bootstrap.cookie, String(bootstrap.payload?.['csrfToken']))
        await signIn.context.auth.login('44', 'helperUserToken001')

        const updated = await signIn.context.session.updateSessionData({ marker: 'after-login' })

        expect(updated?.id).toBe(signIn.context.session.sessionInfo?.id)
        expect(updated?.data['marker']).toBe('after-login')
    })
})

describe.skipIf(!hasRedis)('session cookie of a slow response', () => {
    const signIn = async (userToken: string) => {
        const bootstrap = await init()
        const response = await mutate(bootstrap.cookie, String(bootstrap.payload?.['csrfToken']))
        await response.context.auth.login('45', userToken)
        return {
            cookie: response.context.responseData.cookies.get(sessionConfig.cookieName)?.value,
            token: String(response.context.session.sessionInfo?.data.csrfToken),
            id: String(response.context.session.sessionInfo?.id),
        }
    }

    it('an unchanged session gets no Set-Cookie until the refresh is due', async () => {
        const s1 = await signIn('slowCookieToken0001')

        const next = await mutate(s1.cookie, s1.token)

        expect(next.passed).toBe(true)
        expect(next.cookie).toBeUndefined()
    })

    it('a slow request does not restore the cookie of a session replaced meanwhile', async () => {
        const s1 = await signIn('slowCookieToken0002')
        // Make the cookie refresh due, so the slow request re-sends the S1 cookie.
        await admin.del(`session_cookie_refresh:${s1.id}`)

        // R1 starts with S1 (its middleware chain prepares Set-Cookie: S1) ...
        const slow = await mutate(s1.cookie, s1.token)
        expect(slow.cookie).toEqual(expect.any(String))
        // ... a password change renews the session meanwhile (S1 deleted, S2 issued) ...
        const change = await mutate(s1.cookie, s1.token)
        await change.context.auth.login('45', 'slowCookieToken0002')
        // ... and R1 answers after it.
        await slow.context.session.beforeSend?.()

        expect(slow.context.responseData.cookies.has(sessionConfig.cookieName)).toBe(false)
    })

    it('a request that swapped the session itself keeps its cookie', async () => {
        const bootstrap = await init()
        const response = await mutate(bootstrap.cookie, String(bootstrap.payload?.['csrfToken']))
        await response.context.auth.login('46', 'slowCookieToken0003')

        await response.context.session.beforeSend?.()

        expect(response.context.responseData.cookies.has(sessionConfig.cookieName)).toBe(true)
    })

    it('a cookie refresh never rewrites the session record', async () => {
        const s1 = await signIn('slowCookieToken0004')
        const key = `session:slowCookieToken0004:${s1.id}`
        await admin.del(`session_cookie_refresh:${s1.id}`)
        const before = await admin.get(key)

        const refreshing = await mutate(s1.cookie, s1.token)

        expect(refreshing.cookie).toEqual(expect.any(String)) // the refresh did happen
        expect(await admin.get(key)).toBe(before) // ...without a write to the session
        // A second request within the hour does not refresh again.
        expect((await mutate(s1.cookie, s1.token)).cookie).toBeUndefined()
    })

    it('a refresh for a session deleted meanwhile does not bring it back', async () => {
        const s1 = await signIn('slowCookieToken0005')
        await admin.del(`session_cookie_refresh:${s1.id}`)
        await admin.del(`session:slowCookieToken0005:${s1.id}`)

        const response = await mutate(s1.cookie, s1.token)

        expect(await admin.exists(`session:slowCookieToken0005:${s1.id}`)).toBe(0)
        expect(response.status).toBe(403) // the old token belongs to no session
    })
})
