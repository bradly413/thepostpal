import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import { publishToMeta } from "@/lib/social/meta-publisher";

/**
 * GET /api/test-publish?locationId=...
 * Lists SocialAccount rows for the tenant (dev / ENABLE_TEST_PUBLISH).
 *
 * POST /api/test-publish
 * Dev-only Meta publish smoke test.
 *
 * Body: { socialAccountId: string, imageUrl: string, caption?: string }
 * Requires auth + ENABLE_TEST_PUBLISH=true (or non-production).
 */
function isTestPublishEnabled() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ENABLE_TEST_PUBLISH === "true"
  );
}

export async function GET(req: NextRequest) {
  if (!isTestPublishEnabled()) {
    return NextResponse.json({ error: "Test publish disabled" }, { status: 403 });
  }

  let auth;
  try {
    auth = await requireAuthContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const locationId = req.nextUrl.searchParams.get("locationId") ?? undefined;

  const accounts = await withTenantDb(auth, async (tx) =>
    tx.socialAccount.findMany({
      where: {
        organizationId: auth.tenantId,
        ...(locationId ? { locationId } : {}),
      },
      select: {
        id: true,
        provider: true,
        accountId: true,
        accountName: true,
        locationId: true,
        tokenExpiresAt: true,
        updatedAt: true,
      },
      orderBy: { provider: "asc" },
    }),
  );

  return NextResponse.json({ accounts });
}

export async function POST(req: NextRequest) {
  if (!isTestPublishEnabled()) {
    return NextResponse.json({ error: "Test publish disabled" }, { status: 403 });
  }

  let auth;
  try {
    auth = await requireAuthContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { socialAccountId?: string; imageUrl?: string; caption?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { socialAccountId, imageUrl, caption } = body;
  if (!socialAccountId?.trim() || !imageUrl?.trim()) {
    return NextResponse.json(
      { error: "socialAccountId and imageUrl are required" },
      { status: 400 },
    );
  }

  try {
    const account = await withTenantDb(auth, async (tx) =>
      tx.socialAccount.findFirst({
        where: { id: socialAccountId, organizationId: auth.tenantId },
        select: { id: true, provider: true, accountName: true, locationId: true },
      }),
    );

    if (!account) {
      return NextResponse.json({ error: "SocialAccount not found for tenant" }, { status: 404 });
    }

    const result = await publishToMeta(
      socialAccountId,
      imageUrl.trim(),
      caption?.trim() || "Posterboy test publish",
    );

    return NextResponse.json({
      ok: true,
      account,
      result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Publish failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
