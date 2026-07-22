import { shouldEditFromReference } from "@/lib/studio/reprompt-delta";
import { isListingBrief } from "@/lib/studio/scene-intent";

export type StudioGenState = "idle" | "generating" | "done";

export type StudioImageRoute =
  | "blocked_listing_no_photo"
  | "listing_passthrough"
  | "reprompt_edit"
  | "compose_generate"
  | "direct_generate";

/** Concrete visual nouns — short prompts with these skip compose. */
const VISUAL_NOUN_RE =
  /\b(smoothie|burger|sandwich|portrait|beach|palm|listing|bottle|skincare|coffee|latte|pizza|salad|woman|man|dog|cat|house|car|carafe|flatlay|cupcake|cocktail)\b/i;

/**
 * Outcome phrasing ("make a post about…") still gets a thin Claude rewrite.
 * Concrete image briefs go straight to Gemini — no compose, no art director.
 */
export function needsComposeRewrite(intent: string): boolean {
  const t = intent.trim();
  if (!t) return false;

  // Classic: make/create/design a (platform) post|image(s)|photo|graphic|story|reel|carousel
  if (
    /\b(make|create|generate|design|craft)\s+(an?\s+)?(instagram\s+|facebook\s+|tiktok\s+|linkedin\s+|ig\s+|fb\s+)?(posts?|images?|photos?|graphics?|story|stories|reels?|carousel|slides?)\b/i.test(
      t,
    )
  ) {
    return true;
  }

  // Website brand asks ("images for my website… socelle.com")
  if (
    /\b(for\s+(my|our|the)\s+website|my\s+website|our\s+website|our\s+site|my\s+site|here\s+is\s+the\s+link)\b/i.test(
      t,
    )
  ) {
    return true;
  }

  // Typo / shorthand: "mak an ig post", "ig post for…", "fb post about…"
  if (
    /\b(mak|make|creat|create|gen|generate|design)\b.{0,24}\b(ig|insta|instagram|fb|facebook|tiktok|linkedin)\b.{0,16}\b(post|story|reel|carousel)\b/i.test(
      t,
    ) ||
    /\b(ig|insta|fb)\s+(post|story|reel|carousel)\b/i.test(t)
  ) {
    return true;
  }

  // Carousel / multi-slide asks even without "post"
  if (/\b(\d+[\s-]?)?(slide|slides|carousel)\b/i.test(t) && /\b(design|make|create|announce|for)\b/i.test(t)) {
    return true;
  }

  if (/\b(post|image|photo|story|reel|carousel)\s+about\b/i.test(t)) return true;

  // Soft outcome verbs common in real user copy
  if (
    /\b(announce|promot(?:e|ing)|advertise|spotlight|shoutout|feature)\b/i.test(t) &&
    !VISUAL_NOUN_RE.test(t)
  ) {
    return true;
  }

  // "I need something for social / more bookings…" — intent without a scene
  if (
    /\b(i\s+need|we\s+need|need\s+something|something\s+for\s+(social|instagram|facebook|ig|fb)|more\s+bookings|for\s+social)\b/i.test(
      t,
    )
  ) {
    return true;
  }

  if (/\bfor\s+(my|our|the)\s+\w+/i.test(t) && t.split(/\s+/).length <= 8) return true;

  // Very short vague outcomes without a clear visual noun
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length <= 4 && !VISUAL_NOUN_RE.test(t)) {
    return true;
  }
  return false;
}

export function resolveStudioImageRoute(args: {
  intent: string;
  refImage: string | null;
  generatedUrl: string | null;
  genState: StudioGenState;
  lastGenPrompt: string;
}): StudioImageRoute {
  const isReprompt = args.genState === "done" && !!args.generatedUrl;
  const editingFromCanvas =
    isReprompt &&
    shouldEditFromReference(args.intent, args.lastGenPrompt, true);

  if (
    isListingBrief(args.intent) &&
    !args.refImage &&
    !(args.genState === "done" && args.generatedUrl)
  ) {
    return "blocked_listing_no_photo";
  }

  if (isListingBrief(args.intent) && args.refImage && !editingFromCanvas) {
    return "listing_passthrough";
  }

  if (editingFromCanvas) {
    return "reprompt_edit";
  }

  if (needsComposeRewrite(args.intent)) {
    return "compose_generate";
  }

  return "direct_generate";
}

/** Compose API gate — listing briefs require an attached photo. */
export function validateListingComposeRequest(
  intent: string,
  hasReferenceImage: boolean,
): { ok: true } | { ok: false; status: 422; code: "listing_photo_required"; error: string } {
  if (isListingBrief(intent) && !hasReferenceImage) {
    return {
      ok: false,
      status: 422,
      code: "listing_photo_required",
      error: "Add your listing photo first — we can't show your property from an address alone.",
    };
  }
  return { ok: true };
}
