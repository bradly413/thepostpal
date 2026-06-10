import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { requireAuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import { decryptToken } from "@/lib/social/token-crypto";
import {
  ZERO_SHOT_EXTRACTION_PROMPT,
  zeroShotExtractionSchema,
  type ZeroShotExtraction,
} from "@/lib/zero-shot-extraction";

//  Zero-shot historical onboarding — analyze the tenant's past social posts and
//  infer their Brand Book voice (weSay / weDontSay / tone / pillars), so the
//  Brand Architect can open pre-filled instead of asking the user to type it.
//
//  SCAFFOLD: the provider fetch and the AI synthesis are stubbed. The auth,
//  tenant scoping, token decryption (token-crypto), and the Zod schema wiring
//  are real. Returns { analyzed: false } until the provider fetch is built —
//  which keeps the manual / guest onboarding fallback fully intact.

const GRAPH = "https://graph.facebook.com/v25.0";
const LINKEDIN_POSTS = "https://api.linkedin.com/rest/posts";
const LINKEDIN_VERSION = "202405";
const POST_LIMIT = 50;

interface RecentPost {
  id: string;
  provider: string;
  caption: string;
  createdAt?: string;
}

/**
 * Fetch the account's recent captions for voice analysis. `accessToken` is
 * already decrypted by the caller via token-crypto. Best-effort and
 * error-tolerant — any failure yields [] so onboarding falls back to manual.
 *
 * NOTE: not exercised against live provider APIs here (the demo tenant has no
 * connected accounts / tokens). LinkedIn read access additionally depends on
 * the granted product + scopes.
 */
async function fetchRecentPosts(
  accountId: string,
  provider: string,
  accessToken: string,
): Promise<RecentPost[]> {
  try {
    if (provider === "facebook") {
      const res = await fetch(
        `${GRAPH}/${accountId}/posts?fields=id,message,created_time&limit=${POST_LIMIT}&access_token=${encodeURIComponent(accessToken)}`,
      );
      if (!res.ok) return [];
      const json = (await res.json()) as { data?: { id: string; message?: string; created_time?: string }[] };
      return (json.data ?? [])
        .filter((p) => p.message?.trim())
        .map((p) => ({ id: p.id, provider, caption: p.message as string, createdAt: p.created_time }));
    }

    if (provider === "instagram") {
      const res = await fetch(
        `${GRAPH}/${accountId}/media?fields=id,caption,timestamp&limit=${POST_LIMIT}&access_token=${encodeURIComponent(accessToken)}`,
      );
      if (!res.ok) return [];
      const json = (await res.json()) as { data?: { id: string; caption?: string; timestamp?: string }[] };
      return (json.data ?? [])
        .filter((m) => m.caption?.trim())
        .map((m) => ({ id: m.id, provider, caption: m.caption as string, createdAt: m.timestamp }));
    }

    if (provider === "linkedin") {
      const authorUrn = `urn:li:person:${accountId}`;
      const res = await fetch(
        `${LINKEDIN_POSTS}?q=author&author=${encodeURIComponent(authorUrn)}&count=${POST_LIMIT}&sortBy=LAST_MODIFIED`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "LinkedIn-Version": LINKEDIN_VERSION,
            "X-Restli-Protocol-Version": "2.0.0",
          },
        },
      );
      if (!res.ok) return [];
      const json = (await res.json()) as { elements?: { id?: string; commentary?: string }[] };
      return (json.elements ?? [])
        .map((el, i) => ({ id: el.id ?? `li-${i}`, provider, caption: (el.commentary ?? "").trim() }))
        .filter((p) => p.caption);
    }

    return [];
  } catch (error) {
    console.error(`analyze-history.fetchRecentPosts(${provider})`, error);
    return [];
  }
}

/**
 * Reverse-engineer the brand's tone / pillars / weSay / weDontSay from their own
 * captions using Anthropic + the zero-shot extraction schema. Only called when
 * there are posts to analyze.
 */
async function synthesizeVoiceFromPosts(posts: RecentPost[]): Promise<ZeroShotExtraction> {
  const dataset = JSON.stringify(posts.map((p) => p.caption));
  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-6"),
    schema: zeroShotExtractionSchema,
    system: ZERO_SHOT_EXTRACTION_PROMPT,
    prompt: `Here is the array of the user's last ${posts.length} social media posts:\n${dataset}`,
  });
  return object;
}

export async function POST() {
  try {
    const auth = await requireAuthContext();

    return await withTenantDb(auth, async (tx) => {
      // 1. Retrieve the active tenant's connected social accounts. RLS scopes to
      //    the tenant; the explicit org filter is belt-and-suspenders.
      const accounts = await tx.socialAccount.findMany({
        where: { organizationId: auth.tenantId },
        select: { accountId: true, provider: true, accessToken: true },
      });

      if (accounts.length === 0) {
        return NextResponse.json({ analyzed: false, reason: "no_social_accounts" });
      }

      // 2. Pull recent posts per account. Tokens are stored encrypted — decrypt
      //    each one with token-crypto before handing it to the provider fetch.
      const posts: RecentPost[] = [];
      for (const account of accounts) {
        const accessToken = decryptToken(account.accessToken);
        posts.push(...(await fetchRecentPosts(account.accountId, account.provider, accessToken)));
      }

      if (posts.length === 0) {
        // Placeholder fetch returns nothing yet — nothing to analyze.
        return NextResponse.json({ analyzed: false, reason: "no_posts" });
      }

      // No AI key configured — skip the (doomed) model call and let onboarding
      // fall back to manual. Mirrors the guard in /api/brand-book/generate.
      if (!process.env.ANTHROPIC_API_KEY?.trim()) {
        return NextResponse.json({ analyzed: false, reason: "ai_unavailable" });
      }

      // 3. Synthesize the brand voice from the user's own history.
      const voice = await synthesizeVoiceFromPosts(posts.slice(0, 50));
      return NextResponse.json({ analyzed: true, voice });
    });
  } catch (error) {
    console.error("api.onboarding.analyze-history.POST", error);
    return NextResponse.json({ analyzed: false, reason: "error" }, { status: 500 });
  }
}
