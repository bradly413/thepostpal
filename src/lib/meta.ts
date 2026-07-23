const APP_ID =
  process.env.META_CLIENT_ID ||
  process.env.NEXT_PUBLIC_META_APP_ID ||
  "";
const APP_SECRET =
  process.env.META_CLIENT_SECRET ||
  process.env.META_APP_SECRET ||
  "";
const REDIRECT_URI =
  process.env.META_REDIRECT_URI ||
  (process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/api/meta/callback`
    : "http://localhost:3000/api/meta/callback");
export const META_AUTH_REDIRECT_URI =
  process.env.META_AUTH_REDIRECT_URI ||
  (process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/api/auth/meta/callback`
    : "http://localhost:3000/api/auth/meta/callback");
export const ADS_REDIRECT_URI =
  process.env.META_ADS_REDIRECT_URI ||
  (process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/api/meta/ads/callback`
    : "http://localhost:8240/api/meta/ads/callback");
const GRAPH = "https://graph.facebook.com/v25.0";

const SCOPES = [
  "pages_show_list",
  "pages_manage_posts",
  "pages_read_engagement",
  "instagram_basic",
  "instagram_content_publish",
  // Analytics (/api/meta/insights): Page + IG insights reads. Both are on the
  // app's use cases (added 2026-07-23) — without them the dashboard analytics
  // only works for app-role holders.
  "read_insights",
  "instagram_manage_insights",
].join(",");

/** Incremental Marketing API consent — separate from organic page publishing. */
export const META_ADS_SCOPES = [
  "ads_management",
  "ads_read",
  "business_management",
] as const;

const ADS_OAUTH_SCOPES = [...META_ADS_SCOPES, "pages_show_list"].join(",");

function buildOAuthUrl(state: string, redirectUri: string) {
  const params = new URLSearchParams({
    client_id: APP_ID,
    redirect_uri: redirectUri,
    scope: SCOPES,
    response_type: "code",
    state,
  });
  return `https://www.facebook.com/v25.0/dialog/oauth?${params}`;
}

export function getLoginUrl(state: string) {
  return buildOAuthUrl(state, REDIRECT_URI);
}

/** Canonical Meta connect flow — `/api/auth/meta/callback`. */
export function getAuthLoginUrl(state: string) {
  return buildOAuthUrl(state, META_AUTH_REDIRECT_URI);
}

/** Ads-only OAuth — does not replace organic scopes on the standard connect flow. */
export function getAdsLoginUrl(state: string) {
  const params = new URLSearchParams({
    client_id: APP_ID,
    redirect_uri: ADS_REDIRECT_URI,
    scope: ADS_OAUTH_SCOPES,
    response_type: "code",
    state,
  });
  return `https://www.facebook.com/v21.0/dialog/oauth?${params}`;
}

export async function exchangeCode(code: string, redirectUri = REDIRECT_URI) {
  const params = new URLSearchParams({
    client_id: APP_ID,
    client_secret: APP_SECRET,
    redirect_uri: redirectUri,
    code,
  });
  const res = await fetch(`${GRAPH}/oauth/access_token?${params}`);
  if (!res.ok) throw new Error("Token exchange failed");
  return res.json() as Promise<{ access_token: string; token_type: string; expires_in: number }>;
}

export async function getLongLivedToken(shortToken: string) {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: APP_ID,
    client_secret: APP_SECRET,
    fb_exchange_token: shortToken,
  });
  const res = await fetch(`${GRAPH}/oauth/access_token?${params}`);
  if (!res.ok) throw new Error("Long-lived token exchange failed");
  return res.json() as Promise<{ access_token: string; token_type: string; expires_in: number }>;
}

export async function getPages(userToken: string) {
  const res = await fetch(`${GRAPH}/me/accounts?access_token=${userToken}`);
  if (!res.ok) throw new Error("Failed to fetch pages");
  const data = await res.json();
  return data.data as Array<{ id: string; name: string; access_token: string }>;
}

export async function getInstagramAccount(pageId: string, pageToken: string) {
  const res = await fetch(`${GRAPH}/${pageId}?fields=instagram_business_account&access_token=${pageToken}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.instagram_business_account?.id as string | undefined;
}

export async function publishToFacebook(
  pageId: string,
  pageToken: string,
  options: {
    message?: string;
    imageUrl?: string;
    videoUrl?: string;
    mediaType?: "image" | "video";
    scheduledTime?: number;
  },
) {
  const mediaUrl = options.videoUrl || options.imageUrl;
  const isVideo =
    options.mediaType === "video" ||
    Boolean(options.videoUrl) ||
    (mediaUrl ? /\.(mp4|mov|webm|m4v)(\?|$)/i.test(mediaUrl) : false);

  if (mediaUrl && isVideo) {
    const body: Record<string, unknown> = {
      file_url: mediaUrl,
      description: options.message || "",
      access_token: pageToken,
    };
    if (options.scheduledTime) {
      body.published = false;
      body.scheduled_publish_time = options.scheduledTime;
    }
    const res = await fetch(`${GRAPH}/${pageId}/videos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`FB video post failed: ${await res.text()}`);
    return res.json();
  }

  if (options.imageUrl) {
    const body: Record<string, unknown> = {
      url: options.imageUrl,
      caption: options.message || "",
      access_token: pageToken,
    };
    if (options.scheduledTime) {
      body.published = false;
      body.scheduled_publish_time = options.scheduledTime;
    }
    const res = await fetch(`${GRAPH}/${pageId}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`FB photo post failed: ${await res.text()}`);
    return res.json();
  }
  const body: Record<string, unknown> = {
    message: options.message || "",
    access_token: pageToken,
  };
  if (options.scheduledTime) {
    body.published = false;
    body.scheduled_publish_time = options.scheduledTime;
  }
  const res = await fetch(`${GRAPH}/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`FB post failed: ${await res.text()}`);
  return res.json();
}

