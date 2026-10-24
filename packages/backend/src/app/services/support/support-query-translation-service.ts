import { getTextAdapterForModel } from '#app/services/ai/ai-provider.js'
import { promptService } from '#app/services/ai/prompt-service.js'
import logger from '#logger'
import supportConfig from '#config/support.js'

const { defaultTranslationPrompt, defaultGeneration } = supportConfig

export const supportQueryTranslationService = {
    async translateToEnglish(text: string): Promise<string> {
        const model = promptService.getModel('SUPPORT_QUERY_TRANSLATION')
        const temperature =
            promptService.getTemperature('SUPPORT_QUERY_TRANSLATION') ??
            defaultGeneration.SUPPORT_QUERY_TRANSLATION.temperature
        const maxTokens =
            promptService.getMaxTokens('SUPPORT_QUERY_TRANSLATION') ??
            defaultGeneration.SUPPORT_QUERY_TRANSLATION.maxTokens
        const systemPrompt =
            promptService.getContent('SUPPORT_QUERY_TRANSLATION') || defaultTranslationPrompt

        const adapter = getTextAdapterForModel(model)
        if (!adapter.isConfigured()) {
            logger.warn(
                'Support query translation: text adapter not configured, using original query',
            )
            return text
        }

        try {
            let result = ''
            for await (const chunk of adapter.streamText({
                systemPrompt,
                userPrompt: text,
                temperature,
                maxOutputTokens: maxTokens,
                modelOverride: model ?? undefined,
            })) {
                result += chunk
            }
            const englishQuery = result.trim()
            return englishQuery.length > 0 ? englishQuery : text
        } catch (err) {
            logger.error(
                { err, originalLength: text.length, originalQuery: text },
                'Support: query translation failed, using original',
            )
            return text
        }
    },
}
