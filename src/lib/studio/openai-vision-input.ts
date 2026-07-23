import "server-only";

import { loadVisionJpegBase64 } from "@/lib/studio/vision-image-input";
import { assertUrlAllowed, safeFetch, readCappedBuffer } from "@/lib/safe-fetch";

/** Matches OpenAI Responses API vision detail levels. */
export type OpenAiVisionDetail = "low" | "high" | "original" | "auto";

export type OpenAiInputImagePart =
  | { type: "input_image"; image_url: string; detail?: OpenAiVisionDetail }
  | { type: "input_image"; file_id: string; detail?: OpenAiVisionDetail };

const MAX_VISION_IMAGES = 4;
const MAX_FILE_BYTES = 8 * 1024 * 1024;

/** Dedupe while preserving order. */
export function uniqueHttpsUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const u = raw.trim();
    if (!u || seen.has(u)) continue;
    if (!/^https:\/\//i.test(u) && !u.startsWith("data:image/")) continue;
    seen.add(u);
    out.push(u);
    if (out.length >= MAX_VISION_IMAGES) break;
  }
  return out;
}

/** Build multimodal Responses `input` — plain string when no images. */
export function buildResponsesInput(
  prompt: string,
  images: OpenAiInputImagePart[],
): string | Array<{ role: "user"; content: Array<{ type: "input_text"; text: string } | OpenAiInputImagePart> }> {
  const text = prompt.trim();
  if (!images.length) return text;
  return [
    {
      role: "user",
      content: [{ type: "input_text", text }, ...images],
    },
  ];
}

async function uploadVisionFile(apiKey: string, jpegBase64: string): Promise<string | null> {
  try {
    const buf = Buffer.from(jpegBase64, "base64");
    if (buf.length === 0 || buf.length > MAX_FILE_BYTES) return null;
    const form = new FormData();
    form.append("purpose", "vision");
    form.append("file", new Blob([new Uint8Array(buf)], { type: "image/jpeg" }), "vision-input.jpg");
    const res = await fetch("https://api.openai.com/v1/files", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(30_000),
    });
    const data = (await res.json()) as { id?: string; error?: { message?: string } };
    if (!res.ok || !data.id) return null;
    return data.id;
  } catch {
    return null;
  }
}

/**
 * Resolve Studio image sources (https URLs, data URLs, local paths) into
 * OpenAI `input_image` parts. Prefers direct URL/base64; uploads via Files
 * API when we had to fetch and re-encode.
 */
export async function resolveOpenAiVisionInputs(opts: {
  apiKey: string;
  sources: string[];
  detail?: OpenAiVisionDetail;
  preferFileId?: boolean;
}): Promise<OpenAiInputImagePart[]> {
  const detail = opts.detail ?? "auto";
  const parts: OpenAiInputImagePart[] = [];

  for (const source of uniqueHttpsUrls(opts.sources)) {
    if (parts.length >= MAX_VISION_IMAGES) break;

    if (source.startsWith("data:image/")) {
      parts.push({ type: "input_image", image_url: source, detail });
      continue;
    }

    if (/^https:\/\//i.test(source)) {
      try {
        await assertUrlAllowed(source);
      } catch {
        continue;
      }
      if (!opts.preferFileId) {
        parts.push({ type: "input_image", image_url: source, detail });
        continue;
      }
    }

    const b64 = await loadVisionJpegBase64(source);
    if (!b64) continue;

    const fileId = await uploadVisionFile(opts.apiKey, b64);
    if (fileId) {
      parts.push({ type: "input_image", file_id: fileId, detail });
    } else {
      parts.push({
        type: "input_image",
        image_url: `data:image/jpeg;base64,${b64}`,
        detail,
      });
    }
  }

  return parts;
}

/** Optional vision-only analysis turn (Responses API, no image_generation tool). */
export async function analyzeImageViaResponses(opts: {
  apiKey: string;
  prompt: string;
  images: OpenAiInputImagePart[];
  model?: string;
}): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const model = opts.model?.trim() || process.env.OPENAI_RESPONSES_MODEL?.trim() || "gpt-5.6";
  const input = buildResponsesInput(opts.prompt, opts.images);
  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${opts.apiKey}`,
      },
      body: JSON.stringify({ model, input }),
      signal: AbortSignal.timeout(45_000),
    });
    const data = (await res.json()) as {
      output_text?: string;
      output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
      error?: { message?: string };
    };
    if (!res.ok) {
      return {
        ok: false,
        error: data.error?.message || "Vision analysis failed",
      };
    }
    if (typeof data.output_text === "string" && data.output_text.trim()) {
      return { ok: true, text: data.output_text.trim() };
    }
    for (const item of data.output ?? []) {
      if (item.type !== "message") continue;
      for (const block of item.content ?? []) {
        if (block.type === "output_text" && block.text?.trim()) {
          return { ok: true, text: block.text.trim() };
        }
      }
    }
    return { ok: false, error: "No analysis text returned" };
  } catch {
    return { ok: false, error: "Vision analysis unreachable" };
  }
}

/** Fetch remote image bytes for Images API edit fallback. */
export async function loadImageBytesForEdit(source: string): Promise<Buffer | null> {
  if (source.startsWith("data:image/")) {
    const match = source.match(/^data:(.+?);base64,([A-Za-z0-9+/=\s]+)$/);
    if (!match) return null;
    const buf = Buffer.from(match[2].replace(/\s/g, ""), "base64");
    return buf.length > 0 && buf.length <= MAX_FILE_BYTES ? buf : null;
  }
  if (/^https:\/\//i.test(source)) {
    try {
      await assertUrlAllowed(source);
      const res = await safeFetch(
        source,
        { headers: { Accept: "image/*,*/*;q=0.8" } },
        { timeoutMs: 12_000, maxBytes: MAX_FILE_BYTES },
      );
      if (!res.ok) return null;
      return readCappedBuffer(res, MAX_FILE_BYTES);
    } catch {
      return null;
    }
  }
  const b64 = await loadVisionJpegBase64(source);
  return b64 ? Buffer.from(b64, "base64") : null;
}
