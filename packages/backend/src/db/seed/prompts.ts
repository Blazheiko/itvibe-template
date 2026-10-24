import supportConfig from '../../config/support.js'
import type { llmPromptTypeEnum } from '../../database/schema.js'

export type PromptType = (typeof llmPromptTypeEnum.enumValues)[number]

export interface SeedPrompt {
    type: PromptType
    topic: string
    content: string
    model: null
    temperature: number
    maxTokens: number
}

const { defaultGeneration } = supportConfig

// The same texts the services fall back to, so the first seed does not change AI behaviour.
const contentByType = {
    SUPPORT_SYSTEM: supportConfig.defaultSystemPrompt,
    SUPPORT_FIRST_CHAT: supportConfig.defaultFirstChatPrompt,
    SUPPORT_QUERY_TRANSLATION: supportConfig.defaultTranslationPrompt,
} satisfies Record<PromptType, string>

const topicByType = {
    SUPPORT_SYSTEM: 'Support chat',
    SUPPORT_FIRST_CHAT: 'Support greeting',
    SUPPORT_QUERY_TRANSLATION: 'Support query translation',
} satisfies Record<PromptType, string>

export const SEED_PROMPTS: readonly SeedPrompt[] = (Object.keys(contentByType) as PromptType[]).map(
    (type) => ({
        type,
        topic: topicByType[type],
        content: contentByType[type],
        model: null,
        temperature: defaultGeneration[type].temperature,
        maxTokens: defaultGeneration[type].maxTokens,
    }),
)
