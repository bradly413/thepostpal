import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import { resolveAccess } from "@/lib/authz";
import { loadApprovalByScheduledPostId, applyAndPersistTransition } from "@/lib/post-approval-service";
import { handleRouteError } from "@/lib/route-errors";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(_: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const auth = await requireAuthContext();
    return await withTenantDb(auth, async (tx) => {
      const approval = await loadApprovalByScheduledPostId(id, auth.tenantId, tx);
      if (!approval) return NextResponse.json({ error: "Approval not found" }, { status: 404 });

      const access = await resolveAccess(auth.userId, approval.locationId, tx);
      if (!access.hasAccess || !access.canApprove) {
        return NextResponse.json({ error: "Reviewer access required" }, { status: 403 });
      }

      const result = await applyAndPersistTransition(approval.id, auth.userId, {
        type: "approve",
        actorUserId: auth.userId,
      }, tx);

      if (!result.ok) {
        return NextResponse.json({ error: result.reason }, { status: 409 });
      }

      return NextResponse.json({ approval: result.approval });
    });
  } catch (err) {
    return handleRouteError("api.posts.approve", err);
  }
}
