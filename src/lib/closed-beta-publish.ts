/**
 * Closed-beta publish gates. Image posts to FB/IG only — video must not enter
 * the cron queue or be dispatched, even if a client bypasses the UI.
 */

export const CLOSED_BETA_VIDEO_MESSAGE =
  "Video publish is not available in closed beta.";

/** Statuses that feed (or are mid-flight on) the internal cron publish queue. */
const QUEUE_STATUSES = new Set(["approved", "scheduled", "publishing"]);

export function isClosedBetaVideoQueueStatus(
  status: string | null | undefined,
): boolean {
  return typeof status === "string" && QUEUE_STATUSES.has(status);
}

/** True when writing/dispatching this media+status would attempt a video publish. */
export function blocksClosedBetaVideoPublish(
  mediaType: string | null | undefined,
  status: string | null | undefined,
): boolean {
  return mediaType === "video" && isClosedBetaVideoQueueStatus(status);
}
