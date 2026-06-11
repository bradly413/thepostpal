import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/api-auth";
import { rateLimit, buildRateLimitKey, RateLimitUnavailableError } from "@/lib/rate-limit";

const LEONARDO_BASE = "https://cloud.leonardo.ai/api/rest/v1";

export async function GET(req: NextRequest) {
  let auth;
  try { auth = await requireAuthContext(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  try {
    if (!(await rateLimit(buildRateLimitKey("leonardo-status", req.headers, auth), 20, 60_000))) {
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

  const variationId = req.nextUrl.searchParams.get("id");
  if (!variationId) {
    return NextResponse.json(
      { error: "id query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(`${LEONARDO_BASE}/variations/${variationId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Leonardo status error:", res.status, err);
      return NextResponse.json(
        { error: "Failed to check status" },
        { status: res.status }
      );
    }

    const data = await res.json();
    const variation = data.generated_image_variation_generic?.[0];

    if (!variation) {
      // Still processing
      return NextResponse.json({
        status: "PENDING",
        imageUrl: null,
      });
    }

    const status = variation.status || "PENDING";
    const imageUrl = variation.url || null;

    return NextResponse.json({
      status,
      imageUrl,
      id: variation.id,
    });
  } catch (err) {
    console.error("Leonardo status error:", err);
    return NextResponse.json(
      { error: "Status check failed" },
      { status: 500 }
    );
  }
}
