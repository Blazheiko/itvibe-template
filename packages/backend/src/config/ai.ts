import { env } from 'node:process'

export const AI_TEXT_DRIVERS = ['openai', 'xai', 'mistral'] as const
export type AiTextDriver = (typeof AI_TEXT_DRIVERS)[number]

const errors: string[] = []

// An unknown driver used to fall back to Mistral silently (code-issues item 50).
const readTextDriver = (): AiTextDriver => {
    const raw = (env['AI_TEXT_DRIVER'] ?? '').trim()
    if (raw === '') return 'openai'
    if ((AI_TEXT_DRIVERS as readonly string[]).includes(raw)) return raw as AiTextDriver
    errors.push(`AI_TEXT_DRIVER must be one of ${AI_TEXT_DRIVERS.join(', ')}, got "${raw}"`)
    return 'openai'
}

// Upper bound for one provider call (code-issues item 51).
const readTimeoutMs = (): number => {
    const raw = env['AI_REQUEST_TIMEOUT_MS']
    if (raw === undefined || raw.trim() === '') return 60_000
    const value = Number(raw.trim())
    if (!/^\d+$/.test(raw.trim()) || !Number.isSafeInteger(value) || value < 1000) {
        errors.push(`AI_REQUEST_TIMEOUT_MS must be an integer >= 1000, got "${raw}"`)
        return 60_000
    }
    return value
}

const aiConfig = Object.freeze({
    drivers: {
        text: readTextDriver(),
    },
    requestTimeoutMs: readTimeoutMs(),
    providers: {
        openai: {
            apiKey: env['OPENAI_API_KEY'] ?? '',
            chatModel: env['OPENAI_CHAT_MODEL'] ?? 'gpt-5.4-mini',
            chatApiUrl: env['OPENAI_CHAT_API_URL'] ?? 'https://api.openai.com/v1/chat/completions',
        },
        xai: {
            apiKey: env['XAI_API_KEY'] ?? '',
            chatModel: env['XAI_CHAT_MODEL'] ?? 'grok-4.3',
        },
        mistralai: {
            apiKey: env['MISTRAL_API_KEY'] ?? '',
            textModel: env['MISTRAL_TEXT_MODEL'] ?? 'mistral-medium-latest',
        },
    },
    openaiEmbedding: {
        apiKey: env['OPENAI_API_KEY'] ?? '',
        model: env['OPENAI_EMBEDDING_MODEL'] ?? 'text-embedding-3-small',
        dimensions: Number(env['OPENAI_EMBEDDING_DIMENSIONS'] ?? 1536),
    },
    configError: errors.length > 0 ? errors.join('; ') : null,
})

export default aiConfig