export async function publishToInstagram(
  igAccountId: string,
  pageToken: string,
  options: {
    caption?: string;
    imageUrl?: string;
    videoUrl?: string;
    mediaType?: "image" | "video";
    scheduledTime?: number;
  },
) {
  const mediaUrl = options.videoUrl || options.imageUrl;
  if (!mediaUrl) {
    throw new Error("Instagram requires an image or video URL.");
  }
  const isVideo =
    options.mediaType === "video" ||
    Boolean(options.videoUrl) ||
    /\.(mp4|mov|webm|m4v)(\?|$)/i.test(mediaUrl);

  const containerBody: Record<string, unknown> = {
    caption: options.caption || "",
    access_token: pageToken,
  };
  if (isVideo) {
    containerBody.media_type = "REELS";
    containerBody.video_url = mediaUrl;
  } else {
    containerBody.image_url = mediaUrl;
  }
  // NOTE: Instagram's Content Publishing API does NOT support
  // `scheduled_publish_time` (only Facebook Pages do). Passing it makes Graph
  // either reject the container or silently ignore the schedule and publish
  // immediately. IG scheduling is handled by the internal cron queue
  // (src/lib/cron-publish.ts), which dispatches when a post is due. So we
  // intentionally ignore `options.scheduledTime` here and always publish now.

  const containerRes = await fetch(`${GRAPH}/${igAccountId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(containerBody),
  });
  if (!containerRes.ok) throw new Error(`IG container failed: ${await containerRes.text()}`);
  const { id: containerId } = await containerRes.json();

  const publishRes = await fetch(`${GRAPH}/${igAccountId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: containerId,
      access_token: pageToken,
    }),
  });
  if (!publishRes.ok) throw new Error(`IG publish failed: ${await publishRes.text()}`);
  return publishRes.json();
}

export async function getScheduledPosts(pageId: string, pageToken: string) {
  const res = await fetch(`${GRAPH}/${pageId}/scheduled_posts?access_token=${pageToken}`);
  if (!res.ok) throw new Error(`Failed to fetch scheduled posts: ${await res.text()}`);
  return res.json();
}

// ─────────────────────────────────────────────────────────────
//  Voice-sample harvesting — read-only fetch of post captions
//  used by /api/meta/voice-samples to feed the brand-book
//  voice synthesizer with the user's actual writing history.
// ─────────────────────────────────────────────────────────────

export interface RecentPost {
  /** Caption / message body — empty string if the post is photo-only with no text. */
  text: string;
  /** ISO 8601 timestamp from Graph API. */
  createdAt: string;
}

/**
 * Fetch the most recent published Instagram media captions for an IG Business
 * or Creator account. Requires `instagram_basic` scope (already in SCOPES).
 * Returns captions newest-first, filtered to those with non-empty text.
 */
export async function getInstagramMedia(
  igAccountId: string,
  pageToken: string,
  limit = 25,
): Promise<RecentPost[]> {
  const url = `${GRAPH}/${igAccountId}/media?fields=caption,timestamp,media_type&limit=${limit}&access_token=${pageToken}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch Instagram media: ${await res.text()}`);
  }
  const json = (await res.json()) as {
    data?: Array<{ caption?: string; timestamp?: string; media_type?: string }>;
  };
  const items = json.data ?? [];
  return items
    .map((m) => ({
      text: typeof m.caption === "string" ? m.caption.trim() : "",
      createdAt: m.timestamp || "",
    }))
    .filter((p) => p.text.length > 0);
}

/**
 * Fetch the most recent published Facebook page posts. Requires
 * `pages_read_engagement` scope (already in SCOPES). Returns post
 * messages newest-first, filtered to those with non-empty text.
 */
export async function getFacebookPagePosts(
  pageId: string,
  pageToken: string,
  limit = 25,
): Promise<RecentPost[]> {
  const url = `${GRAPH}/${pageId}/posts?fields=message,created_time&limit=${limit}&access_token=${pageToken}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch Facebook posts: ${await res.text()}`);
  }
  const json = (await res.json()) as {
    data?: Array<{ message?: string; created_time?: string }>;
  };
  const items = json.data ?? [];
  return items
    .map((m) => ({
      text: typeof m.message === "string" ? m.message.trim() : "",
      createdAt: m.created_time || "",
    }))
    .filter((p) => p.text.length > 0);
}
