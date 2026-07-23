import "server-only";

/**
 * GPT Image adapter — OpenAI's image model for the DESIGN lane (promos,
 * flyers, ads with real typography/layout). Photo lanes stay on Gemini
 * (nano-banana.ts); this engine is only selected for Director-approved
 * text-on-image prompts, and only when OPENAI_API_KEY is configured.
 *
 * Same result contract as generateNanoBananaImage so the generate route and
 * everything downstream (quality gate, previews, publish) stay engine-blind.
 */

export const GPT_IMAGE_MODEL = "gpt-image-2";

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

export function gptImageErrorMessage(data: GptImageResponse, fallback = "Image generation failed"): string {
  if (data.error && typeof data.error === "object" && data.error.message) {
    return data.error.message;
  }
  return fallback;
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
        // "high" is slow (can approach a minute) — reserve it for the Pro tier.
        quality: opts.quality === "pro" ? "high" : "medium",
        output_format: "jpeg",
      }),
      // Route maxDuration is 60s — leave headroom for response handling.
      signal: AbortSignal.timeout(55_000),
    });
  } catch {
    return { ok: false, status: 502, error: "Could not reach the design image service." };
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

  return {
    ok: true,
    imageDataUrl: `data:image/jpeg;base64,${b64}`,
    rawBase64: b64,
    mimeType: "image/jpeg",
    text: "",
    model: GPT_IMAGE_MODEL,
  };
}
