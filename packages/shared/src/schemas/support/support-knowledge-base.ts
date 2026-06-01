import { type } from '@arktype/type';

export const SupportKnowledgeBaseCreateSchema = type({
    title: 'string >= 1',
    content: 'string >= 1',
    'category?': 'string',
    'isActive?': 'boolean',
    '+': 'reject',
});

export type SupportKnowledgeBaseCreateInput = typeof SupportKnowledgeBaseCreateSchema.infer;

export const SupportKnowledgeBaseUpdateSchema = type({
    'title?': 'string >= 1',
    'content?': 'string >= 1',
    'category?': 'string',
    'isActive?': 'boolean',
    '+': 'reject',
});

export type SupportKnowledgeBaseUpdateInput = typeof SupportKnowledgeBaseUpdateSchema.infer;
