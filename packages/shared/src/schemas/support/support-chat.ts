import { type } from '@arktype/type';

export const SupportChatInputSchema = type({
    message: 'string >= 1',
    '+': 'reject',
});

export type SupportChatInput = typeof SupportChatInputSchema.infer;
