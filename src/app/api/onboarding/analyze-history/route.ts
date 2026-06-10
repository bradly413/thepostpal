import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { requireAuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import { decryptToken } from "@/lib/social/token-crypto";
import { brandVoiceAiSchema, type BrandVoiceAiOutput } from "@/lib/brand-book-schema";

//  Zero-shot historical onboarding — analyze the tenant's past social posts and
//  infer their Brand Book voice (weSay / weDontSay / tone / pillars), so the
//  Brand Architect can open pre-filled instead of asking the user to type it.
//
//  SCAFFOLD: the provider fetch and the AI synthesis are stubbed. The auth,
//  tenant scoping, token decryption (token-crypto), and the Zod schema wiring
//  are real. Returns { analyzed: false } until the provider fetch is built —
//  which keeps the manual / guest onboarding fallback fully intact.

interface RecentPost {
  id: string;
  provider: string;
  caption: string;
  createdAt?: string;
}

/**
 * PLACEHOLDER. Will hit the provider API for the account's last ~50 posts using
 * the (decrypted) access token:
 *   - Meta:     GET /{page-id}/posts?fields=message,created_time  (Graph API)
 *   - LinkedIn: GET /rest/posts?author={urn}                       (Posts API)
 * Returns the captions we feed to the voice model.
 */
async function fetchRecentPosts(
  accountId: string,
  provider: string,
  accessToken: string,
): Promise<RecentPost[]> {
  // TODO(zero-shot): implement per-provider fetch (last 50 posts).
  // `accessToken` is already decrypted by the caller via token-crypto.
  void accountId;
  void provider;
  void accessToken;
  return [];
}

/**
 * PLACEHOLDER (real wiring). Synthesize the brand voice from the user's own
 * captions using Anthropic + our existing Brand Book Zod schema, so the output
 * matches how they already write. Only called when there are posts to analyze.
 */
async function synthesizeVoiceFromPosts(posts: RecentPost[]): Promise<BrandVoiceAiOutput> {
  const corpus = posts.map((p) => `- ${p.caption}`).join("\n");
  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-6"),
    schema: brandVoiceAiSchema,
    system:
      "You are a brand strategist. Analyze a business's own past social captions " +
      "and infer the brand voice they already use. Be faithful to their existing " +
      "vocabulary, cadence, and themes — do not invent a new persona.",
    prompt: `The business's recent posts:\n${corpus}\n\nInfer their brand voice (weSay, weDontSay, tone, content pillars).`,
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

      // 3. Synthesize the brand voice from the user's own history.
      const voice = await synthesizeVoiceFromPosts(posts.slice(0, 50));
      return NextResponse.json({ analyzed: true, voice });
    });
  } catch (error) {
    console.error("api.onboarding.analyze-history.POST", error);
    return NextResponse.json({ analyzed: false, reason: "error" }, { status: 500 });
  }
}
