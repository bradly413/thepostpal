import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import {
  getInstagramMedia,
  getFacebookPagePosts,
  type RecentPost,
} from "@/lib/meta";

// ─────────────────────────────────────────────────────────────
//  POST /api/meta/voice-samples
//
//  Read-only fetch of the user's recent post captions/messages
//  from Meta Graph API. Feeds the brand-book voice synthesizer.
//
//  The client passes its already-OAuth'd pageToken + the relevant
//  account ID (same pattern as /api/meta/publish — tokens live in
//  the client's localStorage meta-store, never persisted server-
//  side). This route is just a Graph-API proxy so the page token
//  doesn't leave the trusted network path.
//
//  Body:
//    {
//      source: "instagram" | "facebook",
//      accountId: string,    // igAccountId for Instagram, pageId for Facebook
//      pageToken: string,
//      limit?: number        // default 25, max 50
//    }
//
//  Response:
//    {
//      samples: string[],          // post text bodies, newest-first
//      posts: RecentPost[],        // full {text, createdAt} objects
//      count: number,
//      source: "instagram" | "facebook"
//    }
// ─────────────────────────────────────────────────────────────

interface RequestBody {
  source?: unknown;
  accountId?: unknown;
  pageToken?: unknown;
  limit?: unknown;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  // Slightly tighter rate limit than other Meta routes — voice-sample fetches
  // are kicked off explicitly by the user, not on every page load.
  if (!rateLimit(`meta-voice-samples:${ip}`, 10, 60_000)) {
    return NextResponse.json(
      { error: "Too many voice-sample fetches. Wait a moment and retry." },
      { status: 429 },
    );
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const source = body.source;
  const accountId = body.accountId;
  const pageToken = body.pageToken;
  const limitRaw =
    typeof body.limit === "number" && Number.isFinite(body.limit)
      ? body.limit
      : 25;
  const limit = Math.min(Math.max(Math.floor(limitRaw), 1), 50);

  if (source !== "instagram" && source !== "facebook") {
    return NextResponse.json(
      { error: "source must be 'instagram' or 'facebook'" },
      { status: 400 },
    );
  }
  if (typeof accountId !== "string" || !accountId.trim()) {
    return NextResponse.json(
      { error: "accountId is required" },
      { status: 400 },
    );
  }
  if (typeof pageToken !== "string" || !pageToken.trim()) {
    return NextResponse.json(
      { error: "pageToken is required" },
      { status: 400 },
    );
  }

  try {
    const posts: RecentPost[] =
      source === "instagram"
        ? await getInstagramMedia(accountId, pageToken, limit)
        : await getFacebookPagePosts(accountId, pageToken, limit);

    return NextResponse.json({
      source,
      count: posts.length,
      samples: posts.map((p) => p.text),
      posts,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    // 502 — upstream Graph API failure (bad token, account not found, scope
    // missing, etc.). The exact upstream message is in `error` so the client
    // can surface it.
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
