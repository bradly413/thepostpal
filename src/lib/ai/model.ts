import "server-only";

import { anthropic } from "@/lib/ai/anthropic";

/**
 * Posterboy language models.
 *
 * Default: direct Anthropic via `@ai-sdk/anthropic` + `ANTHROPIC_API_KEY`
 * (current production path).
 *
 * Opt-in AI Gateway: set `AI_GATEWAY_API_KEY` or `POSTERBOY_USE_AI_GATEWAY=true`
 * (Vercel OIDC also works when Gateway is enabled on the project).
 */
export type PosterboyModelId = "sonnet" | "haiku";

const GATEWAY_MODELS: Record<PosterboyModelId, string> = {
  sonnet: "anthropic/claude-sonnet-4.6",
  haiku: "anthropic/claude-haiku-4.5",
};

const DIRECT_MODELS: Record<PosterboyModelId, string> = {
  sonnet: "claude-sonnet-4-6",
  haiku: "claude-haiku-4-5",
};

export function useAiGateway(): boolean {
  return (
    process.env.POSTERBOY_USE_AI_GATEWAY === "true" ||
    Boolean(process.env.AI_GATEWAY_API_KEY?.trim())
  );
}

/** AI SDK `model` accepts a LanguageModel or a Gateway `provider/model` string. */
export function getLanguageModel(id: PosterboyModelId = "sonnet") {
  if (useAiGateway()) {
    return GATEWAY_MODELS[id];
  }
  return anthropic(DIRECT_MODELS[id]);
}

export function aiTelemetry(
  functionId: string,
  metadata?: Record<string, string | number | boolean | undefined>,
) {
  return {
    isEnabled: true,
    functionId,
    metadata: Object.fromEntries(
      Object.entries(metadata ?? {}).filter(([, v]) => v !== undefined),
    ) as Record<string, string | number | boolean>,
  };
}
