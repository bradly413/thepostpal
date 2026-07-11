import { describe, expect, it } from "vitest";
import {
  resolveStudioImageRoute,
  validateListingComposeRequest,
} from "@/lib/studio/studio-image-routing";

const LISTING_PROMPT =
  "make an instagram post about my new listing 223 victor ct. in ballwin, mo 63021";

describe("resolveStudioImageRoute", () => {
  it("blocks listing briefs without a photo on idle", () => {
    expect(
      resolveStudioImageRoute({
        intent: LISTING_PROMPT,
        refImage: null,
        generatedUrl: null,
        genState: "idle",
        lastGenPrompt: "",
      }),
    ).toBe("blocked_listing_no_photo");
  });

  it("passthrough listing photo without calling compose/generate", () => {
    expect(
      resolveStudioImageRoute({
        intent: LISTING_PROMPT,
        refImage: "data:image/jpeg;base64,abc",
        generatedUrl: null,
        genState: "idle",
        lastGenPrompt: "",
      }),
    ).toBe("listing_passthrough");
  });

  it("routes scenic briefs through compose+generate", () => {
    expect(
      resolveStudioImageRoute({
        intent: "a palm tree on the beach",
        refImage: null,
        generatedUrl: null,
        genState: "idle",
        lastGenPrompt: "",
      }),
    ).toBe("compose_generate");
  });

  it("routes reprompt edits through reprompt API", () => {
    expect(
      resolveStudioImageRoute({
        intent: "brighter closeup",
        refImage: null,
        generatedUrl: "data:image/png;base64,gen",
        genState: "done",
        lastGenPrompt: "cupcake on a plate",
      }),
    ).toBe("reprompt_edit");
  });

  it("does not passthrough when user is editing an existing canvas image", () => {
    expect(
      resolveStudioImageRoute({
        intent: "brighter",
        refImage: "data:image/jpeg;base64,listing",
        generatedUrl: "data:image/png;base64,gen",
        genState: "done",
        lastGenPrompt: LISTING_PROMPT,
      }),
    ).toBe("reprompt_edit");
  });
});

describe("validateListingComposeRequest", () => {
  it("returns 422 when listing has no photo flag", () => {
    const result = validateListingComposeRequest(LISTING_PROMPT, false);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("listing_photo_required");
      expect(result.status).toBe(422);
    }
  });

  it("allows listing when hasReferenceImage is true", () => {
    expect(validateListingComposeRequest(LISTING_PROMPT, true)).toEqual({ ok: true });
  });

  it("allows non-listing briefs without a photo", () => {
    expect(
      validateListingComposeRequest("weekend happy hour at our cafe", false),
    ).toEqual({ ok: true });
  });
});
