import { streamText, tool, jsonSchema, stepCountIs } from 'ai'
import type { ToolSet } from 'ai'
import { createXai } from '@ai-sdk/xai'
import aiConfig from '#config/ai.js'
import { aiRequestSignal } from '#app/services/ai/ai-request-signal.js'
import { buildFinalTextPrompt } from '#app/services/ai/types.js'
import type {
    ITextAdapter,
    TextStreamOptions,
    TextUsageCompleteHandler,
} from '#app/services/ai/types.js'
import logger from '#logger'

const cfg = aiConfig.providers.xai
const xaiProvider = createXai(cfg.apiKey === '' ? {} : { apiKey: cfg.apiKey })

export const xaiTextAdapter: ITextAdapter = {
    isConfigured(): boolean {
        return cfg.apiKey !== ''
    },

    get model(): string {
        return cfg.chatModel
    },

    async *streamText(
        opts: TextStreamOptions,
        onComplete?: TextUsageCompleteHandler,
    ): AsyncGenerator<string, string, undefined> {
        const modelName = opts.modelOverride ?? cfg.chatModel
        const finalPrompt = buildFinalTextPrompt(opts)

        const toolCallHandler = opts.toolCallHandler
        const hasTools =
            toolCallHandler !== undefined && Object.keys(toolCallHandler.tools).length > 0

        // Build tools with execute() delegates when toolCallHandler is provided
        const wrappedTools: ToolSet | undefined = hasTools
            ? Object.fromEntries(
                  Object.entries(toolCallHandler.tools).map(
                      ([name, def]): [string, ToolSet[string]] => [
                          name,
                          tool({
                              description: def.description,
                              inputSchema: jsonSchema(def.parametersSchema),
                              execute: async (args: unknown): Promise<string> =>
                                  toolCallHandler.onCall(name, args),
                          }),
                      ],
                  ),
              )
            : undefined

        const streamParams = {
            // @ai-sdk/xai 5 dropped the Chat Completions model (`.chat()`); xAI is now
            // reached through its Responses API.
            model: xaiProvider.responses(modelName),
            system: opts.systemPrompt,
            prompt: opts.userPrompt,
            temperature: opts.temperature ?? 0.3,
            maxOutputTokens: opts.maxOutputTokens ?? 2000,
            // step 1 = LLM text + tool call, step 2 = tool execution, step 3 = LLM continuation
            stopWhen: hasTools ? stepCountIs(3) : stepCountIs(1),
            abortSignal: aiRequestSignal(opts.signal),
            ...(wrappedTools !== undefined ? { tools: wrappedTools } : {}),
        }
        const result = streamText(streamParams)

        if (wrappedTools !== undefined) {
            logger.info({ tools: Object.keys(wrappedTools) }, 'XAI adapter: streaming with tools')
        }

        let fullText = ''
        for await (const part of result.stream) {
            if (part.type === 'text-delta') {
                fullText += part.text
                yield part.text
            } else {
                // Log every non-text part type for diagnostics
                logger.info({ partType: part.type }, 'XAI adapter: stream part')
            }
        }

        logger.info({ fullTextLength: fullText.length, hasTools }, 'XAI adapter: stream complete')

        if (onComplete !== undefined) {
            try {
                const usage = await result.usage
                // Unknown counts stay NULL instead of becoming 0.
                const promptTokens = usage.inputTokens ?? null
                const completionTokens = usage.outputTokens ?? null
                onComplete(
                    {
                        promptTokens,
                        completionTokens,
                        totalTokens:
                            promptTokens !== null && completionTokens !== null
                                ? promptTokens + completionTokens
                                : null,
                    },
                    modelName,
                    finalPrompt,
                )
            } catch {
                // ignore usage tracking errors
            }
        }

        return fullText
    },
}
