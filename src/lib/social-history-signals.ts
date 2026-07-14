/**
 * Local (no-AI) signals from social post history: hashtags, cadence, media mix.
 * Used by /api/onboarding/analyze-history after provider fetches.
 */

export interface HistoryPost {
  id: string;
  provider: string;
  caption: string;
  createdAt?: string;
  mediaType?: string | null;
  mediaUrl?: string | null;
  permalink?: string | null;
}

export interface HashtagCount {
  tag: string;
  count: number;
}

export interface PostingCadence {
  postsAnalyzed: number;
  spanDays: number | null;
  postsPerWeek: number | null;
  medianDaysBetweenPosts: number | null;
  peakDays: string[];
  summary: string;
}

export interface MediaMix {
  images: number;
  video: number;
  carousels: number;
  other: number;
  total: number;
  /** Sample public image URLs for a future vision pass (capped). */
  sampleImageUrls: string[];
  summary: string;
}

export interface HistorySignals {
  topHashtags: HashtagCount[];
  cadence: PostingCadence;
  mediaMix: MediaMix;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const HASHTAG_RE = /#([\p{L}\p{N}_]+)/gu;

export function extractHashtags(captions: string[], limit = 12): HashtagCount[] {
  const counts = new Map<string, number>();
  for (const caption of captions) {
    if (!caption) continue;
    const seenInPost = new Set<string>();
    for (const match of caption.matchAll(HASHTAG_RE)) {
      const tag = match[1]?.toLowerCase();
      if (!tag || seenInPost.has(tag)) continue;
      seenInPost.add(tag);
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag: `#${tag}`, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, limit);
}

function parseTime(iso?: string): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

export function computePostingCadence(posts: HistoryPost[]): PostingCadence {
  const times = posts
    .map((p) => parseTime(p.createdAt))
    .filter((t): t is number => t != null)
    .sort((a, b) => a - b);

  const postsAnalyzed = posts.length;
  if (times.length < 2) {
    return {
      postsAnalyzed,
      spanDays: times.length === 1 ? 0 : null,
      postsPerWeek: null,
      medianDaysBetweenPosts: null,
      peakDays: [],
      summary:
        postsAnalyzed === 0
          ? "No dated posts to measure cadence"
          : postsAnalyzed === 1
            ? "1 dated post — not enough history for cadence"
            : `${postsAnalyzed} posts without usable dates`,
    };
  }

  const spanMs = times[times.length - 1]! - times[0]!;
  const spanDays = Math.max(spanMs / 86_400_000, 1 / 24);
  const postsPerWeek = (times.length / spanDays) * 7;

  const gaps: number[] = [];
  for (let i = 1; i < times.length; i++) {
    gaps.push((times[i]! - times[i - 1]!) / 86_400_000);
  }
  gaps.sort((a, b) => a - b);
  const mid = Math.floor(gaps.length / 2);
  const medianDaysBetweenPosts =
    gaps.length % 2 === 0 ? (gaps[mid - 1]! + gaps[mid]!) / 2 : gaps[mid]!;

  const dayCounts = new Array(7).fill(0) as number[];
  for (const t of times) {
    dayCounts[new Date(t).getUTCDay()]! += 1;
  }
  const maxDay = Math.max(...dayCounts);
  const peakDays =
    maxDay <= 0
      ? []
      : DAY_NAMES.filter((_, i) => dayCounts[i] === maxDay && dayCounts[i]! > 0);

  const ppw = Math.round(postsPerWeek * 10) / 10;
  const gap =
    medianDaysBetweenPosts < 1
      ? `${Math.round(medianDaysBetweenPosts * 24)}h between posts`
      : `${Math.round(medianDaysBetweenPosts * 10) / 10} days between posts`;
  const peaks = peakDays.length ? ` · peaks ${peakDays.join(", ")}` : "";

  return {
    postsAnalyzed,
    spanDays: Math.round(spanDays * 10) / 10,
    postsPerWeek: ppw,
    medianDaysBetweenPosts: Math.round(medianDaysBetweenPosts * 10) / 10,
    peakDays: [...peakDays],
    summary: `${ppw}/week over ${Math.round(spanDays)}d · ${gap}${peaks}`,
  };
}

function normalizeMediaType(raw?: string | null): keyof Omit<MediaMix, "total" | "sampleImageUrls" | "summary"> {
  const t = (raw ?? "").toUpperCase();
  if (!t) return "other";
  if (t.includes("CAROUSEL") || t.includes("ALBUM") || t === "SHARE") return "carousels";
  if (t.includes("VIDEO") || t.includes("REEL") || t === "VIDEO_INLINE") return "video";
  if (t.includes("IMAGE") || t.includes("PHOTO") || t === "STATUS") return "images";
  return "other";
}

export function computeMediaMix(posts: HistoryPost[], sampleLimit = 12): MediaMix {
  const mix = { images: 0, video: 0, carousels: 0, other: 0 };
  const sampleImageUrls: string[] = [];

  for (const post of posts) {
    const bucket = normalizeMediaType(post.mediaType);
    mix[bucket] += 1;
    if (
      sampleImageUrls.length < sampleLimit &&
      post.mediaUrl &&
      (bucket === "images" || bucket === "carousels")
    ) {
      sampleImageUrls.push(post.mediaUrl);
    }
  }

  const total = posts.length;
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));
  const parts = [
    `${pct(mix.images)}% images`,
    `${pct(mix.video)}% video`,
    `${pct(mix.carousels)}% carousels`,
  ];
  if (mix.other > 0) parts.push(`${pct(mix.other)}% other`);

  return {
    ...mix,
    total,
    sampleImageUrls,
    summary: total === 0 ? "No media typed posts" : parts.join(" · "),
  };
}

export function analyzeHistorySignals(posts: HistoryPost[]): HistorySignals {
  return {
    topHashtags: extractHashtags(
      posts.map((p) => p.caption),
      12,
    ),
    cadence: computePostingCadence(posts),
    mediaMix: computeMediaMix(posts),
  };
}
