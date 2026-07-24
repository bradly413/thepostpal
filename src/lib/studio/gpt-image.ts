import "server-only";

import {
  buildResponsesInput,
  loadImageBytesForEdit,
  type OpenAiInputImagePart,
  type OpenAiVisionDetail,
} from "@/lib/studio/openai-vision-input";

/**
 * GPT Image adapter — OpenAI gpt-image-2 for Studio generation.
 *
 * Primary: Responses API + image_generation tool (gpt-5.6 orchestrator, multimodal
 * input_image support, generate + edit). Fallback: Images API generations/edits.
 *
 * Listing-photo edits stay on Gemini in the generate route.
 */

export const GPT_IMAGE_MODEL = "gpt-image-2";

/** Orchestrator for Responses API — world-knowledge + vision routing. */
export const GPT_RESPONSES_MODEL =
  process.env.OPENAI_RESPONSES_MODEL?.trim() || "gpt-4.1-mini";

export type GptImageAction = "auto" | "generate" | "edit";

export function gptImageConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

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
  content?: Array<{ type?: string; text?: string }>;
};

type ResponsesApiResponse = {
  output?: ResponsesOutputItem[];
  output_text?: string;
  error?: { message?: string } | null;
};

export function gptImageErrorMessage(data: GptImageResponse, fallback = "Image generation failed"): string {
  if (data.error && typeof data.error === "object" && data.error.message) {
    return data.error.message;
  }
  return fallback;
}

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

type GptRunResult =
  | { ok: true; imageDataUrl: string; rawBase64: string; mimeType: string; text: string; model: string }
  | { ok: false; status: number; error: string; text?: string };

/** Orchestrator fallbacks when gpt-5.6 is unavailable on the account. */
export function gptOrchestratorModels(): string[] {
  const env = process.env.OPENAI_RESPONSES_MODEL?.trim();
  const chain = [env, "gpt-5.6", "gpt-4.1-mini", "gpt-4.1"].filter(
    (m): m is string => typeof m === "string" && m.length > 0,
  );
  return [...new Set(chain)];
}

export function isRetryableResponsesError(status: number, message: string): boolean {
  if (status === 404 || status === 429) return true;
  if (status !== 400 && status !== 422) return false;
  return /model|tool_choice|does not support|not found|invalid/i.test(message);
}

async function callResponsesOnce(opts: {
  apiKey: string;
  prompt: string;
  aspectRatio?: string;
  quality: "standard" | "pro";
  visionImages?: OpenAiInputImagePart[];
  action?: GptImageAction;
  forceImageTool?: boolean;
  model: string;
}): Promise<GptRunResult> {
  const action = opts.action ?? (opts.visionImages?.length ? "auto" : "generate");
  const input = buildResponsesInput(opts.prompt, opts.visionImages ?? []);
  const body: Record<string, unknown> = {
    model: opts.model,
    input,
    tools: [
      {
        type: "image_generation",
        action,
        model: GPT_IMAGE_MODEL,
        size: gptImageSizeForAspect(opts.aspectRatio),
        quality: opts.quality === "pro" ? "high" : "medium",
        output_format: "jpeg",
      },
    ],
  };
  if (opts.forceImageTool) {
    body.tool_choice = { type: "image_generation" };
  }

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${opts.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(55_000),
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
    const hint =
      typeof data.output_text === "string" && data.output_text.trim()
        ? data.output_text.trim().slice(0, 200)
        : undefined;
    return {
      ok: false,
      status: 422,
      error: "No image was generated. Try a different prompt.",
      ...(hint ? { text: hint } : {}),
    };
  }

  return okResult(b64);
}

async function generateGptImageViaResponses(opts: {
  apiKey: string;
  prompt: string;
  aspectRatio?: string;
  quality: "standard" | "pro";
  visionImages?: OpenAiInputImagePart[];
  action?: GptImageAction;
  forceImageTool?: boolean;
  maxAttempts?: number;
}): Promise<GptRunResult> {
  const models = gptOrchestratorModels().slice(0, 2);
  const toolAttempts = opts.forceImageTool ? [true, false] : [false];
  let last: GptRunResult = { ok: false, status: 502, error: "Image generation failed" };
  let attempts = 0;
  /** Stay under /api/generate-image maxDuration so Gemini fallback can still run. */
  const maxAttempts = opts.maxAttempts ?? 2;

  for (const model of models) {
    for (const forceImageTool of toolAttempts) {
      if (attempts >= maxAttempts) break;
      attempts += 1;
      const result = await callResponsesOnce({ ...opts, model, forceImageTool });
      if (result.ok) return result;
      last = result;
      if (!isRetryableResponsesError(result.status, result.error)) return result;
    }
  }

  return last;
}

