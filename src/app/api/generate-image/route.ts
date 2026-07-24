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
import { generateGptImage, gptImageConfigured, type GptImageAction } from "@/lib/studio/gpt-image";
import {
  resolveOpenAiVisionInputs,
  uniqueHttpsUrls,
  type OpenAiVisionDetail,
} from "@/lib/studio/openai-vision-input";
import {
  buildTenantImageBrandContext,
  buildTenantGeography,
} from "@/lib/ai-brand-context";

// Studio: GPT Image 2 (Responses multimodal + edit) · Gemini fallback for listings.

export const maxDuration = 120; // GPT Image 2 + optional Gemini fallback on Pro/High

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
    designLane?: unknown;
    inputImages?: unknown;
    visionDetail?: unknown;
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
  const openAiConfigured = gptImageConfigured();
  if (!openAiConfigured && !apiKey) {
    return NextResponse.json(
      { error: "Image generation is not configured (OPENAI_API_KEY or GEMINI_API_KEY required)" },
      { status: 500 },
    );
  }

  const refInline =
    typeof referenceImage === "string" && referenceImage.trim()
      ? await referenceImageToGeminiInline(referenceImage)
      : null;
  const hasAttachedReference =
    typeof referenceImage === "string" && referenceImage.trim().length > 0;
  if (hasAttachedReference && !refInline && listingMode) {
    return NextResponse.json(
      { error: "Could not read your listing photo. Try a smaller JPG or PNG." },
      { status: 422 },
    );
  }
  if (listingMode && !hasAttachedReference) {
    return NextResponse.json(
      { error: "Listing posts need your property photo attached." },
      { status: 422 },
    );
  }

  const hasGeminiReference = !!refInline;
  let promptForModel = hasGeminiReference ? prompt : enrichScenicBrief(prompt);

  const inputImages = uniqueHttpsUrls(
    Array.isArray(parsed.inputImages)
      ? parsed.inputImages.filter((u): u is string => typeof u === "string")
      : [],
  );
  const visionDetail: OpenAiVisionDetail =
    parsed.visionDetail === "low" ||
    parsed.visionDetail === "high" ||
    parsed.visionDetail === "original" ||
    parsed.visionDetail === "auto"
      ? parsed.visionDetail
      : "auto";

  // Direct briefs (no compose/reprompt Claude step, no reference photo) get the
  // hidden art-director expansion: brand palette, vertical aesthetic, geography.
  // expandImageBrief returns the original brief on any failure — never blocks.
  const alreadyComposed = parsed.composed === true;
  if (!hasGeminiReference && !alreadyComposed) {
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

  const listingRef =
    hasGeminiReference && (listingMode || isListingBrief(sourceIntent || prompt));
  const refPreamble = listingRef
    ? `Edit the attached listing photograph only. The property/building MUST remain identical — same house, same facade, same roofline, same windows. Do not invent a different property or substitute generic lifestyle props. Apply only: `
    : `Edit the reference photograph. The main subject in the reference image must stay identical — same food item, same object, same identity. Do not swap subjects. Apply only: `;

  const engineOverride =
    parsed.engine === "gpt" || parsed.engine === "gemini" ? parsed.engine : null;
  const openAiKey = openAiConfigured ? process.env.OPENAI_API_KEY!.trim() : "";
  const gptEditEligible =
    hasAttachedReference && !listingRef && openAiConfigured && engineOverride !== "gemini";
  const useGptEngine =
    openAiConfigured && engineOverride !== "gemini" && (!hasGeminiReference || gptEditEligible);
  const gptOnly = engineOverride === "gpt";

  const designLane =
    parsed.designLane === true && parsed.composed === true && !listingRef;
  const allowText = parsed.allowText === true && parsed.composed === true && !listingRef;

  const visionSources = gptEditEligible
    ? [referenceImage as string]
    : inputImages;
  let visionImages: Awaited<ReturnType<typeof resolveOpenAiVisionInputs>> = [];
  if (useGptEngine && visionSources.length > 0) {
    try {
      visionImages = await resolveOpenAiVisionInputs({
        apiKey: openAiKey,
        sources: visionSources,
        detail: visionDetail,
      });
    } catch {
      visionImages = [];
    }
  }

  const gptAction: GptImageAction = gptEditEligible
    ? "edit"
    : designLane || visionImages.length > 0
      ? "generate"
      : "generate";

  const vividHint = allowText
    ? TEXT_ON_IMAGE_SUFFIX
    : designLane
      ? GPT_DESIGN_SUFFIX
      : hasGeminiReference
        ? generationSuffixForBrief(sourceIntent || promptForModel, true)
        : generationSuffixForBrief(sourceIntent || promptForModel, false);

  const routeDeadline = Date.now() + 118_000;
  const geminiTimeoutMs = () =>
    Math.min(85_000, Math.max(25_000, routeDeadline - Date.now() - 2_000));

  async function runGeneration(promptText: string) {
    const useGeminiPreamble = hasGeminiReference && !gptEditEligible;
    const fullPrompt = (useGeminiPreamble ? `${refPreamble}${promptText}` : promptText) + vividHint;
    if (useGptEngine) {
      const gptResult = await generateGptImage({
        apiKey: openAiKey,
        prompt: fullPrompt,
        aspectRatio,
        quality,
        visionImages,
        visionDetail,
        action: gptAction,
        forceImageTool: designLane,
        editImageSource: gptEditEligible ? (referenceImage as string) : null,
        preferDirectImagesApi: designLane && visionImages.length === 0,
      });
      if (gptResult.ok || gptOnly || !apiKey) return gptResult;
    }
    if (!apiKey) {
      return {
        ok: false as const,
        status: 502,
        error: "Gemini fallback is not configured.",
      };
    }
    const fallbackTimeout = geminiTimeoutMs();
    if (!hasGeminiReference) {
      return generateNanoBananaImage({
        apiKey: apiKey!,
        quality,
        prompt: fullPrompt,
        aspectRatio,
        imageSize,
        reference: null,
        timeoutMs: fallbackTimeout,
      });
    }
    return generateNanoBananaImage({
      apiKey: apiKey!,
      quality,
      prompt: fullPrompt,
      aspectRatio,
      imageSize,
      reference: { mimeType: refInline!.mimeType, data: refInline!.data },
      timeoutMs: fallbackTimeout,
    });
  }

  try {
    let result = await runGeneration(promptForModel);
    const usedGeminiFallback =
      useGptEngine &&
      !gptOnly &&
      result.ok &&
      !result.model.includes("gpt-image");

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, ...(result.text ? { text: result.text } : {}) },
        { status: result.status >= 400 && result.status < 600 ? result.status : 502 },
      );
    }

    let retriedForQuality = false;
    // Skip the darkness retry for GPT designs: dark editorial layouts are a
    // deliberate style there, and a retry doubles a slow generation.
    if (!hasGeminiReference && !useGptEngine && (await isImageTooDark(result.rawBase64))) {
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
      ...(usedGeminiFallback ? { engineFallback: "gemini" } : {}),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 },
    );
  }
}
