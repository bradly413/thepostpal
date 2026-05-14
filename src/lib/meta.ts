const APP_ID = process.env.NEXT_PUBLIC_META_APP_ID || "";
const APP_SECRET = process.env.META_APP_SECRET || "";
const REDIRECT_URI = process.env.META_REDIRECT_URI || "http://localhost:3000/api/meta/callback";
const GRAPH = "https://graph.facebook.com/v25.0";

const SCOPES = [
  "pages_show_list",
  "pages_manage_posts",
  "pages_read_engagement",
  "instagram_basic",
  "instagram_content_publish",
].join(",");

export function getLoginUrl(state: string) {
  const params = new URLSearchParams({
    client_id: APP_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    response_type: "code",
    state,
  });
  return `https://www.facebook.com/v21.0/dialog/oauth?${params}`;
}

export async function exchangeCode(code: string) {
  const params = new URLSearchParams({
    client_id: APP_ID,
    client_secret: APP_SECRET,
    redirect_uri: REDIRECT_URI,
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

export async function publishToFacebook(pageId: string, pageToken: string, options: { message?: string; imageUrl?: string; scheduledTime?: number }) {
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

export async function publishToInstagram(igAccountId: string, pageToken: string, options: { caption?: string; imageUrl: string; scheduledTime?: number }) {
  const containerBody: Record<string, unknown> = {
    image_url: options.imageUrl,
    caption: options.caption || "",
    access_token: pageToken,
  };
  if (options.scheduledTime) {
    containerBody.published = false;
    containerBody.scheduled_publish_time = options.scheduledTime;
  }

  const containerRes = await fetch(`${GRAPH}/${igAccountId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(containerBody),
  });
  if (!containerRes.ok) throw new Error(`IG container failed: ${await containerRes.text()}`);
  const { id: containerId } = await containerRes.json();

  if (options.scheduledTime) {
    return { id: containerId, scheduled: true };
  }

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
