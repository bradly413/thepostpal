import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import { getPages } from "@/lib/meta";
import { resolveAccess } from "@/lib/authz";
import {
  META_OAUTH_PENDING_COOKIE,
  openMetaOAuthPending,
} from "@/lib/meta-oauth-pending";

/**
 * GET /api/auth/meta/pending
 * Lists Facebook Pages available to attach to the pending OAuth location.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuthContext();
    const sealed = req.cookies.get(META_OAUTH_PENDING_COOKIE)?.value;
    if (!sealed) {
      return NextResponse.json({ error: "No pending Meta connection" }, { status: 404 });
    }

    const pending = openMetaOAuthPending(sealed);
    if (!pending) {
      return NextResponse.json({ error: "Pending session expired" }, { status: 410 });
    }

    const location = await withTenantDb(auth, async (tx) => {
      const access = await resolveAccess(auth.userId, pending.locationId, tx);
      if (!access.hasAccess) throw new Error("FORBIDDEN");
      return tx.location.findFirst({
        where: { id: pending.locationId, organizationId: auth.tenantId },
        select: { id: true, name: true },
      });
    });

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    const pages = await getPages(pending.userToken);

    return NextResponse.json({
      locationId: location.id,
      locationName: location.name,
      returnTo: pending.returnTo,
      pages: pages.map((p) => ({ id: p.id, name: p.name })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export const dynamic = "force-dynamic";
