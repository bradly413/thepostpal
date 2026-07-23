import "server-only";

/**
 * GPT Image adapter — OpenAI gpt-image-2 for Studio generation.
 *
 * Primary path: Responses API + image_generation tool (world-knowledge aware
 * orchestrator → gpt-image-2). Fallback: Images API /v1/images/generations.
 *
 * Reference-photo edits stay on Gemini (nano-banana.ts). Same result contract
 * as generateNanoBananaImage so the generate route stays engine-blind.
 */

export const GPT_IMAGE_MODEL = "gpt-image-2";

/** Orchestrator for Responses API image_generation tool calls. Override via env. */
export const GPT_RESPONSES_MODEL =
  process.env.OPENAI_RESPONSES_MODEL?.trim() || "gpt-4.1-mini";

export function gptImageConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

/**
 * Map Studio aspect ratios to the model's supported sizes. The client
 * cover-crops to exact platform dimensions afterwards (resizeToExact), so
 * nearest-shape is all we need.
 */
export function gptImageSizeForAspect(aspectRatio: string | undefined): string {
  switch ((aspectRatio || "1:1").trim()) {
    case "16:9":
    case "3:2":
    case "5:4":
    case "21:9":
      return "1536x1024";
    case "9:16":
    case "4:5":
    case "2:3":
    case "3:4":
      return "1024x1536";
    default:
      return "1024x1024";
  }
}

type GptImageResponse = {
  data?: Array<{ b64_json?: string }>;
  error?: { message?: string; type?: string } | null;
};

type ResponsesOutputItem = {
  type?: string;
  result?: string;
  status?: string;
};

type ResponsesApiResponse = {
  output?: ResponsesOutputItem[];
  error?: { message?: string } | null;
};

export function gptImageErrorMessage(data: GptImageResponse, fallback = "Image generation failed"): string {
  if (data.error && typeof data.error === "object" && data.error.message) {
    return data.error.message;
  }
  return fallback;
}

/** Pull base64 JPEG from a completed Responses API image_generation_call. */
export function extractImageFromResponsesResponse(data: ResponsesApiResponse): string | null {
  const items = data.output ?? [];
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    if (
      item?.type === "image_generation_call" &&
      item.status === "completed" &&
      typeof item.result === "string" &&
      item.result.length > 0
    ) {
      return item.result;
    }
  }
  return null;
}

function okResult(b64: string) {
  return {
    ok: true as const,
    imageDataUrl: `data:image/jpeg;base64,${b64}`,
    rawBase64: b64,
    mimeType: "image/jpeg",
    text: "",
    model: GPT_IMAGE_MODEL,
  };
}

async function generateGptImageViaResponses(opts: {
  apiKey: string;
  prompt: string;
  aspectRatio?: string;
  quality: "standard" | "pro";
}): Promise<
  | { ok: true; imageDataUrl: string; rawBase64: string; mimeType: string; text: string; model: string }
  | { ok: false; status: number; error: string; text?: string }
> {
  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${opts.apiKey}`,
      },
      body: JSON.stringify({
        model: GPT_RESPONSES_MODEL,
        input: opts.prompt,
        tools: [
          {
            type: "image_generation",
            action: "generate",
            model: GPT_IMAGE_MODEL,
            size: gptImageSizeForAspect(opts.aspectRatio),
            quality: opts.quality === "pro" ? "high" : "medium",
            output_format: "jpeg",
          },
        ],
      }),
      signal: AbortSignal.timeout(85_000),
    });
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === "TimeoutError";
    return {
      ok: false,
      status: timedOut ? 504 : 502,
      error: timedOut
        ? "Image generation timed out. Try again or switch to Standard quality."
        : "Could not reach the design image service.",
    };
  }

  let data: ResponsesApiResponse;
  try {
    data = (await res.json()) as ResponsesApiResponse;
  } catch {
    return {
      ok: false,
      status: res.status || 502,
      error: res.ok ? "Invalid response from image generation." : "Image generation failed",
    };
  }

  if (!res.ok) {
    const msg =
      (data.error && typeof data.error === "object" && data.error.message) ||
      "Image generation failed";
    return { ok: false, status: res.status, error: msg };
  }

  const b64 = extractImageFromResponsesResponse(data);
  if (!b64) {
    return { ok: false, status: 422, error: "No image was generated. Try a different prompt." };
  }

  return okResult(b64);
}

async function generateGptImageViaImagesApi(opts: {
  apiKey: string;
  prompt: string;
  aspectRatio?: string;
  quality: "standard" | "pro";
}): Promise<
  | { ok: true; imageDataUrl: string; rawBase64: string; mimeType: string; text: string; model: string }
  | { ok: false; status: number; error: string; text?: string }
> {
  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${opts.apiKey}`,
      },
      body: JSON.stringify({
        model: GPT_IMAGE_MODEL,
        prompt: opts.prompt,
        n: 1,
        size: gptImageSizeForAspect(opts.aspectRatio),
        quality: opts.quality === "pro" ? "high" : "medium",
        output_format: "jpeg",
      }),
      signal: AbortSignal.timeout(85_000),
    });
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === "TimeoutError";
    return {
      ok: false,
      status: timedOut ? 504 : 502,
      error: timedOut
        ? "Image generation timed out. Try again or switch to Standard quality."
        : "Could not reach the design image service.",
    };
  }

  let data: GptImageResponse;
  try {
    data = (await res.json()) as GptImageResponse;
  } catch {
    return {
      ok: false,
      status: res.status || 502,
      error: res.ok ? "Invalid response from image generation." : "Image generation failed",
    };
  }

  if (!res.ok) {
    return { ok: false, status: res.status, error: gptImageErrorMessage(data) };
  }

  const b64 = data.data?.[0]?.b64_json;
  if (!b64) {
    return { ok: false, status: 422, error: "No image was generated. Try a different prompt." };
  }

  return okResult(b64);
}

export async function generateGptImage(opts: {
  apiKey: string;
  prompt: string;
  aspectRatio?: string;
  /** Studio quality tier → model quality. */
  quality: "standard" | "pro";
}): Promise<
  | { ok: true; imageDataUrl: string; rawBase64: string; mimeType: string; text: string; model: string }
  | { ok: false; status: number; error: string; text?: string }
> {
  const viaResponses = await generateGptImageViaResponses(opts);
  if (viaResponses.ok) return viaResponses;
  // Legacy Images API fallback when Responses is unavailable or misconfigured.
  return generateGptImageViaImagesApi(opts);
}
