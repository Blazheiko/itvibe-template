import { Result } from 'better-result'

import { textAdapter } from '#app/services/ai/ai-provider.js'
import { aiAbortKind } from '#app/services/ai/ai-request-signal.js'
import {
    serviceUnavailable,
    upstreamError,
    upstreamTimeout,
    type AppResult,
} from '#app/services/shared/errors.js'
import logger from '#logger'

// Admin "test this prompt" call (code-issues item 23): goes through the
// configured text adapter only — no own fetch, no fallback to raw OpenAI — and
// maps provider failures to domain errors instead of a generic 500.
export const promptTestService = {
    async run(
        systemPrompt: string,
        message: string,
        signal?: AbortSignal,
    ): Promise<AppResult<string>> {
        if (!textAdapter.isConfigured()) {
            return Result.err({
                ...serviceUnavailable(),
                message: 'AI provider is not configured',
            })
        }

        try {
            let result = ''
            for await (const chunk of textAdapter.streamText({
                systemPrompt,
                userPrompt: message,
                temperature: 0.5,
                maxOutputTokens: 2000,
                ...(signal !== undefined ? { signal } : {}),
            })) {
                result += chunk
            }
            return Result.ok(result)
        } catch (error) {
            logger.error({ err: error, model: textAdapter.model }, 'Prompt test LLM call failed')
            return Result.err(
                aiAbortKind(error) === 'timeout' ? upstreamTimeout(error) : upstreamError(error),
            )
        }
    },
}
