import { type } from '@arktype/type';

export const SupportOpenChatInputSchema = type({
    '+': 'reject',
});

export type SupportOpenChatInput = typeof SupportOpenChatInputSchema.infer;
