import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CSP_HEADER, CSP_REPORT_ONLY_HEADER, STRICT_CSP } from '#vendor/utils/network/csp.js'

type Handler = (res: unknown, req: unknown) => unknown

const handlers = new Map<string, Handler>()

const fakeApp = {
    ws: vi.fn(),
    listen: vi.fn((_host: string, _port: number, callback: (token: unknown) => void) => {
        callback({})
    }),
    ...Object.fromEntries(
        ['get', 'post', 'put', 'patch', 'del', 'any'].map((method) => [
            method,
            vi.fn((path: string, handler: Handler) => {
                handlers.set(`${method} ${path}`, handler)
            }),
        ]),
    ),
}

vi.mock('uWebSockets.js', () => ({
    App: () => fakeApp,
    us_listen_socket_close: vi.fn(),
}))

vi.mock('#config/app.js', async (importOriginal) => {
    const actual = await importOriginal<{ default: Record<string, unknown> }>()
    return {
        default: {
            ...actual.default,
            serveStatic: false,
            unixPath: undefined,
            pathPrefix: 'api',
        },
    }
})

vi.mock('#config/cors.js', async (importOriginal) => {
    const actual = await importOriginal<{ default: Record<string, unknown> }>()
    return {
        default: {
            ...actual.default,
            enabled: true,
            allowedOrigins: ['https://app.test'],
        },
    }
})

vi.mock('#app/routes/http-routes.js', () => ({ default: [] }))
vi.mock('#app/routes/ws-routes.js', () => ({ default: [] }))
vi.mock('#vendor/utils/network/get-ip.js', () => ({
    default: () => '127.0.0.1',
}))
vi.mock('#vendor/utils/network/ws-handlers.js', () => ({
    onMessage: vi.fn(),
    onOpen: vi.fn(),
    onClose: vi.fn(),
    handleUpgrade: vi.fn(),
    closeAllWs: vi.fn(),
}))
vi.mock('#vendor/start/static-server.js', () => ({
    cacheStaticSource: vi.fn().mockResolvedValue(null),
    staticHandler: vi.fn(),
    staticCacheHandler: vi.fn(),
}))
vi.mock('#vendor/utils/middlewares/core/execute-httpMiddlewares.js', () => ({
    default: vi.fn().mockResolvedValue(true),
}))

const CONTROLLER_POLICY = "default-src 'self'; sandbox"

type Mode = 'disabled' | 'enforcing' | 'report-only'

interface CapturedResponse {
    status: string
    headers: { name: string; value: string }[]
    body: string | undefined
}

const createRes = () => {
    const captured: CapturedResponse = {
        status: '',
        headers: [],
        body: undefined,
    }
    let done: () => void = () => {}
    const finished = new Promise<void>((resolve) => {
        done = resolve
    })
    const res = {
        cork: (callback: () => void) => {
            callback()
            return res
        },
        onAborted: () => res,
        onData: () => res,
        writeStatus: (status: string) => {
            captured.status = status
            return res
        },
        writeHeader: (name: string, value: string) => {
            captured.headers.push({ name, value })
            return res
        },
        end: (body?: string) => {
            captured.body = body
            done()
            return res
        },
        close: () => {
            done()
            return res
        },
    }
    return { res, captured, finished }
}

const createReq = (url: string, method: string, headers: Record<string, string> = {}) => ({
    getUrl: () => url,
    getMethod: () => method,
    getQuery: () => '',
    getParameter: () => '',
    getHeader: (name: string) => headers[name] ?? '',
    forEach: (callback: (key: string, value: string) => void) => {
        Object.entries(headers).forEach(([key, value]) => {
            callback(key, value)
        })
    },
})

const routes = [
    {
        method: 'get',
        url: 'api/csp-test/plain',
        middlewares: [],
        handler: () => ({ ok: true }),
    },
    {
        method: 'get',
        url: 'api/csp-test/own-policy',
        middlewares: [],
        handler: (context: { responseData: { setHeader: (n: string, v: string) => void } }) => {
            context.responseData.setHeader('Content-Security-Policy', CONTROLLER_POLICY)
            return { ok: true }
        },
    },
    {
        method: 'get',
        url: 'api/csp-test/fails',
        middlewares: [],
        handler: () => {
            throw new Error('boom')
        },
    },
]

const loadServer = async (mode: Mode) => {
    vi.resetModules()
    handlers.clear()
    vi.doMock('#config/csp.js', () => ({
        default: {
            enabled: mode !== 'disabled',
            reportOnly: mode === 'report-only',
            documentPolicy: "default-src 'self'",
            configError: null,
        },
    }))
    const { initServer } = await import('./server.js')
    await initServer({
        httpRoutes: routes.map((route) => ({ ...route, responseCheck: null })),
        wsRoutesByUrl: new Map(),
        sourceHttpRoutes: [],
        sourceWsRoutes: [],
    } as never)
}

const call = async (
    key: string,
    url: string,
    method: string,
    headers?: Record<string, string>,
): Promise<CapturedResponse> => {
    const handler = handlers.get(key)
    if (handler === undefined) throw new Error(`No handler registered for ${key}`)
    const { res, captured, finished } = createRes()
    await handler(res, createReq(url, method, headers))
    await finished
    return captured
}

const cspHeaders = (response: CapturedResponse) =>
    response.headers.filter((header) => {
        const name = header.name.toLowerCase()
        return name === CSP_HEADER || name === CSP_REPORT_ONLY_HEADER
    })

const CASES: [string, () => Promise<CapturedResponse>][] = [
    ['API JSON 200', () => call('get /api/csp-test/plain', '/api/csp-test/plain', 'get')],
    ['API error 500', () => call('get /api/csp-test/fails', '/api/csp-test/fails', 'get')],
    ['unknown API route 404', () => call('any /*', '/api/nope', 'get')],
    [
        'CORS OPTIONS',
        () =>
            call('any /*', '/api/csp-test/plain', 'options', {
                origin: 'https://app.test',
            }),
    ],
]

describe.each<Mode>(['enforcing', 'report-only', 'disabled'])('API CSP, mode %s', (mode) => {
    beforeEach(async () => {
        await loadServer(mode)
    })

    it.each(CASES)('%s gets the strict global policy', async (_label, request) => {
        const response = await request()
        const csp = cspHeaders(response)

        if (mode === 'disabled') {
            expect(csp).toEqual([])
            return
        }
        expect(csp).toEqual([
            {
                name: mode === 'report-only' ? CSP_REPORT_ONLY_HEADER : CSP_HEADER,
                value: STRICT_CSP,
            },
        ])
    })

    it('lets a controller policy replace the global one, in every mode', async () => {
        const response = await call(
            'get /api/csp-test/own-policy',
            '/api/csp-test/own-policy',
            'get',
        )

        expect(response.status).toBe('200 OK')
        expect(cspHeaders(response)).toEqual([
            { name: 'Content-Security-Policy', value: CONTROLLER_POLICY },
        ])
    })
})
