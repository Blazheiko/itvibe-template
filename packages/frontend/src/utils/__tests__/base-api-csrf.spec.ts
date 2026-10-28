import { beforeEach, describe, expect, it, vi } from 'vitest'

const emitMock = vi.hoisted(() => vi.fn())
const TOKEN_U1 = 'a'.repeat(43)
const TOKEN_U2 = 'b'.repeat(43)
const TOKEN_ANON = 'c'.repeat(43)
const TOKEN_U1_FRESH = 'd'.repeat(43)
const INIT = '/api/main/init'

vi.mock('@/composables/useWebSocketConnection', () => ({
    useWebSocketConnection: () => ({
        websocketApi: vi.fn(),
    }),
}))

vi.mock('../event-bus', () => ({
    useEventBus: () => ({
        emit: emitMock,
    }),
}))

const jsonResponse = (payload: unknown, status = 200): Response =>
    new Response(JSON.stringify(payload), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })

const tokenMismatch = (csrfToken?: string): Response =>
    jsonResponse(
        {
            status: 'error',
            code: 'csrf_invalid',
            message: 'Invalid CSRF token',
            reason: 'token_mismatch',
            ...(csrfToken === undefined ? {} : { csrfToken }),
        },
        403,
    )

const initAs = (userId: string, csrfToken: string): Response =>
    jsonResponse({ status: 'ok', user: { id: userId }, csrfToken })

const initAnonymous = (csrfToken: string): Response =>
    jsonResponse({ status: 'error', code: 'unauthorized', message: 'No session', csrfToken }, 401)

type Reply = Response | Error | ((init?: RequestInit) => Promise<Response>)

/** fetch double: separate reply queues for main/init and for everything else. */
const createServer = (replies: { init?: Reply[]; other?: Reply[] }) => {
    const initReplies = [...(replies.init ?? [])]
    const other = [...(replies.other ?? [])]
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit): Promise<Response> => {
        const queue = url.endsWith(INIT) ? initReplies : other
        const reply = queue.shift() ?? jsonResponse({ status: 'success' })
        if (reply instanceof Error) throw reply
        return typeof reply === 'function' ? reply(_init) : reply
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch
    return fetchMock
}

const callsTo = (fetchMock: ReturnType<typeof createServer>, path: string) =>
    fetchMock.mock.calls.filter(([url]) => url.endsWith(path))

const mutations = (fetchMock: ReturnType<typeof createServer>) =>
    fetchMock.mock.calls.filter(([, init]) => init?.method !== 'GET')

const sentToken = (call: unknown[] | undefined): string | undefined =>
    ((call?.[1] as RequestInit | undefined)?.headers as Record<string, string> | undefined)?.[
        'X-CSRF-Token'
    ]

interface Setup {
    token?: string
    tokenUser?: string | null
    uiUser?: string | null
}

const loadApi = async ({ token = TOKEN_U1, tokenUser = '1', uiUser = '1' }: Setup = {}) => {
    const csrf = await import('../csrf-token')
    if (token !== '') csrf.confirmCsrfToken(token, tokenUser)
    const module = await import('../base-api')
    module.setRefreshTimeout(50)
    const reload = vi.fn()
    module.setReloadHandler(reload)
    module.setCurrentUserIdProvider(() => uiUser)
    return { api: module.default, csrf, reload }
}

