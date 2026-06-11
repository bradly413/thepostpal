import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { requireAuthContext, type AuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import { isProImageEntitled } from "@/lib/plan-features";

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

  const ip = getClientIp(req.headers);
  if (!rateLimit(`gen-image:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let parsed: {
    prompt?: unknown;
    aspectRatio?: unknown;
    referenceImage?: unknown;
    quality?: unknown;
    imageSize?: unknown;
  };
  try {
    parsed = (await req.json()) as typeof parsed;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const prompt = typeof parsed.prompt === "string" ? parsed.prompt : "";
  const aspectRatio = typeof parsed.aspectRatio === "string" ? parsed.aspectRatio : "1:1";
  const referenceImage = parsed.referenceImage;

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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  const parts: Record<string, unknown>[] = [];

  if (referenceImage && typeof referenceImage === "string") {
    const match = referenceImage.match(/^data:(.+?);base64,(.+)$/);
    if (match) {
      parts.push({
        inlineData: {
          mimeType: match[1],
          data: match[2],
        },
      });
    }
  }

  // Gemini image gen has no aspectRatio config field — hint it in the prompt
  // so portrait/landscape platform formats aren't all returned square.
  const ratioHint =
    aspectRatio && aspectRatio !== "1:1" ? ` Compose the image in a ${aspectRatio} aspect ratio.` : "";
  parts.push({
    text:
      (referenceImage && typeof referenceImage === "string"
        ? `Using the uploaded image as a reference, generate a new image based on this description: ${prompt}`
        : prompt) + ratioHint,
  });

  try {
    const model = IMAGE_MODELS[quality];
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [
            {
              parts,
            },
          ],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
            responseMimeType: "text/plain",
            // Pro supports native aspect/size config; standard keeps the prompt hint.
            ...(quality === "pro"
              ? { imageConfig: { aspectRatio, ...(imageSize ? { imageSize } : {}) } }
              : {}),
          },
        }),
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Image generation failed" },
        { status: res.status }
      );
    }

    const data = await res.json();
    const responseParts = data.candidates?.[0]?.content?.parts || [];

    let imageData: string | null = null;
    let mimeType: string = "image/png";
    let textResponse: string = "";

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
      return NextResponse.json(
        { error: "No image was generated. Try a different prompt.", text: textResponse },
        { status: 422 }
      );
    }

    return NextResponse.json({
      image: `data:${mimeType};base64,${imageData}`,
      text: textResponse,
      model: quality, // which tier actually ran (pro requests may fall back)
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    );
  }
}
