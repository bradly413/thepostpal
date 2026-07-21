import "server-only";

import { randomUUID } from "crypto";
import { isS3Configured, uploadToS3 } from "@/lib/storage";

/** Veo 3.1 Fast — best latency for Studio social clips. */
export const VEO_MODEL = "veo-3.1-fast-generate-preview";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

export type VeoAspectRatio = "16:9" | "9:16";
export type VeoResolution = "720p" | "1080p" | "4k";

export type VeoTaskStatus = "submitted" | "processing" | "succeed" | "failed";

export type VeoTask = {
  taskId: string;
  status: VeoTaskStatus;
  videoUrl?: string;
  error?: string;
};

export function veoConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error("GEMINI_API_KEY not configured");
  return key;
}

/** Parse data URL or return null (caller may pass a remote URL separately). */
export function parseDataImage(image: string): { mimeType: string; data: string } | null {
  const m = image.trim().match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (!m) return null;
  return { mimeType: m[1].toLowerCase(), data: m[2] };
}

export function buildVeoPredictBody(opts: {
  prompt: string;
  /** Raw base64 + mime, or omit for text-to-video. */
  inlineImage?: { mimeType: string; data: string } | null;
  aspectRatio?: VeoAspectRatio;
  resolution?: VeoResolution;
}): Record<string, unknown> {
  const instance: Record<string, unknown> = {
    prompt: opts.prompt.slice(0, 1024),
  };
  if (opts.inlineImage?.data) {
    instance.image = {
      inlineData: {
        mimeType: opts.inlineImage.mimeType || "image/jpeg",
        data: opts.inlineImage.data,
      },
    };
  }
  const parameters: Record<string, unknown> = {
    aspectRatio: opts.aspectRatio === "9:16" ? "9:16" : "16:9",
    resolution: opts.resolution || "720p",
    // 8s required for many Veo modes; matches Studio social clips.
    durationSeconds: 8,
  };
  return { instances: [instance], parameters };
}

export function parseVeoOperation(data: {
  name?: string;
  done?: boolean;
  error?: { message?: string };
  response?: {
    generateVideoResponse?: {
      generatedSamples?: Array<{ video?: { uri?: string } }>;
    };
  };
}): {
  done: boolean;
  videoUri?: string;
  error?: string;
} {
  if (data.error?.message) {
    return { done: true, error: data.error.message };
  }
  if (!data.done) {
    return { done: false };
  }
  const uri = data.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
  if (!uri) {
    return { done: true, error: "Video finished but no file was returned." };
  }
  return { done: true, videoUri: uri };
}

/** Start a long-running Veo job. Returns the operation name (taskId). */
export async function startVeoVideo(opts: {
  prompt: string;
  /** data: URL or https URL of a still frame (optional for text-to-video). */
  image?: string | null;
  aspectRatio?: VeoAspectRatio;
  resolution?: VeoResolution;
}): Promise<string> {
  const key = apiKey();
  let inlineImage: { mimeType: string; data: string } | null = null;

  if (opts.image?.trim()) {
    const fromData = parseDataImage(opts.image);
    if (fromData) {
      inlineImage = fromData;
    } else if (/^https?:\/\//i.test(opts.image)) {
      inlineImage = await fetchImageAsInline(opts.image);
    } else {
      throw new Error("Image must be a data URL or https URL");
    }
  }

  const body = buildVeoPredictBody({
    prompt: opts.prompt,
    inlineImage,
    aspectRatio: opts.aspectRatio,
    resolution: opts.resolution,
  });

  const res = await fetch(`${GEMINI_BASE}/models/${VEO_MODEL}:predictLongRunning`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": key,
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({}))) as {
    name?: string;
    error?: { message?: string };
  };

  if (!res.ok || !data.name) {
    throw new Error(data.error?.message || `Veo start failed (${res.status})`);
  }
  return data.name;
}

async function fetchImageAsInline(
  url: string,
): Promise<{ mimeType: string; data: string }> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error("Could not load the reference image for video.");
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 12 * 1024 * 1024) {
    throw new Error("Reference image is too large for video generation.");
  }
  const mimeType = res.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  return { mimeType, data: buf.toString("base64") };
}

/** Poll a Veo operation. Does not download the file. */
export async function getVeoOperation(operationName: string): Promise<{
  done: boolean;
  videoUri?: string;
  error?: string;
}> {
  const key = apiKey();
  const path = operationName.startsWith("operations/")
    ? operationName
    : operationName.includes("/")
      ? operationName
      : `operations/${operationName}`;

  const res = await fetch(`${GEMINI_BASE}/${path}`, {
    headers: { "x-goog-api-key": key },
  });
  const data = (await res.json().catch(() => ({}))) as Parameters<typeof parseVeoOperation>[0] & {
    error?: { message?: string };
  };
  if (!res.ok) {
    return {
      done: true,
      error: data.error?.message || `Veo poll failed (${res.status})`,
    };
  }
  return parseVeoOperation(data);
}

/**
 * Download a Veo-hosted video URI (needs API key) and store on S3 for a durable URL.
 * Falls back to returning the Google URI if S3 is not configured (expires in ~2 days).
 */
export async function materializeVeoVideoUrl(videoUri: string): Promise<string> {
  const key = apiKey();
  const res = await fetch(videoUri, {
    headers: { "x-goog-api-key": key },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`Could not download generated video (${res.status})`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.length) throw new Error("Downloaded video was empty");

  if (!isS3Configured()) {
    // Last resort — URI works for ~2 days for the tenant to download.
    return videoUri;
  }

  const { url } = await uploadToS3({
    key: `studio/veo/${randomUUID()}.mp4`,
    body: buf,
    contentType: "video/mp4",
  });
  return url;
}

/** Avoid re-downloading/uploading on every successful poll. */
const materializedCache = new Map<string, string>();

/** Full poll helper used by the API route. */
export async function getVeoTask(taskId: string): Promise<VeoTask> {
  const cached = materializedCache.get(taskId);
  if (cached) {
    return { taskId, status: "succeed", videoUrl: cached };
  }

  const op = await getVeoOperation(taskId);
  if (!op.done) {
    return { taskId, status: "processing" };
  }
  if (op.error || !op.videoUri) {
    return { taskId, status: "failed", error: op.error || "Video generation failed" };
  }
  try {
    const videoUrl = await materializeVeoVideoUrl(op.videoUri);
    materializedCache.set(taskId, videoUrl);
    return { taskId, status: "succeed", videoUrl };
  } catch (err) {
    return {
      taskId,
      status: "failed",
      error: err instanceof Error ? err.message : "Could not save the video",
    };
  }
}
