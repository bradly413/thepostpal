import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/api-auth";
import { resolveAccess } from "@/lib/authz";
import { withTenantDb } from "@/lib/db";
import type { DraftStatus } from "@/lib/posterboy-types";

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function computeStats(posts: { status: DraftStatus }[]) {
  return {
    total: posts.length,
    approved: posts.filter((p) => p.status === "approved" || p.status === "published").length,
    scheduled: posts.filter((p) => p.status === "scheduled").length,
    needsReview: posts.filter(
      (p) => p.status === "needs_review" || p.status === "needs_revision",
    ).length,
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthContext();
    const locationId = request.nextUrl.searchParams.get("locationId");

    return await withTenantDb(auth, async (tx) => {
      if (locationId) {
        const access = await resolveAccess(auth.userId, locationId, tx);
        if (!access.hasAccess) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }

      const issues = await tx.issue.findMany({
        where: {
          organizationId: auth.tenantId,
          ...(locationId ? { locationId } : {}),
        },
        orderBy: { weekStart: "desc" },
        take: 50,
      });

      const enriched = await Promise.all(
        issues.map(async (issue) => {
          const posts = await tx.scheduledPost.findMany({
            where: {
              organizationId: auth.tenantId,
              issueId: issue.id,
            },
            select: { status: true },
          });

          return {
            id: issue.id,
            organizationId: issue.organizationId,
            locationId: issue.locationId,
            title: issue.title,
            weekStart: formatDate(issue.weekStart),
            weekEnd: formatDate(issue.weekEnd),
            status: issue.status as "open" | "in_review" | "closed",
            stats: computeStats(posts),
          };
        }),
      );

      return NextResponse.json({ issues: enriched });
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