describe('base-api CSRF', () => {
    beforeEach(() => {
        vi.resetModules()
        vi.clearAllMocks()
        vi.spyOn(console, 'error').mockImplementation(() => undefined)
        createServer({})
    })

    describe('headers', () => {
        it('adds the confirmed X-CSRF-Token to unsafe JSON requests', async () => {
            const { api } = await loadApi()

            await api.http('POST', '/api/test', { value: 1 })

            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/test'),
                expect.objectContaining({
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': TOKEN_U1 },
                }),
            )
        })

        it('does not add X-CSRF-Token to GET requests', async () => {
            const { api } = await loadApi()

            await api.http('GET', '/api/test')

            expect(sentToken(vi.mocked(fetch).mock.calls[0])).toBeUndefined()
        })

        it('adds X-CSRF-Token to uploads without overwriting multipart Content-Type', async () => {
            const { api } = await loadApi()
            const formData = new FormData()
            formData.append('file', new Blob(['hello']), 'hello.txt')

            await api.upload('POST', '/api/upload', formData)

            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/upload'),
                expect.objectContaining({
                    method: 'POST',
                    body: formData,
                    credentials: 'include',
                    headers: { 'X-CSRF-Token': TOKEN_U1 },
                }),
            )
        })
    })

    describe('which response tokens are confirmed', () => {
        it('init 401 confirms an anonymous token used by the next login', async () => {
            const server = createServer({ init: [initAnonymous(TOKEN_ANON)] })
            const { api } = await loadApi({ token: '', uiUser: null })

            await api.http('GET', INIT)
            await api.http('POST', '/api/auth/login', {}, { csrfRecovery: 'public' })

            expect(sentToken(callsTo(server, '/api/auth/login')[0])).toBe(TOKEN_ANON)
        })

        it('a login response with a user confirms its token for that user', async () => {
            createServer({
                other: [jsonResponse({ status: 'success', user: { id: 1 }, csrfToken: TOKEN_U1 })],
            })
            const { api, csrf } = await loadApi({
                token: TOKEN_ANON,
                tokenUser: null,
                uiUser: null,
            })

            await api.http('POST', '/api/auth/login', {}, { csrfRecovery: 'public' })

            expect(csrf.getCsrfToken()).toBe(TOKEN_U1)
            expect(csrf.getConfirmedUserId()).toBe('1')
        })

        it('a logout response confirms its token as anonymous', async () => {
            createServer({ other: [jsonResponse({ status: 'success', csrfToken: TOKEN_ANON })] })
            const { api, csrf } = await loadApi()

            await api.http('POST', '/api/auth/logout', {}, { sessionAfter: 'anonymous' })

            expect(csrf.getCsrfToken()).toBe(TOKEN_ANON)
            expect(csrf.getConfirmedUserId()).toBeNull()
        })

        it('a 2xx to a request signed with the confirmed token keeps its owner', async () => {
            createServer({
                other: [jsonResponse({ status: 'success', csrfToken: TOKEN_U1_FRESH })],
            })
            const { api, csrf } = await loadApi()

            await api.http('POST', '/api/auth/change-password', {})

            expect(csrf.getCsrfToken()).toBe(TOKEN_U1_FRESH)
            expect(csrf.getConfirmedUserId()).toBe('1')
        })

        it('a token from a 403 stays unconfirmed and is never sent', async () => {
            createServer({
                other: [
                    jsonResponse(
                        {
                            status: 'error',
                            code: 'csrf_invalid',
                            reason: 'origin_mismatch',
                            csrfToken: TOKEN_U2,
                        },
                        403,
                    ),
                ],
            })
            const { api, csrf } = await loadApi()

            await api.http('POST', '/api/test')

            expect(csrf.getCsrfToken()).toBe(TOKEN_U1)
            expect(csrf.getUnconfirmedCsrfToken()).toBe(TOKEN_U2)
        })
    })

    describe('retry after token_mismatch', () => {
        it('protected: same user after init → one retry with the token from init', async () => {
            const server = createServer({
                init: [initAs('1', TOKEN_U1_FRESH)],
                other: [tokenMismatch(TOKEN_U1_FRESH), jsonResponse({ status: 'success' })],
            })
            const { api } = await loadApi()

            const result = await api.http('POST', '/api/test')

            expect(result.error).toBeNull()
            const sent = callsTo(server, '/api/test')
            expect(sent).toHaveLength(2)
            expect(sentToken(sent[0])).toBe(TOKEN_U1)
            expect(sentToken(sent[1])).toBe(TOKEN_U1_FRESH)
            expect(emitMock).not.toHaveBeenCalled()
        })

        it('protected: a second 403 is returned as is, no third attempt', async () => {
            const server = createServer({
                init: [initAs('1', TOKEN_U1_FRESH)],
                other: [tokenMismatch(), tokenMismatch()],
            })
            const { api } = await loadApi()

            const result = await api.http('POST', '/api/test')

            expect(callsTo(server, '/api/test')).toHaveLength(2)
            expect(result.error).toMatchObject({ code: 'csrf_invalid', transportCode: 403 })
            expect(result.error?.clientCode).toBeUndefined()
        })

        it('account changed: init returns another user → no retry, reload, account_changed', async () => {
            const server = createServer({
                init: [initAs('2', TOKEN_U2)],
                other: [tokenMismatch(TOKEN_U2)],
            })
            const { api, csrf, reload } = await loadApi()

            const result = await api.http('POST', '/api/test')

            expect(callsTo(server, '/api/test')).toHaveLength(1)
            expect(reload).toHaveBeenCalledOnce()
            expect(csrf.getSessionState()).toBe('reloading')
            expect(result.error).toEqual({
                code: 'csrf_invalid',
                clientCode: 'account_changed',
                transportCode: 403,
                message: 'Invalid CSRF token',
            })
            expect(sentToken(callsTo(server, '/api/test')[0])).toBe(TOKEN_U1)
        })

        it('protected: init 401 → no retry, unauthorized emitted after the decision', async () => {
            const server = createServer({
                init: [initAnonymous(TOKEN_ANON)],
                other: [tokenMismatch(TOKEN_ANON)],
            })
            const { api } = await loadApi()

            const result = await api.http('POST', '/api/test')

            expect(callsTo(server, '/api/test')).toHaveLength(1)
            expect(emitMock).toHaveBeenCalledExactlyOnceWith('unauthorized')
            expect(result.error).toMatchObject({ code: 'csrf_invalid', transportCode: 403 })
        })

        it('public login: init 401 → one retry, no unauthorized and no redirect', async () => {
            const server = createServer({
                init: [initAnonymous(TOKEN_ANON)],
                other: [tokenMismatch(TOKEN_ANON), jsonResponse({ status: 'success' })],
            })
            const { api } = await loadApi({ token: '', uiUser: null })

            const result = await api.http('POST', '/api/auth/login', {}, { csrfRecovery: 'public' })

            expect(result.error).toBeNull()
            const sent = callsTo(server, '/api/auth/login')
            expect(sent).toHaveLength(2)
            expect(sentToken(sent[1])).toBe(TOKEN_ANON)
            expect(emitMock).not.toHaveBeenCalled()
        })

        it('public login: another tab already signed in → no retry, account change', async () => {
            const server = createServer({
                init: [initAs('2', TOKEN_U2)],
                other: [tokenMismatch(TOKEN_U2)],
            })
            const { api, reload } = await loadApi({
                token: TOKEN_ANON,
                tokenUser: null,
                uiUser: null,
            })

            const result = await api.http('POST', '/api/auth/login', {}, { csrfRecovery: 'public' })

            expect(callsTo(server, '/api/auth/login')).toHaveLength(1)
            expect(reload).toHaveBeenCalledOnce()
            expect(result.error?.clientCode).toBe('account_changed')
            expect(emitMock).not.toHaveBeenCalledWith('unauthorized')
        })

        it.each([
            ['network error', new Error('offline')],
            ['503', jsonResponse({ status: 'error', code: 'service_unavailable' }, 503)],
            ['200 without a token', jsonResponse({ status: 'ok', user: { id: '1' } })],
        ])(
            'init %s → no retry, session_unverified, next call refreshes again',
            async (_, reply) => {
                const server = createServer({
                    init: [reply, initAs('1', TOKEN_U1_FRESH)],
                    other: [tokenMismatch(), jsonResponse({ status: 'success' })],
                })
                const { api, csrf } = await loadApi()

                const result = await api.http('POST', '/api/test')

                expect(result.error).toEqual({
                    code: 'csrf_invalid',
                    clientCode: 'session_unverified',
                    transportCode: 403,
                    message: 'Invalid CSRF token',
                })
                expect(callsTo(server, '/api/test')).toHaveLength(1)
                expect(csrf.getSessionState()).toBe('diverged')

                await api.http('POST', '/api/test')
                expect(callsTo(server, INIT)).toHaveLength(2)
            },
        )

        it.each([['origin_mismatch'], ['fetch_site_cross_site'], ['fetch_site_invalid']])(
            '%s → no init and no retry',
            async (reason) => {
                const server = createServer({
                    other: [jsonResponse({ status: 'error', code: 'csrf_invalid', reason }, 403)],
                })
                const { api } = await loadApi()

                const result = await api.http('POST', '/api/test')

                expect(callsTo(server, INIT)).toHaveLength(0)
                expect(callsTo(server, '/api/test')).toHaveLength(1)
                expect(result.error).toMatchObject({ code: 'csrf_invalid', transportCode: 403 })
            },
        )

        it('uploads are retried with the same FormData', async () => {
            const server = createServer({
                init: [initAs('1', TOKEN_U1_FRESH)],
                other: [tokenMismatch(), jsonResponse({ status: 'success' })],
            })
            const { api } = await loadApi()
            const formData = new FormData()

            await api.upload('POST', '/api/upload', formData)

            const sent = callsTo(server, '/api/upload')
            expect(sent).toHaveLength(2)
            expect(sent[1]?.[1]?.body).toBe(formData)
            expect(sentToken(sent[1])).toBe(TOKEN_U1_FRESH)
        })
    })

    describe('session gate', () => {
        it('an unverified token never reaches the next request (U1 → cookie U2 → init 503)', async () => {
            const server = createServer({
                init: [
                    jsonResponse({ status: 'error' }, 503),
                    jsonResponse({ status: 'error' }, 503),
                ],
                other: [tokenMismatch(TOKEN_U2)],
            })
            const { api } = await loadApi()

            await api.http('POST', '/api/first')
            const second = await api.http('POST', '/api/second')

            expect(callsTo(server, '/api/second')).toHaveLength(0)
            expect(mutations(server)).toHaveLength(1)
            expect(second.error).toEqual({
                clientCode: 'session_unverified',
                transportCode: 0,
                message: expect.any(String),
            })
            expect(second.error).not.toHaveProperty('code')
            for (const call of server.mock.calls) expect(sentToken(call)).not.toBe(TOKEN_U2)
        })

        it('diverged → init with the same user → the mutation is sent once with the init token', async () => {
            const server = createServer({
                init: [jsonResponse({ status: 'error' }, 503), initAs('1', TOKEN_U1_FRESH)],
                other: [tokenMismatch(), jsonResponse({ status: 'success' })],
            })
            const { api, csrf } = await loadApi()
            await api.http('POST', '/api/first')

            const result = await api.http('POST', '/api/second')

            expect(result.error).toBeNull()
            const sent = callsTo(server, '/api/second')
            expect(sent).toHaveLength(1)
            expect(sentToken(sent[0])).toBe(TOKEN_U1_FRESH)
            expect(csrf.getSessionState()).toBe('synced')
        })

        it('diverged → init with another user → not sent, reloading', async () => {
            const server = createServer({
                init: [jsonResponse({ status: 'error' }, 503), initAs('2', TOKEN_U2)],
                other: [tokenMismatch()],
            })
            const { api, csrf, reload } = await loadApi()
            await api.http('POST', '/api/first')

            const result = await api.http('POST', '/api/second')

            expect(callsTo(server, '/api/second')).toHaveLength(0)
            expect(csrf.getSessionState()).toBe('reloading')
            expect(reload).toHaveBeenCalledOnce()
            expect(result.error).toEqual({
                clientCode: 'account_changed',
                transportCode: 0,
                message: expect.any(String),
            })
        })

        it('reloading: a late init cannot restore synced, and nothing is sent or refreshed', async () => {
            let releaseLateInit: (response: Response) => void = () => undefined
            const lateInit = new Promise<Response>((resolve) => {
                releaseLateInit = resolve
            })
            const server = createServer({
                init: [initAs('2', TOKEN_U2), () => lateInit],
                other: [tokenMismatch()],
            })
            const { api, csrf } = await loadApi()
            await api.http('POST', '/api/first')
            expect(csrf.getSessionState()).toBe('reloading')

            // The app's own init answering late for the old user.
            const appInit = api.http('GET', INIT)
            releaseLateInit(initAs('1', TOKEN_U1_FRESH))
            await appInit
            const result = await api.http('POST', '/api/second')

            expect(csrf.getSessionState()).toBe('reloading')
            expect(csrf.getCsrfToken()).toBeNull()
            expect(callsTo(server, '/api/second')).toHaveLength(0)
            expect(callsTo(server, INIT)).toHaveLength(2)
            expect(result.error?.clientCode).toBe('account_changed')
        })

        it('two requests failing together share one init', async () => {
            const server = createServer({
                init: [initAs('1', TOKEN_U1_FRESH)],
                other: [tokenMismatch(), tokenMismatch()],
            })
            const { api } = await loadApi()

            const results = await Promise.all([
                api.http('POST', '/api/a'),
                api.http('POST', '/api/b'),
            ])

            expect(callsTo(server, INIT)).toHaveLength(1)
            expect(results.map((r) => r.error)).toEqual([null, null])
            expect(sentToken(callsTo(server, '/api/a')[1])).toBe(TOKEN_U1_FRESH)
            expect(sentToken(callsTo(server, '/api/b')[1])).toBe(TOKEN_U1_FRESH)
        })

        it('a mutation started while reconciling waits and passes the same user check', async () => {
            let releaseInit: (response: Response) => void = () => undefined
            const pendingInit = new Promise<Response>((resolve) => {
                releaseInit = resolve
            })
            const server = createServer({
                init: [() => pendingInit],
                other: [tokenMismatch(), jsonResponse({ status: 'success' })],
            })
            const { api, csrf } = await loadApi()

            const first = api.http('POST', '/api/first')
            await vi.waitFor(() => {
                expect(csrf.getSessionState()).toBe('reconciling')
            })
            const second = api.http('POST', '/api/second')
            expect(callsTo(server, '/api/second')).toHaveLength(0)
            releaseInit(initAs('1', TOKEN_U1_FRESH))
            await Promise.all([first, second])

            expect(callsTo(server, INIT)).toHaveLength(1)
            expect(sentToken(callsTo(server, '/api/second')[0])).toBe(TOKEN_U1_FRESH)
        })

        it('refreshSession itself emits nothing', async () => {
            createServer({
                init: [initAnonymous(TOKEN_ANON)],
                other: [tokenMismatch()],
            })
            const { api } = await loadApi({ token: '', uiUser: null })

            await api.http('POST', '/api/auth/login', {}, { csrfRecovery: 'public' })

            expect(emitMock).not.toHaveBeenCalled()
        })
    })

    describe('review fixes', () => {
        const hanging = (init?: RequestInit) =>
            new Promise<Response>((_, reject) => {
                init?.signal?.addEventListener('abort', () => {
                    reject(new DOMException('timed out', 'TimeoutError'))
                })
            })

        it('synced: a token the app init confirmed for another user never signs a mutation', async () => {
            const server = createServer({ init: [initAs('2', TOKEN_U2)] })
            const { api, csrf, reload } = await loadApi()

            await api.http('GET', INIT) // the app's own init sees the other tab's account
            const result = await api.http('POST', '/api/test')

            expect(mutations(server)).toHaveLength(0)
            expect(reload).toHaveBeenCalledOnce()
            expect(csrf.getSessionState()).toBe('reloading')
            expect(result.error).toEqual({
                clientCode: 'account_changed',
                transportCode: 0,
                message: expect.any(String),
            })
        })

        it('a hanging init times out: no retry, session_unverified, the next action refreshes again', async () => {
            const server = createServer({
                init: [hanging, initAs('1', TOKEN_U1_FRESH)],
                other: [tokenMismatch(), jsonResponse({ status: 'success' })],
            })
            const { api, csrf } = await loadApi()

            const first = await api.http('POST', '/api/first')

            expect(first.error?.clientCode).toBe('session_unverified')
            expect(csrf.getSessionState()).toBe('diverged')
            const second = await api.http('POST', '/api/second')
            expect(second.error).toBeNull()
            expect(callsTo(server, INIT)).toHaveLength(2)
        })

        it('the caller can stop waiting for the shared refresh', async () => {
            createServer({ init: [hanging], other: [tokenMismatch()] })
            const { api } = await loadApi()
            const controller = new AbortController()

            const pending = api.http('POST', '/api/test', {}, { signal: controller.signal })
            await vi.waitFor(() => {
                expect(
                    vi.mocked(fetch).mock.calls.some(([url]) => (url as string).endsWith(INIT)),
                ).toBe(true)
            })
            controller.abort()

            expect((await pending).error).toEqual({ transportCode: 0, message: 'Request aborted' })
        })

        it('a late 403 in reloading starts no new refresh', async () => {
            let releaseLate: (response: Response) => void = () => undefined
            const late = new Promise<Response>((resolve) => {
                releaseLate = resolve
            })
            const server = createServer({
                init: [initAs('2', TOKEN_U2)],
                other: [() => late, tokenMismatch()],
            })
            const { api, csrf } = await loadApi()

            const slow = api.http('POST', '/api/slow')
            await vi.waitFor(() => {
                expect(callsTo(server, '/api/slow')).toHaveLength(1)
            })
            await api.http('POST', '/api/first') // → account change, reloading
            expect(csrf.getSessionState()).toBe('reloading')
            releaseLate(tokenMismatch())
            const result = await slow

            expect(callsTo(server, INIT)).toHaveLength(1)
            expect(result.error?.clientCode).toBe('account_changed')
        })
    })
})
