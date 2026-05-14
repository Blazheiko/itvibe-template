export type TextFeature =
    | 'TRANSLATOR_TRANSLATE'
    | 'TRANSLATOR_SUMMARY'
    | 'TEACHER_CHAT'
    | 'TEACHER_LESSON'
    | 'TEACHER_SYNTAX_LESSON'
    | 'TEACHER_FACTS'
    | 'TEACHER_VOCABULARY'
    | 'PROMPT_TEST'
    | 'SUPPORT_CHAT';

export type ImageFeature = 'AVATAR_GENERATE' | 'CHAT_IMAGE_EDIT';

export interface TextFilter {
    userId?: bigint;
    dateFrom?: Date;
    dateTo?: Date;
    feature?: TextFeature;
}

export interface ImageFilter {
    userId?: bigint;
    dateFrom?: Date;
    dateTo?: Date;
    feature?: ImageFeature;
}

export interface LlmTextUsageRow {
    id: bigint;
}

export interface LlmImageUsageRow {
    id: bigint;
}

export interface TextStatRow {
    model: string;
    feature: TextFeature;
    calls: number;
    totalTokens: number;
}

export interface ImageStatRow {
    model: string;
    feature: ImageFeature;
    calls: number;
    totalImages: number;
}

export const llmUsageService = {
    recordText(_params: {
        userId: bigint;
        llmSystemPromptId: bigint | null;
        model: string;
        feature: TextFeature;
        finalPrompt: string;
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    }): void {},
    recordImage(_params: {
        userId: bigint;
        llmSystemPromptId: bigint | null;
        model: string;
        feature: ImageFeature;
        imageCount?: number;
    }): void {},
    async getTextUsage(_opts: {
        limit: number;
        offset: number;
        filter?: TextFilter;
    }): Promise<{ rows: LlmTextUsageRow[]; total: number }> {
        return { rows: [], total: 0 };
    },
    async getImageUsage(_opts: {
        limit: number;
        offset: number;
        filter?: ImageFilter;
    }): Promise<{ rows: LlmImageUsageRow[]; total: number }> {
        return { rows: [], total: 0 };
    },
    async getStats(): Promise<{ text: TextStatRow[]; image: ImageStatRow[] }> {
        return { text: [], image: [] };
    },
};
