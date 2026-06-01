import type { ToolCallHandler } from '#app/services/actions/types.js';

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export type TextUsageCompleteHandler = (
  usage: TokenUsage,
  model: string,
  finalPrompt: string,
) => void;

export interface TextStreamOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  modelOverride?: string | undefined;
  /**
   * Optional tool-calling handler. When provided, the adapter will pass tools
   * to the LLM and invoke onCall() for each tool call made by the model.
   * Adapters that do not support tool calling must silently ignore this field.
   */
  toolCallHandler?: ToolCallHandler;
}

export interface ITextAdapter {
  isConfigured(): boolean;
  get model(): string;
  streamText(
    opts: TextStreamOptions,
    onComplete?: TextUsageCompleteHandler,
  ): AsyncGenerator<string, string, undefined>;
}

export function buildFinalTextPrompt(opts: TextStreamOptions): string {
  return [`[system]`, opts.systemPrompt, ``, `[user]`, opts.userPrompt].join("\n");
}
