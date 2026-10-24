// Size of support_knowledge_base.embedding (vector(N)). OPENAI_EMBEDDING_DIMENSIONS
// must match it: another size needs a column migration and a reindex.
// Kept free of imports: config/ai.ts and schema.ts both read it.
export const EMBEDDING_COLUMN_DIMENSIONS = 1536
