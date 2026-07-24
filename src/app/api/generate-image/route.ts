import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
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
import {
  normalizeStudioImageQuality,
  type StudioImageQuality,
} from "@/lib/studio/image-quality";
import { expandImageBrief } from "@/lib/studio/art-director";
import {
  classifyGptFallbackReason,
  generateGptImage,
  gptImageConfigured,
  type GptFallbackReason,
  type GptImageAction,
} from "@/lib/studio/gpt-image";
import {
  referenceRoleForSource,
  resolveOpenAiVisionInputs,
  uniqueHttpsUrls,
  withIndexedReferenceInstructions,
  type OpenAiVisionDetail,
} from "@/lib/studio/openai-vision-input";
import {
  buildTenantImageBrandContext,
  buildTenantGeography,
} from "@/lib/ai-brand-context";
import {
  STUDIO_GEMINI_FALLBACK_RESERVE_MS,
  STUDIO_GEMINI_PROVIDER_TIMEOUT_MS,
  STUDIO_IMAGE_ROUTE_BUDGET_MS,
} from "@/lib/studio/image-generation-budget";
import { isS3Configured, uploadToS3 } from "@/lib/storage";
import { isSafeMediaUrl } from "@/lib/safe-media-url";

// Studio: GPT Image 2 (Responses multimodal + edit) · Gemini fallback for listings.

export const runtime = "nodejs";
export const maxDuration = 300; // High GPT Image 2 (up to 190s) + optional Gemini fallback

// Keep enough of the 300s function window for durable object-storage delivery.
// Vercel Function responses are capped at 4.5 MB, so 2K image bytes must not
// ride back to the browser inside a base64 JSON response.
const STUDIO_IMAGE_DELIVERY_RESERVE_MS = 12_000;
const STUDIO_INLINE_RESPONSE_MAX_BYTES = 4_000_000;

function generatedImageExtension(mimeType: string): string {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "img";
}

