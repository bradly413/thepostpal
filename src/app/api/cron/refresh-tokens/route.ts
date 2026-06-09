import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { withCronDb } from "@/lib/db";
import { getProvider } from "@/lib/social/providers";
import { encryptToken } from "@/lib/social/token-crypto";

export const runtime = "nodejs";

function verifyCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cutoff = new Date(Date.now() + SEVEN_DAYS_MS);

    // RLS-bypass (superadmin GUC) — cross-tenant scan of SocialAccount.
    const expiring = await withCronDb((tx) =>
      tx.socialAccount.findMany({
        where: { tokenExpiresAt: { lte: cutoff, not: null } },
      }),
    );

    let processed = 0;
    let refreshed = 0;
    let failed = 0;

    for (const account of expiring) {
      processed += 1;
      try {
        const provider = getProvider(account.provider);
        const { newAccessToken, newExpiresAt } = await provider.refreshToken(
          account.accessToken,
        );

        await withCronDb((tx) =>
          tx.socialAccount.update({
            where: { id: account.id },
            data: {
              accessToken: encryptToken(newAccessToken),
              tokenExpiresAt: newExpiresAt ?? null,
            },
          }),
        );
        refreshed += 1;
      } catch (error) {
        failed += 1;
        console.error(
          `[CRON_REFRESH] Failed to refresh SocialAccount ${account.id} (${account.provider}):`,
          error instanceof Error ? error.message : error,
        );
        Sentry.captureException(error, {
          tags: { job: "cron_refresh_tokens" },
          extra: {
            socialAccountId: account.id,
            provider: account.provider,
            organizationId: account.organizationId,
          },
        });

        // Flag for reconnect: there is no status field, so an epoch-0 expiry
        // marks the token as known-stale for the UI to surface.
        await withCronDb((tx) =>
          tx.socialAccount.update({
            where: { id: account.id },
            data: { tokenExpiresAt: new Date(0) },
          }),
        );
      }
    }

    return NextResponse.json({ success: true, processed, refreshed, failed });
  } catch (error) {
    console.error("[CRON_REFRESH_TOKENS_ERROR]", error);
    Sentry.captureException(error, {
      tags: {
        route: "/api/cron/refresh-tokens",
        job: "cron_refresh_tokens",
      },
    });
    await Sentry.flush(2000);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
