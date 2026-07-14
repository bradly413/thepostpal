import { NextRequest, NextResponse } from "next/server";
import { buildRateLimitKey, rateLimit, RateLimitUnavailableError } from "@/lib/rate-limit";

/**
 * GET /api/geocode/reverse?lat=&lon=
 * Server-side Nominatim reverse geocode so the client stays within CSP
 * (connect-src 'self' only — no browser call to openstreetmap.org).
 * Public for guest onboarding — IP rate limited.
 */
export async function GET(req: NextRequest) {
  try {
    if (
      !(await rateLimit(
        buildRateLimitKey("geocode-reverse", req.headers),
        30,
        60_000,
      ))
    ) {
      return NextResponse.json({ error: "Too many location lookups" }, { status: 429 });
    }
  } catch (error) {
    if (!(error instanceof RateLimitUnavailableError)) throw error;
  }

  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lon = Number(req.nextUrl.searchParams.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));
    url.searchParams.set("format", "json");

    const res = await fetch(url.toString(), {
      headers: {
        "Accept-Language": "en",
        // Nominatim usage policy requires a valid identifying UA.
        "User-Agent": "PosterboySocial/1.0 (onboarding; https://www.posterboysocial.com)",
      },
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Geocoder unavailable" }, { status: 502 });
    }

    const data = (await res.json()) as {
      address?: {
        city?: string;
        town?: string;
        village?: string;
        hamlet?: string;
        county?: string;
        state?: string;
        country?: string;
      };
      display_name?: string;
    };

    const a = data.address ?? {};
    const city = a.city || a.town || a.village || a.hamlet || a.county || "";
    const region = a.state || "";
    const place = [city, region].filter(Boolean).join(", ");

    return NextResponse.json({
      place: place || data.display_name || "",
      city,
      region,
      country: a.country || "",
    });
  } catch (err) {
    console.error(
      "api.geocode.reverse",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ error: "Geocoder failed" }, { status: 502 });
  }
}

export const dynamic = "force-dynamic";
