import { describe, expect, it, vi } from 'vitest'

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
