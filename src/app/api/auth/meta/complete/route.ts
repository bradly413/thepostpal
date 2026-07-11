import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/api-auth";
import { getPages } from "@/lib/meta";
import { completeMetaPageConnection } from "@/lib/meta-connect-complete";
import {
  META_OAUTH_PENDING_COOKIE,
  META_OAUTH_RETURN_TO_COOKIE,
  openMetaOAuthPending,
} from "@/lib/meta-oauth-pending";

function clearPendingCookies(response: NextResponse) {
  response.cookies.delete(META_OAUTH_PENDING_COOKIE);
  response.cookies.delete(META_OAUTH_RETURN_TO_COOKIE);
}

/**
 * POST /api/auth/meta/complete
 * Body: { pageId: string } — finishes OAuth after the user picks a Page.
 */
export async function POST(req: NextRequest) {
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

    let body: { pageId?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const pageId = typeof body.pageId === "string" ? body.pageId.trim() : "";
    if (!pageId) {
      return NextResponse.json({ error: "pageId is required" }, { status: 400 });
    }

    const pages = await getPages(pending.userToken);
    const page = pages.find((p) => p.id === pageId);
    if (!page) {
      return NextResponse.json({ error: "That Page is not available on this account" }, { status: 400 });
    }

    const tokenExpiresAt = pending.tokenExpiresAt ? new Date(pending.tokenExpiresAt) : null;
    const connection = await completeMetaPageConnection(
      auth,
      pending.locationId,
      page,
      tokenExpiresAt,
    );

    const response = NextResponse.json({ connection });
    clearPendingCookies(response);
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "SOLO_PROFILE_LIMIT") {
      return NextResponse.json(
        { error: "Solo includes up to 3 connected social profiles." },
        { status: 403 },
      );
    }
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(
      "[api/auth/meta/complete]",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ error: "Could not complete Meta connection" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
