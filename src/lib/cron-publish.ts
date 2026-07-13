import "server-only";

import * as Sentry from "@sentry/nextjs";
import type { DraftStatus } from "@prisma/client";
import { MetaApiError, publishToMetaPerPlatform } from "@/lib/meta-api";
import type { SocialPlatform } from "@prisma/client";
import { loadMetaBundleSecretsForCron } from "@/lib/meta-social-db";
import { withCronDb } from "@/lib/db";

export interface CronPublishResult {
  processed: number;
  published: number;
  failed: number;
  skipped: number;
  staleClaims: number;
  errors: Array<{ postId: string; message: string }>;
}

/** Internal queue only — native Meta-scheduled posts stay `scheduled` and are not re-dispatched. */
const READY_STATUSES: DraftStatus[] = ["approved"];

/**
 * A `publishing` claim older than this is orphaned (the run that claimed it
 * died mid-publish). Must comfortably exceed the route's maxDuration.
 */
const STALE_CLAIM_MS = 15 * 60 * 1000;

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
 * Atomically claim a post for publishing. Only a row still in `approved` can
 * be claimed, so an overlapping cron run (or a re-read of a row whose result
 * write was lost) skips it instead of publishing a duplicate.
 */
async function claimPost(postId: string): Promise<boolean> {
  const claimed = await withCronDb((tx) =>
    tx.scheduledPost.updateMany({
      where: { id: postId, status: "approved" },
      data: { status: "publishing", updatedAt: new Date() },
    }),
  );
  return claimed.count === 1;
}

/** A platform went live but persisting that fact failed — must not mark failed. */
class PlatformRecordWriteError extends Error {
  constructor(readonly platform: SocialPlatform, readonly cause2: unknown) {
    super(`Could not record ${platform} publish`);
  }
}

/**
 * Records one platform going live the moment it happens, so a crash or a
 * later platform's failure can never lose the fact — retries skip platforms
 * listed in `publishedPlatforms`.
 */
async function recordPlatformPublish(
  postId: string,
  platform: SocialPlatform,
  graphResult: unknown,
): Promise<void> {
  await withCronDb(async (tx) => {
    const current = await tx.scheduledPost.findUnique({
      where: { id: postId },
      select: { publishedPlatforms: true, publishResults: true },
    });
    const platforms = new Set<SocialPlatform>(current?.publishedPlatforms ?? []);
    platforms.add(platform);
    const results = {
      ...((current?.publishResults as Record<string, unknown> | null) ?? {}),
      [platform]: graphResult ?? true,
    };
    await tx.scheduledPost.update({
      where: { id: postId },
      data: {
        publishedPlatforms: Array.from(platforms),
        publishResults: results as object,
        updatedAt: new Date(),
      },
    });
  });
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

  // Orphaned claims from a run that died mid-publish are marked failed, NOT
  // re-queued: the Meta call may have succeeded before the result write was
  // lost, so re-publishing risks a duplicate on the client's page.
  const stale = await withCronDb((tx) =>
    tx.scheduledPost.updateMany({
      where: {
        status: "publishing",
        updatedAt: { lt: new Date(now.getTime() - STALE_CLAIM_MS) },
      },
      data: {
        status: "failed",
        errorLog:
          "Publish was interrupted mid-run. Check the connected page before retrying — the post may already be live.",
        updatedAt: now,
      },
    }),
  );

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
    staleClaims: stale.count,
    errors: [],
  };

  if (stale.count > 0) {
    console.error(`[CRON] Marked ${stale.count} orphaned publishing claim(s) as failed`);
    Sentry.captureMessage("Orphaned publishing claims marked failed", {
      level: "warning",
      tags: { job: "cron_publish", phase: "stale_claims" },
      extra: { count: stale.count },
    });
  }

  for (const post of pending) {
    const locationId = post.locationId!;

    if (!(await claimPost(post.id))) {
      result.skipped += 1;
      continue;
    }

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
      // Platforms already live from a previous partial attempt are skipped;
      // each new success is persisted immediately via recordPlatformPublish.
      const alreadyLive = post.publishedPlatforms ?? [];
      const outcome = await publishToMetaPerPlatform(
        post,
        secrets.pageToken,
        { pageId: secrets.pageId, igAccountId: secrets.igAccountId },
        alreadyLive,
        (platform, graphResult) =>
          recordPlatformPublish(post.id, platform, graphResult).catch((cause) => {
            throw new PlatformRecordWriteError(platform, cause);
          }),
      );

      if (outcome.failure) {
        const live = [
          ...alreadyLive,
          ...outcome.succeeded.map((s) => s.platform),
        ];
        const liveNote = live.length
          ? ` Already live: ${live.join(", ")} — a retry publishes only the rest.`
          : "";
        const message = `${outcome.failure.platform} failed: ${outcome.failure.error.toLogString()}.${liveNote}`;
        console.error(`[CRON] Failed to publish post ${post.id}:`, outcome.failure.error);
        Sentry.captureException(outcome.failure.error, {
          tags: { job: "cron_publish" },
          extra: { postId: post.id, organizationId: post.organizationId, locationId },
        });
        await markStatus(post.id, "failed", message.slice(0, 4000));
        result.failed += 1;
        result.errors.push({ postId: post.id, message });
        continue;
      }

      try {
        await markStatus(post.id, "published", null);
      } catch (writeError) {
        // The post IS live but recording that failed. Leave it in
        // "publishing" — never back to "approved" (would re-publish) and not
        // "failed" here (a retry would duplicate it). The stale-claim sweep
        // surfaces it for review if the write keeps failing.
        console.error(`[CRON] Post ${post.id} published but status write failed:`, writeError);
        Sentry.captureException(writeError, {
          tags: { job: "cron_publish", phase: "record_publish" },
          extra: { postId: post.id, organizationId: post.organizationId, locationId },
        });
        result.published += 1;
        result.errors.push({
          postId: post.id,
          message: "Published to Meta but the status write failed; left in 'publishing'",
        });
        continue;
      }

      result.published += 1;
    } catch (error) {
      if (error instanceof PlatformRecordWriteError) {
        // The platform IS live but the record write failed. Leave the post in
        // "publishing" (not approved — would re-publish; not failed — a retry
        // would duplicate). The stale-claim sweep surfaces it for review.
        console.error(`[CRON] Post ${post.id}: ${error.platform} live but record write failed:`, error.cause2);
        Sentry.captureException(error.cause2, {
          tags: { job: "cron_publish", phase: "record_platform" },
          extra: { postId: post.id, platform: error.platform, organizationId: post.organizationId },
        });
        result.errors.push({
          postId: post.id,
          message: `${error.platform} published but the record write failed; left in 'publishing'`,
        });
        continue;
      }

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
