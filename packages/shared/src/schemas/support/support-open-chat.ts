import { type } from '@arktype/type'

export const SupportOpenChatInputSchema = type({
    // UI locale (e.g. "uk", "pt-BR"); the server maps it to an app locale or its default.
    'language?': 'string <= 16',
    '+': 'reject',
})

export type SupportOpenChatInput = typeof SupportOpenChatInputSchema.infer
