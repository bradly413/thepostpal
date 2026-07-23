import { NextRequest, NextResponse } from "next/server";
import { rateLimit, buildRateLimitKey, RateLimitUnavailableError } from "@/lib/rate-limit";
import { requireAuthContext } from "@/lib/api-auth";
import { expandImageBrief } from "@/lib/studio/art-director";
import {
  buildTenantImageBrandContext,
  buildTenantGeography,
} from "@/lib/ai-brand-context";

export async function POST(req: NextRequest) {
  let auth;
  try { auth = await requireAuthContext(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    if (!(await rateLimit(buildRateLimitKey("enhance", req.headers, auth), 15, 60_000))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return NextResponse.json({ error: "Rate limit unavailable" }, { status: 503 });
    }
    throw error;
  }

  const body = (await req.json()) as {
    prompt?: unknown;
    locationId?: unknown;
    businessType?: unknown;
    brandLock?: unknown;
  };
  const prompt = typeof body.prompt === "string" ? body.prompt : "";

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  if (prompt.length > 2000) {
    return NextResponse.json({ error: "Prompt too long (2000 char max)" }, { status: 400 });
  }

  // Preferred path: the art director — brand palette, vertical aesthetic, and
  // geography aware. Returns the original brief unchanged on any failure.
  if (process.env.ANTHROPIC_API_KEY?.trim()) {
    const locationId = typeof body.locationId === "string" ? body.locationId : null;
    const [brandContext, geography] = await Promise.all([
      body.brandLock === false
        ? Promise.resolve("")
        : buildTenantImageBrandContext(auth, { locationId }),
      buildTenantGeography(auth, locationId),
    ]);
    const enhanced = await expandImageBrief({
      brief: prompt,
      businessType: typeof body.businessType === "string" ? body.businessType.slice(0, 120) : undefined,
      brandContext: brandContext || undefined,
      geography: geography || undefined,
    });
    if (enhanced.trim() && enhanced.trim() !== prompt.trim()) {
      return NextResponse.json({ enhanced: enhanced.trim() });
    }
    // Fall through to the legacy enhancer if the expansion was a no-op.
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are an expert image prompt engineer. Take the user's rough image description and enhance it into a detailed, vivid prompt optimized for AI image generation. Add specific details about lighting, composition, color palette, mood, and style. Keep it concise (2-3 sentences max). Only return the enhanced prompt text, nothing else.\n\nUser prompt: ${prompt}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 200,
          },
        }),
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Enhancement failed" }, { status: res.status });
    }

    const data = await res.json();
    const enhanced = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!enhanced) {
      return NextResponse.json({ error: "No enhanced prompt returned" }, { status: 422 });
    }

    return NextResponse.json({ enhanced });
  } catch {
    return NextResponse.json({ error: "Enhancement failed" }, { status: 500 });
  }
}
