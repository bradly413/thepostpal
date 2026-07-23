/** Session handoff: Studio → Schedule composer (`/dashboard/calendar`). */

export const STUDIO_SCHEDULE_HANDOFF_KEY = "pb-studio-schedule-handoff";

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
    if (!parsed?.mediaUrl || typeof parsed.mediaUrl !== "string") return null;
    return parsed;
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
