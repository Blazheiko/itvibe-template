import { supportRepository } from '#app/repositories/support/support-repository.js';
import { supportEmbeddingService } from '#app/services/support/support-embedding-service.js';
import { supportLlmService } from '#app/services/support/support-llm-service.js';
import { supportQueryTranslationService } from '#app/services/support/support-query-translation-service.js';
import { broadcastService } from '#app/services/communication/broadcast-service.js';
import { llmUsageService } from '#app/services/ai/usage/llm-usage-service.js';
import { promptService } from '#app/services/ai/prompt-service.js';
import { Result } from 'better-result';
import logger from '#logger';
import { type AppResult } from '#app/services/shared/errors.js';
import { tryInternal } from '#app/services/shared/result-helpers.js';

export interface SupportChatHistoryItem {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    screenshots: string[] | null;
    createdAt: string;
}

function broadcastToConnection(
    userIdStr: string,
    targetUuid: string | undefined,
    event: string,
    payload: Record<string, unknown>,
): void {
    if (targetUuid !== undefined) {
        const sent = broadcastService.broadcastMessageToUserConnection(userIdStr, targetUuid, event, payload);
        if (sent === 0) {
            broadcastService.broadcastMessageToUser(userIdStr, event, payload);
        }
    } else {
        broadcastService.broadcastMessageToUser(userIdStr, event, payload);
    }
}

function extractScreenshotIds(text: string): string[] {
    const ids: string[] = [];
    const regex = /\[screenshot:(\d+)\]/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
        if (match[1] !== undefined) {
            ids.push(match[1]);
        }
    }
    return ids;
}

function formatKnowledgeContext(results: Awaited<ReturnType<typeof supportEmbeddingService.search>>): string {
    if (results.length === 0) {
        return 'No relevant articles found in the knowledge base.';
    }
    return results
        .map((r, i) => {
            const screenshotNote = r.screenshotKey !== null
                ? `\n[This article has a screenshot. Use [screenshot:${String(r.id)}] to show it if relevant.]`
                : '';
            return `--- Article ${i + 1} (id: ${String(r.id)}) ---\nTitle: ${r.title}\n${r.content}${screenshotNote}`;
        })
        .join('\n\n');
}

export const supportService = {
    async getChatHistory(userId: bigint): Promise<AppResult<{ data: SupportChatHistoryItem[] }>> {
        const result = await tryInternal(
            () => supportRepository.findChatHistory(userId),
            'Failed to load chat history',
        );
        if (Result.isError(result)) {
          return Result.err(result.error);
        }

        return Result.ok({
            data: result.value.map((m) => ({
                id: String(m.id),
                role: m.role,
                content: m.content,
                screenshots: (m.screenshots as string[] | null) ?? null,
                createdAt: m.createdAt.toISOString(),
            })),
        });
    },

    async deleteChatHistory(userId: bigint): Promise<AppResult<void>> {
        const result = await tryInternal(
            () => supportRepository.deleteAllChatHistory(userId),
            'Failed to delete chat history',
        );
        if (Result.isError(result)) {
          return Result.err(result.error);
        }

        return Result.ok(undefined);
    },

    async openChat(
        userId: bigint,
        targetUuid?: string,
    ): Promise<void> {
        const userIdStr = String(userId);
        try {
            const langNative = 'ru';
            const existing = await supportRepository.findChatHistory(userId, 1);
            if (existing.length > 0) {
                return;
            }

            const promptId = promptService.get('SUPPORT_FIRST_CHAT')?.id ?? null;

            let fullReply = '';
            for await (const token of supportLlmService.openChatStream(
                langNative,
                (usage, model, finalPrompt) => {
                    llmUsageService.recordText({
                        userId,
                        llmSystemPromptId: promptId,
                        model,
                        feature: 'SUPPORT_CHAT',
                        finalPrompt,
                        promptTokens: usage.promptTokens,
                        completionTokens: usage.completionTokens,
                        totalTokens: usage.totalTokens,
                    });
                },
            )) {
                fullReply += token;
                broadcastToConnection(userIdStr, targetUuid, 'support_chat_token', { token });
            }

            if (fullReply.length > 0) {
                await supportRepository.addChatMessage(userId, 'assistant', fullReply);
            }

            broadcastToConnection(userIdStr, targetUuid, 'support_chat_complete', {
                content: fullReply,
                screenshots: [],
            });
        } catch (err) {
            logger.error({ err, userId: userIdStr }, 'Support: openChat failed');
            broadcastToConnection(userIdStr, targetUuid, 'support_chat_error', {
                message: 'Failed to open support chat',
            });
        }
    },

    async chat(
        userId: bigint,
        message: string,
        targetUuid?: string,
    ): Promise<void> {
        const userIdStr = String(userId);
        try {
            const langNative = 'ru';
            await supportRepository.addChatMessage(userId, 'user', message);

            const [englishQuery, chatHistory] = await Promise.all([
                supportQueryTranslationService.translateToEnglish(message),
                supportRepository.findChatHistory(userId, 20),
            ]);

            const searchResults = await supportEmbeddingService.search(englishQuery, 5);
            const knowledgeContext = formatKnowledgeContext(searchResults);
            const promptId = promptService.get('SUPPORT_SYSTEM')?.id ?? null;

            let fullReply = '';
            for await (const token of supportLlmService.chatStream(
                message,
                knowledgeContext,
                chatHistory.filter((m) => m.role !== 'user' || m.content !== message),
                langNative,
                (usage, model, finalPrompt) => {
                    llmUsageService.recordText({
                        userId,
                        llmSystemPromptId: promptId,
                        model,
                        feature: 'SUPPORT_CHAT',
                        finalPrompt,
                        promptTokens: usage.promptTokens,
                        completionTokens: usage.completionTokens,
                        totalTokens: usage.totalTokens,
                    });
                },
            )) {
                fullReply += token;
                broadcastToConnection(userIdStr, targetUuid, 'support_chat_token', { token });
            }

            const screenshotIds = extractScreenshotIds(fullReply);

            await supportRepository.addChatMessage(
                userId,
                'assistant',
                fullReply,
                screenshotIds,
            );

            broadcastToConnection(userIdStr, targetUuid, 'support_chat_complete', {
                content: fullReply,
                screenshots: screenshotIds,
            });
        } catch (err) {
            logger.error({ err, userId: userIdStr }, 'Support: chat failed');
            broadcastToConnection(userIdStr, targetUuid, 'support_chat_error', {
                message: 'Chat failed',
            });
        }
    },
};
