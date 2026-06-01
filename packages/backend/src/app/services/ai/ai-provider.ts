import aiConfig from "#config/ai.js";
import { openaiTextAdapter } from "#app/services/ai/adapters/openai-text-adapter.js";
import { xaiTextAdapter } from "#app/services/ai/adapters/xai-text-adapter.js";
import { mistralaiTextAdapter } from "#app/services/ai/adapters/mistralai-text-adapter.js";
import type { ITextAdapter } from "#app/services/ai/types.js";

function createTextAdapter(): ITextAdapter {
  if (aiConfig.drivers.text === "openai") {
    return openaiTextAdapter;
  }
  if (aiConfig.drivers.text === "xai") {
    return xaiTextAdapter;
  }
  return mistralaiTextAdapter;
}

export const textAdapter: ITextAdapter = createTextAdapter();

/**
 * Returns the appropriate text adapter based on model name from llm_system_prompts.
 * If model is null/undefined/empty — returns the default adapter.
 * If model contains "grok" — returns xai adapter.
 * If model contains "mistral" — returns mistral adapter.
 * If model contains "gpt" or "openai" — returns OpenAI adapter.
 * Provider-prefixed names such as "openai/gpt-4o" are supported by this rule.
 * Otherwise — returns the default adapter.
 */
export function getTextAdapterForModel(model: string | null | undefined): ITextAdapter {
  if (model === null || model === undefined || model.trim() === "") {
    return textAdapter;
  }
  const lower = model.toLowerCase();
  if (lower.includes("grok")) {
    return xaiTextAdapter;
  }
  if (lower.includes("mistral")) {
    return mistralaiTextAdapter;
  }
  if (lower.includes("gpt") || lower.includes("openai")) {
    return openaiTextAdapter;
  }
  return textAdapter;
}
