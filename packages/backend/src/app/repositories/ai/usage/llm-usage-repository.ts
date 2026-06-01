import { db } from '#database/db.js';
import { llmTextUsage } from '#database/schema.js';
import { eq, sql, desc, and, gte, lte } from 'drizzle-orm';
import type { InferInsertModel, InferSelectModel, SQL } from 'drizzle-orm';

export type LlmTextUsageRow = InferSelectModel<typeof llmTextUsage>;
export type LlmTextUsageInsert = InferInsertModel<typeof llmTextUsage>;

export type TextFeature = LlmTextUsageRow['feature'];

export interface TextStatRow {
    model: string;
    feature: string;
    totalCalls: number;
    totalTokens: number;
}

export interface TextFilter {
    userId?: bigint;
    dateFrom?: Date;
    dateTo?: Date;
    feature?: TextFeature;
}

export interface ILlmUsageRepository {
    insertText(data: LlmTextUsageInsert): Promise<void>;
    findText(opts: TextFilter & { limit: number; offset: number }): Promise<LlmTextUsageRow[]>;
    countText(filter?: TextFilter): Promise<number>;
    getTextStats(): Promise<TextStatRow[]>;
}

function buildTextWhere(filter: TextFilter): SQL | undefined {
    const conditions: SQL[] = [];
    if (filter.userId !== undefined) conditions.push(eq(llmTextUsage.userId, filter.userId));
    if (filter.dateFrom !== undefined) conditions.push(gte(llmTextUsage.createdAt, filter.dateFrom));
    if (filter.dateTo !== undefined) conditions.push(lte(llmTextUsage.createdAt, filter.dateTo));
    if (filter.feature !== undefined) conditions.push(eq(llmTextUsage.feature, filter.feature));
    return conditions.length > 0 ? and(...conditions) : undefined;
}

export const llmUsageRepository: ILlmUsageRepository = {
    async insertText(data) {
        await db.insert(llmTextUsage).values(data);
    },

    async findText({ limit, offset, ...filter }) {
        const where = buildTextWhere(filter);
        const base = db.select().from(llmTextUsage);
        const filtered = where !== undefined ? base.where(where) : base;
        return filtered.orderBy(desc(llmTextUsage.createdAt)).limit(limit).offset(offset);
    },

    async countText(filter = {}) {
        const where = buildTextWhere(filter);
        const query = db.select({ count: sql<number>`count(*)` }).from(llmTextUsage);
        const result = await (where !== undefined ? query.where(where) : query);
        return result[0]?.count ?? 0;
    },

    async getTextStats() {
        const rows = await db
            .select({
                model: llmTextUsage.model,
                feature: llmTextUsage.feature,
                totalCalls: sql<number>`count(*)`,
                totalTokens: sql<number>`sum(${llmTextUsage.totalTokens})`,
            })
            .from(llmTextUsage)
            .groupBy(llmTextUsage.model, llmTextUsage.feature)
            .orderBy(desc(sql`count(*)`));
        return rows.map((r) => ({
            model: r.model,
            feature: r.feature,
            totalCalls: r.totalCalls,
            totalTokens: r.totalTokens ?? 0,
        }));
    },

};
