import OpenAI from 'openai'
import aiConfig from '#config/ai.js'
import { aiRequestSignal } from '#app/services/ai/ai-request-signal.js'
import type { TextUsageCompleteHandler } from '#app/services/ai/types.js'

const cfg = aiConfig.openaiEmbedding

let client: OpenAI | undefined

function getClient(): OpenAI {
    client ??= new OpenAI({ apiKey: cfg.apiKey })
    return client
}

export interface EmbedOptions {
    signal?: AbortSignal
    /** Called once per request with the provider's usage (code-issues item 53). */
    onComplete?: TextUsageCompleteHandler
}

// Embeddings have no completion tokens; missing usage is recorded as NULL.
function reportUsage(
    usage: { prompt_tokens?: number; total_tokens?: number } | undefined,
    input: string,
    onComplete: TextUsageCompleteHandler | undefined,
): void {
    if (onComplete === undefined) return
    try {
        onComplete(
            {
                promptTokens: usage?.prompt_tokens ?? null,
                completionTokens: null,
                totalTokens: usage?.total_tokens ?? null,
            },
            cfg.model,
            input,
        )
    } catch {
        // usage tracking must not break the call
    }
}

export const openaiEmbeddingAdapter = {
    isConfigured(): boolean {
        return cfg.apiKey !== ''
    },

    async embed(text: string, options: EmbedOptions = {}): Promise<number[]> {
        const response = await getClient().embeddings.create(
            { model: cfg.model, input: text, dimensions: cfg.dimensions },
            { signal: aiRequestSignal(options.signal) },
        )
        reportUsage(response.usage, text, options.onComplete)

        const data = response.data[0]
        if (data === undefined) {
            throw new Error('OpenAI Embedding: empty response')
        }
        return data.embedding
    },

    async embedBatch(texts: string[], options: EmbedOptions = {}): Promise<number[][]> {
        if (texts.length === 0) return []

        const response = await getClient().embeddings.create(
            { model: cfg.model, input: texts, dimensions: cfg.dimensions },
            { signal: aiRequestSignal(options.signal) },
        )
        // final_prompt gets a summary, not up to SUPPORT_EMBEDDING_BATCH_SIZE full articles.
        const totalChars = texts.reduce((sum, text) => sum + text.length, 0)
        reportUsage(
            response.usage,
            `[batch: ${String(texts.length)} texts, ${String(totalChars)} chars]`,
            options.onComplete,
        )

        const sorted = [...response.data].sort((a, b) => a.index - b.index)
        return sorted.map((d) => d.embedding)
    },
}
