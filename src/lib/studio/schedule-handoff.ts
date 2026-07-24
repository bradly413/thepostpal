/** One-shot media handoff: Studio or Library → Schedule composer. */

export const STUDIO_SCHEDULE_HANDOFF_KEY = "pb-studio-schedule-handoff";

export type StudioScheduleQueueItem = {
  mediaUrl: string;
  mediaType: "image" | "video";
};

export type StudioScheduleHandoff = {
  mediaUrl: string;
  mediaType: "image" | "video";
  caption?: string;
  /** Studio platform id — mapped to calendar formPlatform on intake. */
  platformId?: string;
  /** v1: UI intent only — calendar can open ready for multi-upload later. */
  format?: "single" | "carousel";
  carouselCount?: number;
  /** When format is carousel, all ready slide URLs (selected first is mediaUrl). */
  mediaUrls?: string[];
  /** Library multi-select: each item becomes its own post in Schedule. */
  queue?: StudioScheduleQueueItem[];
};

export function writeStudioScheduleHandoff(payload: StudioScheduleHandoff): void {
  try {
    sessionStorage.setItem(STUDIO_SCHEDULE_HANDOFF_KEY, JSON.stringify(payload));
  } catch {
    // quota / private mode — Schedule still opens empty
  }
}

export function takeStudioScheduleHandoff(): StudioScheduleHandoff | null {
  try {
    const raw = sessionStorage.getItem(STUDIO_SCHEDULE_HANDOFF_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(STUDIO_SCHEDULE_HANDOFF_KEY);
    const parsed = JSON.parse(raw) as StudioScheduleHandoff;
    if (
      !parsed?.mediaUrl ||
      typeof parsed.mediaUrl !== "string" ||
      (parsed.mediaType !== "image" && parsed.mediaType !== "video")
    ) {
      return null;
    }
    const queue = Array.isArray(parsed.queue)
      ? parsed.queue.filter(
          (item): item is StudioScheduleQueueItem =>
            Boolean(item) &&
            typeof item.mediaUrl === "string" &&
            item.mediaUrl.length > 0 &&
            (item.mediaType === "image" || item.mediaType === "video"),
        )
      : undefined;
    return {
      ...parsed,
      queue: queue?.length ? queue : undefined,
    };
  } catch {
    return null;
  }
}

export function handoffPlatformToForm(
  platformId: string | undefined,
): "facebook" | "instagram" | "both" {
  if (platformId === "facebook") return "facebook";
  if (platformId === "instagram") return "instagram";
  return "both";
}
