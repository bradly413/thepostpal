/**
 * Nano Banana = Gemini native image models.
 * @see https://ai.google.dev/gemini-api/docs/image-generation
 */

export const NANO_BANANA_MODELS = {
  /** Nano Banana 2 — versatile workhorse (Flash in Studio). */
  standard: "gemini-3.1-flash-image",
  /** Nano Banana Pro — premium creative control (Pro in Studio). */
  pro: "gemini-3-pro-image",
} as const;

export type NanoBananaQuality = keyof typeof NANO_BANANA_MODELS;

export type NanoBananaImageSize = "1K" | "2K" | "4K";

type InteractionImageBlock = {
  type?: string;
  data?: string;
  text?: string;
  mime_type?: string;
  mimeType?: string;
};

type InteractionStep = {
  type?: string;
  content?: InteractionImageBlock[];
  summary?: InteractionImageBlock[];
};

export type InteractionsResponse = {
  output_image?: InteractionImageBlock | null;
  steps?: InteractionStep[];
  error?: { message?: string; status?: string; code?: number } | string;
  message?: string;
};

/** Pull the final image out of an Interactions REST payload (no SDK convenience props). */
export function extractImageFromInteraction(data: InteractionsResponse): {
  data: string;
  mimeType: string;
  text: string;
} | null {
  // SDK convenience property — present in some clients, absent from raw REST.
  const fromConvenience = data.output_image;
  if (fromConvenience?.data) {
    return {
      data: fromConvenience.data,
      mimeType: fromConvenience.mime_type || fromConvenience.mimeType || "image/jpeg",
      text: "",
    };
  }

  let text = "";
  let image: { data: string; mimeType: string } | null = null;

  // Prefer the last image in order. Interim "thought" images (if any) come
  // first; the final model_output image overwrites them.
  for (const step of data.steps ?? []) {
    const blocks =
      step.type === "thought"
        ? (step.summary ?? step.content ?? [])
        : (step.content ?? step.summary ?? []);
    for (const block of blocks ?? []) {
      if (block.type === "text" && typeof block.text === "string") {
        text += block.text;
      }
      if (block.type === "image" && typeof block.data === "string" && block.data.length > 0) {
        image = {
          data: block.data,
          mimeType: block.mime_type || block.mimeType || "image/jpeg",
        };
      }
    }
  }
  if (!image) return null;
  return { ...image, text };
}

export function interactionsErrorMessage(data: InteractionsResponse, fallback = "Image generation failed"): string {
  if (typeof data.error === "string" && data.error.trim()) return data.error;
  if (data.error && typeof data.error === "object" && data.error.message) {
    return data.error.message;
  }
  if (typeof data.message === "string" && data.message.trim()) return data.message;
  return fallback;
}

/**
 * Generate / edit an image via the Gemini Interactions API.
 * Prefer this over legacy generateContent for Gemini 3 image models.
 */
export async function generateNanoBananaImage(opts: {
  apiKey: string;
  quality: NanoBananaQuality;
  prompt: string;
  aspectRatio?: string;
  imageSize?: NanoBananaImageSize | null;
  /** Optional reference image (edit / listing). */
  reference?: { mimeType: string; data: string } | null;
  /** When GPT already ran, cap Gemini so the route stays under maxDuration. */
  timeoutMs?: number;
}): Promise<
  | { ok: true; imageDataUrl: string; rawBase64: string; mimeType: string; text: string; model: string }
  | { ok: false; status: number; error: string; text?: string }
> {
  const model = NANO_BANANA_MODELS[opts.quality];
  const input: Array<Record<string, string>> = [];

  if (opts.reference?.data) {
    input.push({
      type: "image",
      mime_type: opts.reference.mimeType || "image/jpeg",
      data: opts.reference.data,
    });
  }
  input.push({ type: "text", text: opts.prompt });

  const responseFormat: Record<string, string> = {
    type: "image",
    // Interactions image outputs currently accept JPEG only (PNG → 400).
    mime_type: "image/jpeg",
  };
  if (opts.aspectRatio) responseFormat.aspect_ratio = opts.aspectRatio;
  if (opts.imageSize) responseFormat.image_size = opts.imageSize;

  let res: Response;
  try {
    res = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": opts.apiKey,
      },
      body: JSON.stringify({
        model,
        input,
        response_format: responseFormat,
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 85_000),
    });
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === "TimeoutError";
    return {
      ok: false,
      status: timedOut ? 504 : 502,
      error: timedOut ? "Image generation timed out. Try again or switch to Standard quality." : "Could not reach image generation service.",
    };
  }

  let data: InteractionsResponse;
  try {
    data = (await res.json()) as InteractionsResponse;
  } catch {
    return {
      ok: false,
      status: res.status || 502,
      error: res.ok ? "Invalid response from image generation." : "Image generation failed",
    };
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: interactionsErrorMessage(data),
    };
  }

  const extracted = extractImageFromInteraction(data);
  if (!extracted) {
    return {
      ok: false,
      status: 422,
      error: "No image was generated. Try a different prompt.",
    };
  }

  return {
    ok: true,
    imageDataUrl: `data:${extracted.mimeType};base64,${extracted.data}`,
    rawBase64: extracted.data,
    mimeType: extracted.mimeType,
    text: extracted.text,
    model,
  };
}
