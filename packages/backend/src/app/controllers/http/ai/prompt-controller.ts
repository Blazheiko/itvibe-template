import type { HttpContext } from '#vendor/types/types.js';
import { mapControllerError } from '#app/controllers/shared/controller-error.js';
import { getTypedPayload } from '#vendor/utils/validation/get-typed-payload.js';
import { promptService } from '#app/services/ai/prompt-service.js';
import type { PromptType, PromptUpdate } from '#app/repositories/ai/prompt-repository.js';
import { textAdapter } from '#app/services/ai/ai-provider.js';
import aiConfig from '#config/ai.js';
import logger from '#logger';
import {
    badRequest,
    internalMessage,
    notFound,
} from '#app/services/shared/errors.js';
import type { PromptTestInput, PromptUpdateInput } from 'shared/schemas';
import type {
    PromptGetListResponse,
    PromptGetByTypeResponse,
    PromptUpdateResponse,
    PromptTestResponse,
} from 'shared';

const PROMPT_TYPES: PromptType[] = [
    'SUPPORT_SYSTEM',
    'SUPPORT_FIRST_CHAT',
    'SUPPORT_QUERY_TRANSLATION',
];

function isPromptType(value: string): value is PromptType {
    return (PROMPT_TYPES as string[]).includes(value);
}

interface MinimalFetchResponse {
    ok: boolean;
    status: number;
    text: () => Promise<string>;
    json: () => Promise<unknown>;
}

async function callLlm(systemPrompt: string, userPrompt: string): Promise<string> {
    if (textAdapter.isConfigured()) {
        try {
            const gen = textAdapter.streamText({
                systemPrompt,
                userPrompt,
                temperature: 0.5,
                maxOutputTokens: 2000,
            });
            let result = '';
            for await (const chunk of gen) {
                result += chunk;
            }
            return result;
        } catch (error) {
            logger.warn({ err: error }, 'LLM prompt test failed, falling back to OpenAI');
        }
    }

    const openaiKey = aiConfig.providers.openai.apiKey;
    if (openaiKey === '') {
        throw new Error('No AI API key configured (OPENAI_API_KEY)');
    }

    const response = (await fetch(aiConfig.providers.openai.chatApiUrl, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: aiConfig.providers.openai.chatModel,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            stream: false,
            temperature: 0.5,
            max_completion_tokens: 2000,
        }),
    })) as unknown as MinimalFetchResponse;

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI error ${String(response.status)}: ${errorText.slice(0, 200)}`);
    }

    const json = await response.json();
    if (typeof json !== 'object' || json === null) throw new Error('Invalid response');
    const choices = (json as Record<string, unknown>)['choices'];
    if (!Array.isArray(choices) || choices.length === 0) throw new Error('No choices');
    const message = (choices[0] as Record<string, unknown>)['message'];
    if (typeof message !== 'object' || message === null) throw new Error('No message');
    const content = (message as Record<string, unknown>)['content'];
    return typeof content === 'string' ? content : '';
}

export default {
    list(_context: HttpContext): PromptGetListResponse {
        return { status: 'success', data: promptService.all().filter((prompt) => isPromptType(prompt.type)) };
    },

    getByType(context: HttpContext): PromptGetByTypeResponse {
        const { type } = context.httpData.params as { type: string };
        if (!isPromptType(type)) {
            return mapControllerError(
                context,
                badRequest(`Unknown prompt type: ${type}`),
            );
        }
        const prompt = promptService.get(type);
        if (prompt === undefined) {
            return mapControllerError(context, notFound('Prompt', 'Prompt not found'));
        }
        return { status: 'success', data: prompt };
    },

    async testPrompt(context: HttpContext<PromptTestInput>): Promise<PromptTestResponse> {
        const { type } = context.httpData.params as { type: string };
        if (!isPromptType(type)) {
            return mapControllerError(
                context,
                badRequest(`Unknown prompt type: ${type}`),
            );
        }

        const prompt = promptService.get(type);
        if (prompt === undefined) {
            return mapControllerError(context, notFound('Prompt', 'Prompt not found'));
        }

        const { message } = getTypedPayload(context);

        try {
            const result = await callLlm(prompt.content, message);
            return { status: 'success', result };
        } catch (error) {
            logger.error({ err: error }, 'Prompt test LLM call failed');
            return mapControllerError(context, internalMessage('LLM call failed'));
        }
    },

    async update(context: HttpContext<PromptUpdateInput>): Promise<PromptUpdateResponse> {
        const { type } = context.httpData.params as { type: string };
        if (!isPromptType(type)) {
            return mapControllerError(
                context,
                badRequest(`Unknown prompt type: ${type}`),
            );
        }

        const payload = getTypedPayload(context);
        const updateData: PromptUpdate = {};

        if (payload.content !== undefined) updateData.content = payload.content;
        if ('model' in payload) updateData.model = payload.model ?? null;
        if ('temperature' in payload) updateData.temperature = payload.temperature ?? null;
        if ('maxTokens' in payload) updateData.maxTokens = payload.maxTokens ?? null;

        if (Object.keys(updateData).length === 0) {
            return mapControllerError(context, badRequest('Nothing to update'));
        }

        const ok = await promptService.update(type, updateData);
        if (!ok) {
            return mapControllerError(
                context,
                notFound('Prompt', 'Prompt not found or not updated'),
            );
        }
        return { status: 'success' };
    },
};
