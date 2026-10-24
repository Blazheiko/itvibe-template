import { openaiEmbeddingAdapter } from '#app/services/ai/adapters/openai-embedding-adapter.js'
import { supportKnowledgeRepository } from '#app/repositories/index.js'
import type { KbSearchResult } from '#app/repositories/index.js'
import { llmUsageService } from '#app/services/ai/usage/llm-usage-service.js'
import logger from '#logger'

export const supportEmbeddingService = {
    async indexArticle(articleId: bigint, title: string, content: string): Promise<void> {
        if (!openaiEmbeddingAdapter.isConfigured()) {
            logger.warn('OpenAI Embedding not configured, skipping indexing')
            return
        }
        const text = `${title}\n\n${content}`
        // Indexing is a system call: no user to attribute it to.
        const vector = await openaiEmbeddingAdapter.embed(text, {
            onComplete: llmUsageService.textUsageRecorder('SUPPORT_EMBEDDING', null),
        })
        await supportKnowledgeRepository.setEmbedding(articleId, vector)
    },

    async reindexAll(): Promise<number> {
        if (!openaiEmbeddingAdapter.isConfigured()) {
            logger.warn('OpenAI Embedding not configured, skipping reindex')
            return 0
        }

        const allRows = await supportKnowledgeRepository.findActiveAll()
        if (allRows.length === 0) return 0

        const texts = allRows.map((a) => `${a.title}\n\n${a.content}`)
        const vectors = await openaiEmbeddingAdapter.embedBatch(texts, {
            onComplete: llmUsageService.textUsageRecorder('SUPPORT_EMBEDDING', null),
        })

        for (let i = 0; i < allRows.length; i++) {
            const article = allRows[i]
            const vector = vectors[i]
            if (article === undefined || vector === undefined) continue
            await supportKnowledgeRepository.setEmbedding(article.id, vector)
        }

        return allRows.length
    },

    async search(
        query: string,
        limit = 5,
        options: { userId?: bigint; signal?: AbortSignal } = {},
    ): Promise<KbSearchResult[]> {
        if (!openaiEmbeddingAdapter.isConfigured()) {
            logger.warn('OpenAI Embedding not configured, returning empty results')
            return []
        }
        const queryVector = await openaiEmbeddingAdapter.embed(query, {
            ...(options.signal !== undefined ? { signal: options.signal } : {}),
            onComplete: llmUsageService.textUsageRecorder(
                'SUPPORT_EMBEDDING',
                options.userId ?? null,
            ),
        })
        return supportKnowledgeRepository.searchByEmbedding(queryVector, limit)
    },
}
