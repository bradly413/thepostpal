import { NextRequest, NextResponse } from "next/server";
import { withTenantDb } from "@/lib/db";
import { requireAuthContext } from "@/lib/api-auth";
import { resolveAccess } from "@/lib/authz";
import { handleRouteError } from "@/lib/route-errors";

const VALID_STATUSES = new Set([
  "draft",
  "needs_review",
  "approved",
  "scheduled",
  "published",
  "skipped",
  "needs_revision",
  "failed",
]);

const VALID_MEDIA_TYPES = new Set(["image", "video"]);

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthContext();
    return await withTenantDb(auth, async (tx) => {
      const locationId = request.nextUrl.searchParams.get("locationId");
      const location = request.nextUrl.searchParams.get("location");

      if (!locationId && location !== "all") {
        return NextResponse.json({ error: "locationId is required" }, { status: 400 });
      }

      if (location === "all") {
        const memberships = await tx.locationMembership.findMany({
          where: { userId: auth.userId, location: { organizationId: auth.tenantId } },
          select: { locationId: true },
        });
        const ids = memberships.map((m) => m.locationId);
        const posts = await tx.scheduledPost.findMany({
          where: { organizationId: auth.tenantId, locationId: { in: ids } },
          orderBy: { createdAt: "desc" },
        });
        return NextResponse.json({ posts });
      }

      const access = await resolveAccess(auth.userId, locationId!, tx);
      if (!access.hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

      const posts = await tx.scheduledPost.findMany({
        where: { organizationId: auth.tenantId, locationId: locationId! },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({ posts });
    });
  } catch (error) {
    return handleRouteError("api.posts.GET", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthContext();
    return await withTenantDb(auth, async (tx) => {
      const body = await request.json();

      const locationId = typeof body.locationId === "string" ? body.locationId : "";
      if (!locationId) return NextResponse.json({ error: "locationId is required" }, { status: 400 });

      const access = await resolveAccess(auth.userId, locationId, tx);
      if (!access.hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

      const requestedStatus =
        typeof body.status === "string" && VALID_STATUSES.has(body.status)
          ? body.status
          : "draft";

      const post = await tx.scheduledPost.create({
        data: {
          organizationId: auth.tenantId,
          locationId,
          copy: typeof body.copy === "string" ? body.copy : "",
          platforms: Array.isArray(body.platforms) ? body.platforms : [],
          scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : null,
          status: requestedStatus,
          templateId:
            typeof body.templateId === "string" ? body.templateId : null,
          pillar: typeof body.pillar === "string" ? body.pillar : null,
          mediaUrl: typeof body.mediaUrl === "string" ? body.mediaUrl : null,
          mediaUrls: Array.isArray(body.mediaUrls)
            ? body.mediaUrls.filter((url: unknown) => typeof url === "string" && url.trim())
            : null,
          mediaType:
            typeof body.mediaType === "string" && VALID_MEDIA_TYPES.has(body.mediaType)
              ? body.mediaType
              : null,
        },
      });

      return NextResponse.json({ post }, { status: 201 });
    });
  } catch (error) {
    return handleRouteError("api.posts.POST", error);
  }
}
