import { describe, expect, it, vi } from 'vitest'

import { type } from '@arktype/type'

import { unknownPaths } from '#app/routes/response-schema-guards.js'
import type { HttpContext, RouteItem } from '#vendor/types/types.js'

vi.mock('#logger', () => ({
    default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))
vi.mock('#vendor/utils/logger.js', () => ({
    default: {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
        child: vi.fn(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() })),
    },
}))
// The real route lists import every controller; keep the data layer offline.
vi.mock('#database/db.js', () => ({ db: {}, pool: {} }))
vi.mock('#database/redis.js', () => ({ default: {}, redisHealth: {}, withRedis: vi.fn() }))

// Config modules validate secrets at import time.
vi.stubEnv('APP_KEY', 'a'.repeat(32))

const { default: httpRoutes } = await import('./http-routes.js')
const { default: wsRoutes } = await import('./ws-routes.js')
const { routesHandler } = await import('#vendor/start/router.js')
const { createResponseCheck } = await import('#vendor/utils/validation/validate-response.js')
const { default: executeMiddlewares } =
    await import('#vendor/utils/middlewares/core/execute-httpMiddlewares.js')

const http = routesHandler(httpRoutes)
const ws = routesHandler(wsRoutes)
const pushRoutes = http.filter((route) => route.url.includes('/push-subscriptions/'))
const isPublic = (route: RouteItem): boolean => route.url.endsWith('/vapid-public-key')

const anonymousContext = (): HttpContext =>
    ({
        auth: { check: () => false, getUserId: () => null },
        responseData: { status: 200, payload: null, headers: [], cookies: [] },
        session: null,
        httpData: { headers: new Map(), cookies: new Map(), method: 'post' },
    }) as unknown as HttpContext

describe('runtime response validation wiring (feat-044 T5)', () => {
    it('every normalized route has responseCheck set, never undefined', () => {
        for (const route of [...http, ...ws]) {
            expect(route.responseCheck, route.url).not.toBeUndefined()
        }
    })

    it('a route with a ResponseSchema gets a check, one without gets null', () => {
        // Tests run outside production, so RESPONSE_VALIDATION is never off here.
        for (const route of [...http, ...ws]) {
            const expected = route.ResponseSchema === undefined ? 'object' : 'function'
            expect(typeof route.responseCheck, route.url).toBe(expected)
        }
    })
})

describe('route access matrix (code-issues items 48, 67)', () => {
    it('test-push accepts only POST', () => {
        const testPush = pushRoutes.filter((route) => route.url.endsWith('/test-push'))
        expect(testPush.map((route) => route.method)).toEqual(['post'])
    })

    it('every push-subscriptions route except vapid-public-key declares auth_guard', () => {
        expect(pushRoutes.length).toBeGreaterThan(1)
        for (const route of pushRoutes) {
            expect(route.middlewares?.includes('auth_guard'), route.url).toBe(!isPublic(route))
        }
    })

    it('auth_guard answers 401 for an anonymous request before the handler', async () => {
        for (const route of pushRoutes.filter((item) => !isPublic(item))) {
            const middlewares = (route.middlewares ?? []).slice(
                (route.middlewares ?? []).indexOf('auth_guard'),
            )
            const context = anonymousContext()
            const passed = await executeMiddlewares(middlewares, context)
            expect(passed, route.url).toBe(false)
            expect(context.responseData.status, route.url).toBe(401)
        }
    })

    it('every admin WS route declares ws_admin_guard', () => {
        const adminWs = ws.filter((route) => route.url.includes('/admin/'))
        expect(adminWs.map((route) => route.url).sort()).toEqual([
            'api/admin/subscribe_online_users',
            'api/admin/unsubscribe_online_users',
        ])
        for (const route of adminWs) {
            expect(route.middlewares, route.url).toContain('ws_admin_guard')
        }
    })
})

describe('response schema guards (feat-046)', () => {
    const routesWithSchema = [...http, ...ws].filter((route) => route.ResponseSchema !== undefined)

    it('no response schema has a morph: the original object is sent after reject', () => {
        // A morph would make the sent format depend on whether undeclared keys were
        // stripped (plan §4.6, feat-047). Revisit createResponseCheck before allowing one.
        const withMorph = routesWithSchema
            .filter((route) => route.ResponseSchema?.internal.includesTransform === true)
            .map((route) => route.url)
        expect(withMorph).toEqual([])
    })

    it('an unknown field is allowed only as a listed exception (plan §4.5)', () => {
        // The allow-list does not filter the content of these fields; the same list is in
        // documentation/backend/response-validation.md.
        const allowed = new Set([
            // Canonical error: built only from AppError constructors.
            'details',
            // Push log: `data` of a notification this user's device already received.
            'data.notificationLogs[].messageData',
            'data[].messageData',
        ])
        const found = routesWithSchema.flatMap((route) =>
            unknownPaths(route.ResponseSchema!)
                .filter((path) => !allowed.has(path))
                .map((path) => `${route.method} ${route.url}: ${path}`),
        )
        expect(found).toEqual([])
    })

    it('a route that can answer an error accepts the full canonical error', () => {
        // mapControllerError may add reason/details, session_web adds csrfToken: under the
        // undeclared-key check a hand-written error branch would turn them into a 500.
        // Any error branch counts, also one without `code`: it would reject or strip it.
        const probes = [
            { status: 'error' },
            { status: 'error', message: 'm' },
            { status: 'error', code: 'bad_request', message: 'm' },
        ]
        const full = {
            status: 'error',
            code: 'bad_request',
            message: 'm',
            reason: 'r',
            details: { a: 1 },
            csrfToken: 't',
        }
        const broken = routesWithSchema
            .filter((route) => {
                const reject = route.ResponseSchema!.onDeepUndeclaredKey('reject')
                const answersErrors = probes.some(
                    (probe) => !(reject(probe) instanceof type.errors),
                )
                return answersErrors && reject(full) instanceof type.errors
            })
            .map((route) => `${route.method} ${route.url}`)
        expect(broken).toEqual([])
    })

    it.each(['strict', 'log'] as const)('builds the %s check for every route', (mode) => {
        // log adds onDeepUndeclaredKey('delete'), a morph: ArkType rejects it on a union
        // with overlapping branches at start-up.
        const failed = routesWithSchema.filter((route) => {
            try {
                createResponseCheck(route.ResponseSchema, { mode })
                return false
            } catch {
                return true
            }
        })
        expect(failed.map((route) => route.url)).toEqual([])
    })

    it.each(['strict', 'log'] as const)(
        '%s keeps the canonical error of GET /auth/oauth/:provider/redirect',
        (mode) => {
            // Unknown provider → mapControllerError → 400 with `code` (reviewer P1).
            const route = http.find((item) => item.url.endsWith('auth/oauth/:provider/redirect'))
            const check = createResponseCheck(route?.ResponseSchema, { mode })
            const payload = {
                status: 'error',
                code: 'bad_request',
                message: 'Unsupported provider',
            }
            expect(check?.(payload, { route: 'oauth', transport: 'http' })).toEqual({
                ok: true,
                payload,
            })
        },
    )
})
