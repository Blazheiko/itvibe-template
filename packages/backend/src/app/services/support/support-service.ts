import { supportRepository } from '#app/repositories/index.js'
import { supportEmbeddingService } from '#app/services/support/support-embedding-service.js'
import { supportLlmService } from '#app/services/support/support-llm-service.js'
import { aiAbortKind } from '#app/services/ai/ai-request-signal.js'
import supportConfig from '#config/support.js'
import { isAppLocaleCode } from 'shared/enums'
import { supportQueryTranslationService } from '#app/services/support/support-query-translation-service.js'
import { broadcastService } from '#app/services/communication/broadcast-service.js'
import { llmUsageService } from '#app/services/ai/usage/llm-usage-service.js'
import { promptService } from '#app/services/ai/prompt-service.js'
import { Result } from 'better-result'
import type { BroadcastEventName, BroadcastPayload } from 'shared/schemas'
import logger from '#logger'
import { type AppResult } from '#app/services/shared/errors.js'
import { tryInternal } from '#app/services/shared/result-helpers.js'
import { userNotificationService } from '#app/services/notifications/user-notification-service.js'

export interface SupportChatHistoryItem {
    id: string
    role: 'user' | 'assistant'
    content: string
    screenshots: string[] | null
    createdAt: string
}

// The UI locale the client sent, mapped to an app locale; otherwise the configured
// default (code-issues item 52 — it used to be a hard-coded 'ru').
export function resolveSupportLanguage(language: string | undefined): string {
    if (language !== undefined) {
        const base = language.trim().toLowerCase().split(/[-_]/)[0] ?? ''
        if (isAppLocaleCode(base)) return base
    }
    return supportConfig.defaultLanguage
}

function broadcastToConnection<E extends BroadcastEventName>(
    userIdStr: string,
    targetUuid: string | undefined,
    event: E,
    payload: BroadcastPayload<E>,
): void {
    if (targetUuid !== undefined) {
        const sent = broadcastService.broadcastMessageToUserConnection(
            userIdStr,
            targetUuid,
            event,
            payload,
        )
        if (sent === 0) {
            broadcastService.broadcastMessageToUser(userIdStr, event, payload)
        }
    } else {
        broadcastService.broadcastMessageToUser(userIdStr, event, payload)
    }
}

function extractScreenshotIds(text: string): string[] {
    const ids: string[] = []
    const regex = /\[screenshot:(\d+)\]/g
    let match: RegExpExecArray | null
    while ((match = regex.exec(text)) !== null) {
        if (match[1] !== undefined) {
            ids.push(match[1])
        }
    }
    return ids
}

function formatKnowledgeContext(
    results: Awaited<ReturnType<typeof supportEmbeddingService.search>>,
): string {
    if (results.length === 0) {
        return 'No relevant articles found in the knowledge base.'
    }
    return results
        .map((r, i) => {
            const screenshotNote =
                r.screenshotKey !== null
                    ? `\n[This article has a screenshot. Use [screenshot:${String(r.id)}] to show it if relevant.]`
                    : ''
            return `--- Article ${String(i + 1)} (id: ${String(r.id)}) ---\nTitle: ${r.title}\n${r.content}${screenshotNote}`
        })
        .join('\n\n')
}

export const supportService = {
    async getChatHistory(userId: bigint): Promise<AppResult<{ data: SupportChatHistoryItem[] }>> {
        const result = await tryInternal(
            () => supportRepository.findChatHistory(userId),
            'Failed to load chat history',
        )
        if (Result.isError(result)) {
            return Result.err(result.error)
        }

        return Result.ok({
            data: result.value.map((m) => ({
                id: String(m.id),
                role: m.role,
                content: m.content,
                screenshots: (m.screenshots as string[] | null) ?? null,
                createdAt: m.createdAt.toISOString(),
            })),
        })
    },

    async deleteChatHistory(userId: bigint): Promise<AppResult<void>> {
        const result = await tryInternal(
            () => supportRepository.deleteAllChatHistory(userId),
            'Failed to delete chat history',
        )
        if (Result.isError(result)) {
            return Result.err(result.error)
        }

        return Result.ok(undefined)
    },

    async openChat(
        userId: bigint,
        targetUuid?: string,
        signal?: AbortSignal,
        language?: string,
    ): Promise<void> {
        const userIdStr = String(userId)
        try {
            const langNative = resolveSupportLanguage(language)
            const existing = await supportRepository.findChatHistory(userId, 1)
            if (existing.length > 0) {
                return
            }

            const promptId = promptService.get('SUPPORT_FIRST_CHAT')?.id ?? null

            let fullReply = ''
            for await (const token of supportLlmService.openChatStream(
                langNative,
                llmUsageService.textUsageRecorder('SUPPORT_CHAT', userId, promptId),
                signal,
            )) {
                fullReply += token
                broadcastToConnection(userIdStr, targetUuid, 'support_chat_token', { token })
            }

            if (fullReply.length > 0) {
                await supportRepository.addChatMessage(userId, 'assistant', fullReply)
            }

            broadcastToConnection(userIdStr, targetUuid, 'support_chat_complete', {
                content: fullReply,
                screenshots: [],
            })
        } catch (err) {
            if (aiAbortKind(err) === 'aborted') {
                // The connection closed: nobody to answer, and not a failure.
                logger.info({ userId: userIdStr }, 'Support: openChat cancelled, connection closed')
                return
            }
            logger.error({ err, userId: userIdStr }, 'Support: openChat failed')
            broadcastToConnection(userIdStr, targetUuid, 'support_chat_error', {
                message: 'Failed to open support chat',
            })
        }
    },

    async chat(
        userId: bigint,
        message: string,
        targetUuid?: string,
        signal?: AbortSignal,
        language?: string,
    ): Promise<void> {
        const userIdStr = String(userId)
        try {
            const langNative = resolveSupportLanguage(language)
            await supportRepository.addChatMessage(userId, 'user', message)

            const [englishQuery, chatHistory] = await Promise.all([
                supportQueryTranslationService.translateToEnglish(message, {
                    userId,
                    ...(signal !== undefined ? { signal } : {}),
                }),
                supportRepository.findChatHistory(userId, 20),
            ])

            const searchResults = await supportEmbeddingService.search(englishQuery, 5, {
                userId,
                ...(signal !== undefined ? { signal } : {}),
            })
            const knowledgeContext = formatKnowledgeContext(searchResults)
            const promptId = promptService.get('SUPPORT_SYSTEM')?.id ?? null

            let fullReply = ''
            for await (const token of supportLlmService.chatStream(
                message,
                knowledgeContext,
                chatHistory.filter((m) => m.role !== 'user' || m.content !== message),
                langNative,
                llmUsageService.textUsageRecorder('SUPPORT_CHAT', userId, promptId),
                signal,
            )) {
                fullReply += token
                broadcastToConnection(userIdStr, targetUuid, 'support_chat_token', { token })
            }

            const screenshotIds = extractScreenshotIds(fullReply)

            await supportRepository.addChatMessage(userId, 'assistant', fullReply, screenshotIds)
            userNotificationService.supportReply(userId)

            broadcastToConnection(userIdStr, targetUuid, 'support_chat_complete', {
                content: fullReply,
                screenshots: screenshotIds,
            })
        } catch (err) {
            if (aiAbortKind(err) === 'aborted') {
                logger.info({ userId: userIdStr }, 'Support: chat cancelled, connection closed')
                return
            }
            logger.error({ err, userId: userIdStr }, 'Support: chat failed')
            broadcastToConnection(userIdStr, targetUuid, 'support_chat_error', {
                message: 'Chat failed',
            })
        }
    },
}
