import { promptRepository } from '#app/repositories/index.js'
import type { PromptRow, PromptType, PromptUpdate } from '#app/repositories/index.js'
import logger from '#logger'
import aiConfig from '#config/ai.js'

export type { PromptType, PromptUpdate }

const cache = new Map<PromptType, PromptRow>()
let loadedAt = 0
let refreshing: Promise<void> | null = null
// update() bumps writeSeq: a load() that started before a local update must not
// overwrite the fresh row with the one it read earlier.
let writeSeq = 0
const writtenAt = new Map<PromptType, number>()

// Reads stay synchronous: a stale cache answers with what it has and refreshes in
// the background, so another instance's update shows up within PROMPT_CACHE_TTL_MS
// (code-issues item 43). One refresh at a time; a failed one keeps the old values.
function cached(type: PromptType): PromptRow | undefined {
    if (refreshing === null && Date.now() - loadedAt >= aiConfig.promptCacheTtlMs) {
        refreshing = promptService
            .load()
            .catch((err: unknown) => {
                logger.warn({ err }, 'PromptService: refresh failed, keeping cached prompts')
            })
            .finally(() => {
                refreshing = null
            })
    }
    return cache.get(type)
}

export const promptService = {
    async load(): Promise<void> {
        const startSeq = writeSeq
        const rows = await promptRepository.findAll()
        const next = new Map<PromptType, PromptRow>()
        for (const row of rows) {
            next.set(row.type, row)
        }
        for (const [type, seq] of writtenAt) {
            const fresh = cache.get(type)
            if (seq > startSeq && fresh !== undefined) next.set(type, fresh)
        }
        cache.clear()
        for (const [type, row] of next) {
            cache.set(type, row)
        }
        loadedAt = Date.now()
        logger.info(`PromptService: loaded ${String(rows.length)} prompts`)
    },

    get(type: PromptType): PromptRow | undefined {
        return cached(type)
    },

    getContent(type: PromptType): string {
        return cached(type)?.content ?? ''
    },

    getModel(type: PromptType): string | null {
        return cached(type)?.model ?? null
    },

    getTemperature(type: PromptType): number | null {
        return cached(type)?.temperature ?? null
    },

    getMaxTokens(type: PromptType): number | null {
        return cached(type)?.maxTokens ?? null
    },

    async update(type: PromptType, data: PromptUpdate): Promise<boolean> {
        const ok = await promptRepository.update(type, data)
        if (ok) {
            const updated = await promptRepository.findByType(type)
            if (updated !== undefined) {
                cache.set(type, updated)
                writeSeq++
                writtenAt.set(type, writeSeq)
            }
        }
        return ok
    },

    all(): PromptRow[] {
        return [...cache.values()]
    },
}
