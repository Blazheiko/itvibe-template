import type { HttpContext } from '#vendor/types/types.js';
import { llmUsageService } from '#app/services/ai/usage/llm-usage-service.js';
import type { TextFilter } from '#app/repositories/ai/usage/llm-usage-repository.js';
import type { LlmTextUsageQuery } from 'shared/schemas';
import type {
    GetTextUsageResponse,
    GetUsageStatsResponse,
} from 'shared';

function buildTextFilter(query: LlmTextUsageQuery): TextFilter {
    const filter: TextFilter = {};
    if (query.userId !== undefined && query.userId.trim().length > 0) {
        const userId = query.userId.trim();
        try { filter.userId = BigInt(userId.trim()); } catch { /* ignore invalid */ }
    }
    if (query.dateFrom !== undefined) {
        filter.dateFrom = query.dateFrom;
    }
    if (query.dateTo !== undefined) {
        filter.dateTo = query.dateTo;
    }
    if (query.feature !== undefined) {
        filter.feature = query.feature;
    }
    return filter;
}

export default {
    async getTextUsage(
        context: HttpContext<unknown, LlmTextUsageQuery>,
    ): Promise<GetTextUsageResponse> {
        const { page, limit } = context.httpData.query;
        const offset = (page - 1) * limit;
        const filter = buildTextFilter(context.httpData.query);

        const { rows, total } = await llmUsageService.getTextUsage({ limit, offset, filter });

        const serialized = rows.map((r) => ({
            id: String(r.id),
            userId: String(r.userId),
            model: r.model,
            feature: r.feature,
            finalPrompt: r.finalPrompt,
            promptTokens: r.promptTokens,
            completionTokens: r.completionTokens,
            totalTokens: r.totalTokens,
            createdAt: r.createdAt.toISOString(),
        }));

        return { status: 'success', data: { rows: serialized, total, page, limit } };
    },

    async getStats(_context: HttpContext): Promise<GetUsageStatsResponse> {
        const { text } = await llmUsageService.getStats();
        return { status: 'success', data: { text } };
    },
};
