import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { anthropic } from "@/lib/ai/anthropic";
import { requireAuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import { decryptToken } from "@/lib/social/token-crypto";
import {
  analyzeHistorySignals,
  type HistoryPost,
} from "@/lib/social-history-signals";
import {
  ZERO_SHOT_EXTRACTION_PROMPT,
  zeroShotExtractionSchema,
  type ZeroShotExtraction,
  type ZeroShotHistoryResult,
} from "@/lib/zero-shot-extraction";
import { refineVisualStyleFromImages } from "@/lib/history-vision-style";

const GRAPH = "https://graph.facebook.com/v25.0";
const LINKEDIN_POSTS = "https://api.linkedin.com/rest/posts";
const LINKEDIN_VERSION = "202405";
const POST_LIMIT = 50;

/**
 * Fetch recent posts with captions + media metadata for voice + local signals.
 * Best-effort — any failure yields [] so onboarding falls back to manual.
 */
async function fetchRecentPosts(
  accountId: string,
  provider: string,
  accessToken: string,
): Promise<HistoryPost[]> {
  try {
    if (provider === "facebook") {
      const res = await fetch(
        `${GRAPH}/${accountId}/posts?fields=id,message,created_time,full_picture,permalink_url,attachments{media_type,media,type,subattachments}&limit=${POST_LIMIT}&access_token=${encodeURIComponent(accessToken)}`,
      );
      if (!res.ok) return [];
      const json = (await res.json()) as {
        data?: {
          id: string;
          message?: string;
          created_time?: string;
          full_picture?: string;
          permalink_url?: string;
          attachments?: {
            data?: { media_type?: string; type?: string; media?: { image?: { src?: string } } }[];
          };
        }[];
      };

      return (json.data ?? []).map((p) => {
        const att = p.attachments?.data?.[0];
        const mediaType = att?.media_type || att?.type || (p.full_picture ? "IMAGE" : null);
        const mediaUrl = p.full_picture || att?.media?.image?.src || null;
        return {
          id: p.id,
          provider,
          caption: (p.message ?? "").trim(),
          createdAt: p.created_time,
          mediaType,
          mediaUrl,
          permalink: p.permalink_url ?? null,
        };
      });
    }

    if (provider === "instagram") {
      const res = await fetch(
        `${GRAPH}/${accountId}/media?fields=id,caption,timestamp,media_type,media_url,permalink,thumbnail_url&limit=${POST_LIMIT}&access_token=${encodeURIComponent(accessToken)}`,
      );
      if (!res.ok) return [];
      const json = (await res.json()) as {
        data?: {
          id: string;
          caption?: string;
          timestamp?: string;
          media_type?: string;
          media_url?: string;
          thumbnail_url?: string;
          permalink?: string;
        }[];
      };

      return (json.data ?? []).map((m) => ({
        id: m.id,
        provider,
        caption: (m.caption ?? "").trim(),
        createdAt: m.timestamp,
        mediaType: m.media_type ?? null,
        mediaUrl: m.media_url || m.thumbnail_url || null,
        permalink: m.permalink ?? null,
      }));
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
      const json = (await res.json()) as {
        elements?: {
          id?: string;
          commentary?: string;
          createdAt?: number;
          publishedAt?: number;
          content?: { media?: { id?: string } };
        }[];
      };

      return (json.elements ?? [])
        .map((el, i) => {
          const ms = el.publishedAt ?? el.createdAt;
          return {
            id: el.id ?? `li-${i}`,
            provider,
            caption: (el.commentary ?? "").trim(),
            createdAt: ms ? new Date(ms).toISOString() : undefined,
            mediaType: el.content?.media ? "IMAGE" : "TEXT",
            mediaUrl: null,
            permalink: null,
          };
        })
        .filter((p) => p.caption);
    }

    if (provider === "tiktok") {
      // Connect-only today; no post-list scope wiring yet.
      return [];
    }

    return [];
  } catch (error) {
    console.error(`analyze-history.fetchRecentPosts(${provider})`, error);
    return [];
  }
}

async function synthesizeVoiceFromPosts(
  posts: HistoryPost[],
  signalsSummary: { hashtags: string[]; cadence: string; mediaMix: string },
): Promise<ZeroShotExtraction> {
  const dataset = JSON.stringify(
    posts.slice(0, 50).map((p) => ({
      caption: p.caption,
      mediaType: p.mediaType ?? null,
      createdAt: p.createdAt ?? null,
      provider: p.provider,
    })),
  );

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-5"),
    schema: zeroShotExtractionSchema,
    system: ZERO_SHOT_EXTRACTION_PROMPT,
    prompt: `Precomputed local stats (trust these; do not invent alternatives):
- Top hashtags: ${signalsSummary.hashtags.length ? signalsSummary.hashtags.join(", ") : "(none found)"}
- Posting cadence: ${signalsSummary.cadence}
- Media mix: ${signalsSummary.mediaMix}

Here is the array of the user's last ${Math.min(posts.length, 50)} social media posts (captions + media labels):
${dataset}`,
  });
  return object;
}

