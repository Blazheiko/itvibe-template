import { type } from '@arktype/type'

export const SupportChatInputSchema = type({
    message: 'string >= 1',
    // UI locale (e.g. "uk", "pt-BR"); the server maps it to an app locale or its default.
    'language?': 'string <= 16',
    '+': 'reject',
})

export type SupportChatInput = typeof SupportChatInputSchema.infer
