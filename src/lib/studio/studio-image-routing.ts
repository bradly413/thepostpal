import { shouldEditFromReference } from "@/lib/studio/reprompt-delta";
import { isListingBrief } from "@/lib/studio/scene-intent";

export type StudioGenState = "idle" | "generating" | "done";

export type StudioImageRoute =
  | "blocked_listing_no_photo"
  | "listing_passthrough"
  | "reprompt_edit"
  | "compose_generate";

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

  return "compose_generate";
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
