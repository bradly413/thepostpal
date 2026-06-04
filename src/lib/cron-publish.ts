import "server-only";

import type { DraftStatus } from "@prisma/client";
import type { TenantDbClient } from "@/lib/db";

export interface CronPublishResult {
  processed: number;
  published: number;
  failed: number;
  skipped: number;
  errors: Array<{ postId: string; message: string }>;
}

const READY_STATUSES: DraftStatus[] = ["approved", "scheduled"];

/**
 * Finds scheduled posts that are due and marks them published.
 * Meta dispatch is stubbed — wire publishToFacebook/Instagram when S3 public URLs exist.
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
    include: {
      location: {
        select: { id: true, name: true },
      },
    },
  });

  const result: CronPublishResult = {
    processed: pending.length,
    published: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  for (const post of pending) {
    try {
      // TODO: Load SocialConnection tokens for post.locationId and call Meta publish APIs.
      // await dispatchScheduledPostToMeta(post);

      await tx.scheduledPost.update({
        where: { id: post.id },
        data: {
          status: "published",
          updatedAt: now,
        },
      });

      result.published += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown publish error";
      console.error(`[CRON] Failed to publish post ${post.id}:`, error);

      await tx.scheduledPost.update({
        where: { id: post.id },
        data: {
          status: "needs_revision",
          reviewerNotes: `[cron-publish] ${message}`.slice(0, 2000),
          updatedAt: now,
        },
      });

      result.failed += 1;
      result.errors.push({ postId: post.id, message });
    }
  }

  return result;
}
