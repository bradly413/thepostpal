import "server-only";

import { SignJWT } from "jose";

/**
 * Kling AI video generation (official API).
 *
 * Auth: a short-lived JWT (HS256) signed with the Secret Key; iss = Access Key.
 * Image-to-video is async: create a task, then poll until it succeeds.
 *
 * Env: KLING_ACCESS_KEY + KLING_SECRET_KEY (prod may name the access half
 * `posterboy_kling` — we fall back to it). KLING_API_BASE overrides the host.
 */

const BASE = process.env.KLING_API_BASE?.replace(/\/+$/, "") || "https://api-singapore.klingai.com";

export function klingConfigured(): boolean {
  return Boolean((process.env.KLING_ACCESS_KEY || process.env.posterboy_kling) && process.env.KLING_SECRET_KEY);
}

async function klingToken(): Promise<string> {
  const accessKey = process.env.KLING_ACCESS_KEY || process.env.posterboy_kling || "";
  const secretKey = process.env.KLING_SECRET_KEY || "";
  if (!accessKey || !secretKey) throw new Error("Kling keys not configured");
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(accessKey)
    .setExpirationTime(now + 1800)
    .setNotBefore(now - 5)
    .sign(new TextEncoder().encode(secretKey));
}

/** Strip a data: URL prefix — Kling's `image` field wants raw base64 (or a URL). */
function toKlingImage(image: string): string {
  const m = image.match(/^data:[^;]+;base64,(.+)$/);
  return m ? m[1] : image;
}

export interface KlingTask {
  taskId: string;
  status: "submitted" | "processing" | "succeed" | "failed";
  videoUrl?: string;
  error?: string;
}

function mapStatus(s: string): KlingTask["status"] {
  if (s === "succeed") return "succeed";
  if (s === "failed") return "failed";
  if (s === "processing") return "processing";
  return "submitted";
}

/** Create an image-to-video task. Returns the Kling task id. */
export async function createVideoTask(opts: {
  image: string;
  prompt?: string;
  durationSeconds?: 5 | 10;
}): Promise<string> {
  const token = await klingToken();
  const res = await fetch(`${BASE}/v1/videos/image2video`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      model_name: "kling-v2-master",
      image: toKlingImage(opts.image),
      prompt: opts.prompt?.slice(0, 2400) || undefined,
      negative_prompt: "text, watermark, logo, distorted, warped, morphing, extra limbs, flicker",
      mode: "pro",
      duration: String(opts.durationSeconds ?? 5),
      cfg_scale: 0.5,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.code !== 0 || !data?.data?.task_id) {
    const msg = String(data?.message || `Kling create failed (${res.status})`);
    if (/balance/i.test(msg)) throw new Error("KLING_NO_BALANCE");
    throw new Error(msg);
  }
  return data.data.task_id as string;
}

/** Poll a task's status; includes the video URL once it succeeds. */
export async function getVideoTask(taskId: string): Promise<KlingTask> {
  const token = await klingToken();
  const res = await fetch(`${BASE}/v1/videos/image2video/${encodeURIComponent(taskId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.code !== 0) {
    throw new Error(data?.message || `Kling poll failed (${res.status})`);
  }
  const status = mapStatus(data.data?.task_status);
  return {
    taskId,
    status,
    videoUrl: data.data?.task_result?.videos?.[0]?.url,
    error: status === "failed" ? data.data?.task_status_msg : undefined,
  };
}
