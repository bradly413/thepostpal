/**
 * One coordinated wall-clock budget for Studio image generation.
 *
 * OpenAI documents that complex GPT Image requests can take up to two minutes,
 * so the primary provider must be allowed to run beyond the old 55s cutoff.
 * The remaining time is reserved for Posterboy Visual and a clean JSON response.
 */
export const STUDIO_IMAGE_ROUTE_BUDGET_MS = 232_000;
export const STUDIO_GPT_PROVIDER_TIMEOUT_MS = 125_000;
export const STUDIO_GEMINI_FALLBACK_RESERVE_MS = 90_000;
export const STUDIO_GEMINI_PROVIDER_TIMEOUT_MS = 85_000;

/** Client abort follows the route deadline; the watchdog follows the client. */
export const STUDIO_IMAGE_CLIENT_TIMEOUT_MS = 238_000;
export const STUDIO_IMAGE_WATCHDOG_MS = 245_000;