async function generateGptImageViaImagesApi(opts: {
  apiKey: string;
  prompt: string;
  aspectRatio?: string;
  quality: "standard" | "pro";
}): Promise<GptRunResult> {
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
      signal: AbortSignal.timeout(55_000),
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

async function editGptImageViaImagesApi(opts: {
  apiKey: string;
  prompt: string;
  aspectRatio?: string;
  quality: "standard" | "pro";
  imageSource: string;
}): Promise<GptRunResult> {
  const bytes = await loadImageBytesForEdit(opts.imageSource);
  if (!bytes) {
    return { ok: false, status: 422, error: "Could not read the reference image for editing." };
  }

  const form = new FormData();
  form.append("model", GPT_IMAGE_MODEL);
  form.append("prompt", opts.prompt);
  form.append("n", "1");
  form.append("size", gptImageSizeForAspect(opts.aspectRatio));
  form.append("quality", opts.quality === "pro" ? "high" : "medium");
  form.append("output_format", "jpeg");
  form.append("image", new Blob([new Uint8Array(bytes)], { type: "image/jpeg" }), "reference.jpg");

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${opts.apiKey}` },
      body: form,
      signal: AbortSignal.timeout(55_000),
    });
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === "TimeoutError";
    return {
      ok: false,
      status: timedOut ? 504 : 502,
      error: timedOut ? "Image edit timed out. Try again." : "Could not reach the image edit service.",
    };
  }

  let data: GptImageResponse;
  try {
    data = (await res.json()) as GptImageResponse;
  } catch {
    return {
      ok: false,
      status: res.status || 502,
      error: res.ok ? "Invalid edit response." : "Image edit failed",
    };
  }

  if (!res.ok) {
    return { ok: false, status: res.status, error: gptImageErrorMessage(data, "Image edit failed") };
  }

  const b64 = data.data?.[0]?.b64_json;
  if (!b64) {
    return { ok: false, status: 422, error: "No edited image was returned." };
  }

  return okResult(b64);
}

export async function generateGptImage(opts: {
  apiKey: string;
  prompt: string;
  aspectRatio?: string;
  quality: "standard" | "pro";
  /** Multimodal reference / inspiration images (Responses input_image). */
  visionImages?: OpenAiInputImagePart[];
  visionDetail?: OpenAiVisionDetail;
  /** generate | edit | auto — edit when refining an on-canvas image. */
  action?: GptImageAction;
  /** Force the image_generation tool (product ads, design lane). */
  forceImageTool?: boolean;
  /** Images API edit fallback source (https / data URL). */
  editImageSource?: string | null;
  /**
   * Product-ad fast path: call gpt-image-2 directly (matches OpenAI playground)
   * instead of Responses orchestrator — one hop, leaves budget for Gemini fallback.
   */
  preferDirectImagesApi?: boolean;
}): Promise<GptRunResult> {
  if (opts.preferDirectImagesApi && opts.action !== "edit") {
    const direct = await generateGptImageViaImagesApi({
      apiKey: opts.apiKey,
      prompt: opts.prompt,
      aspectRatio: opts.aspectRatio,
      quality: opts.quality,
    });
    if (direct.ok) return direct;
    // Timed out — skip Responses so Gemini fallback still has room on Vercel.
    if (direct.status === 504) return direct;
    const viaResponses = await generateGptImageViaResponses({
      apiKey: opts.apiKey,
      prompt: opts.prompt,
      aspectRatio: opts.aspectRatio,
      quality: opts.quality,
      visionImages: opts.visionImages,
      action: opts.action,
      forceImageTool: opts.forceImageTool,
      maxAttempts: 1,
    });
    if (viaResponses.ok) return viaResponses;
    return direct;
  }

  const viaResponses = await generateGptImageViaResponses({
    apiKey: opts.apiKey,
    prompt: opts.prompt,
    aspectRatio: opts.aspectRatio,
    quality: opts.quality,
    visionImages: opts.visionImages,
    action: opts.action,
    forceImageTool: opts.forceImageTool,
    maxAttempts: opts.forceImageTool ? 1 : 2,
  });
  if (viaResponses.ok) return viaResponses;

  if (opts.action === "edit" && opts.editImageSource) {
    const viaEdit = await editGptImageViaImagesApi({
      apiKey: opts.apiKey,
      prompt: opts.prompt,
      aspectRatio: opts.aspectRatio,
      quality: opts.quality,
      imageSource: opts.editImageSource,
    });
    if (viaEdit.ok) return viaEdit;
  }

  if (opts.action === "generate" || !opts.visionImages?.length) {
    // Skip a second 45s Images API hop after Responses already timed out — leave
    // budget for the server-side Gemini fallback instead of dying on Vercel's wall.
    if (viaResponses.status !== 504) {
      const viaImages = await generateGptImageViaImagesApi({
        apiKey: opts.apiKey,
        prompt: opts.prompt,
        aspectRatio: opts.aspectRatio,
        quality: opts.quality,
      });
      if (viaImages.ok) return viaImages;
    }
  }

  return viaResponses;
}
