import { shouldEditFromReference } from "@/lib/studio/reprompt-delta";
import { isListingBrief } from "@/lib/studio/scene-intent";

export type StudioGenState = "idle" | "generating" | "done";

export type StudioImageRoute =
  | "blocked_listing_no_photo"
  | "listing_passthrough"
  | "reprompt_edit"
  | "compose_generate"
  | "direct_generate";

/**
 * Outcome phrasing ("make a post about…") still gets a thin Claude rewrite.
 * Concrete image briefs go straight to Gemini — no compose, no art director.
 */
export function needsComposeRewrite(intent: string): boolean {
  const t = intent.trim();
  if (!t) return false;
  if (
    /\b(make|create|generate|design)\s+(an?\s+)?(instagram\s+|facebook\s+|tiktok\s+|linkedin\s+)?(post|image|photo|graphic)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  if (/\b(post|image|photo)\s+about\b/i.test(t)) return true;
  if (/\bfor\s+(my|our|the)\s+\w+/i.test(t) && t.split(/\s+/).length <= 8) return true;
  // Very short vague outcomes without a clear visual noun
  const words = t.split(/\s+/).filter(Boolean);
  if (
    words.length <= 4 &&
    !/\b(smoothie|burger|sandwich|portrait|beach|palm|listing|bottle|skincare|coffee|pizza|salad|woman|man|dog|cat|house|car)\b/i.test(
      t,
    )
  ) {
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
