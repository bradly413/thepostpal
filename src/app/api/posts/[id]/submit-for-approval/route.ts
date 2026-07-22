import { NextRequest, NextResponse } from "next/server";
import { withTenantDb } from "@/lib/db";
import { requireAuthContext } from "@/lib/api-auth";
import { resolveAccess } from "@/lib/authz";
import { handleRouteError } from "@/lib/route-errors";
import {
  blocksClosedBetaVideoPublish,
  CLOSED_BETA_VIDEO_MESSAGE,
} from "@/lib/closed-beta-publish";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(_: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const auth = await requireAuthContext();
    return await withTenantDb(auth, async (tx) => {
      const post = await tx.scheduledPost.findFirst({
        where: { id, organizationId: auth.tenantId },
        include: { location: { include: { approvalRule: true } } },
      });

      if (!post) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }

      if (!post.locationId || !post.location) {
        return NextResponse.json({ error: "Post location is required" }, { status: 400 });
      }

      const access = await resolveAccess(auth.userId, post.locationId, tx);
      if (!access.hasAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const requiresApproval = post.location.approvalRule?.requiresApproval ?? false;
      if (!requiresApproval) {
        // "approved" = the internal cron publish queue (same status the
        // approval flow sets). "scheduled" is never dispatched by the cron.
        if (blocksClosedBetaVideoPublish(post.mediaType, "approved")) {
          return NextResponse.json({ error: CLOSED_BETA_VIDEO_MESSAGE }, { status: 400 });
        }
        const scheduled = await tx.scheduledPost.update({
          where: { id: post.id },
          data: { status: "approved" },
        });
        return NextResponse.json({ post: scheduled, status: "SCHEDULED" });
      }

      const approval = await tx.postApproval.upsert({
        where: { scheduledPostId: post.id },
        create: {
          scheduledPostId: post.id,
          locationId: post.locationId,
          status: "PENDING_REVIEW",
          submittedByUserId: auth.userId,
        },
        update: {
          status: "PENDING_REVIEW",
          submittedByUserId: auth.userId,
          reviewedByUserId: null,
          reviewedAt: null,
        },
      });

      await tx.approvalEvent.create({
        data: {
          postApprovalId: approval.id,
          actorUserId: auth.userId,
          action: "SUBMITTED",
        },
      });

      await tx.scheduledPost.update({
        where: { id: post.id },
        data: { status: "needs_review" },
      });

      return NextResponse.json({ approval, status: "PENDING_REVIEW" });
    });
  } catch (err) {
    return handleRouteError("api.posts.submit-for-approval", err);
  }
}
