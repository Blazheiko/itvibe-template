import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Every adapter hands an AbortSignal bounded by AI_REQUEST_TIMEOUT_MS to its
// transport and follows the caller's signal (code-issues item 51).

vi.mock('#config/ai.js', () => ({
    default: {
        drivers: { text: 'openai' },
        requestTimeoutMs: 50,
        providers: {
            openai: { apiKey: 'k', chatModel: 'gpt-test', chatApiUrl: 'https://llm.test/chat' },
            xai: { apiKey: 'k', chatModel: 'grok-test' },
            mistralai: { apiKey: 'k', textModel: 'mistral-test' },
        },
        openaiEmbedding: { apiKey: 'k', model: 'emb', dimensions: 3 },
        configError: null,
    },
}))
vi.mock('#logger', () => ({
    default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const xaiStreamText = vi.fn()
vi.mock('ai', () => ({
    streamText: xaiStreamText,
    tool: vi.fn(),
    jsonSchema: vi.fn(),
    stepCountIs: vi.fn(),
}))
vi.mock('@ai-sdk/xai', () => ({ createXai: () => ({ responses: (model: string) => model }) }))

const mistralStream = vi.fn()
vi.mock('@mistralai/mistralai', () => ({
    Mistral: class {
        chat = { stream: mistralStream }
    },
}))

const embeddingsCreate = vi.fn()
vi.mock('openai', () => ({
    default: class {
        embeddings = { create: embeddingsCreate }
    },
}))

const drain = async (gen: AsyncGenerator<string, string, undefined>): Promise<void> => {
    const chunks: string[] = []
    for await (const chunk of gen) chunks.push(chunk)
}

const neverResolvingFetch = vi.fn(
    (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
            init.signal.addEventListener('abort', () => {
                reject(init.signal.reason as Error)
            })
        }),
)

beforeEach(() => {
    vi.stubGlobal('fetch', neverResolvingFetch)
})

afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
})

describe('openai text adapter', () => {
    it('aborts a hanging provider after the timeout', async () => {
        const { openaiTextAdapter } = await import('./openai-text-adapter.js')
        await expect(
            drain(openaiTextAdapter.streamText({ systemPrompt: 's', userPrompt: 'u' })),
        ).rejects.toMatchObject({ name: 'TimeoutError' })
        const init = neverResolvingFetch.mock.calls[0]?.[1]
        expect(init?.signal).toBeInstanceOf(AbortSignal)
    })

    it("stops at once when the caller's signal aborts", async () => {
        const { openaiTextAdapter } = await import('./openai-text-adapter.js')
        const controller = new AbortController()
        const pending = drain(
            openaiTextAdapter.streamText({
                systemPrompt: 's',
                userPrompt: 'u',
                signal: controller.signal,
            }),
        )
        controller.abort()
        await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    })
})

describe('xai, mistral and embedding adapters pass the signal on', () => {
    it('xai: abortSignal follows the caller', async () => {
        xaiStreamText.mockReturnValue({ stream: (async function* () {})() })
        const { xaiTextAdapter } = await import('./xai-text-adapter.js')
        const controller = new AbortController()
        await drain(
            xaiTextAdapter.streamText({
                systemPrompt: 's',
                userPrompt: 'u',
                signal: controller.signal,
            }),
        )
        const params = xaiStreamText.mock.calls[0]?.[0] as { abortSignal: AbortSignal }
        expect(params.abortSignal.aborted).toBe(false)
        controller.abort()
        expect(params.abortSignal.aborted).toBe(true)
    })

    it('mistral: fetchOptions.signal follows the caller', async () => {
        mistralStream.mockResolvedValue((async function* () {})())
        const { mistralaiTextAdapter } = await import('./mistralai-text-adapter.js')
        const controller = new AbortController()
        await drain(
            mistralaiTextAdapter.streamText({
                systemPrompt: 's',
                userPrompt: 'u',
                signal: controller.signal,
            }),
        )
        const options = mistralStream.mock.calls[0]?.[1] as {
            fetchOptions: { signal: AbortSignal }
        }
        controller.abort()
        expect(options.fetchOptions.signal.aborted).toBe(true)
    })

    it('embeddings: the request options carry a timeout signal', async () => {
        embeddingsCreate.mockResolvedValue({ data: [{ index: 0, embedding: [1, 2, 3] }] })
        const { openaiEmbeddingAdapter } = await import('./openai-embedding-adapter.js')
        await openaiEmbeddingAdapter.embed('text')
        await openaiEmbeddingAdapter.embedBatch(['a'])
        for (const call of embeddingsCreate.mock.calls) {
            expect((call[1] as { signal: AbortSignal }).signal).toBeInstanceOf(AbortSignal)
        }
        expect(embeddingsCreate).toHaveBeenCalledTimes(2)
    })
})
