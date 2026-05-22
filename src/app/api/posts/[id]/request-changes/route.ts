import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/api-auth";
import { resolveAccess } from "@/lib/authz";
import { loadApprovalByScheduledPostId, applyAndPersistTransition } from "@/lib/post-approval-service";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(_: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const auth = await requireAuthContext();
    const approval = await loadApprovalByScheduledPostId(id, auth.organizationId);
    if (!approval) return NextResponse.json({ error: "Approval not found" }, { status: 404 });

    const access = await resolveAccess(auth.userId, approval.locationId);
    if (!access.hasAccess || !access.canApprove) {
      return NextResponse.json({ error: "Reviewer access required" }, { status: 403 });
    }

    const result = await applyAndPersistTransition(approval.id, auth.userId, {
      type: "request_changes",
      actorUserId: auth.userId,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 409 });
    }

    return NextResponse.json({ approval: result.approval });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
