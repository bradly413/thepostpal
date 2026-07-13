import "server-only";

import type { ScheduledPost, ScheduledPostMediaType, SocialPlatform } from "@prisma/client";

const GRAPH_API_VERSION = "v25.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export type MetaApiErrorCode =
  | "TOKEN_EXPIRED"
  | "RATE_LIMIT"
  | "PERMISSION_DENIED"
  | "VALIDATION"
  | "GRAPH_API";

export class MetaApiError extends Error {
  readonly name = "MetaApiError";

  constructor(
    message: string,
    readonly code: MetaApiErrorCode,
    readonly httpStatus: number,
    readonly fbError?: {
      message: string;
      type?: string;
      code?: number;
      error_subcode?: number;
      fbtrace_id?: string;
    },
  ) {
    super(message);
  }

  toLogString(): string {
    const parts = [`[${this.code}]`, this.message];
    if (this.fbError?.code != null) {
      parts.push(`(fb:${this.fbError.code})`);
    }
    if (this.fbError?.fbtrace_id) {
      parts.push(`trace:${this.fbError.fbtrace_id}`);
    }
    return parts.join(" ");
  }
}

interface MetaGraphErrorBody {
  error?: {
    message: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

function classifyMetaError(
  httpStatus: number,
  fb?: MetaGraphErrorBody["error"],
): MetaApiErrorCode {
  const fbCode = fb?.code;
  if (fbCode === 190 || fbCode === 102) return "TOKEN_EXPIRED";
  if (fbCode === 4 || fbCode === 17 || fbCode === 613 || httpStatus === 429) {
    return "RATE_LIMIT";
  }
  if (fbCode === 10 || fbCode === 200 || fbCode === 294) return "PERMISSION_DENIED";
  if (httpStatus >= 400 && httpStatus < 500) return "VALIDATION";
  return "GRAPH_API";
}

async function parseMetaResponse(res: Response, context: string): Promise<unknown> {
  const text = await res.text();
  let body: MetaGraphErrorBody | null = null;
  try {
    body = text ? (JSON.parse(text) as MetaGraphErrorBody) : null;
  } catch {
    body = null;
  }

  if (!res.ok) {
    const fb = body?.error;
    const code = classifyMetaError(res.status, fb);
    throw new MetaApiError(
      fb?.message || `${context}: HTTP ${res.status}`,
      code,
      res.status,
      fb,
    );
  }

  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new MetaApiError(`${context}: invalid JSON response`, "GRAPH_API", res.status);
  }
}

async function graphPost(path: string, body: Record<string, unknown>): Promise<unknown> {
  try {
    const res = await fetch(`${GRAPH_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await parseMetaResponse(res, path);
  } catch (error) {
    if (error instanceof MetaApiError) throw error;
    const message = error instanceof Error ? error.message : "Network error";
    throw new MetaApiError(message, "GRAPH_API", 0);
  }
}

async function graphGet(path: string, params: Record<string, string>): Promise<unknown> {
  const qs = new URLSearchParams(params).toString();
  try {
    const res = await fetch(`${GRAPH_BASE}${path}?${qs}`, { method: "GET" });
    return await parseMetaResponse(res, path);
  } catch (error) {
    if (error instanceof MetaApiError) throw error;
    const message = error instanceof Error ? error.message : "Network error";
    throw new MetaApiError(message, "GRAPH_API", 0);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface MetaPublishTarget {
  pageId: string;
  igAccountId: string | null;
}

export interface MetaPublishResult {
  facebook?: unknown;
  instagram?: unknown;
}

function inferMediaType(
  mediaUrl: string | null | undefined,
  explicit: ScheduledPostMediaType | null | undefined,
): ScheduledPostMediaType | null {
  if (explicit) return explicit;
  if (!mediaUrl) return null;
  const lower = mediaUrl.split("?")[0].toLowerCase();
  if (/\.(mp4|mov|webm|m4v)(\?|$)/.test(lower)) return "video";
  if (/\.(jpe?g|png|gif|webp|heic)(\?|$)/.test(lower)) return "image";
  return "image";
}

function wantsFacebook(platforms: SocialPlatform[]): boolean {
  return platforms.includes("facebook");
}

function wantsInstagram(platforms: SocialPlatform[]): boolean {
  return platforms.includes("instagram");
}

async function publishFacebookPost(
  pageId: string,
  pageToken: string,
  options: { message: string; mediaUrl?: string | null; mediaType: ScheduledPostMediaType | null },
): Promise<unknown> {
  const { message, mediaUrl, mediaType } = options;

  if (mediaUrl && mediaType === "video") {
    return graphPost(`/${pageId}/videos`, {
      file_url: mediaUrl,
      description: message,
      access_token: pageToken,
    });
  }

  if (mediaUrl) {
    return graphPost(`/${pageId}/photos`, {
      url: mediaUrl,
      caption: message,
      access_token: pageToken,
    });
  }

  return graphPost(`/${pageId}/feed`, {
    message,
    access_token: pageToken,
  });
}

async function publishInstagramPost(
  igAccountId: string,
  pageToken: string,
  options: { caption: string; mediaUrl?: string | null; mediaType: ScheduledPostMediaType | null },
): Promise<unknown> {
  const { caption, mediaUrl, mediaType } = options;

  if (!mediaUrl) {
    throw new MetaApiError(
      "Instagram requires an image or video URL",
      "VALIDATION",
      400,
    );
  }

  const containerBody: Record<string, unknown> = {
    caption,
    access_token: pageToken,
  };

  if (mediaType === "video") {
    containerBody.media_type = "VIDEO";
    containerBody.video_url = mediaUrl;
  } else {
    containerBody.image_url = mediaUrl;
  }

  const container = (await graphPost(`/${igAccountId}/media`, containerBody)) as { id?: string };
  if (!container.id) {
    throw new MetaApiError("Instagram media container missing id", "GRAPH_API", 500);
  }

  // Instagram processes the uploaded media asynchronously. Calling media_publish
  // before the container is FINISHED returns "Media ID is not available"
  // (fb:9007), so poll the container's status until it's ready.
  await waitForInstagramContainer(container.id, pageToken);

  return graphPost(`/${igAccountId}/media_publish`, {
    creation_id: container.id,
    access_token: pageToken,
  });
}

async function waitForInstagramContainer(containerId: string, accessToken: string): Promise<void> {
  // Images usually finish in a second or two; videos can take longer.
  const MAX_ATTEMPTS = 12;
  const DELAY_MS = 2000;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const status = (await graphGet(`/${containerId}`, {
      fields: "status_code",
      access_token: accessToken,
    })) as { status_code?: string };

    if (status.status_code === "FINISHED") return;
    if (status.status_code === "ERROR" || status.status_code === "EXPIRED") {
      throw new MetaApiError(
        `Instagram media processing returned ${status.status_code}`,
        "GRAPH_API",
        502,
      );
    }
    await sleep(DELAY_MS);
  }
  throw new MetaApiError(
    "Instagram media did not finish processing in time",
    "GRAPH_API",
    504,
  );
}

/**
 * Publishes a scheduled post to Meta (Facebook Page + optional Instagram).
 * `accessToken` is the page access token from SocialConnection.
 * `target` supplies Graph object ids (page + IG business account).
 */
export async function publishToMeta(
  post: Pick<ScheduledPost, "copy" | "platforms" | "mediaUrl" | "mediaType">,
  accessToken: string,
  target: MetaPublishTarget,
): Promise<MetaPublishResult> {
  if (!accessToken.trim()) {
    throw new MetaApiError("Missing Meta access token", "VALIDATION", 400);
  }

  const message = post.copy?.trim() || "";
  const mediaUrl = post.mediaUrl?.trim() || null;
  const mediaType = inferMediaType(mediaUrl, post.mediaType);
  const platforms = post.platforms ?? [];

  if (!wantsFacebook(platforms) && !wantsInstagram(platforms)) {
    throw new MetaApiError(
      "Scheduled post has no Facebook or Instagram platform",
      "VALIDATION",
      400,
    );
  }

  const result: MetaPublishResult = {};

  try {
    if (wantsFacebook(platforms)) {
      result.facebook = await publishFacebookPost(target.pageId, accessToken, {
        message,
        mediaUrl,
        mediaType,
      });
    }

    if (wantsInstagram(platforms)) {
      if (!target.igAccountId) {
        throw new MetaApiError(
          "No Instagram business account linked for this location",
          "VALIDATION",
          400,
        );
      }
      result.instagram = await publishInstagramPost(target.igAccountId, accessToken, {
        caption: message,
        mediaUrl,
        mediaType,
      });
    }

    return result;
  } catch (error) {
    if (error instanceof MetaApiError) throw error;
    const msg = error instanceof Error ? error.message : "Unknown Meta publish error";
    throw new MetaApiError(msg, "GRAPH_API", 0);
  }
}

export interface MetaPlatformPublishOutcome {
  /** Platforms published by THIS call, in order, with their Graph results. */
  succeeded: Array<{ platform: "facebook" | "instagram"; result: unknown }>;
  /** First platform that failed; platforms after it were not attempted. */
  failure?: { platform: "facebook" | "instagram"; error: MetaApiError };
}

/**
 * Publishes platform-by-platform and never throws on a per-platform Graph
 * failure — the failure is returned in the outcome instead. `skipPlatforms`
 * are platforms already live from a previous attempt (a retry must not
 * re-post them). `onPublished` runs after each platform succeeds so the
 * caller can persist partial progress immediately; its errors propagate.
 */
export async function publishToMetaPerPlatform(
  post: Pick<ScheduledPost, "copy" | "platforms" | "mediaUrl" | "mediaType">,
  accessToken: string,
  target: MetaPublishTarget,
  skipPlatforms: SocialPlatform[] = [],
  onPublished?: (platform: "facebook" | "instagram", result: unknown) => Promise<void>,
): Promise<MetaPlatformPublishOutcome> {
  if (!accessToken.trim()) {
    throw new MetaApiError("Missing Meta access token", "VALIDATION", 400);
  }

  const message = post.copy?.trim() || "";
  const mediaUrl = post.mediaUrl?.trim() || null;
  const mediaType = inferMediaType(mediaUrl, post.mediaType);
  const platforms = post.platforms ?? [];

  if (!wantsFacebook(platforms) && !wantsInstagram(platforms)) {
    throw new MetaApiError(
      "Scheduled post has no Facebook or Instagram platform",
      "VALIDATION",
      400,
    );
  }

  const pending: Array<"facebook" | "instagram"> = [];
  if (wantsFacebook(platforms) && !skipPlatforms.includes("facebook")) pending.push("facebook");
  if (wantsInstagram(platforms) && !skipPlatforms.includes("instagram")) pending.push("instagram");

  const outcome: MetaPlatformPublishOutcome = { succeeded: [] };

  for (const platform of pending) {
    let result: unknown;
    try {
      if (platform === "facebook") {
        result = await publishFacebookPost(target.pageId, accessToken, {
          message,
          mediaUrl,
          mediaType,
        });
      } else {
        if (!target.igAccountId) {
          throw new MetaApiError(
            "No Instagram business account linked for this location",
            "VALIDATION",
            400,
          );
        }
        result = await publishInstagramPost(target.igAccountId, accessToken, {
          caption: message,
          mediaUrl,
          mediaType,
        });
      }
    } catch (error) {
      const metaError =
        error instanceof MetaApiError
          ? error
          : new MetaApiError(
              error instanceof Error ? error.message : "Unknown Meta publish error",
              "GRAPH_API",
              0,
            );
      outcome.failure = { platform, error: metaError };
      break;
    }
    outcome.succeeded.push({ platform, result });
    // Outside the catch above: persistence errors from the caller's callback
    // must propagate, not be recorded as a Graph publish failure.
    if (onPublished) await onPublished(platform, result);
  }

  return outcome;
}

export { GRAPH_API_VERSION, GRAPH_BASE };