function mergeHistoryResult(
  voice: ZeroShotExtraction,
  posts: HistoryPost[],
): ZeroShotHistoryResult {
  const signals = analyzeHistorySignals(posts);
  return {
    ...voice,
    hashtags: signals.topHashtags.map((h) => h.tag),
    postingCadence: signals.cadence.summary,
    mediaMix: signals.mediaMix.summary,
  };
}

export async function POST() {
  try {
    const auth = await requireAuthContext();

    return await withTenantDb(auth, async (tx) => {
      const accounts = await tx.socialAccount.findMany({
        where: { organizationId: auth.tenantId },
        select: { accountId: true, provider: true, accessToken: true },
      });

      if (accounts.length === 0) {
        return NextResponse.json({ analyzed: false, reason: "no_social_accounts" });
      }

      const posts: HistoryPost[] = [];
      for (const account of accounts) {
        const accessToken = decryptToken(account.accessToken);
        posts.push(...(await fetchRecentPosts(account.accountId, account.provider, accessToken)));
      }

      // Keep posts that have either caption or media (photo-only still useful for mix).
      const usable = posts.filter((p) => p.caption || p.mediaUrl || p.mediaType);
      if (usable.length === 0) {
        return NextResponse.json({ analyzed: false, reason: "no_posts" });
      }

      const signals = analyzeHistorySignals(usable);

      // Caption-less libraries still return local signals (no AI voice).
      const withCaptions = usable.filter((p) => p.caption.trim());
      if (withCaptions.length === 0 || !process.env.ANTHROPIC_API_KEY?.trim()) {
        return NextResponse.json({
          analyzed: true,
          voice: {
            tone: "Warm. Clear. Local.",
            pillars: ["Updates", "Behind the Scenes", "Community"],
            weSay: ["we're", "our team", "come see"],
            weDontSay: ["guaranteed results", "act now", "cheap"],
            visualStyle: ["authentic moments", "brand-forward"],
            hashtags: signals.topHashtags.map((h) => h.tag),
            postingCadence: signals.cadence.summary,
            mediaMix: signals.mediaMix.summary,
          } satisfies ZeroShotHistoryResult,
          signals,
          reason: withCaptions.length === 0 ? "signals_only" : "ai_unavailable",
        });
      }

      const voiceCore = await synthesizeVoiceFromPosts(withCaptions.slice(0, 50), {
        hashtags: signals.topHashtags.map((h) => h.tag),
        cadence: signals.cadence.summary,
        mediaMix: signals.mediaMix.summary,
      });

      const visualStyle = await refineVisualStyleFromImages(
        signals.mediaMix.sampleImageUrls,
        voiceCore.visualStyle,
        signals.mediaMix.summary,
      );
      const voice = mergeHistoryResult({ ...voiceCore, visualStyle }, usable);

      return NextResponse.json({
        analyzed: true,
        voice,
        signals: {
          topHashtags: signals.topHashtags,
          cadence: signals.cadence,
          mediaMix: {
            images: signals.mediaMix.images,
            video: signals.mediaMix.video,
            carousels: signals.mediaMix.carousels,
            other: signals.mediaMix.other,
            total: signals.mediaMix.total,
            summary: signals.mediaMix.summary,
            sampleImageUrls: signals.mediaMix.sampleImageUrls.slice(0, 12),
          },
        },
      });
    });
  } catch (error) {
    console.error("api.onboarding.analyze-history.POST", error);
    return NextResponse.json({ analyzed: false, reason: "error" }, { status: 500 });
  }
}