export async function POST(req: NextRequest) {
  const routeStartedAt = Date.now();
  // One wall-clock budget for auth, grounding, GPT, and fallback. Delivery gets
  // its own reserve so a completed image can be persisted before maxDuration.
  const routeDeadline =
    routeStartedAt + STUDIO_IMAGE_ROUTE_BUDGET_MS - STUDIO_IMAGE_DELIVERY_RESERVE_MS;

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
  const quality: StudioImageQuality = normalizeStudioImageQuality(parsed.quality);
  const geminiQuality: NanoBananaQuality = quality === "pro" ? "pro" : "standard";

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

  const geminiTimeoutMs = () =>
    Math.min(STUDIO_GEMINI_PROVIDER_TIMEOUT_MS, routeDeadline - Date.now() - 2_000);

  type GptFallbackDiagnostic = {
    reason: GptFallbackReason;
    status: number;
    error: string;
    errorCode?: string;
    provider?: string;
    providerRequestId?: string;
    elapsedMs: number;
  };
  const gptFallbackState: { diagnostic: GptFallbackDiagnostic | null } = {
    diagnostic: null,
  };

  async function runGeneration(promptText: string) {
    const useGeminiPreamble = hasGeminiReference && !gptEditEligible;
    const fullPrompt = (useGeminiPreamble ? `${refPreamble}${promptText}` : promptText) + vividHint;
    if (useGptEngine) {
      const referenceDescriptions = visionImages.map((_, index) =>
        referenceRoleForSource(visionSources[index] ?? "", index, {
          attachedReference: gptEditEligible,
        }),
      );
      const gptPrompt = withIndexedReferenceInstructions(
        fullPrompt,
        referenceDescriptions,
      );
      const gptStartedAt = Date.now();
      const gptResult = await generateGptImage({
        apiKey: openAiKey,
        prompt: gptPrompt,
        aspectRatio,
        quality,
        visionImages,
        visionDetail,
        action: gptAction,
        forceImageTool: designLane,
        editImageSource: gptEditEligible ? (referenceImage as string) : null,
        // OpenAI recommends the direct Images API for clean one-shot
        // generation; keep Responses for multimodal and iterative work.
        preferDirectImagesApi: gptAction === "generate" && visionImages.length === 0,
        deadlineMs: routeDeadline,
        fallbackReserveMs:
          !gptOnly && apiKey ? STUDIO_GEMINI_FALLBACK_RESERVE_MS : 0,
      });
      if (gptResult.ok || gptOnly || !apiKey) return gptResult;
      gptFallbackState.diagnostic = {
        reason: classifyGptFallbackReason(gptResult.status, gptResult.error),
        status: gptResult.status,
        error: gptResult.error,
        errorCode: gptResult.errorCode,
        provider: gptResult.provider,
        providerRequestId: gptResult.requestId,
        elapsedMs: Date.now() - gptStartedAt,
      };
      console.warn("[studio-image] GPT Image fallback", {
        ...gptFallbackState.diagnostic,
        quality,
        aspectRatio,
        designLane,
      });
    }
    if (!apiKey) {
      return {
        ok: false as const,
        status: 502,
        error: "Gemini fallback is not configured.",
      };
    }
    const fallbackTimeout = geminiTimeoutMs();
    if (fallbackTimeout < 1_000) {
      return {
        ok: false as const,
        status: 504,
        error: "Image generation timed out. Try Standard quality or a shorter brief.",
      };
    }
    if (!hasGeminiReference) {
      return generateNanoBananaImage({
        apiKey: apiKey!,
        quality: geminiQuality,
        prompt: fullPrompt,
        aspectRatio,
        imageSize,
        reference: null,
        timeoutMs: fallbackTimeout,
      });
    }
    return generateNanoBananaImage({
      apiKey: apiKey!,
      quality: geminiQuality,
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
      const diagnostic = gptFallbackState.diagnostic;
      if (diagnostic) {
        console.error("[studio-image] GPT Image and Posterboy Visual failed", {
          ...diagnostic,
          fallbackStatus: result.status,
          fallbackError: result.error,
          quality,
          aspectRatio,
          designLane,
        });
      }
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

    const responseMeta = {
      text: result.text,
      model: quality,
      modelId: result.model,
      imageSize: imageSize ?? "1K",
      ...(retriedForQuality ? { retriedForQuality: true } : {}),
      ...(usedGeminiFallback
        ? {
            engineFallback: "gemini",
            engineFallbackReason:
              gptFallbackState.diagnostic?.reason ?? ("provider_error" as const),
          }
        : {}),
    };
    const mimeType = /^image\/[a-z0-9.+-]+$/i.test(result.mimeType)
      ? result.mimeType.toLowerCase()
      : "image/jpeg";
    const imageBytes = Buffer.from(result.rawBase64, "base64");
    const inlineResponse = {
      image: result.imageDataUrl,
      ...responseMeta,
    };
    const inlineResponseBytes = Buffer.byteLength(JSON.stringify(inlineResponse));

    if (imageBytes.length === 0) {
      return NextResponse.json(
        {
          error: "Image generation finished without image data. Please try again.",
          code: "GENERATED_IMAGE_EMPTY",
        },
        { status: 502 },
      );
    }

    if (isS3Configured()) {
      try {
        const filename = `${randomUUID()}.${generatedImageExtension(mimeType)}`;
        const uploaded = await uploadToS3({
          key: `tenants/${auth.tenantId}/studio/${filename}`,
          body: imageBytes,
          contentType: mimeType,
        });

        let registeredInLibrary = false;
        if (locationId && isSafeMediaUrl(uploaded.url)) {
          try {
            await withTenantDb(auth, async (tx) => {
              await tx.photoAsset.create({
                data: {
                  organizationId: auth.tenantId,
                  locationId,
                  url: uploaded.url,
                  mimeType,
                  alt: (sourceIntent || prompt).trim().slice(0, 200) || "Studio generation",
                },
              });
            });
            registeredInLibrary = true;
          } catch (error) {
            // The durable image is still usable; library registration is best-effort.
            console.warn("[studio-image] media registration failed", {
              elapsedMs: Date.now() - routeStartedAt,
              error: error instanceof Error ? error.message : "unknown",
            });
          }
        }

        const hostedResponse = {
          image: uploaded.url,
          ...responseMeta,
        };
        console.info("[studio-image] completed", {
          elapsedMs: Date.now() - routeStartedAt,
          modelId: result.model,
          quality,
          aspectRatio,
          imageBytes: imageBytes.length,
          responseBytes: Buffer.byteLength(JSON.stringify(hostedResponse)),
          delivery: "object-storage",
          registeredInLibrary,
        });
        return NextResponse.json(hostedResponse);
      } catch (error) {
        console.error("[studio-image] object-storage delivery failed", {
          elapsedMs: Date.now() - routeStartedAt,
          imageBytes: imageBytes.length,
          inlineResponseBytes,
          error: error instanceof Error ? error.message : "unknown",
        });
      }
    }

    // Local development can still use compact inline results. Never send a
    // response that risks being truncated by the platform proxy.
    if (inlineResponseBytes > STUDIO_INLINE_RESPONSE_MAX_BYTES) {
      return NextResponse.json(
        {
          error:
            "The image finished, but it was too large to deliver safely. Try Standard quality.",
          code: "GENERATED_IMAGE_DELIVERY_FAILED",
        },
        { status: 502 },
      );
    }

    console.info("[studio-image] completed", {
      elapsedMs: Date.now() - routeStartedAt,
      modelId: result.model,
      quality,
      aspectRatio,
      imageBytes: imageBytes.length,
      responseBytes: inlineResponseBytes,
      delivery: "inline",
      registeredInLibrary: false,
    });
    return NextResponse.json(inlineResponse);
  } catch (error) {
    console.error("[studio-image] generation failed", {
      elapsedMs: Date.now() - routeStartedAt,
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 },
    );
  }
}
