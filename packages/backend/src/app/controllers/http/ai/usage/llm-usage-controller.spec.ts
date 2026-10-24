import { describe, expect, it, vi } from 'vitest'

import { type } from '@arktype/type'
import { GetTextUsageResponseSchema } from 'shared'
import type { HttpContext } from '#vendor/types/types.js'

const getTextUsage = vi.fn()
vi.mock('#app/services/ai/usage/llm-usage-service.js', () => ({
    llmUsageService: { getTextUsage, getStats: vi.fn() },
}))

const { default: LlmUsageController } = await import('./llm-usage-controller.js')

describe('LlmUsageController.getTextUsage (item 53)', () => {
    it('serializes NULL user and token counts as null and matches the response schema', async () => {
        getTextUsage.mockResolvedValue({
            rows: [
                {
                    id: 1n,
                    userId: null,
                    model: 'emb',
                    feature: 'SUPPORT_EMBEDDING',
                    finalPrompt: 'text',
                    promptTokens: null,
                    completionTokens: null,
                    totalTokens: null,
                    createdAt: new Date(0),
                },
            ],
            total: 1,
        })

        const response = await LlmUsageController.getTextUsage({
            httpData: { query: { page: 1, limit: 10 } },
        } as unknown as HttpContext<unknown, never>)

        expect(response.data?.rows[0]).toMatchObject({
            userId: null,
            promptTokens: null,
            totalTokens: null,
        })
        expect(GetTextUsageResponseSchema(response) instanceof type.errors).toBe(false)
    })
})
