import { NextRequest, NextResponse } from "next/server";
import { withTenantDb } from "@/lib/db";
import { requireAuthContext } from "@/lib/api-auth";
import { resolveAccess } from "@/lib/authz";
import { isSafeMediaUrl } from "@/lib/safe-media-url";
import { rateLimit, buildRateLimitKey, RateLimitUnavailableError } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthContext();
    return await withTenantDb(auth, async (tx) => {
      const locationId = request.nextUrl.searchParams.get("locationId");
      if (!locationId) {
        return NextResponse.json({ error: "locationId is required" }, { status: 400 });
      }

      const access = await resolveAccess(auth.userId, locationId, tx);
      if (!access.hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

      const photos = await tx.photoAsset.findMany({
        where: { organizationId: auth.tenantId, locationId },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({ photos });
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthContext();
    try {
      if (!(await rateLimit(buildRateLimitKey("photos-create", request.headers, auth), 20, 60_000))) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
      }
    } catch (error) {
      if (error instanceof RateLimitUnavailableError) {
        return NextResponse.json({ error: "Rate limit unavailable" }, { status: 503 });
      }
      throw error;
    }
    return await withTenantDb(auth, async (tx) => {
      const body = await request.json();

      const locationId = typeof body.locationId === "string" ? body.locationId : "";
      if (!locationId) {
        return NextResponse.json({ error: "locationId is required" }, { status: 400 });
      }

      const url = typeof body.url === "string" ? body.url.trim() : "";
      if (!url) {
        return NextResponse.json({ error: "url is required" }, { status: 400 });
      }
      if (!isSafeMediaUrl(url)) {
        return NextResponse.json({ error: "url must be a valid http(s) media URL" }, { status: 400 });
      }

      const access = await resolveAccess(auth.userId, locationId, tx);
      if (!access.hasAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const photo = await tx.photoAsset.create({
        data: {
          organizationId: auth.tenantId,
          locationId,
          url,
          mimeType: typeof body.mimeType === "string" ? body.mimeType : null,
          alt: typeof body.alt === "string" ? body.alt : null,
        },
      });

      return NextResponse.json({ photo }, { status: 201 });
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
