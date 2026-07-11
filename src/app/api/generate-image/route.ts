import { NextRequest, NextResponse } from "next/server";
import { rateLimit, buildRateLimitKey, RateLimitUnavailableError } from "@/lib/rate-limit";
import { requireAuthContext, type AuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import { isProImageEntitled } from "@/lib/plan-features";
import { expandImageBrief } from "@/lib/studio/art-director";
import { buildTenantImageBrandContext } from "@/lib/ai-brand-context";
import { enrichScenicBrief, generationSuffixForBrief, isListingBrief } from "@/lib/studio/scene-intent";
import { REAL_PHOTO_EXPOSURE_RETRY_SUFFIX } from "@/lib/studio/image-prompt-vivid";
import { isImageTooDark } from "@/lib/studio/image-quality-gate";
import { referenceImageToGeminiInline } from "@/lib/studio/vision-image-input";

// Image model routing — standard for everyone; Pro (Nano Banana Pro) is the
// plan-gated upgrade: sharper detail, better reference fidelity, 2K output.
// Standard = Nano Banana 2 (gemini-3.1-flash-image): Pro-level quality at
// Flash speed, ~$0.067/image — the same model Artlist's toolkit runs.
const IMAGE_MODELS = {
  standard: "gemini-3.1-flash-image",
  pro: "gemini-3-pro-image-preview",
} as const;
type ImageQuality = keyof typeof IMAGE_MODELS;

export async function POST(req: NextRequest) {
  // Require an authenticated session — this route spends Gemini quota.
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

  // Resolve quality: "pro" requires plan entitlement (server-side gate — never
  // trust the client). Unentitled requests gracefully fall back to standard.
  let quality: ImageQuality = parsed.quality === "pro" ? "pro" : "standard";
  if (quality === "pro") {
    try {
      const entitled = await withTenantDb(auth, async (tx) => {
        const org = await tx.organization.findUnique({
          where: { id: auth.tenantId },
          select: { plan: true, brandEngine: true },
        });
        return org ? isProImageEntitled(org.plan, org.brandEngine) : false;
      });
      if (!entitled) quality = "standard";
    } catch {
      quality = "standard";
    }
  }
  const imageSize =
    quality === "pro" && (parsed.imageSize === "2K" || parsed.imageSize === "1K")
      ? parsed.imageSize
      : null;

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

  const geminiKey = apiKey;

  const parts: Record<string, unknown>[] = [];

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
  if (refInline) {
    parts.push({
      inlineData: {
        mimeType: refInline.mimeType,
        data: refInline.data,
      },
    });
  }

  // Hidden art-director pass: expand the short brief into a rich, on-brand
  // image prompt before the model runs (no UI — invisible to the user). Skip it
  // for reference edits (follow the user's literal direction so we don't fight
  // the source photo) and for already-detailed briefs (>320 chars = the user
  // art-directed it themselves). Falls back to the raw brief on any failure.
  const businessType =
    typeof parsed.businessType === "string" ? parsed.businessType.slice(0, 80) : undefined;
  const locationId = typeof parsed.locationId === "string" ? parsed.locationId : null;
  const hasReference = !!refInline;
  // Brand book visual direction (photography style + palette) — "" if no book.
  const brandContext =
    hasReference || prompt.length > 320
      ? ""
      : await buildTenantImageBrandContext(auth, { locationId });
  const promptForModel =
    hasReference || prompt.length > 320
      ? prompt
      : await expandImageBrief({
          brief: enrichScenicBrief(prompt),
          aspectRatio,
          businessType,
          brandContext,
        });

  // Gemini image gen has no aspectRatio config field — hint it in the prompt
  // so portrait/landscape platform formats aren't all returned square.
  const ratioHint =
    aspectRatio && aspectRatio !== "1:1" ? ` Compose the image in a ${aspectRatio} aspect ratio.` : "";

  async function runGeneration(promptText: string, vividHint: string) {
    const requestParts: Record<string, unknown>[] = [...parts];
    const listingRef = refInline && (listingMode || isListingBrief(sourceIntent || prompt));
    const refPreamble = listingRef
      ? `Edit the attached listing photograph only. The property/building MUST remain identical — same house, same facade, same roofline, same windows. Do not invent a different property or substitute generic lifestyle props. Apply only: `
      : `Edit the reference photograph. The main subject in the reference image must stay identical — same food item, same object, same identity. Do not swap subjects. Apply only: `;
    requestParts.push({
      text:
        (refInline ? `${refPreamble}${promptText}` : promptText) + ratioHint + vividHint,
    });

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODELS[quality]}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
        body: JSON.stringify({
          contents: [{ parts: requestParts }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
            responseMimeType: "text/plain",
            ...(quality === "pro"
              ? { imageConfig: { aspectRatio, ...(imageSize ? { imageSize } : {}) } }
              : {}),
          },
        }),
      },
    );

    if (!res.ok) {
      return { ok: false as const, status: res.status, error: "Image generation failed" };
    }

    const data = await res.json();
    const responseParts = data.candidates?.[0]?.content?.parts || [];

    let imageData: string | null = null;
    let mimeType = "image/png";
    let textResponse = "";

    for (const part of responseParts) {
      if (part.inlineData) {
        imageData = part.inlineData.data;
        mimeType = part.inlineData.mimeType || "image/png";
      }
      if (part.text) {
        textResponse += part.text;
      }
    }

    if (!imageData) {
      return {
        ok: false as const,
        status: 422,
        error: "No image was generated. Try a different prompt.",
        text: textResponse,
      };
    }

    return {
      ok: true as const,
      image: `data:${mimeType};base64,${imageData}`,
      text: textResponse,
      rawBase64: imageData,
    };
  }

  try {
    const vividHint = hasReference
      ? generationSuffixForBrief(sourceIntent || promptForModel, true)
      : generationSuffixForBrief(promptForModel, false);
    let result = await runGeneration(promptForModel, vividHint);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, ...(result.text ? { text: result.text } : {}) },
        { status: result.status },
      );
    }

    let retriedForQuality = false;
    if (!hasReference && (await isImageTooDark(result.rawBase64))) {
      const retry = await runGeneration(promptForModel + REAL_PHOTO_EXPOSURE_RETRY_SUFFIX, vividHint);
      if (retry.ok) {
        result = retry;
        retriedForQuality = true;
      }
    }

    return NextResponse.json({
      image: result.image,
      text: result.text,
      model: quality,
      ...(retriedForQuality ? { retriedForQuality: true } : {}),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    );
  }
}
