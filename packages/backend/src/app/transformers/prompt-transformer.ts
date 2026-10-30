import type { PromptRow } from '#app/repositories/index.js'

// Wire shape of llm_system_prompts rows (feat-047): id as a string, dates as ISO strings.
export type SerializedPrompt = Omit<PromptRow, 'id' | 'createdAt' | 'updatedAt'> & {
    id: string
    createdAt: string
    updatedAt: string
}

export const promptTransformer = {
    serialize(prompt: PromptRow): SerializedPrompt {
        const { id, createdAt, updatedAt, ...rest } = prompt
        return {
            ...rest,
            id: String(id),
            createdAt: createdAt.toISOString(),
            updatedAt: updatedAt.toISOString(),
        }
    },

    serializeArray(prompts: PromptRow[]): SerializedPrompt[] {
        return prompts.map((prompt) => promptTransformer.serialize(prompt))
    },
}
