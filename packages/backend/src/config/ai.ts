import { env } from "node:process";

const aiConfig = Object.freeze({
  drivers: {
    text: env["AI_TEXT_DRIVER"] ?? "openai",
  },
  providers: {
    openai: {
      apiKey: env["OPENAI_API_KEY"] ?? "",
      chatModel: env["OPENAI_CHAT_MODEL"] ?? "gpt-5.4-mini",
      chatApiUrl: env["OPENAI_CHAT_API_URL"] ?? "https://api.openai.com/v1/chat/completions",
    },
    xai: {
      apiKey: env["XAI_API_KEY"] ?? "",
      chatModel: env["XAI_CHAT_MODEL"] ?? "grok-4.3",
    },
    mistralai: {
      apiKey: env["MISTRAL_API_KEY"] ?? "",
      textModel: env["MISTRAL_TEXT_MODEL"] ?? "mistral-medium-latest",
    },
  },
  openaiEmbedding: {
    apiKey: env["OPENAI_API_KEY"] ?? "",
    model: env["OPENAI_EMBEDDING_MODEL"] ?? "text-embedding-3-small",
    dimensions: Number(env["OPENAI_EMBEDDING_DIMENSIONS"] ?? 1536),
  },
});

export default aiConfig;
