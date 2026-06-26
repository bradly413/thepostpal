import "server-only";

import * as Sentry from "@sentry/nextjs";
import type { DraftStatus } from "@prisma/client";
import { MetaApiError, publishToMeta } from "@/lib/meta-api";
import { loadMetaBundleSecretsForCron } from "@/lib/meta-social-db";
import { withCronDb } from "@/lib/db";

export interface CronPublishResult {
  processed: number;
  published: number;
  failed: number;
  skipped: number;
  errors: Array<{ postId: string; message: string }>;
}

/** Internal queue only — native Meta-scheduled posts stay `scheduled` and are not re-dispatched. */
const READY_STATUSES: DraftStatus[] = ["approved"];

/** Short cron transaction (superadmin RLS bypass) used only for fast DB writes. */
async function markStatus(postId: string, status: DraftStatus, errorLog: string | null): Promise<void> {
  await withCronDb((tx) =>
    tx.scheduledPost.update({
      where: { id: postId },
      data: { status, errorLog, updatedAt: new Date() },
    }),
  );
}

/**
 * Finds approved scheduled posts that are due, dispatches to Meta Graph API,
 * and updates status to published or failed with errorLog for the dashboard.
 *
 * IMPORTANT: each DB read/write runs in its own short `withCronDb` transaction,
 * while the slow Meta API calls happen OUTSIDE any transaction. Wrapping the
 * external HTTP work in an interactive transaction (the old design) blew the
 * 5s Prisma timeout (P2028) so results were never recorded, and held a Neon
 * connection open across the round-trip until it was force-closed.
 */
export async function processDueScheduledPosts(): Promise<CronPublishResult> {
  const now = new Date();

  const pending = await withCronDb((tx) =>
    tx.scheduledPost.findMany({
      where: {
        status: { in: READY_STATUSES },
        scheduledFor: { lte: now, not: null },
        locationId: { not: null },
      },
      orderBy: { scheduledFor: "asc" },
      take: 50,
    }),
  );

  const result: CronPublishResult = {
    processed: pending.length,
    published: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  for (const post of pending) {
    const locationId = post.locationId!;

    try {
      const secrets = await withCronDb((tx) =>
        loadMetaBundleSecretsForCron(tx, post.organizationId, locationId),
      );

      if (!secrets?.pageToken) {
        const message = "Meta not connected for this location";
        await markStatus(post.id, "failed", message);
        result.skipped += 1;
        result.errors.push({ postId: post.id, message });
        continue;
      }

      // External Meta API work — deliberately OUTSIDE any DB transaction.
      await publishToMeta(post, secrets.pageToken, {
        pageId: secrets.pageId,
        igAccountId: secrets.igAccountId,
      });

      await markStatus(post.id, "published", null);
      result.published += 1;
    } catch (error) {
      const message =
        error instanceof MetaApiError
          ? error.toLogString()
          : error instanceof Error
            ? error.message
            : "Unknown publish error";

      console.error(`[CRON] Failed to publish post ${post.id}:`, error);
      Sentry.captureException(error, {
        tags: {
          job: "cron_publish",
        },
        extra: {
          postId: post.id,
          organizationId: post.organizationId,
          locationId: post.locationId,
        },
      });

      try {
        await markStatus(post.id, "failed", message.slice(0, 4000));
      } catch (writeError) {
        // Don't let a status-write failure abort the rest of the batch.
        console.error(`[CRON] Could not record failure for post ${post.id}:`, writeError);
      }

      result.failed += 1;
      result.errors.push({ postId: post.id, message });
    }
  }

  return result;
}
