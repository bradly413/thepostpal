import Anthropic from "@anthropic-ai/sdk";
import { requireAuthContext, type AuthContext } from "@/lib/api-auth";
import { buildTenantImageBrandContext } from "@/lib/ai-brand-context";
import { withTenantDb } from "@/lib/db";
import { resolveAccess } from "@/lib/authz";
import { rateLimit, buildRateLimitKey, RateLimitUnavailableError } from "@/lib/rate-limit";
import { isInlineReferenceImage } from "@/lib/reference-image";
import { loadVisionJpegBase64 } from "@/lib/studio/vision-image-input";
import { REAL_PHOTO_REFERENCE_SUFFIX } from "@/lib/studio/image-prompt-vivid";

export const runtime = "nodejs";

const MODEL = "claude-sonnet-5";

const REPROMPT_SYSTEM = `You edit social post images for a small local business. The user already has a generated image and wants specific changes — NOT a new subject, NOT a new scene.

You will receive the current image. Study it first.

Return ONLY one dense image-generation prompt (40–90 words) for a text-to-image model.

CRITICAL — subject lock:
- Identify the main subject in the attached image (e.g. cupcake, palm tree, latte, house keys).
- The output prompt MUST depict that EXACT subject — same food item, same object, same identity.
- If the image shows a cupcake, write a cupcake — NEVER swap to a croissant, muffin, donut, or other pastry.
- Only change what the user requested: lighting, exposure, framing, crop, color, background blur, etc.
- If they ask for a closer/brighter shot, keep the same subject and move the camera or lighting — do not replace it.

Hard rules:
- Photographic, vivid, well-exposed — no gloomy grading
- NO text, logos, or watermarks
- Return ONLY the prompt — no preamble, no quotes, no markdown`;

export async function POST(req: Request) {
  let auth: AuthContext;
  try {
    auth = await requireAuthContext();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!(await rateLimit(buildRateLimitKey("studio-reprompt", req.headers as unknown as Headers, auth), 15, 60_000))) {
      return Response.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
    }
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return Response.json({ error: "Rate limit unavailable" }, { status: 503 });
    }
    throw error;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "AI service not configured" }, { status: 500 });
  }

  let body: {
    delta?: unknown;
    previousPrompt?: unknown;
    referenceImage?: unknown;
    locationId?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const delta = typeof body.delta === "string" ? body.delta.trim() : "";
  const previousPrompt =
    typeof body.previousPrompt === "string" ? body.previousPrompt.trim() : "";
  const referenceImage = body.referenceImage;

  if (!delta || delta.length > 500) {
    return Response.json({ error: "delta required (max 500 chars)" }, { status: 400 });
  }
  if (!previousPrompt) {
    return Response.json({ error: "previousPrompt required" }, { status: 400 });
  }
  if (!isInlineReferenceImage(referenceImage) && typeof referenceImage !== "string") {
    return Response.json({ error: "referenceImage required" }, { status: 400 });
  }

  const locationId = typeof body.locationId === "string" ? body.locationId : null;
  if (locationId) {
    const allowed = await withTenantDb(auth, async (tx) => {
      const access = await resolveAccess(auth.userId, locationId, tx);
      return access.hasAccess;
    });
    if (!allowed) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const imageB64 = await loadVisionJpegBase64(
    typeof referenceImage === "string" ? referenceImage : "",
  );
  if (!imageB64) {
    return Response.json({ error: "Could not read the reference image" }, { status: 400 });
  }

  const brandContext = await buildTenantImageBrandContext(auth, { locationId });

  try {
    const client = new Anthropic({ apiKey, timeout: 12_000, maxRetries: 1 });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      system: REPROMPT_SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: "image/jpeg", data: imageB64 },
            },
            {
              type: "text",
              text: [
                brandContext ? `Brand visual direction:\n${brandContext}` : null,
                `Original brief: ${previousPrompt}`,
                `Requested changes: ${delta}`,
              ]
                .filter(Boolean)
                .join("\n\n"),
            },
          ],
        },
      ],
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";
    if (text.length < 20 || text.length > 2000) {
      return Response.json({ error: "Could not interpret your changes" }, { status: 502 });
    }

    return Response.json({
      imagePrompt:
        text +
        " Keep the exact same main subject as the reference image — no subject swap." +
        REAL_PHOTO_REFERENCE_SUFFIX,
    });
  } catch {
    return Response.json({ error: "Reprompt failed" }, { status: 500 });
  }
}
