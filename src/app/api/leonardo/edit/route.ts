import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/api-auth";
import { rateLimit, buildRateLimitKey, RateLimitUnavailableError } from "@/lib/rate-limit";

const LEONARDO_BASE = "https://cloud.leonardo.ai/api/rest/v1";

type EditAction = "upscale" | "remove-bg" | "inpaint";

export async function POST(req: NextRequest) {
  let auth;
  try { auth = await requireAuthContext(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  try {
    if (!(await rateLimit(buildRateLimitKey("leonardo-edit", req.headers, auth), 10, 60_000))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return NextResponse.json({ error: "Rate limit unavailable" }, { status: 503 });
    }
    throw error;
  }

  const apiKey = process.env.LEONARDO_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "LEONARDO_API_KEY not configured" },
      { status: 500 }
    );
  }

  const { action, imageId, options } = (await req.json()) as {
    action: EditAction;
    imageId: string;
    options?: {
      prompt?: string;
      style?: string;
      upscaleMultiplier?: number;
      creativityStrength?: number;
      // Inpainting-specific
      imageDataUrl?: string;
      maskDataUrl?: string;
      strength?: number;
    };
  };

  if (!action || !imageId) {
    return NextResponse.json(
      { error: "action and imageId are required" },
      { status: 400 }
    );
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  try {
    let endpoint: string;
    let body: Record<string, unknown>;

    switch (action) {
      case "upscale":
        endpoint = `${LEONARDO_BASE}/variations/universal-upscaler`;
        body = {
          initImageId: imageId,
          upscaleMultiplier: options?.upscaleMultiplier ?? 1.5,
          creativityStrength: options?.creativityStrength ?? 5,
          upscalerStyle: "GENERAL",
        };
        break;

      case "remove-bg":
        endpoint = `${LEONARDO_BASE}/variations/nobg`;
        body = {
          id: imageId,
          isVariation: false,
        };
        break;

      case "inpaint":
        if (!options?.imageDataUrl || !options?.prompt) {
          return NextResponse.json(
            { error: "imageDataUrl and prompt are required for inpainting" },
            { status: 400 }
          );
        }
        endpoint = `${LEONARDO_BASE}/lcm-inpainting`;
        body = {
          imageDataUrl: options.imageDataUrl,
          maskDataUrl: options.maskDataUrl || null,
          prompt: options.prompt,
          style: options.style || "PHOTOGRAPHY",
          strength: options.strength ?? 0.65,
          width: 1024,
          height: 1024,
        };
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`Leonardo ${action} error:`, res.status, err);
      return NextResponse.json(
        { error: `${action} failed: ${res.statusText}` },
        { status: res.status }
      );
    }

    const data = await res.json();

    // Different endpoints return variation IDs differently
    let variationId: string | null = null;

    if (action === "inpaint") {
      // LCM inpainting returns the result directly
      const generations = data.lcmGenerationJob?.imageDataUrl;
      if (generations) {
        return NextResponse.json({
          variationId: null,
          directResult: generations,
          status: "COMPLETE",
        });
      }
      // Fall through to check for async job
      variationId =
        data.lcmGenerationJob?.generationId ||
        data.sdGenerationJob?.generationId ||
        null;
    } else {
      // Upscale and nobg return a variation ID to poll
      variationId =
        data.universalUpscaler?.id ||
        data.createVariationNoBg?.id ||
        data.sdUpscaleJob?.id ||
        data.id ||
        null;
    }

    if (!variationId && !data.lcmGenerationJob?.imageDataUrl) {
      console.error("Leonardo unexpected response:", JSON.stringify(data));
      return NextResponse.json(
        { error: "Unexpected response from Leonardo", raw: data },
        { status: 500 }
      );
    }

    return NextResponse.json({
      variationId,
      status: "PENDING",
    });
  } catch (err) {
    console.error(`Leonardo ${action} error:`, err);
    return NextResponse.json(
      { error: `${action} failed` },
      { status: 500 }
    );
  }
}
