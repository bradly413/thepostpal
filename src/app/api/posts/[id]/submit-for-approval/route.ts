import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthContext } from "@/lib/api-auth";
import { resolveAccess } from "@/lib/authz";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(_: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const auth = await requireAuthContext();

    const post = await db.scheduledPost.findFirst({
      where: { id, organizationId: auth.organizationId },
      include: { location: { include: { approvalRule: true } } },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (!post.locationId || !post.location) {
      return NextResponse.json({ error: "Post location is required" }, { status: 400 });
    }

    const access = await resolveAccess(auth.userId, post.locationId);
    if (!access.hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const requiresApproval = post.location.approvalRule?.requiresApproval ?? false;
    if (!requiresApproval) {
      const scheduled = await db.scheduledPost.update({
        where: { id: post.id },
        data: { status: "scheduled" },
      });
      return NextResponse.json({ post: scheduled, status: "SCHEDULED" });
    }

    const approval = await db.postApproval.upsert({
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

    await db.approvalEvent.create({
      data: {
        postApprovalId: approval.id,
        actorUserId: auth.userId,
        action: "SUBMITTED",
      },
    });

    await db.scheduledPost.update({
      where: { id: post.id },
      data: { status: "needs_review" },
    });

    return NextResponse.json({ approval, status: "PENDING_REVIEW" });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
