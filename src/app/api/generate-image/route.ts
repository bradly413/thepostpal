import { NextRequest, NextResponse } from "next/server";
import { rateLimit, buildRateLimitKey, RateLimitUnavailableError } from "@/lib/rate-limit";
import { requireAuthContext, type AuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import { resolveAccess } from "@/lib/authz";
import { isProImageEntitled } from "@/lib/plan-features";
import {
  enrichScenicBrief,
  generationSuffixForBrief,
  isListingBrief,
} from "@/lib/studio/scene-intent";
import {
  GPT_DESIGN_SUFFIX,
  REAL_PHOTO_EXPOSURE_RETRY_SUFFIX,
  TEXT_ON_IMAGE_SUFFIX,
} from "@/lib/studio/image-prompt-vivid";
import { isImageTooDark } from "@/lib/studio/image-quality-gate";
import { referenceImageToGeminiInline } from "@/lib/studio/vision-image-input";
import {
  generateNanoBananaImage,
  type NanoBananaImageSize,
  type NanoBananaQuality,
} from "@/lib/studio/nano-banana";
import { expandImageBrief } from "@/lib/studio/art-director";
import { generateGptImage, gptImageConfigured } from "@/lib/studio/gpt-image";
import {
  buildTenantImageBrandContext,
  buildTenantGeography,
} from "@/lib/ai-brand-context";

// Studio: Standard = Nano Banana 2, Pro = Nano Banana Pro (Interactions API).

export const maxDuration = 90; // art-director expand + Pro 2K generation + quality retry

export async function POST(req: NextRequest) {
  let auth: AuthContext;
  try {
    auth = await requireAuthContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!(await rateLimit(buildRateLimitKey("gen-image", req.headers, auth), 10, 60_000))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return NextResponse.json({ error: "Rate limit unavailable" }, { status: 503 });
    }
    throw error;
  }

  let parsed: {
    prompt?: unknown;
    aspectRatio?: unknown;
    referenceImage?: unknown;
    sourceIntent?: unknown;
    listingMode?: unknown;
    quality?: unknown;
    imageSize?: unknown;
    businessType?: unknown;
    locationId?: unknown;
    composed?: unknown;
    allowText?: unknown;
    engine?: unknown;
    brandLock?: unknown;
  };
  try {
    parsed = (await req.json()) as typeof parsed;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const prompt = typeof parsed.prompt === "string" ? parsed.prompt : "";
  const aspectRatio = typeof parsed.aspectRatio === "string" ? parsed.aspectRatio : "1:1";
  const referenceImage = parsed.referenceImage;
  const sourceIntent =
    typeof parsed.sourceIntent === "string" ? parsed.sourceIntent.slice(0, 1000) : "";
  const listingMode = parsed.listingMode === true || (!!sourceIntent && isListingBrief(sourceIntent));
  const locationId = typeof parsed.locationId === "string" ? parsed.locationId : null;
  const quality: NanoBananaQuality = parsed.quality === "pro" ? "pro" : "standard";

  if (quality === "pro" || locationId) {
    try {
      const gate = await withTenantDb(auth, async (tx) => {
        if (locationId) {
          const access = await resolveAccess(auth.userId, locationId, tx);
          if (!access.hasAccess) return { ok: false as const, reason: "forbidden" as const };
        }
        if (quality === "pro") {
          const org = await tx.organization.findUnique({
            where: { id: auth.tenantId },
            select: { plan: true, brandEngine: true },
          });
          const entitled = org ? isProImageEntitled(org.plan, org.brandEngine) : false;
          if (!entitled) return { ok: false as const, reason: "pro_required" as const };
        }
        return { ok: true as const };
      });
      if (!gate.ok) {
        if (gate.reason === "forbidden") {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        return NextResponse.json(
          {
            error: "Pro image model requires an eligible plan.",
            code: "PRO_REQUIRED",
          },
          { status: 403 },
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Could not verify plan entitlements" },
        { status: 503 },
      );
    }
  }

  const requestedSize =
    parsed.imageSize === "4K" || parsed.imageSize === "2K" || parsed.imageSize === "1K"
      ? (parsed.imageSize as NanoBananaImageSize)
      : null;
  // Pro defaults to 2K; Flash can take an explicit size (defaults to API 1K).
  const imageSize: NanoBananaImageSize | null =
    requestedSize ?? (quality === "pro" ? "2K" : null);

  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  if (prompt.length > 2000) {
    return NextResponse.json({ error: "Prompt too long (2000 char max)" }, { status: 400 });
  }

  if (
    referenceImage != null &&
    referenceImage !== "" &&
    typeof referenceImage !== "string"
  ) {
    return NextResponse.json({ error: "referenceImage must be a string URL" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  const refInline =
    typeof referenceImage === "string" && referenceImage.trim()
      ? await referenceImageToGeminiInline(referenceImage)
      : null;
  if (
    typeof referenceImage === "string" &&
    referenceImage.trim() &&
    !refInline
  ) {
    return NextResponse.json(
      { error: "Could not read your listing photo. Try a smaller JPG or PNG." },
      { status: 422 },
    );
  }
  if (listingMode && !refInline) {
    return NextResponse.json(
      { error: "Listing posts need your property photo attached." },
      { status: 422 },
    );
  }

  const hasReference = !!refInline;
  let promptForModel = hasReference ? prompt : enrichScenicBrief(prompt);

  // Direct briefs (no compose/reprompt Claude step, no reference photo) get the
  // hidden art-director expansion: brand palette, vertical aesthetic, geography.
  // expandImageBrief returns the original brief on any failure — never blocks.
  const alreadyComposed = parsed.composed === true;
  if (!hasReference && !alreadyComposed) {
    const businessType =
      typeof parsed.businessType === "string" ? parsed.businessType.slice(0, 120) : undefined;
    const [brandContext, geography] = await Promise.all([
      parsed.brandLock === false
        ? Promise.resolve("")
        : buildTenantImageBrandContext(auth, { locationId }),
      buildTenantGeography(auth, locationId),
    ]);
    promptForModel = await expandImageBrief({
      brief: promptForModel,
      aspectRatio,
      businessType,
      brandContext: brandContext || undefined,
      geography: geography || undefined,
    });
  }

  const listingRef = refInline && (listingMode || isListingBrief(sourceIntent || prompt));
  const refPreamble = listingRef
    ? `Edit the attached listing photograph only. The property/building MUST remain identical — same house, same facade, same roofline, same windows. Do not invent a different property or substitute generic lifestyle props. Apply only: `
    : `Edit the reference photograph. The main subject in the reference image must stay identical — same food item, same object, same identity. Do not swap subjects. Apply only: `;

  // Engine: design-lane prompts (Director-approved typography) go to GPT Image
  // when configured — it composes full layouts. Photo lanes + all reference
  // edits stay Gemini. `engine` body param is an explicit override for
  // bake-off testing; without OPENAI_API_KEY everything runs Gemini as before.
  const allowText = parsed.allowText === true && parsed.composed === true && !hasReference;
  const engineOverride =
    parsed.engine === "gpt" || parsed.engine === "gemini" ? parsed.engine : null;
  const useGptEngine =
    (engineOverride === "gpt" || (allowText && engineOverride !== "gemini")) &&
    gptImageConfigured() &&
    !hasReference;

  // Suffix: designed graphics may carry typography — never append the photo
  // lane's "no text" clause to them.
  const vividHint = allowText
    ? TEXT_ON_IMAGE_SUFFIX
    : useGptEngine
      ? GPT_DESIGN_SUFFIX
      : hasReference
        ? generationSuffixForBrief(sourceIntent || promptForModel, true)
        : generationSuffixForBrief(sourceIntent || promptForModel, false);

  async function runGeneration(promptText: string) {
    const fullPrompt = (hasReference ? `${refPreamble}${promptText}` : promptText) + vividHint;
    if (useGptEngine) {
      return generateGptImage({
        apiKey: process.env.OPENAI_API_KEY!.trim(),
        prompt: fullPrompt,
        aspectRatio,
        quality,
      });
    }
    return generateNanoBananaImage({
      apiKey: apiKey!,
      quality,
      prompt: fullPrompt,
      aspectRatio,
      imageSize,
      reference: refInline
        ? { mimeType: refInline.mimeType, data: refInline.data }
        : null,
    });
  }

  try {
    let result = await runGeneration(promptForModel);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, ...(result.text ? { text: result.text } : {}) },
        { status: result.status >= 400 && result.status < 600 ? result.status : 502 },
      );
    }

    let retriedForQuality = false;
    // Skip the darkness retry for GPT designs: dark editorial layouts are a
    // deliberate style there, and a retry doubles a slow generation.
    if (!hasReference && !useGptEngine && (await isImageTooDark(result.rawBase64))) {
      const retry = await runGeneration(promptForModel + REAL_PHOTO_EXPOSURE_RETRY_SUFFIX);
      if (retry.ok) {
        result = retry;
        retriedForQuality = true;
      }
    }

    return NextResponse.json({
      image: result.imageDataUrl,
      text: result.text,
      model: quality,
      modelId: result.model,
      imageSize: imageSize ?? "1K",
      ...(retriedForQuality ? { retriedForQuality: true } : {}),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 },
    );
  }
}
