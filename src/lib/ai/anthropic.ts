import { createAnthropic } from "@ai-sdk/anthropic";

// Shared Anthropic provider.
//
// Some environments (notably the Claude Code CLI) export ANTHROPIC_BASE_URL
// WITHOUT the `/v1` suffix. The AI SDK uses that value verbatim and appends
// `/messages`, producing `https://api.anthropic.com/messages` → 404 on every
// call. Normalize the base URL so it always targets `/v1`; when the env var is
// unset we let the SDK use its own (correct) default.
const raw = process.env.ANTHROPIC_BASE_URL?.replace(/\/+$/, "");
const baseURL = raw ? (/\/v1$/.test(raw) ? raw : `${raw}/v1`) : undefined;

export const anthropic = createAnthropic(baseURL ? { baseURL } : {});
