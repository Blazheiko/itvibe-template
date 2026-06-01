import { llmUsageRepository } from '#app/repositories/ai/usage/llm-usage-repository.js';
import type {
    LlmTextUsageRow,
    TextFeature,
    TextStatRow,
    TextFilter,
} from '#app/repositories/ai/usage/llm-usage-repository.js';
import logger from '#logger';

export const llmUsageService = {
    recordText(params: {
        userId: bigint;
        llmSystemPromptId: bigint | null;
        model: string;
        feature: TextFeature;
        finalPrompt: string;
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    }): void {
        void llmUsageRepository.insertText({
            userId: params.userId,
            llmSystemPromptId: params.llmSystemPromptId ?? undefined,
            model: params.model,
            feature: params.feature,
            finalPrompt: params.finalPrompt,
            promptTokens: params.promptTokens,
            completionTokens: params.completionTokens,
            totalTokens: params.totalTokens,
            createdAt: new Date(),
        }).catch((err: unknown) => {
            logger.warn({ err }, 'llmUsageService: failed to record text usage');
        });
    },

    async getTextUsage(opts: {
        limit: number;
        offset: number;
        filter?: TextFilter;
    }): Promise<{ rows: LlmTextUsageRow[]; total: number }> {
        const filter = opts.filter ?? {};
        const [rows, total] = await Promise.all([
            llmUsageRepository.findText({ limit: opts.limit, offset: opts.offset, ...filter }),
            llmUsageRepository.countText(filter),
        ]);
        return { rows, total };
    },

    async getStats(): Promise<{ text: TextStatRow[] }> {
        const text = await llmUsageRepository.getTextStats();
        return { text };
    },
};
