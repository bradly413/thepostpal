import "server-only";

import * as Sentry from "@sentry/nextjs";
import type { DraftStatus } from "@prisma/client";
import type { TenantDbClient } from "@/lib/db";
import { MetaApiError, publishToMeta } from "@/lib/meta-api";
import { loadMetaBundleSecretsForCron } from "@/lib/meta-social-db";

export interface CronPublishResult {
  processed: number;
  published: number;
  failed: number;
  skipped: number;
  errors: Array<{ postId: string; message: string }>;
}

/** Internal queue only — native Meta-scheduled posts stay `scheduled` and are not re-dispatched. */
const READY_STATUSES: DraftStatus[] = ["approved"];

/**
 * Finds approved scheduled posts that are due, dispatches to Meta Graph API,
 * and updates status to published or failed with errorLog for the dashboard.
 */
export async function processDueScheduledPosts(tx: TenantDbClient): Promise<CronPublishResult> {
  const now = new Date();

  const pending = await tx.scheduledPost.findMany({
    where: {
      status: { in: READY_STATUSES },
      scheduledFor: { lte: now, not: null },
      locationId: { not: null },
    },
    orderBy: { scheduledFor: "asc" },
    take: 50,
  });

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
      const secrets = await loadMetaBundleSecretsForCron(
        tx,
        post.organizationId,
        locationId,
      );

      if (!secrets?.pageToken) {
        result.skipped += 1;
        const message = "Meta not connected for this location";
        await tx.scheduledPost.update({
          where: { id: post.id },
          data: {
            status: "failed",
            errorLog: message,
            updatedAt: now,
          },
        });
        result.errors.push({ postId: post.id, message });
        continue;
      }

      await publishToMeta(post, secrets.pageToken, {
        pageId: secrets.pageId,
        igAccountId: secrets.igAccountId,
      });

      await tx.scheduledPost.update({
        where: { id: post.id },
        data: {
          status: "published",
          errorLog: null,
          updatedAt: now,
        },
      });

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

      await tx.scheduledPost.update({
        where: { id: post.id },
        data: {
          status: "failed",
          errorLog: message.slice(0, 4000),
          updatedAt: now,
        },
      });

      result.failed += 1;
      result.errors.push({ postId: post.id, message });
    }
  }

  return result;
}
