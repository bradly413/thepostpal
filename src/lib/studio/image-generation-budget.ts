/**
 * One coordinated wall-clock budget for Studio image generation.
 *
 * High-quality GPT Image renders can run beyond two minutes in production.
 * Standard keeps a tighter latency cap; High gets additional headroom while
 * preserving enough time for Posterboy Visual and a clean JSON response.
 */
export const STUDIO_IMAGE_ROUTE_BUDGET_MS = 292_000;
export const STUDIO_GPT_DRAFT_PROVIDER_TIMEOUT_MS = 75_000;
export const STUDIO_GPT_STANDARD_PROVIDER_TIMEOUT_MS = 125_000;
export const STUDIO_GPT_HIGH_PROVIDER_TIMEOUT_MS = 190_000;
export const STUDIO_GEMINI_FALLBACK_RESERVE_MS = 90_000;
export const STUDIO_GEMINI_PROVIDER_TIMEOUT_MS = 85_000;

/**
 * The browser signal must outlive the 300s function plus durable image
 * delivery and response parsing.
 */
export const STUDIO_IMAGE_CLIENT_TIMEOUT_MS = 315_000;
export const STUDIO_IMAGE_WATCHDOG_MS = 325_000;
