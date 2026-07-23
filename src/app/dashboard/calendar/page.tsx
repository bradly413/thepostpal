"use client";

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { templates } from "@/lib/templates";
import { type ScheduledPost } from "@/lib/schedule-store";
import { uploadMediaToS3, DashboardUploadError } from "@/lib/dashboard-upload";
import { inferMediaContentType, isVideoContentType } from "@/lib/upload-mime";
import { type CalendarEvent } from "@/lib/events-store";
import { getHolidayMap } from "@/lib/holidays";
import { useMetaConnection } from "@/lib/use-meta-connection";
import { buildMetaPublishPayload } from "@/lib/meta-publish-payload";
import { SITE_NAME } from "@/lib/site";
import { useActiveLocation } from "@/lib/use-active-location";
import {
  fetchDashboardCalendar,
  createDashboardCalendarEvent,
  updateDashboardCalendarEvent,
  deleteDashboardCalendarEvent,
  fetchDashboardPosts,
  createDashboardPost,
  updateDashboardPost,
  deleteDashboardPost,
  formatDashboardApiMessage,
  type DashboardCalendarEventRecord,
} from "@/lib/dashboard-api";
import {
  mapCalendarPostToCreateInput,
  mapRecordToCalendarPost,
} from "@/lib/scheduled-post-mappers";
import {
  isCalendarPostQueued,
  todayDateKeyLocal,
} from "@/lib/dashboard-post-helpers";
import {
  handoffPlatformToForm,
  takeStudioScheduleHandoff,
} from "@/lib/studio/schedule-handoff";
import LocationSwitcher from "@/components/LocationSwitcher";
import { usePlan, usePlanFeatures } from "@/components/dashboard/PlanProvider";
import PostPreview, {
  type ComposerMediaItem,
} from "@/components/dashboard/calendar/PostPreview";
import CalendarPostRadialMenu, {
  type RadialPostAction,
} from "@/components/dashboard/calendar/CalendarPostRadialMenu";
import CalendarAssistant from "@/components/dashboard/calendar/CalendarAssistant";
import { AnimatedOverlay } from "@/components/dashboard/AnimatedOverlay";
import CollapsingLabelButton from "@/components/dashboard/CollapsingLabelButton";
import {
  Clock,
  ChevronDown,
  Image as ImageIcon,
  Search,
  Settings2,
  LayoutGrid,
  List,
  Plus,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Wand2,
} from "lucide-react";
import { LocationGate } from "@/components/dashboard/StateViews";
import { DashboardConfirm } from "@/components/dashboard/DashboardModal";

// Adapt a live calendar record into the local CalendarEvent view shape the
// grid + modals already render.
function recordToEvent(r: DashboardCalendarEventRecord): CalendarEvent {
  const d = new Date(r.startsAt);
  const allDay = d.getHours() === 0 && d.getMinutes() === 0;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return {
    id: r.id,
    title: r.title,
    date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    time: allDay ? undefined : `${hh}:${mm}`,
    type: (r.type as CalendarEvent["type"]) || "other",
    notes: r.description || undefined,
  };
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  const display = `${h % 12 || 12}:${m} ${h < 12 ? "AM" : "PM"}`;
  const value = `${String(h).padStart(2, "0")}:${m}`;
  return { display, value };
});

/** Next 30-minute schedule slot at or after `from` (keeps the picker from sitting in the past). */
function nextScheduleTime(from = new Date()): string {
  const totalMins = from.getHours() * 60 + from.getMinutes() + 1;
  let next = Math.ceil(totalMins / 30) * 30;
  if (next >= 24 * 60) next = 23 * 60 + 30;
  const h = Math.floor(next / 60);
  const m = next % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** YYYY-MM-DD compare — true when `dateKey` is before today (local). */
function isPastDateKey(dateKey: string, todayKey = todayDateKeyLocal()): boolean {
  return Boolean(dateKey) && dateKey < todayKey;
}

/** True when the schedule slot is already in the past (past day, or earlier today). */
function isScheduleSlotPast(
  dateKey: string,
  time: string,
  now = new Date(),
): boolean {
  const todayKey = todayDateKeyLocal(now);
  if (!dateKey || dateKey < todayKey) return true;
  if (dateKey > todayKey) return false;
  const [h, m] = time.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return true;
  const slotMins = h * 60 + m;
  const nowMins = now.getHours() * 60 + now.getMinutes();
  return slotMins <= nowMins;
}

/** Stagger bulk-upload schedule slots by 30 minutes from a start date/time. */
function staggerBulkSlots(
  count: number,
  startDate: string,
  startTime: string,
): { date: string; time: string }[] {
  const slots: { date: string; time: string }[] = [];
  let date = startDate;
  let [h, m] = startTime.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) {
    h = 10;
    m = 0;
  }
  for (let i = 0; i < count; i++) {
    slots.push({
      date,
      time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
    });
    m += 30;
    if (m >= 60) {
      h += 1;
      m -= 60;
    }
    if (h >= 24) {
      h = 9;
      m = 0;
      const d = new Date(`${date}T12:00:00`);
      d.setDate(d.getDate() + 1);
      date = todayDateKeyLocal(d);
    }
  }
  return slots;
}

const platformColors: Record<string, string> = {
  facebook: "bg-[rgba(59,130,246,0.12)] text-[#2563eb]",
  instagram: "bg-[rgba(236,72,153,0.12)] text-[#db2777]",
  both: "bg-[rgba(31,157,77,0.12)] text-[#1f9d4d]",
};

const eventTypeColors: Record<string, string> = {
  "open-house": "bg-[rgba(217,119,6,0.12)] text-[#b45309]",
  closing: "bg-[rgba(31,157,77,0.12)] text-[#1f9d4d]",
  meeting: "bg-[rgba(238,37,50,0.1)] text-[#ee2532]",
  personal: "bg-[rgba(59,130,246,0.12)] text-[#2563eb]",
  other: "bg-black/[0.05] text-black/55",
};

const eventTypeLabels: Record<string, string> = {
  "open-house": "Open House",
  closing: "Closing",
  meeting: "Meeting",
  personal: "Personal",
  other: "Other",
};

function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function calendarCellOverflow(
  holiday: boolean,
  eventCount: number,
  postCount: number,
): number {
  const holidaySlots = holiday ? 1 : 0;
  const visible = holidaySlots + Math.min(2, eventCount) + Math.min(2, postCount);
  const total = holidaySlots + eventCount + postCount;
  return total > visible ? total - visible : 0;
}

function openDayFromKeyboard(
  e: React.KeyboardEvent,
  dateKey: string,
  onOpen: (dateKey: string) => void,
) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    onOpen(dateKey);
  }
}

type ModalMode = "post" | "event" | "day-detail" | "preview" | null;

type CalendarScheduledPost = ScheduledPost & {
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | null;
  errorLog?: string | null;
};

function FacebookGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Tiny platform dots under calendar thumbs — FB blue, IG warm gradient. */
function PlatformDots({
  platform,
  size = "sm",
}: {
  platform: "facebook" | "instagram" | "both";
  size?: "sm" | "md";
}) {
  const showFb = platform === "facebook" || platform === "both";
  const showIg = platform === "instagram" || platform === "both";
  const dot = size === "md" ? "h-2 w-2" : "h-1.5 w-1.5";
  return (
    <span className="flex items-center justify-center gap-0.5" aria-hidden="true">
      {showFb && (
        <span
          title="Facebook"
          className={`${dot} rounded-full bg-gradient-to-br from-[#86b7ff] via-[#1877F2] to-[#0b5fcc] shadow-[0_0_0_1px_rgba(255,255,255,0.35)]`}
        />
      )}
      {showIg && (
        <span
          title="Instagram"
          className={`${dot} rounded-full bg-gradient-to-br from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] shadow-[0_0_0_1px_rgba(255,255,255,0.35)]`}
        />
      )}
    </span>
  );
}

function formatComposerSchedule(dateKey: string, time: string): string {
  const d = new Date(`${dateKey}T${time || "09:00"}:00`);
  if (Number.isNaN(d.getTime())) return "Pick a time";
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

function formatDisplayTime(time: string): string {
  const match = TIME_OPTIONS.find((t) => t.value === time.slice(0, 5));
  if (match) return match.display;
  const [hRaw, mRaw] = time.split(":").map(Number);
  if (!Number.isFinite(hRaw) || !Number.isFinite(mRaw)) return time;
  const h12 = hRaw % 12 || 12;
  const suffix = hRaw < 12 ? "AM" : "PM";
  return `${h12}:${String(mRaw).padStart(2, "0")} ${suffix}`;
}

function formatPostStatusLabel(status: string): string {
  if (status === "scheduled") return "Scheduled";
  if (status === "draft") return "Draft";
  if (status === "published") return "Published";
  if (status === "failed") return "Failed";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

interface CaptionOption {
  angle: string;
  caption: string;
  hashtags: string[];
}

function formatCaptionOption(v: CaptionOption): string {
  // Keep caption + hashtag on one line so nothing clips in the fixed composer field.
  const tags = v.hashtags.slice(0, 1).join(" ");
  if (!tags) return v.caption.trim();
  const base = v.caption.trim().replace(/\s+/g, " ");
  return `${base} ${tags}`.trim();
}

export default function CalendarPage() {
  return (
    <Suspense fallback={null}>
      <CalendarPageContent />
    </Suspense>
  );
}

function CalendarPageContent() {
  useEffect(() => { document.title = `Schedule | ${SITE_NAME}`; }, []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const modalRef = useRef<HTMLDivElement>(null);
  const postSettingsRef = useRef<HTMLDivElement>(null);
  const bulkListRef = useRef<HTMLDivElement>(null);
  const bulkUploadRef = useRef<HTMLDivElement>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "agenda">("month");
  const mobileDefaultApplied = useRef(false);
  const [posts, setPosts] = useState<CalendarScheduledPost[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => {
      if (mq.matches) {
        setView((v) => (v === "month" ? "agenda" : v));
        mobileDefaultApplied.current = true;
      }
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => todayDateKeyLocal());
  const [editingPost, setEditingPost] = useState<CalendarScheduledPost | null>(null);
  const [previewPost, setPreviewPost] = useState<CalendarScheduledPost | null>(null);
  const [radialMenu, setRadialMenu] = useState<{
    post: CalendarScheduledPost;
    x: number;
    y: number;
  } | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  // D2: surface a genuine initial-load failure (was silently swallowed → blank
  // grid). Transient errors after a good load still keep the grid stable.
  const [loadError, setLoadError] = useState<string | null>(null);
  const [eventsLoadError, setEventsLoadError] = useState<string | null>(null);
  const loadedOkRef = useRef(false);
  const eventsLoadedOkRef = useRef(false);

  const [formTemplate, setFormTemplate] = useState("");
  const [formPlatform, setFormPlatform] = useState<"facebook" | "instagram" | "both">("both");
  const [formTime, setFormTime] = useState(() => nextScheduleTime());
  const [scheduleTimeTouched, setScheduleTimeTouched] = useState(false);
  const [formCaption, setFormCaption] = useState("");
  const [captionOptions, setCaptionOptions] = useState<CaptionOption[]>([]);
  const [captionLoading, setCaptionLoading] = useState(false);
  const [captionGenError, setCaptionGenError] = useState<string | null>(null);
  const [captionIndex, setCaptionIndex] = useState(0);
  const [captionFade, setCaptionFade] = useState<"in" | "out">("in");
  const [captionUserEdited, setCaptionUserEdited] = useState(false);
  const [captionQueueBusy, setCaptionQueueBusy] = useState(false);
  const skipNextCaptionGenRef = useRef(false);
  const captionGenIdRef = useRef(0);
  const captionRotateTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const captionFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Serial caption jobs — avoids slamming /api/ai/captions-from-image on bulk upload. */
  const captionQueueRef = useRef<string[]>([]);
  const captioningUrlRef = useRef<string | null>(null);
  const captionDrainRunningRef = useRef(false);
  const mediaUrlRef = useRef("");
  const mediaItemsRef = useRef<ComposerMediaItem[]>([]);
  const autoGenerateCaptionsRef = useRef(false);
  const [showScheduleMenu, setShowScheduleMenu] = useState(false);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [calendarSearch, setCalendarSearch] = useState("");
  const [formStatus, setFormStatus] = useState<"scheduled" | "draft">("scheduled");
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Brief glass toast — auto-dismiss so it doesn't stick around.
  useEffect(() => {
    if (!publishResult) return;
    const ms = publishResult.type === "success" ? 2800 : 4200;
    const id = window.setTimeout(() => setPublishResult(null), ms);
    return () => window.clearTimeout(id);
  }, [publishResult]);

  // S3 media for the composer (carousel when bulk-uploaded).
  const [mediaItems, setMediaItems] = useState<ComposerMediaItem[]>([]);
  const [mediaIndex, setMediaIndex] = useState(0);
  const mediaUrl = mediaItems[mediaIndex]?.url ?? "";
  const mediaType = mediaItems[mediaIndex]?.type ?? "image";
  mediaUrlRef.current = mediaUrl;
  mediaItemsRef.current = mediaItems;
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showPostSettings, setShowPostSettings] = useState(false);
  const [autoGenerateCaptions, setAutoGenerateCaptions] = useState(false);
  autoGenerateCaptionsRef.current = autoGenerateCaptions;
  const [showBulkList, setShowBulkList] = useState(false);
  const [bulkListScheduleIndex, setBulkListScheduleIndex] = useState<number | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkUploadProgress, setBulkUploadProgress] = useState({ done: 0, total: 0 });
  const bulkInputRef = useRef<HTMLInputElement>(null);
  const addComposerInputRef = useRef<HTMLInputElement>(null);
  const isBulkQueue = mediaItems.length > 1;
  const captionImageTotal = mediaItems.filter((i) => i.type === "image").length;
  const captionImageDone = mediaItems.filter(
    (i) => i.type === "image" && Boolean(i.caption?.trim()),
  ).length;

  function stopCaptionRotation() {
    if (captionRotateTimerRef.current) {
      clearInterval(captionRotateTimerRef.current);
      captionRotateTimerRef.current = null;
    }
    if (captionFadeTimerRef.current) {
      clearTimeout(captionFadeTimerRef.current);
      captionFadeTimerRef.current = null;
    }
    setCaptionFade("in");
  }

  function applyCaptionOption(option: CaptionOption, index: number) {
    const text = formatCaptionOption(option);
    setCaptionIndex(index);
    setFormCaption(text);
    setCaptionFade("in");
    setMediaItems((prev) =>
      prev.map((item, i) => (i === mediaIndex ? { ...item, caption: text } : item)),
    );
  }

  function startCaptionRotation(options: CaptionOption[]) {
    stopCaptionRotation();
    if (options.length < 2) return;
    captionRotateTimerRef.current = setInterval(() => {
      setCaptionFade("out");
      captionFadeTimerRef.current = setTimeout(() => {
        setCaptionIndex((prev) => {
          const next = (prev + 1) % options.length;
          setFormCaption(formatCaptionOption(options[next]));
          return next;
        });
        setCaptionFade("in");
      }, 480);
    }, 5200);
  }

  function clearComposerMedia() {
    setMediaItems([]);
    setMediaIndex(0);
  }

  function setComposerMediaSingle(url: string, type: "image" | "video") {
    setMediaItems([{ url, type }]);
    setMediaIndex(0);
  }

  // Studio → Schedule: seed composer with the generated asset (one-shot).
  useEffect(() => {
    const handoff = takeStudioScheduleHandoff();
    if (!handoff) return;
    setComposerMediaSingle(
      handoff.mediaUrl,
      handoff.mediaType === "video" ? "video" : "image",
    );
    setFormPlatform(handoffPlatformToForm(handoff.platformId));
    if (handoff.caption?.trim()) {
      skipNextCaptionGenRef.current = true;
      setFormCaption(handoff.caption.trim());
      setCaptionUserEdited(true);
    }
    setSelectedDate(todayDateKeyLocal());
    requestAnimationFrame(() => {
      document.getElementById("post-composer")?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  }, []);

  // Home month calendar → Schedule deep-link (?date=YYYY-MM-DD).
  useEffect(() => {
    const date = searchParams.get("date");
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    const parsed = new Date(`${date}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) return;
    setSelectedDate(date);
    setCurrentDate(parsed);
  }, [searchParams]);

  function updateBulkItemSchedule(index: number, nextDate: string, nextTime: string) {
    const date = isPastDateKey(nextDate, todayDateKeyLocal()) ? todayDateKeyLocal() : nextDate;
    let time = nextTime;
    if (isScheduleSlotPast(date, time)) {
      time = date === todayDateKeyLocal() ? nextScheduleTime() : time;
    }
    setMediaItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, date, time } : item)),
    );
    if (index === mediaIndex) {
      setSelectedDate(date);
      setFormTime(time);
      setScheduleTimeTouched(true);
    }
  }

  function goCarouselTo(index: number) {
    if (index < 0 || index >= mediaItems.length || index === mediaIndex) return;
    const scheduleDate =
      !selectedDate || isPastDateKey(selectedDate, todayDateKeyLocal())
        ? todayDateKeyLocal()
        : selectedDate;
    const nextItems = mediaItems.map((item, i) =>
      i === mediaIndex
        ? { ...item, caption: formCaption, date: scheduleDate, time: formTime }
        : item,
    );
    const target = nextItems[index];
    stopCaptionRotation();
    setCaptionOptions([]);
    setCaptionGenError(null);
    setMediaItems(nextItems);
    setMediaIndex(index);
    if (target.date) setSelectedDate(target.date);
    if (target.time) {
      setFormTime(target.time);
      setScheduleTimeTouched(true);
    }
    if (target.caption) {
      skipNextCaptionGenRef.current = true;
      setFormCaption(target.caption);
      setCaptionUserEdited(true);
      setCaptionLoading(false);
    } else {
      setFormCaption("");
      setCaptionUserEdited(false);
      setCaptionLoading(captioningUrlRef.current === target.url);
    }
  }

  function removeActiveMedia() {
    stopCaptionRotation();
    setCaptionOptions([]);
    setCaptionGenError(null);
    setCaptionUserEdited(false);
    setMediaError(null);
    if (mediaItems.length <= 1) {
      clearComposerMedia();
      return;
    }
    const nextItems = mediaItems.filter((_, i) => i !== mediaIndex);
    const nextIndex = Math.min(mediaIndex, nextItems.length - 1);
    setMediaItems(nextItems);
    setMediaIndex(nextIndex);
  }

  // On select/drop → bypass local blobs, push straight to S3, bind the returned
  // absolute publicUrl as the active media item (replaces current slide).
  async function handleMediaFile(file: File | null | undefined) {
    if (!file) return;
    setMediaError(null);
    setUploadingMedia(true);
    const inferred = inferMediaContentType(file.name, file.type);
    const type: "image" | "video" = inferred && isVideoContentType(inferred) ? "video" : "image";
    try {
      const publicUrl = await uploadMediaToS3(file, {
        locationId,
        alt: file.name,
      });
      setCaptionUserEdited(false);
      setCaptionOptions([]);
      setCaptionGenError(null);
      stopCaptionRotation();
      if (mediaItems.length === 0) {
        setComposerMediaSingle(publicUrl, type);
      } else {
        // Replace the active slide only — keep the rest of the carousel.
        setMediaItems((prev) =>
          prev.map((item, i) =>
            i === mediaIndex ? { ...item, url: publicUrl, type, caption: "" } : item,
          ),
        );
      }
    } catch (err) {
      if (mediaItems.length === 0) clearComposerMedia();
      setMediaError(
        err instanceof DashboardUploadError ? err.message : "Upload failed. Please try again.",
      );
    } finally {
      setUploadingMedia(false);
    }
  }

  /** Append another image/video as a new carousel slide (keeps existing posts). */
  async function handleAddComposerMedia(file: File | null | undefined) {
    if (!file) return;
    setMediaError(null);
    setUploadingMedia(true);
    const inferred = inferMediaContentType(file.name, file.type);
    const type: "image" | "video" = inferred && isVideoContentType(inferred) ? "video" : "image";
    try {
      const publicUrl = await uploadMediaToS3(file, {
        locationId,
        alt: file.name,
      });
      const scheduleDate =
        !selectedDate || isPastDateKey(selectedDate, todayDateKeyLocal())
          ? todayDateKeyLocal()
          : selectedDate;

      // Persist the active slide's draft fields before leaving it.
      const preserved = mediaItems.map((item, i) =>
        i === mediaIndex
          ? { ...item, caption: formCaption, date: scheduleDate, time: formTime }
          : item,
      );

      const last = preserved[preserved.length - 1];
      const startDate = last?.date || scheduleDate;
      const startTime = last?.time || formTime || nextScheduleTime();
      // Next slide gets the slot 30 minutes after the previous post.
      const nextSlot = staggerBulkSlots(2, startDate, startTime)[1] ?? {
        date: scheduleDate,
        time: nextScheduleTime(),
      };

      const nextItems: ComposerMediaItem[] = [
        ...preserved,
        {
          url: publicUrl,
          type,
          caption: "",
          date: nextSlot.date,
          time: nextSlot.time,
        },
      ];

      setEditingPost(null);
      setCaptionUserEdited(false);
      setCaptionOptions([]);
      setCaptionGenError(null);
      stopCaptionRotation();
      setMediaItems(nextItems);
      setMediaIndex(nextItems.length - 1);
      setSelectedDate(nextSlot.date);
      setFormTime(nextSlot.time);
      setScheduleTimeTouched(true);
      setFormCaption("");
      setFormStatus("scheduled");
      if (typeof document !== "undefined") {
        document.getElementById("post-composer")?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    } catch (err) {
      setMediaError(
        err instanceof DashboardUploadError ? err.message : "Upload failed. Please try again.",
      );
    } finally {
      setUploadingMedia(false);
    }
  }

  function requestAddComposerPost() {
    // Empty or editing a saved post → clear into a fresh composer.
    if (editingPost || mediaItems.length === 0) {
      openNewPost(todayKey);
      return;
    }
    addComposerInputRef.current?.click();
  }

  async function handleBulkFiles(fileList: FileList | File[] | null) {
    const files = fileList ? Array.from(fileList).filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/")) : [];
    if (files.length === 0) return;
    setMediaError(null);
    setBulkUploading(true);
    setBulkUploadProgress({ done: 0, total: files.length });
    const uploaded: ComposerMediaItem[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const inferred = inferMediaContentType(file.name, file.type);
        const type: "image" | "video" = inferred && isVideoContentType(inferred) ? "video" : "image";
        const publicUrl = await uploadMediaToS3(file, {
          locationId,
          alt: file.name,
        });
        uploaded.push({ url: publicUrl, type });
        setBulkUploadProgress({ done: i + 1, total: files.length });
      }
      setCaptionUserEdited(false);
      setCaptionOptions([]);
      setCaptionGenError(null);
      stopCaptionRotation();
      const startDate =
        !selectedDate || isPastDateKey(selectedDate, todayDateKeyLocal())
          ? todayDateKeyLocal()
          : selectedDate;
      const slots = staggerBulkSlots(uploaded.length, startDate, nextScheduleTime());
      const queued = uploaded.map((item, i) => ({
        ...item,
        caption: "",
        date: slots[i]?.date ?? startDate,
        time: slots[i]?.time ?? nextScheduleTime(),
      }));
      // Captions are opt-in — only queue if Auto-generate is on in post settings.
      skipNextCaptionGenRef.current = !autoGenerateCaptionsRef.current;
      captionQueueRef.current = [];
      setMediaItems(queued);
      setMediaIndex(0);
      mediaItemsRef.current = queued;
      if (queued[0]?.date) setSelectedDate(queued[0].date);
      if (queued[0]?.time) {
        setFormTime(queued[0].time);
        setScheduleTimeTouched(true);
      }
      setShowBulkUpload(false);
      if (autoGenerateCaptionsRef.current) {
        const imageUrls = queued.filter((i) => i.type === "image").map((i) => i.url);
        enqueueCaptionJobs(imageUrls, true);
      }
    } catch (err) {
      if (uploaded.length > 0) {
        const startDate =
          !selectedDate || isPastDateKey(selectedDate, todayDateKeyLocal())
            ? todayDateKeyLocal()
            : selectedDate;
        const slots = staggerBulkSlots(uploaded.length, startDate, nextScheduleTime());
        const partial = uploaded.map((item, i) => ({
          ...item,
          caption: "",
          date: slots[i]?.date ?? startDate,
          time: slots[i]?.time ?? nextScheduleTime(),
        }));
        skipNextCaptionGenRef.current = !autoGenerateCaptionsRef.current;
        captionQueueRef.current = [];
        setMediaItems(partial);
        mediaItemsRef.current = partial;
        setMediaIndex(0);
        setShowBulkUpload(false);
        if (autoGenerateCaptionsRef.current) {
          enqueueCaptionJobs(
            partial.filter((i) => i.type === "image").map((i) => i.url),
            true,
          );
        }
      }
      setMediaError(
        err instanceof DashboardUploadError ? err.message : "Some uploads failed. Please try again.",
      );
    } finally {
      setBulkUploading(false);
      setBulkUploadProgress({ done: 0, total: 0 });
      if (bulkInputRef.current) bulkInputRef.current.value = "";
    }
  }

  const [eventTitle, setEventTitle] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventType, setEventType] = useState<CalendarEvent["type"]>("other");
  const [eventNotes, setEventNotes] = useState("");
  const [confirmDeletePost, setConfirmDeletePost] = useState(false);
  const [postPendingDelete, setPostPendingDelete] = useState<CalendarScheduledPost | null>(null);
  const [confirmDeleteEvent, setConfirmDeleteEvent] = useState(false);

  const { meta } = useMetaConnection();
  const features = usePlanFeatures();
  const { workspaceName, workspaceInitials } = usePlan();
  const { locationId, loading: locationLoading, error: locationError, refresh: refreshLocations } = useActiveLocation();

  const loadPosts = useCallback(async () => {
    if (!locationId) {
      setPosts([]);
      return;
    }
    try {
      const records = await fetchDashboardPosts(locationId);
      setPosts(
        records.map((record) => ({
          ...mapRecordToCalendarPost(record),
          mediaUrl: record.mediaUrl ?? record.mediaUrls?.[0] ?? null,
          mediaType: record.mediaType ?? null,
          errorLog: record.errorLog ?? null,
        })),
      );
      loadedOkRef.current = true;
      setLoadError(null);
    } catch {
      // Keep grid stable on transient errors; only surface a true initial-load
      // failure (nothing successfully loaded yet) instead of a silent blank grid.
      if (!loadedOkRef.current) {
        setLoadError("We couldn't load your calendar. Check your connection and try again.");
      }
    }
  }, [locationId]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  // Calendar events: live, location-scoped.
  const loadEvents = useCallback(async () => {
    if (!locationId) {
      setEvents([]);
      return;
    }
    try {
      const recs = await fetchDashboardCalendar(locationId);
      setEvents(recs.map(recordToEvent));
      eventsLoadedOkRef.current = true;
      setEventsLoadError(null);
    } catch {
      if (!eventsLoadedOkRef.current) {
        setEventsLoadError("We couldn't load calendar events. Check your connection and try again.");
      }
    }
  }, [locationId]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    const reload = () => {
      void loadPosts();
      void loadEvents();
    };
    window.addEventListener("dashboard-location-updated", reload);
    return () => window.removeEventListener("dashboard-location-updated", reload);
  }, [loadPosts, loadEvents]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();
  const todayKey = todayDateKeyLocal(today);

  // Composer never targets a past day — snap selection forward if needed.
  const composerDate =
    !selectedDate || isPastDateKey(selectedDate, todayKey) ? todayKey : selectedDate;

  const scheduleTimeOptions = useMemo(() => {
    if (composerDate !== todayKey) return TIME_OPTIONS;
    const min = nextScheduleTime();
    return TIME_OPTIONS.filter((t) => t.value >= min);
  }, [composerDate, todayKey]);

  // Keep the composer schedule time current while the user hasn't picked a custom slot.
  useEffect(() => {
    if (editingPost || scheduleTimeTouched) return;
    if (composerDate !== todayKey) return;

    const sync = () => {
      const next = nextScheduleTime();
      setFormTime((prev) => (prev === next ? prev : next));
    };
    sync();
    const id = window.setInterval(sync, 30_000);
    return () => window.clearInterval(id);
  }, [editingPost, scheduleTimeTouched, composerDate, todayKey]);

  // If the selected slot drifts into the past (e.g. sitting on today's page), bump it.
  useEffect(() => {
    if (editingPost) return;
    if (!isScheduleSlotPast(composerDate, formTime)) return;
    setFormTime(nextScheduleTime());
  }, [editingPost, composerDate, formTime]);

  // Keep the active bulk-queue slide's draft fields in sync with the composer.
  useEffect(() => {
    if (!isBulkQueue) return;
    setMediaItems((prev) => {
      const cur = prev[mediaIndex];
      if (
        !cur ||
        (cur.caption === formCaption &&
          cur.date === composerDate &&
          cur.time === formTime)
      ) {
        return prev;
      }
      return prev.map((item, i) =>
        i === mediaIndex
          ? { ...item, caption: formCaption, date: composerDate, time: formTime }
          : item,
      );
    });
  }, [isBulkQueue, mediaIndex, formCaption, composerDate, formTime]);

  const holidayMap = useMemo(() => {
    const map = new Map<string, string>();
    const years = [year - 1, year, year + 1];
    for (const y of years) {
      const yMap = getHolidayMap(y);
      yMap.forEach((v, k) => map.set(k, v));
    }
    return map;
  }, [year]);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells: { day: number; currentMonth: boolean; dateKey: string }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    cells.push({ day: d, currentMonth: false, dateKey: formatDateKey(prevYear, prevMonth, d) });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, currentMonth: true, dateKey: formatDateKey(year, month, d) });
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    cells.push({ day: d, currentMonth: false, dateKey: formatDateKey(nextYear, nextMonth, d) });
  }

  function getWeekDates(): { day: number; dateKey: string; dayName: string }[] {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return {
        day: d.getDate(),
        dateKey: formatDateKey(d.getFullYear(), d.getMonth(), d.getDate()),
        dayName: DAYS[i],
      };
    });
  }

  function prevPeriod() {
    const d = new Date(currentDate);
    if (view === "month" || view === "agenda") d.setMonth(d.getMonth() - 1);
    else d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  }

  function nextPeriod() {
    const d = new Date(currentDate);
    if (view === "month" || view === "agenda") d.setMonth(d.getMonth() + 1);
    else d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  }

  function goToday() {
    setCurrentDate(new Date());
  }

  function openDayDetail(dateKey: string) {
    setSelectedDate(dateKey);
    setModalMode("day-detail");
  }

  function openNewPost(dateKey: string) {
    const day = isPastDateKey(dateKey, todayKey) ? todayKey : dateKey;
    setEditingPost(null);
    setSelectedDate(day);
    setFormTemplate("");
    setFormPlatform("both");
    setFormTime(nextScheduleTime());
    setScheduleTimeTouched(false);
    setFormCaption("");
    setCaptionOptions([]);
    setCaptionGenError(null);
    setCaptionIndex(0);
    setCaptionUserEdited(false);
    stopCaptionRotation();
    setFormStatus("scheduled");
    clearComposerMedia();
    setMediaError(null);
    if (typeof document !== "undefined") {
      document.getElementById("post-composer")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function openPostPreview(post: CalendarScheduledPost) {
    setRadialMenu(null);
    setPreviewPost(post);
    setModalMode("preview");
  }

  function closePostPreview() {
    // Keep previewPost mounted through the GSAP exit tween.
    setModalMode(null);
  }

  function openPostRadialMenu(post: CalendarScheduledPost, e: React.MouseEvent<HTMLElement>) {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setRadialMenu({
      post,
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  }

  function handleRadialPostAction(action: RadialPostAction) {
    if (!radialMenu) return;
    const post = radialMenu.post;
    setRadialMenu(null);
    if (action === "preview") openPostPreview(post);
    else if (action === "edit") openEditPost(post);
    else requestCancelPost(post);
  }

  function openEditPost(post: CalendarScheduledPost) {
    skipNextCaptionGenRef.current = true;
    setRadialMenu(null);
    setPreviewPost(null);
    setModalMode(null);
    setEditingPost(post);
    setSelectedDate(post.date);
    setFormTemplate(post.templateId);
    setFormPlatform(post.platform);
    setFormTime(post.time);
    setScheduleTimeTouched(true);
    setFormCaption(post.caption);
    setCaptionOptions([]);
    setCaptionGenError(null);
    setCaptionIndex(0);
    setCaptionUserEdited(true);
    stopCaptionRotation();
    setFormStatus(
      post.status === "published" || post.status === "failed"
        ? "scheduled"
        : (post.status as "scheduled" | "draft"),
    );
    if (post.mediaUrl) {
      setComposerMediaSingle(post.mediaUrl, post.mediaType === "video" ? "video" : "image");
    } else {
      clearComposerMedia();
    }
    setMediaError(null);
    if (typeof document !== "undefined") {
      document.getElementById("post-composer")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function openNewEvent(dateKey: string) {
    setEditingEvent(null);
    setSelectedDate(dateKey);
    setEventTitle("");
    setEventTime("");
    setEventType("other");
    setEventNotes("");
    setModalMode("event");
  }

  function openEditEvent(event: CalendarEvent) {
    setEditingEvent(event);
    setSelectedDate(event.date);
    setEventTitle(event.title);
    setEventTime(event.time || "");
    setEventType(event.type);
    setEventNotes(event.notes || "");
    setModalMode("event");
  }

  async function handlePublishNow() {
    if (!locationId || uploadingMedia || !mediaUrl) {
      setPublishResult({ type: "error", message: "Add an image before publishing." });
      return;
    }
    if (mediaType === "video") {
      setPublishResult({ type: "error", message: "Video publish is not available in closed beta." });
      return;
    }
    if (!meta?.connected) {
      setPublishResult({ type: "error", message: "Connect Facebook in Settings before publishing." });
      return;
    }

    const tmpl = templates.find((t) => t.id === formTemplate);
    setPublishing(true);
    setPublishResult(null);

    try {
      const payload = await buildMetaPublishPayload({
        platform: formPlatform,
        caption: formCaption,
        imageUrl: mediaUrl,
        locationId,
      });
      const res = await fetch("/api/meta/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Publish failed");

      const postData = {
        templateId: formTemplate,
        templateName: tmpl?.name || "",
        platform: formPlatform,
        date: selectedDate || todayKey,
        time: formTime,
        caption: formCaption,
        status: "scheduled" as const,
        pillar: tmpl?.pillar || "",
      };
      const base = mapCalendarPostToCreateInput(postData, locationId);
      await createDashboardPost({
        ...base,
        status: "published",
        scheduledFor: new Date().toISOString(),
        mediaUrl,
        mediaType: "image",
        mediaUrls: [mediaUrl],
      });
      await loadPosts();
      setPublishResult({ type: "success", message: "Published to Meta!" });
      advanceComposerAfterSave();
    } catch (err) {
      setPublishResult({
        type: "error",
        message: err instanceof Error ? err.message : "Publish failed",
      });
    } finally {
      setPublishing(false);
    }
  }

  function advanceComposerAfterSave() {
    const scheduleDate = selectedDate || todayKey;
    if (editingPost || mediaItems.length <= 1) {
      openNewPost(scheduleDate);
      return;
    }
    const nextItems = mediaItems.filter((_, i) => i !== mediaIndex);
    const nextIndex = Math.min(mediaIndex, nextItems.length - 1);
    setCaptionUserEdited(false);
    setCaptionOptions([]);
    setCaptionGenError(null);
    setFormCaption("");
    setFormTime(nextScheduleTime());
    setScheduleTimeTouched(false);
    stopCaptionRotation();
    setEditingPost(null);
    setMediaItems(nextItems);
    setMediaIndex(nextIndex);
  }

  function togglePlatformChannel(ch: "facebook" | "instagram") {
    const fb = formPlatform === "facebook" || formPlatform === "both";
    const ig = formPlatform === "instagram" || formPlatform === "both";
    const nfb = ch === "facebook" ? !fb : fb;
    const nig = ch === "instagram" ? !ig : ig;
    if (nfb && nig) setFormPlatform("both");
    else if (nfb) setFormPlatform("facebook");
    else if (nig) setFormPlatform("instagram");
    // never allow zero channels — ignore the toggle that would clear the last one
  }

  function sleep(ms: number) {
    return new Promise<void>((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }

  function enqueueCaptionJobs(urls: string[], prioritizeFirst = false) {
    let added = 0;
    for (const url of urls) {
      if (!url) continue;
      const existing = mediaItemsRef.current.find((i) => i.url === url);
      if (existing?.type === "video") continue;
      if (existing?.caption?.trim()) continue;
      if (captioningUrlRef.current === url) continue;
      if (captionQueueRef.current.includes(url)) continue;
      captionQueueRef.current.push(url);
      added += 1;
    }
    if (prioritizeFirst && urls[0]) {
      const head = urls[0];
      captionQueueRef.current = [
        head,
        ...captionQueueRef.current.filter((u) => u !== head),
      ];
    }
    if (added > 0 || captionQueueRef.current.length > 0) {
      setCaptionQueueBusy(true);
      void drainCaptionQueue();
    }
  }

  /** Explicit click — caption the active image only. */
  function requestCaptionForActive() {
    if (!mediaUrl || mediaType !== "image" || uploadingMedia || bulkUploading) return;
    if (captionLoading || captioningUrlRef.current === mediaUrl) return;
    void generateCaptionForUrl(mediaUrl);
  }

  /** Explicit click — caption every image in the bulk queue that still needs one. */
  function requestCaptionsForQueue() {
    const urls = mediaItemsRef.current
      .filter((i) => i.type === "image" && !i.caption?.trim())
      .map((i) => i.url);
    if (mediaUrl && mediaType === "image") {
      enqueueCaptionJobs([mediaUrl, ...urls.filter((u) => u !== mediaUrl)], true);
    } else {
      enqueueCaptionJobs(urls, true);
    }
  }

  async function generateCaptionForUrl(imageUrl: string): Promise<boolean> {
    const genId = ++captionGenIdRef.current;
    const showInComposer = () => mediaUrlRef.current === imageUrl;

    if (showInComposer()) {
      setCaptionLoading(true);
      setCaptionGenError(null);
      setCaptionOptions([]);
      stopCaptionRotation();
    }

    try {
      const platform = formPlatform === "both" ? "instagram" : formPlatform;
      const body = JSON.stringify({
        imageUrl,
        platform,
        count: 3,
        locationId,
      });
      let data: {
        variants?: CaptionOption[];
        compliance?: { blocked?: boolean; message?: string };
      } | null = null;
      let blocked: string | null = null;
      let lastError = "Couldn't generate captions. Try again.";

      for (let attempt = 0; attempt < 3; attempt++) {
        if (genId !== captionGenIdRef.current && showInComposer()) {
          // Newer active-slide request superseded this one for the UI, but still
          // finish writing the caption onto the queue item when possible.
        }
        const res = await fetch("/api/ai/captions-from-image", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body,
        });
        const json = await res.json().catch(() => ({}));
        if (json?.compliance?.blocked) {
          blocked = json.compliance.message || "These options were blocked by your content rules.";
          break;
        }
        if (res.ok && Array.isArray(json?.variants) && json.variants.length > 0) {
          data = json;
          break;
        }
        if (res.status === 429) {
          lastError = "Caption service is busy — waiting, then retrying…";
          if (showInComposer()) setCaptionGenError(lastError);
          await sleep(4000 + attempt * 2000);
          continue;
        }
        if (typeof json?.error === "string" && json.error.trim()) {
          lastError = json.error.trim();
        } else if (!res.ok) {
          lastError = `Caption service error (${res.status}). Try again.`;
        }
        if (attempt < 2) await sleep(800);
      }

      if (blocked) {
        if (showInComposer()) setCaptionGenError(blocked);
        return false;
      }

      const variants: CaptionOption[] = data?.variants ?? [];
      if (variants.length === 0) {
        if (showInComposer()) setCaptionGenError(lastError);
        return false;
      }

      const text = formatCaptionOption(variants[0]);
      setMediaItems((prev) =>
        prev.map((item) => (item.url === imageUrl ? { ...item, caption: text } : item)),
      );

      if (showInComposer()) {
        setCaptionOptions(variants);
        setCaptionUserEdited(false);
        setCaptionIndex(0);
        setFormCaption(text);
        setCaptionGenError(null);
        // Rotating options is noisy in a bulk queue — keep it for single posts.
        if (mediaItemsRef.current.length <= 1) {
          startCaptionRotation(variants);
        }
      }
      return true;
    } catch (err) {
      if (showInComposer()) {
        setCaptionGenError(
          err instanceof Error ? err.message : "Couldn't generate captions.",
        );
      }
      return false;
    } finally {
      if (showInComposer()) setCaptionLoading(false);
    }
  }

  async function drainCaptionQueue() {
    if (captionDrainRunningRef.current) return;
    captionDrainRunningRef.current = true;
    setCaptionQueueBusy(true);
    try {
      while (captionQueueRef.current.length > 0) {
        const url = captionQueueRef.current.shift()!;
        const existing = mediaItemsRef.current.find((i) => i.url === url);
        if (!existing || existing.type === "video" || existing.caption?.trim()) {
          continue;
        }
        captioningUrlRef.current = url;
        await generateCaptionForUrl(url);
        captioningUrlRef.current = null;
        // Stay under the captions-from-image rate limit on large batches.
        if (captionQueueRef.current.length > 0) {
          await sleep(2200);
        }
      }
    } finally {
      captioningUrlRef.current = null;
      captionDrainRunningRef.current = false;
      setCaptionQueueBusy(captionQueueRef.current.length > 0);
    }
  }

  // Auto-generate captions for the active slide (queued — never parallel stampede).
  useEffect(() => {
    if (skipNextCaptionGenRef.current) {
      skipNextCaptionGenRef.current = false;
      return;
    }
    if (!autoGenerateCaptions) return;
    if (!mediaUrl || mediaType !== "image" || uploadingMedia || bulkUploading) return;
    const current = mediaItems[mediaIndex];
    if (current?.caption?.trim()) return;
    // Active slide jumps to the front of the queue so swiping feels responsive.
    enqueueCaptionJobs([mediaUrl], true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run on media change / toggle
  }, [mediaUrl, mediaType, autoGenerateCaptions, uploadingMedia, bulkUploading, mediaIndex]);

  useEffect(() => {
    return () => {
      stopCaptionRotation();
      captionQueueRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSavePost(approve = false) {
    if (!locationId || uploadingMedia) return;

    // Composer UI falls back to today when selectedDate is empty — never schedule a past day.
    const scheduleDate =
      !selectedDate || isPastDateKey(selectedDate, todayKey) ? todayKey : selectedDate;
    if (selectedDate !== scheduleDate) setSelectedDate(scheduleDate);

    const isScheduling =
      !editingPost && (approve || formStatus === "scheduled");
    const savingAsScheduled =
      isScheduling ||
      (editingPost && (approve || formStatus === "scheduled"));

    if (savingAsScheduled && isScheduleSlotPast(scheduleDate, formTime)) {
      setPublishResult({
        type: "error",
        message: "Pick a future date and time — posts can’t be scheduled in the past.",
      });
      setShowSchedulePicker(true);
      return;
    }

    if (savingAsScheduled && mediaType === "video") {
      setPublishResult({
        type: "error",
        message: "Video publish is not available in closed beta.",
      });
      return;
    }

    if (savingAsScheduled && !meta?.connected) {
      setPublishResult({
        type: "error",
        message: "Connect Facebook & Instagram in Settings before scheduling — otherwise the post won’t publish.",
      });
      return;
    }

    // Keep the month grid on the day we're scheduling onto.
    const [sy, sm] = scheduleDate.split("-").map(Number);
    if (sy && sm) {
      setCurrentDate((prev) =>
        prev.getFullYear() === sy && prev.getMonth() === sm - 1
          ? prev
          : new Date(sy, sm - 1, 1),
      );
    }

    const tmpl = templates.find((t) => t.id === formTemplate);
    const postData = {
      templateId: formTemplate,
      templateName: tmpl?.name || "",
      platform: formPlatform,
      date: scheduleDate,
      time: formTime,
      caption: formCaption,
      status: formStatus,
      pillar: tmpl?.pillar || "",
    };

    // Scheduling always goes through "approved" — the internal cron queue.
    // Meta-native scheduling (`scheduledTime` on /api/meta/publish) is not
    // used here: Instagram's API has no native scheduling, so it would post
    // immediately, and the DB row would sit in "scheduled" forever.

    setPublishing(true);
    setPublishResult(null);
    try {
      const base = mapCalendarPostToCreateInput(postData, locationId);
      const status = approve
        ? ("approved" as const)
        : base.status === "scheduled"
          ? ("approved" as const)
          : base.status;
      if (editingPost) {
        const updatePayload: Parameters<typeof updateDashboardPost>[1] = {
          copy: base.copy,
          platforms: base.platforms,
          scheduledFor: base.scheduledFor,
          status,
          templateId: base.templateId,
          pillar: base.pillar,
        };
        if (mediaUrl) {
          updatePayload.mediaUrl = mediaUrl;
          updatePayload.mediaUrls = [mediaUrl];
          updatePayload.mediaType = mediaType;
        } else if (!editingPost.mediaUrl) {
          updatePayload.mediaUrl = null;
          updatePayload.mediaUrls = null;
          updatePayload.mediaType = null;
        }
        await updateDashboardPost(editingPost.id, updatePayload);
      } else {
        await createDashboardPost({
          ...base,
          status,
          mediaUrl: mediaUrl || null,
          mediaUrls: mediaUrl ? [mediaUrl] : null,
          mediaType: mediaUrl ? mediaType : null,
        });
      }
      await loadPosts();
      if (isScheduling) {
        setPublishResult({
          type: "success",
          message: "Your post has been scheduled.",
        });
      } else if (editingPost) {
        setPublishResult({ type: "success", message: "Post updated." });
      } else if (formStatus === "draft") {
        setPublishResult({ type: "success", message: "Saved as draft." });
      }
    } catch (err) {
      setPublishResult({
        type: "error",
        message: formatDashboardApiMessage(err, "Could not save this post."),
      });
      return;
    } finally {
      setPublishing(false);
    }

    advanceComposerAfterSave();
  }

  function requestCancelPost(post: CalendarScheduledPost) {
    setPostPendingDelete(post);
    setConfirmDeletePost(true);
  }

  async function handleDeletePost() {
    const target = postPendingDelete || editingPost;
    if (!target) return;
    setConfirmDeletePost(false);
    setPostPendingDelete(null);
    try {
      await deleteDashboardPost(target.id);
      await loadPosts();
      if (editingPost?.id === target.id) {
        setEditingPost(null);
        setModalMode(null);
        openNewPost(todayKey);
      }
      if (previewPost?.id === target.id) {
        setPreviewPost(null);
        setModalMode(null);
      }
      setPublishResult({ type: "success", message: "Post canceled." });
    } catch (err) {
      setPublishResult({
        type: "error",
        message: formatDashboardApiMessage(err, "Could not delete this post."),
      });
    }
  }

  async function handleSaveEvent() {
    if (!eventTitle.trim() || !locationId) return;
    const startsAt = new Date(`${selectedDate}T${eventTime || "00:00"}`).toISOString();
    const fields = {
      title: eventTitle.trim(),
      description: eventNotes || null,
      type: eventType,
      startsAt,
    };

    try {
      if (editingEvent) {
        await updateDashboardCalendarEvent(editingEvent.id, fields);
      } else {
        await createDashboardCalendarEvent({ locationId, ...fields });
      }
      await loadEvents();
      setModalMode(null);
    } catch {
      setPublishResult({ type: "error", message: "Could not save that event. Try again." });
    }
  }

  async function handleDeleteEvent() {
    if (!editingEvent) return;
    setConfirmDeleteEvent(false);
    const id = editingEvent.id;
    const prev = events;
    setEvents((cur) => cur.filter((e) => e.id !== id)); // optimistic
    setModalMode(null);
    try {
      await deleteDashboardCalendarEvent(id);
    } catch {
      setEvents(prev); // rollback
      setPublishResult({ type: "error", message: "Could not remove that event. Try again." });
    }
  }

  const visiblePosts = posts.filter((p) => {
    if (calendarSearch.trim()) {
      const q = calendarSearch.trim().toLowerCase();
      const hay = `${p.caption || ""} ${p.templateName || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const postsMap = new Map<string, CalendarScheduledPost[]>();
  visiblePosts.forEach((p) => {
    const existing = postsMap.get(p.date) || [];
    existing.push(p);
    postsMap.set(p.date, existing);
  });

  const eventsMap = new Map<string, CalendarEvent[]>();
  events.forEach((e) => {
    const existing = eventsMap.get(e.date) || [];
    existing.push(e);
    eventsMap.set(e.date, existing);
  });

  const calendarPeriodLabel = (() => {
    if (view === "week") {
      const start = new Date(currentDate);
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const sameMonth = start.getMonth() === end.getMonth();
      const sameYear = start.getFullYear() === end.getFullYear();
      if (sameMonth) {
        return `${start.toLocaleDateString("en-US", { month: "long" })} ${start.getDate()}–${end.getDate()}, ${end.getFullYear()}`;
      }
      if (sameYear) {
        return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${end.getFullYear()}`;
      }
      return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  })();
  const accountLabel = meta?.connected ? meta.pageName : workspaceName;
  const accountHandle = `@${(accountLabel || "workspace").toLowerCase().replace(/[^a-z0-9]+/g, "") || "workspace"}`;

  function formatDisplayDate(dateKey: string) {
    const d = new Date(dateKey + "T12:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  }

  return (
    <div className="pb-app min-h-0">
      <LocationGate
        loading={locationLoading}
        error={locationError}
        locationId={locationId}
        onRetry={() => void refreshLocations()}
      >
      <>
      <div className="pb-app-header shrink-0 !mb-3 max-lg:!mb-2">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h1 className="!text-[1.45rem] !leading-tight !tracking-tight sm:!text-[1.65rem]">Schedule</h1>
            <p className="!mt-0.5 !max-w-xl !text-[12px] !text-black/45 max-sm:!hidden">
              Queue and edit posts for your connected channels
            </p>
          </div>
          <div className="flex w-full shrink-0 flex-wrap items-center gap-2.5 md:w-auto">
            <label className="relative flex min-w-0 flex-1 items-center md:flex-none">
              <Search size={15} className="pointer-events-none absolute left-3 text-black/35" aria-hidden />
              <input
                type="search"
                value={calendarSearch}
                onChange={(e) => setCalendarSearch(e.target.value)}
                placeholder="Search"
                aria-label="Search schedule"
                className="h-10 w-full rounded-xl border border-black/10 bg-white pl-9 pr-3 text-sm text-black outline-none transition-colors placeholder:text-black/35 focus:border-[#ee2532]/40 md:w-[200px]"
              />
            </label>
            <CollapsingLabelButton
              aria-label="Post settings"
              icon={<Settings2 size={15} aria-hidden />}
              label="Post settings"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Never open bulk flows from this control.
                setShowBulkUpload(false);
                setShowBulkList(false);
                setBulkListScheduleIndex(null);
                setShowPostSettings(true);
              }}
            />
            {features.multiLocation && <LocationSwitcher />}
          </div>
        </div>
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl px-4 py-3 text-sm font-medium flex items-center justify-between gap-3 bg-[#ee2532]/10 text-[#c81e2a]">
          <span>{loadError}</span>
          <button
            onClick={() => {
              setLoadError(null);
              void loadPosts();
              void loadEvents();
            }}
            className="pb-btn-secondary text-xs py-1.5 px-3 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {eventsLoadError && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-[rgba(217,119,6,0.25)] bg-[rgba(217,119,6,0.08)] px-4 py-3 text-sm text-[#b45309]">
          <span>{eventsLoadError}</span>
          <button
            type="button"
            onClick={() => void loadEvents()}
            className="pb-btn-secondary shrink-0 px-3 py-1.5 text-xs"
          >
            Retry
          </button>
        </div>
      )}

      {publishResult && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 top-[max(1.25rem,env(safe-area-inset-top))] z-[120] flex justify-center px-4"
        >
          <div
            className={`pointer-events-auto flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-[0_12px_40px_-12px_rgba(20,20,40,0.45)] backdrop-blur-xl animate-[pbToastIn_0.28s_ease-out] ${
              publishResult.type === "success"
                ? "border-white/50 bg-white/55 text-black/85"
                : "border-[#ee2532]/25 bg-[#fff5f5]/80 text-[#c81e2a]"
            }`}
          >
            {publishResult.type === "success" ? (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1f9d4d] text-white shadow-[0_0_0_4px_rgba(31,157,77,0.18)]">
                <Check size={16} strokeWidth={2.75} aria-hidden />
              </span>
            ) : (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ee2532] text-sm font-bold text-white">
                !
              </span>
            )}
            <p className="text-sm font-semibold tracking-tight">{publishResult.message}</p>
          </div>
        </div>
      )}

      <div
        className={`pb-cal-grid grid min-h-0 grid-cols-1 gap-3 sm:gap-4 lg:gap-4 xl:gap-5 2xl:gap-6 ${
          isBulkQueue
            ? "lg:grid-cols-[minmax(340px,420px)_minmax(0,1fr)] xl:grid-cols-[minmax(400px,520px)_minmax(0,1fr)] 2xl:grid-cols-[minmax(440px,580px)_minmax(0,1fr)]"
            : "lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)] xl:grid-cols-[minmax(380px,480px)_minmax(0,1fr)] 2xl:grid-cols-[minmax(420px,540px)_minmax(0,1fr)]"
        }`}
      >
        {/* Create Schedule — left composer card */}
        <div id="post-composer" className="flex min-h-0 flex-col overflow-hidden max-md:overflow-visible rounded-[16px] border border-black/[0.06] bg-white shadow-[0_8px_30px_-18px_rgba(20,20,40,0.35)] sm:rounded-[20px] max-md:mb-[calc(4.75rem+env(safe-area-inset-bottom,0px))]">
          <div className="flex shrink-0 items-center justify-between px-3 pt-3 pb-1.5 sm:px-4 sm:pt-4 sm:pb-2">
            <h2 className="text-[15px] font-semibold tracking-tight text-black">
              {isBulkQueue ? "Create Posts" : "Create Post"}
            </h2>
          </div>

          <div className="pb-composer-body flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-0 sm:px-4">
            {editingPost?.status === "failed" && (
              <div className="mb-3 shrink-0 rounded-xl border border-[#ee2532]/25 bg-[#ee2532]/[0.06] p-3">
                <p className="text-xs font-semibold text-[#c81e2a]">This post failed to publish</p>
                {editingPost.errorLog && (
                  <p className="mt-1 break-words text-[11px] text-black/65">{editingPost.errorLog}</p>
                )}
                <p className="mt-1 text-[11px] text-black/55">Updating it sends it back through the queue.</p>
              </div>
            )}

            <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
              <div
                className="flex shrink-0 items-center gap-2 rounded-xl py-0.5 pr-1"
                title={accountHandle}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ee2532] to-[#c81e2a] text-[11px] font-bold text-white">
                  {workspaceInitials}
                </span>
                <span className="max-w-[9rem] truncate text-xs font-medium text-black/55">
                  {accountHandle}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {(["facebook", "instagram"] as const).map((ch) => {
                  const on = formPlatform === ch || formPlatform === "both";
                  return (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => togglePlatformChannel(ch)}
                      aria-label={ch}
                      aria-pressed={on}
                      title={ch}
                      className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                        on
                          ? "border-[#ee2532] bg-[#ee2532]/10 text-[#ee2532]"
                          : "border-black/10 bg-white text-black/30 hover:text-black/55"
                      }`}
                    >
                      {ch === "facebook" ? <FacebookGlyph /> : <InstagramGlyph />}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={requestAddComposerPost}
                  disabled={uploadingMedia || bulkUploading}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ee2532] text-white transition-colors hover:bg-[#c81e2a] disabled:opacity-50"
                  aria-label={
                    mediaItems.length > 0 && !editingPost
                      ? "Add another post"
                      : "New post"
                  }
                  title={
                    mediaItems.length > 0 && !editingPost
                      ? "Add another post"
                      : "New post"
                  }
                >
                  <Plus size={15} strokeWidth={2.5} aria-hidden />
                </button>
                <input
                  ref={addComposerInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="sr-only"
                  tabIndex={-1}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    void handleAddComposerMedia(file);
                  }}
                />
              </div>
            </div>

            <div className="mb-2 flex shrink-0 items-end gap-3 border-b border-black/[0.08] sm:gap-5">
              <span className="-mb-px flex items-center gap-1.5 border-b-2 border-[#ee2532] pb-2 text-[13px] font-semibold text-[#ee2532]">
                <ImageIcon size={15} aria-hidden /> Post
              </span>
              <button
                type="button"
                onClick={() => setShowBulkUpload(true)}
                className={`-mb-px flex items-center gap-1 border-b-2 pb-2 text-[13px] font-semibold transition-colors ${
                  isBulkQueue
                    ? "border-[#ee2532] text-[#ee2532]"
                    : "border-transparent text-black/45 hover:text-[#ee2532]"
                }`}
              >
                Bulk Upload <Plus size={14} strokeWidth={2.5} aria-hidden />
              </button>
              {editingPost && !isBulkQueue && (
                <button
                  type="button"
                  onClick={() => openNewPost(todayKey)}
                  className="ml-auto pb-2.5 text-xs font-medium text-[#ee2532] hover:underline"
                >
                  Start new
                </button>
              )}
            </div>

            {isBulkQueue && (
              <div className="mb-2 flex shrink-0 items-center justify-between gap-2 rounded-xl bg-[#f6f6f7] px-2.5 py-1.5">
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-medium text-black/60">
                    <span className="tabular-nums text-black/80">
                      {mediaIndex + 1}
                    </span>
                    <span className="text-black/35"> / </span>
                    <span className="tabular-nums text-black/80">
                      {mediaItems.length}
                    </span>
                    <span className="text-black/45"> in queue</span>
                  </p>
                  {captionQueueBusy && captionImageTotal > 0 ? (
                    <p className="mt-0.5 truncate text-[11px] text-black/40">
                      Writing captions {Math.min(captionImageDone, captionImageTotal)}/
                      {captionImageTotal}…
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => requestCaptionsForQueue()}
                    disabled={
                      captionQueueBusy ||
                      captionLoading ||
                      uploadingMedia ||
                      bulkUploading ||
                      captionImageDone >= captionImageTotal
                    }
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-semibold text-[#ee2532] transition-colors hover:bg-[#ee2532]/10 disabled:opacity-40"
                    title="Write AI captions for images still missing one"
                  >
                    <Wand2 size={14} aria-hidden /> Captions
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBulkList(true)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-semibold text-[#ee2532] transition-colors hover:bg-[#ee2532]/10"
                  >
                    <List size={14} aria-hidden /> List
                  </button>
                </div>
              </div>
            )}

            <PostPreview
              platform={formPlatform}
              mediaUrl={mediaUrl}
              mediaType={mediaType}
              caption={formCaption}
              accountName={accountLabel}
              avatarInitials={workspaceInitials}
              uploadingMedia={uploadingMedia || bulkUploading}
              onPickFile={(f) => handleMediaFile(f)}
              onRemove={removeActiveMedia}
              mediaError={mediaError}
              mediaItems={mediaItems}
              carouselIndex={mediaIndex}
              onCarouselIndexChange={goCarouselTo}
            />

            {/* Caption block — fixed height so preview owns remaining space. */}
            <div className="mb-1 mt-2 flex h-[64px] shrink-0 flex-col overflow-hidden sm:mb-2 sm:mt-3 sm:h-[60px]">
              <div className="relative h-[40px] shrink-0 overflow-hidden sm:h-[36px]">
                {captionLoading ? (
                  <p className="h-full overflow-hidden text-[13px] font-medium leading-snug text-[#ee2532] animate-pulse">
                    Analyzing image & writing captions…
                  </p>
                ) : (
                  <textarea
                    value={formCaption}
                    onChange={(e) => {
                      setCaptionUserEdited(true);
                      stopCaptionRotation();
                      setFormCaption(e.target.value);
                    }}
                    onFocus={() => {
                      if (captionOptions.length > 0) {
                        setCaptionUserEdited(true);
                        stopCaptionRotation();
                      }
                    }}
                    rows={2}
                    placeholder="Write your caption…"
                    className={`h-full w-full resize-none overflow-y-auto border-0 bg-transparent p-0 text-[16px] leading-snug text-black outline-none placeholder:text-black/35 transition-all duration-500 ease-in-out sm:text-[13px] ${
                      captionFade === "out" ? "translate-y-1.5 opacity-0" : "translate-y-0 opacity-100"
                    }`}
                  />
                )}
                {captionGenError && (
                  <p className="absolute inset-x-0 bottom-0 truncate bg-white/90 text-[11px] text-[#ee2532]">
                    {captionGenError}
                  </p>
                )}
              </div>
              <div className="mt-1.5 flex h-[18px] shrink-0 items-center gap-2 overflow-hidden">
                {mediaUrl && mediaType === "image" ? (
                  <button
                    type="button"
                    onClick={() => requestCaptionForActive()}
                    disabled={captionLoading || uploadingMedia || bulkUploading || captionQueueBusy}
                    className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-[#ee2532] transition-colors hover:text-[#c81e2a] disabled:opacity-40"
                  >
                    <Wand2 size={12} aria-hidden />
                    {captionLoading
                      ? "Writing…"
                      : formCaption.trim()
                        ? "Rewrite caption"
                        : "Write caption"}
                  </button>
                ) : null}
                {captionOptions.length > 1 && !captionUserEdited && !captionLoading ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      {captionOptions.map((opt, i) => (
                        <button
                          key={`${opt.angle}-${i}`}
                          type="button"
                          aria-label={`Caption option ${i + 1}`}
                          title={opt.angle}
                          onClick={() => {
                            setCaptionUserEdited(true);
                            stopCaptionRotation();
                            applyCaptionOption(opt, i);
                          }}
                          className={`h-2 min-w-[8px] rounded-full transition-all duration-300 sm:h-1.5 ${
                            i === captionIndex ? "w-4 bg-[#ee2532]" : "w-2 bg-black/15 hover:bg-black/30 sm:w-1.5"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="truncate text-[10px] font-medium uppercase tracking-wide text-black/35">
                      {captionOptions[captionIndex]?.angle || "Option"} · {captionIndex + 1}/{captionOptions.length}
                    </span>
                  </>
                ) : null}
              </div>
            </div>

          </div>

          <div className="mt-auto shrink-0 border-t border-black/[0.06] bg-[#f6f6f7] px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:px-4 max-md:sticky max-md:bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] max-md:z-30 max-md:shadow-[0_-10px_28px_-18px_rgba(20,20,40,0.35)]">
            <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setShowSchedulePicker((v) => !v)}
                className="inline-flex min-h-10 items-center gap-1.5 text-[13px] font-medium text-black/65 hover:text-black"
              >
                <Clock size={15} className="text-black/40" aria-hidden />
                <span className="max-w-[9.5rem] truncate sm:max-w-none">
                  {formatComposerSchedule(composerDate, formTime)}
                </span>
                <ChevronDown size={14} className={`text-black/35 transition-transform ${showSchedulePicker ? "rotate-180" : ""}`} aria-hidden />
              </button>
              <div className="relative shrink-0">
                <div className="flex overflow-hidden rounded-xl shadow-sm">
                  <button
                    type="button"
                    onClick={() => void handleSavePost(true)}
                    disabled={publishing || uploadingMedia || mediaType === "video"}
                    title={mediaType === "video" ? "Video publish is not available in closed beta." : undefined}
                    className="min-h-11 bg-[#ee2532] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#c81e2a] disabled:opacity-50 sm:min-h-0 sm:px-5"
                  >
                    {publishing ? "Scheduling…" : editingPost ? "Update" : "Schedule"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowScheduleMenu((v) => !v)}
                    disabled={publishing || uploadingMedia}
                    aria-label="More options"
                    className="min-h-11 border-l border-white/25 bg-[#ee2532] px-3 py-2.5 text-white transition-colors hover:bg-[#c81e2a] disabled:opacity-50 sm:min-h-0 sm:px-2.5"
                  >
                    <ChevronDown size={16} aria-hidden />
                  </button>
                </div>
                {showScheduleMenu && (
                  <div className="absolute bottom-full right-0 z-10 mb-1.5 w-52 overflow-hidden rounded-xl border border-black/10 bg-white py-1 shadow-xl">
                    {!editingPost && meta?.connected && mediaUrl && mediaType === "image" && (
                      <button
                        type="button"
                        onClick={() => { setShowScheduleMenu(false); void handlePublishNow(); }}
                        className="block w-full px-3.5 py-2 text-left text-sm text-black/75 hover:bg-black/[0.04]"
                      >
                        Publish now
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => { setShowScheduleMenu(false); setFormStatus("draft"); setTimeout(() => void handleSavePost(false), 0); }}
                      className="block w-full px-3.5 py-2 text-left text-sm text-black/75 hover:bg-black/[0.04]"
                    >
                      Save as draft
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowScheduleMenu(false); openNewEvent(selectedDate || todayKey); }}
                      className="block w-full px-3.5 py-2 text-left text-sm text-black/75 hover:bg-black/[0.04]"
                    >
                      Add event
                    </button>
                    {editingPost && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowScheduleMenu(false);
                          if (editingPost) requestCancelPost(editingPost);
                        }}
                        className="block w-full px-3.5 py-2 text-left text-sm text-[#ee2532] hover:bg-[#ee2532]/[0.06]"
                      >
                        Delete post
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            {showSchedulePicker && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-black">Date</label>
                  <input
                    type="date"
                    min={todayKey}
                    value={composerDate}
                    onChange={(e) => {
                      const next = e.target.value;
                      setSelectedDate(isPastDateKey(next, todayKey) ? todayKey : next);
                    }}
                    className="pb-field"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-black">Time</label>
                  <select
                    value={formTime}
                    onChange={(e) => {
                      setScheduleTimeTouched(true);
                      setFormTime(e.target.value);
                    }}
                    className="pb-field"
                  >
                    {scheduleTimeOptions.map((t) => (
                      <option key={t.value} value={t.value}>{t.display}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Your Schedule — right calendar card */}
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[16px] border border-black/[0.06] bg-white shadow-[0_8px_30px_-18px_rgba(20,20,40,0.35)] sm:rounded-[20px] max-lg:min-h-[28rem]">
          <div className="shrink-0 border-b border-black/[0.06] px-3 py-3 sm:px-5">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
              <h2 className="mr-auto min-w-0 truncate text-[15px] font-semibold tracking-tight text-black" aria-live="polite">
                {calendarPeriodLabel}
              </h2>
              <div className="flex items-center gap-0.5 rounded-xl border border-black/10 bg-white p-0.5">
                <button type="button" onClick={prevPeriod} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-black/45 hover:bg-black/[0.04] hover:text-black" aria-label="Previous">
                  <ChevronLeft size={16} aria-hidden />
                </button>
                <button type="button" onClick={goToday} className="h-8 rounded-lg px-2.5 text-xs font-semibold text-black/70 hover:bg-black/[0.04]">
                  Today
                </button>
                <button type="button" onClick={nextPeriod} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-black/45 hover:bg-black/[0.04] hover:text-black" aria-label="Next">
                  <ChevronRight size={16} aria-hidden />
                </button>
              </div>
              <div className="flex items-center gap-1 rounded-xl border border-black/10 p-0.5">
                <button
                  type="button"
                  onClick={() => setView("month")}
                  aria-label="Month view"
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors max-md:hidden ${view === "month" ? "bg-[#ee2532]/10 text-[#ee2532]" : "text-black/40 hover:text-black"}`}
                >
                  <LayoutGrid size={15} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setView("agenda")}
                  aria-label="Agenda view"
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${view === "agenda" ? "bg-[#ee2532]/10 text-[#ee2532]" : "text-black/40 hover:text-black"}`}
                >
                  <List size={15} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setView("week")}
                  aria-label="Week view"
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${view === "week" ? "bg-[#ee2532]/10 text-[#ee2532]" : "text-black/40 hover:text-black"}`}
                >
                  <Clock size={15} aria-hidden />
                </button>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 sm:p-4">
          {/* Month view — hidden on phones (agenda is default); compact for mid tablets */}
          {view === "month" && (
            <div className="pb-cal-month overflow-hidden rounded-2xl border border-black/[0.06] max-md:hidden">
              <div className="grid shrink-0 grid-cols-7 bg-[#fafafa]">
                {DAYS.map((d) => (
                  <div key={d} className="px-2 py-2 text-center text-[11px] font-semibold text-black/35">{d}</div>
                ))}
              </div>
              <div className="pb-cal-month-grid grid grid-cols-7 border-t border-black/[0.06]">
                {cells.map((cell, i) => {
                  const cellPosts = postsMap.get(cell.dateKey) || [];
                  const cellEvents = eventsMap.get(cell.dateKey) || [];
                  const holiday = holidayMap.get(cell.dateKey);
                  const isToday = cell.dateKey === todayKey;
                  const isPast = isPastDateKey(cell.dateKey, todayKey);
                  const isSelected = cell.dateKey === (selectedDate || todayKey);
                  const overflow = calendarCellOverflow(Boolean(holiday), cellEvents.length, cellPosts.length);
                  return (
                    <div
                      key={i}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedDate(cell.dateKey);
                        openDayDetail(cell.dateKey);
                      }}
                      onKeyDown={(e) => openDayFromKeyboard(e, cell.dateKey, openDayDetail)}
                      title={isPast ? "Past date — view only; scheduling starts today" : undefined}
                      className={`relative min-h-0 cursor-pointer overflow-hidden border-b border-r border-black/[0.06] p-1.5 text-left transition-colors hover:bg-black/[0.02] ${
                        !cell.currentMonth ? "bg-[#fcfcfc] opacity-45" : ""
                      } ${isPast && cell.currentMonth ? "opacity-40" : ""} ${isSelected ? "bg-[#fff1ee]" : ""}`}
                    >
                      {cellPosts.length > 0 && (
                        <span className="absolute inset-x-0 top-0 h-[2.5px] bg-[#ee2532]" aria-hidden="true" />
                      )}
                      <div className={`mb-1 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-medium ${
                        isToday ? "bg-[#ee2532] font-bold text-white" : "text-black/55"
                      }`}>
                        {cell.day}
                      </div>
                      <div className="min-h-0 space-y-0.5 overflow-hidden">
                        {holiday && (
                          <div className="truncate rounded px-1 py-0.5 text-[9px] font-semibold bg-[rgba(217,119,6,0.1)] text-[#b45309]">
                            {holiday}
                          </div>
                        )}
                        {cellEvents.slice(0, 1).map((ev) => (
                          <button
                            key={ev.id}
                            onClick={(e) => { e.stopPropagation(); openEditEvent(ev); }}
                            className={`w-full truncate rounded px-1 py-0.5 text-left text-[9px] font-medium transition-colors hover:opacity-80 ${eventTypeColors[ev.type]}`}
                          >
                            {ev.time ? `${ev.time.slice(0,5)} ` : ""}{ev.title}
                          </button>
                        ))}
                        {cellPosts.length > 0 && (
                          <div className="flex flex-wrap gap-0.5 pt-0.5">
                            {cellPosts.slice(0, 2).map((p) => (
                              <div key={p.id} className="flex w-7 flex-col items-center gap-0.5">
                                <button
                                  type="button"
                                  onClick={(e) => openPostRadialMenu(p, e)}
                                  title={`${formatDisplayTime(p.time)} · ${p.platform === "both" ? "Facebook & Instagram" : p.platform}`}
                                  aria-label={`Post actions ${formatDisplayTime(p.time)}`}
                                  className="relative h-7 w-7 overflow-hidden rounded-none shadow-[0_6px_14px_-6px_rgba(20,20,40,0.55)] ring-1 ring-black/10 transition-transform hover:-translate-y-0.5 hover:ring-black/25"
                                >
                                  {p.mediaUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={p.mediaUrl} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    <span
                                      className={`flex h-full w-full items-center justify-center text-[8px] font-semibold ${
                                        p.status === "failed"
                                          ? "bg-[#ee2532]/10 text-[#c81e2a]"
                                          : p.status === "draft"
                                            ? "bg-black/[0.05] text-black/45"
                                            : "bg-black/[0.06] text-black/55"
                                      }`}
                                    >
                                      {p.time.slice(0, 5)}
                                    </span>
                                  )}
                                  {p.status === "failed" && (
                                    <span className="absolute inset-x-0 bottom-0 h-1 bg-[#ee2532]" aria-hidden="true" />
                                  )}
                                </button>
                                <PlatformDots platform={p.platform} />
                              </div>
                            ))}
                          </div>
                        )}
                        {overflow > 0 && (
                          <p className="px-0.5 text-[9px] text-black/40">+{overflow} more</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Agenda — list of days in the current month (default on phones) */}
          {view === "agenda" && (
            <div className="pb-panel overflow-hidden p-0 divide-y divide-black/10">
              {cells
                .filter((c) => c.currentMonth)
                .map((cell) => {
                  const cellPosts = postsMap.get(cell.dateKey) || [];
                  const cellEvents = eventsMap.get(cell.dateKey) || [];
                  const holiday = holidayMap.get(cell.dateKey);
                  const isToday = cell.dateKey === todayKey;
                  const hasItems = cellPosts.length > 0 || cellEvents.length > 0 || Boolean(holiday);
                  if (!hasItems && cell.dateKey < todayKey) return null;
                  return (
                    <div
                      key={cell.dateKey}
                      className={`flex gap-3 p-3 sm:p-4 ${isToday ? "bg-[rgba(238,37,50,0.04)]" : ""}`}
                    >
                      <button
                        type="button"
                        onClick={() => openDayDetail(cell.dateKey)}
                        className="w-14 shrink-0 text-left"
                      >
                        <p className="text-[10px] font-bold uppercase text-black/35">
                          {DAYS[new Date(cell.dateKey + "T12:00:00").getDay()]}
                        </p>
                        <p className={`mt-0.5 text-xl font-semibold ${isToday ? "text-[#ee2532]" : "text-black"}`}>
                          {cell.day}
                        </p>
                      </button>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        {!hasItems && (
                          <button
                            type="button"
                            onClick={() => openDayDetail(cell.dateKey)}
                            className="w-full rounded-lg border border-dashed border-black/10 px-3 py-2.5 text-left text-xs text-black/45 hover:bg-black/[0.03]"
                          >
                            Nothing scheduled — tap to add
                          </button>
                        )}
                        {holiday && (
                          <div className="rounded-lg px-3 py-2 text-xs font-semibold bg-[rgba(217,119,6,0.1)] text-[#b45309]">
                            {holiday}
                          </div>
                        )}
                        {cellEvents
                          .slice()
                          .sort((a, b) => (a.time || "").localeCompare(b.time || ""))
                          .map((ev) => (
                            <button
                              key={ev.id}
                              type="button"
                              onClick={() => openEditEvent(ev)}
                              className={`w-full min-h-11 text-left rounded-lg px-3 py-2.5 transition-colors hover:opacity-85 ${eventTypeColors[ev.type]}`}
                            >
                              <p className="text-xs font-medium truncate">
                                {ev.time ? `${ev.time.slice(0, 5)} · ` : ""}
                                {ev.title}
                              </p>
                              <p className="text-[10px] opacity-70 capitalize">{eventTypeLabels[ev.type]}</p>
                            </button>
                          ))}
                        {cellPosts
                          .slice()
                          .sort((a, b) => a.time.localeCompare(b.time))
                          .map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => openPostPreview(p)}
                              className={`w-full min-h-11 text-left rounded-lg px-3 py-2.5 transition-colors hover:opacity-85 ${
                                p.status === "failed"
                                  ? "bg-[#ee2532]/10 text-[#c81e2a] border border-[#ee2532]/25"
                                  : p.status === "draft"
                                    ? "bg-black/[0.04] text-black/55 border border-dashed border-black/10"
                                    : platformColors[p.platform]
                              }`}
                            >
                              <p className="text-xs font-medium truncate">
                                {accountLabel || "Account"}
                              </p>
                              <p className="text-[10px] opacity-70">
                                {formatDisplayTime(p.time)} · {formatPostStatusLabel(p.status)}
                              </p>
                            </button>
                          ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Week view */}
          {view === "week" && (
            <div className="pb-panel overflow-hidden p-0">
              <div className="grid grid-cols-1 md:grid-cols-7">
                {getWeekDates().map((wd) => {
                  const isToday = wd.dateKey === todayKey;
                  const dayPosts = postsMap.get(wd.dateKey) || [];
                  const dayEvents = eventsMap.get(wd.dateKey) || [];
                  const holiday = holidayMap.get(wd.dateKey);
                  return (
                    <div key={wd.dateKey} className="border-b md:border-b-0 md:border-r border-black/10 last:border-r-0">
                      <div className={`px-3 py-3 text-left md:text-center ${dayPosts.length > 0 ? "border-b-2 border-b-[#ee2532]" : "border-b border-black/10"} ${isToday ? "bg-[rgba(238,37,50,0.06)]" : ""}`}>
                        <p className="text-[10px] text-black/55 font-bold uppercase">{wd.dayName}</p>
                        <p className={`text-lg font-bold mt-0.5 ${isToday ? "text-[#ee2532]" : "text-black"}`}>{wd.day}</p>
                      </div>
                      <div
                        role="button"
                        tabIndex={0}
                        className="min-h-[120px] md:min-h-[400px] w-full cursor-pointer space-y-1.5 p-2 text-left transition-colors hover:bg-black/[0.04]"
                        onClick={() => openDayDetail(wd.dateKey)}
                        onKeyDown={(e) => openDayFromKeyboard(e, wd.dateKey, openDayDetail)}
                      >
                        {holiday && (
                          <div className="rounded-lg p-2 bg-[rgba(217,119,6,0.1)] text-[#b45309]">
                            <p className="text-[10px] font-bold">{holiday}</p>
                          </div>
                        )}
                        {dayEvents.sort((a, b) => (a.time || "").localeCompare(b.time || "")).map((ev) => (
                          <button
                            key={ev.id}
                            onClick={(e) => { e.stopPropagation(); openEditEvent(ev); }}
                            className={`w-full min-h-11 text-left rounded-lg p-2 transition-colors hover:opacity-80 ${eventTypeColors[ev.type]}`}
                          >
                            {ev.time && <p className="text-[10px] font-bold">{ev.time.slice(0,5)}</p>}
                            <p className="text-xs font-medium truncate">{ev.title}</p>
                            <p className="text-[10px] opacity-70 capitalize">{eventTypeLabels[ev.type]}</p>
                          </button>
                        ))}
                        {dayPosts.sort((a, b) => a.time.localeCompare(b.time)).map((p) => (
                          <button
                            key={p.id}
                            onClick={(e) => { e.stopPropagation(); openPostPreview(p); }}
                            className={`flex w-full items-center gap-2 rounded-lg p-1.5 text-left transition-colors hover:bg-black/[0.05] ${
                              p.status === "failed" ? "ring-1 ring-[#ee2532]/25" : ""
                            }`}
                          >
                            <span className="flex w-10 shrink-0 flex-col items-center gap-0.5">
                              <span className="relative h-10 w-10 overflow-hidden rounded-none shadow-[0_8px_18px_-8px_rgba(20,20,40,0.5)] ring-1 ring-black/10">
                                {p.mediaUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={p.mediaUrl} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <span className="flex h-full w-full items-center justify-center bg-black/[0.06] text-[9px] font-semibold text-black/50">
                                    {p.time.slice(0, 5)}
                                  </span>
                                )}
                              </span>
                              <PlatformDots platform={p.platform} size="md" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-xs font-medium truncate text-black">
                                {accountLabel || "Account"}
                              </span>
                              <span className="block text-[10px] font-bold text-black/70">
                                {formatDisplayTime(p.time)} · {formatPostStatusLabel(p.status)}
                              </span>
                              {p.caption ? (
                                <span className="block truncate text-[10px] text-black/45">{p.caption}</span>
                              ) : null}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          </div>
        </div>

      </div>

      {/* Post settings (session defaults for composer) */}
      <AnimatedOverlay
        open={showPostSettings}
        onClose={() => setShowPostSettings(false)}
        ariaLabel="Post settings"
        align="bottom"
        zIndexClass="z-[100]"
        backdropClassName="bg-black/55 backdrop-blur-md"
        panelRef={postSettingsRef}
        panelClassName="pb-safe-sheet flex w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-white/40 bg-white/85 shadow-[0_24px_80px_-20px_rgba(20,20,40,0.55)] backdrop-blur-xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-black/8 px-5 py-3.5">
          <div>
            <h3 className="text-base font-semibold text-black">Post settings</h3>
            <p className="mt-0.5 text-[12px] text-black/45">
              Defaults for this session — not saved to the server
            </p>
          </div>
          <button
            type="button"
            aria-label="Close post settings"
            onClick={() => setShowPostSettings(false)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-black/45 transition-colors hover:bg-black/[0.05] hover:text-black"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-black/40">
              Default channels
            </p>
            <div className="flex items-center gap-2">
              {(["facebook", "instagram"] as const).map((ch) => {
                const on = formPlatform === ch || formPlatform === "both";
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => togglePlatformChannel(ch)}
                    aria-label={ch}
                    aria-pressed={on}
                    className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-sm font-medium capitalize transition-colors ${
                      on
                        ? "border-[#ee2532] bg-[#ee2532]/10 text-[#ee2532]"
                        : "border-black/10 bg-white text-black/45 hover:text-black/70"
                    }`}
                  >
                    {ch === "facebook" ? <FacebookGlyph /> : <InstagramGlyph />}
                    {ch}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="post-settings-time"
              className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-black/40"
            >
              Default time
            </label>
            <div className="relative">
              <Clock
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/35"
                aria-hidden
              />
              <select
                id="post-settings-time"
                value={formTime}
                onChange={(e) => {
                  setFormTime(e.target.value);
                  setScheduleTimeTouched(true);
                }}
                className="h-11 w-full appearance-none rounded-xl border border-black/10 bg-white pl-9 pr-9 text-sm font-medium text-black outline-none focus:border-[#ee2532]/40"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.display}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={15}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black/35"
                aria-hidden
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl border border-black/8 bg-white/70 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-black">Auto-generate captions</p>
              <p className="mt-0.5 text-[12px] text-black/45">
                Off by default. When on, new images get AI captions without clicking Write caption
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={autoGenerateCaptions}
              onClick={() => setAutoGenerateCaptions((v) => !v)}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                autoGenerateCaptions ? "bg-[#ee2532]" : "bg-black/15"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  autoGenerateCaptions ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="border-t border-black/8 px-5 py-3.5">
          <button
            type="button"
            onClick={() => setShowPostSettings(false)}
            className="pb-btn-primary w-full text-sm py-2.5"
          >
            Done
          </button>
        </div>
      </AnimatedOverlay>

      {/* Bulk queue list view */}
      <AnimatedOverlay
        open={showBulkList && isBulkQueue}
        onClose={() => {
          setBulkListScheduleIndex(null);
          setShowBulkList(false);
        }}
        ariaLabel="Bulk upload list"
        align="bottom"
        backdropClassName="bg-black/55 backdrop-blur-md"
        panelRef={bulkListRef}
        panelClassName="pb-safe-sheet flex w-full max-w-lg max-h-[85dvh] flex-col overflow-hidden rounded-t-2xl border border-white/40 bg-white/85 shadow-[0_24px_80px_-20px_rgba(20,20,40,0.55)] backdrop-blur-xl sm:rounded-2xl"
      >
            <div className="flex items-center justify-between gap-3 border-b border-black/8 px-5 py-3.5">
              <div>
                <h3 className="text-base font-semibold text-black">Bulk queue</h3>
                <p className="mt-0.5 text-[12px] text-black/45">
                  {mediaItems.length} posts · tap time to reschedule · tap row to open
                </p>
              </div>
              <button
                type="button"
                aria-label="Close list"
                onClick={() => {
                  setBulkListScheduleIndex(null);
                  setShowBulkList(false);
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-black/45 transition-colors hover:bg-black/[0.05] hover:text-black"
              >
                <X size={18} aria-hidden />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
              {mediaItems.map((item, i) => {
                const date = item.date || composerDate;
                const time = item.time || formTime;
                const caption = i === mediaIndex ? formCaption : item.caption || "";
                const active = i === mediaIndex;
                const editingSchedule = bulkListScheduleIndex === i;
                const rowTimeOptions =
                  date === todayKey
                    ? TIME_OPTIONS.filter((t) => t.value >= nextScheduleTime())
                    : TIME_OPTIONS;
                return (
                  <div
                    key={`${item.url}-${i}`}
                    className={`mb-1.5 flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                      active
                        ? "border-[#ee2532]/35 bg-[#ee2532]/[0.06]"
                        : "border-black/[0.06] bg-white/70"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setBulkListScheduleIndex(null);
                        goCarouselTo(i);
                        setShowBulkList(false);
                      }}
                      className="relative h-14 w-14 shrink-0 overflow-hidden rounded-none ring-1 ring-black/10"
                      aria-label={`Open post ${i + 1}`}
                    >
                      {item.type === "video" ? (
                        <video src={item.url} className="h-full w-full object-cover" muted playsInline />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.url} alt="" className="h-full w-full object-cover" />
                      )}
                      <span className="absolute left-1 top-1 flex h-4 min-w-4 items-center justify-center rounded bg-black/55 px-1 text-[9px] font-bold text-white">
                        {i + 1}
                      </span>
                    </button>
                    <div className="min-w-0 flex-1">
                      {editingSchedule ? (
                        <div className="mb-1.5 grid grid-cols-[1fr_1fr_auto] items-center gap-1.5">
                          <input
                            type="date"
                            min={todayKey}
                            value={date}
                            onChange={(e) => {
                              const next = e.target.value;
                              updateBulkItemSchedule(
                                i,
                                isPastDateKey(next, todayKey) ? todayKey : next,
                                time,
                              );
                            }}
                            className="h-8 rounded-lg border border-black/10 bg-white px-2 text-[11px] font-medium text-black outline-none focus:border-[#ee2532]/40"
                          />
                          <select
                            value={time}
                            onChange={(e) => updateBulkItemSchedule(i, date, e.target.value)}
                            className="h-8 rounded-lg border border-black/10 bg-white px-1.5 text-[11px] font-medium text-black outline-none focus:border-[#ee2532]/40"
                          >
                            {rowTimeOptions.map((t) => (
                              <option key={t.value} value={t.value}>{t.display}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => setBulkListScheduleIndex(null)}
                            className="h-8 rounded-lg bg-[#ee2532] px-2.5 text-[11px] font-semibold text-white hover:bg-[#c81e2a]"
                          >
                            Done
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setBulkListScheduleIndex(i)}
                          className="mb-1 inline-flex items-center gap-2 rounded-md text-[11px] font-semibold text-black/55 transition-colors hover:bg-black/[0.04] hover:text-black"
                          title="Edit date & time"
                        >
                          <Clock size={12} className="text-black/35" aria-hidden />
                          {formatComposerSchedule(date, time)}
                          {active && (
                            <span className="rounded bg-[#ee2532]/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#ee2532]">
                              Editing
                            </span>
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setBulkListScheduleIndex(null);
                          goCarouselTo(i);
                          setShowBulkList(false);
                        }}
                        className="block w-full text-left"
                      >
                        <span className="line-clamp-2 text-[13px] leading-snug text-black/80">
                          {captionLoading && active
                            ? "Writing caption…"
                            : caption || "No caption yet"}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-black/8 px-5 py-3">
              <button
                type="button"
                onClick={() => {
                  setBulkListScheduleIndex(null);
                  setShowBulkList(false);
                }}
                className="pb-btn-secondary w-full py-2.5 text-xs"
              >
                Close
              </button>
            </div>
      </AnimatedOverlay>

      {/* Bulk upload popup */}
      <AnimatedOverlay
        open={showBulkUpload}
        onClose={() => {
          if (!bulkUploading) setShowBulkUpload(false);
        }}
        ariaLabel="Bulk upload photos"
        align="bottom"
        backdropClassName="bg-black/60 backdrop-blur-sm"
        panelRef={bulkUploadRef}
        panelClassName="w-full max-w-md rounded-t-2xl border border-black/10 bg-white p-6 shadow-2xl sm:rounded-2xl"
        closeOnBackdrop={!bulkUploading}
      >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-black">Bulk Upload</h3>
                <p className="mt-1 text-sm text-black/45">
                  Drop multiple photos — we&apos;ll turn them into a carousel so you can caption each one.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                disabled={bulkUploading}
                onClick={() => setShowBulkUpload(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-black/45 hover:bg-black/[0.05] hover:text-black disabled:opacity-40"
              >
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <label
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-black/15 bg-[#f7f7f8] px-6 py-10 text-center transition-colors hover:border-[#ee2532]/40 hover:bg-[#ee2532]/[0.03] ${
                bulkUploading ? "pointer-events-none opacity-70" : ""
              }`}
            >
              {bulkUploading ? (
                <>
                  <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#323232]/25 border-t-[#323232]" aria-hidden />
                  <span className="text-sm font-semibold text-black/70">
                    Uploading {bulkUploadProgress.done} of {bulkUploadProgress.total}…
                  </span>
                </>
              ) : (
                <>
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#ee2532]/12 text-[#ee2532]">
                    <Plus size={22} strokeWidth={2.5} aria-hidden />
                  </span>
                  <span className="text-sm font-semibold text-black">Choose photos</span>
                  <span className="text-[12px] text-black/40">Select multiple images at once</span>
                </>
              )}
              <input
                ref={bulkInputRef}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                disabled={bulkUploading}
                onChange={(e) => void handleBulkFiles(e.target.files)}
              />
            </label>
      </AnimatedOverlay>

      <CalendarPostRadialMenu
        open={Boolean(radialMenu)}
        x={radialMenu?.x ?? 0}
        y={radialMenu?.y ?? 0}
        onClose={() => setRadialMenu(null)}
        onAction={handleRadialPostAction}
      />

      {/* Scheduled post preview */}
      <AnimatedOverlay
        open={modalMode === "preview"}
        onClose={closePostPreview}
        ariaLabel="Post preview"
        align="bottom"
        backdropClassName="bg-black/55 backdrop-blur-md"
        panelRef={modalRef}
        panelClassName="pb-safe-sheet flex w-full max-w-md max-h-[90dvh] flex-col overflow-hidden rounded-t-2xl border border-white/40 bg-white/80 shadow-[0_24px_80px_-20px_rgba(20,20,40,0.55)] backdrop-blur-xl sm:rounded-2xl"
      >
            <div className="flex items-center justify-between gap-3 border-b border-black/8 px-5 py-3.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-black">
                  {previewPost
                    ? formatComposerSchedule(previewPost.date, previewPost.time)
                    : "Post preview"}
                </p>
                <p className="mt-0.5 text-[11px] font-medium capitalize text-black/45">
                  {previewPost
                    ? `${previewPost.platform === "both" ? "Facebook · Instagram" : previewPost.platform} · ${previewPost.status}`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close preview"
                onClick={closePostPreview}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-black/45 transition-colors hover:bg-black/[0.05] hover:text-black"
              >
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="relative aspect-square w-full bg-black/[0.04]">
                {previewPost?.mediaUrl ? (
                  previewPost.mediaType === "video" ? (
                    <video
                      src={previewPost.mediaUrl}
                      className="h-full w-full object-cover"
                      controls
                      playsInline
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewPost.mediaUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-black/35">
                    No media
                  </div>
                )}
              </div>
              {previewPost?.caption ? (
                <p className="whitespace-pre-wrap px-5 py-4 text-sm leading-relaxed text-black/80">
                  {previewPost.caption}
                </p>
              ) : (
                <p className="px-5 py-4 text-sm text-black/35">No caption</p>
              )}
            </div>

            <div className="flex gap-2 border-t border-black/8 px-5 py-3.5">
              <button
                type="button"
                onClick={closePostPreview}
                className="pb-btn-secondary flex-1 py-2.5 text-xs"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => previewPost && openEditPost(previewPost)}
                className="pb-btn-primary flex-1 py-2.5 text-xs"
              >
                Edit in composer
              </button>
            </div>
      </AnimatedOverlay>

      {/* Day Detail Modal */}
      <AnimatedOverlay
        open={modalMode === "day-detail"}
        onClose={() => setModalMode(null)}
        ariaLabel="Day details"
        align="bottom"
        backdropClassName="bg-black/60 backdrop-blur-sm"
        panelRef={modalRef}
        panelClassName="pb-safe-sheet w-full max-w-md max-h-[85dvh] rounded-t-2xl sm:rounded-2xl bg-white border border-black/10 shadow-2xl flex flex-col"
      >
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-black">{formatDisplayDate(selectedDate)}</h3>
                {holidayMap.get(selectedDate) && (
                  <p className="text-xs font-semibold text-[#b45309] mt-0.5">{holidayMap.get(selectedDate)}</p>
                )}
              </div>
              <button aria-label="Close" onClick={() => setModalMode(null)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-black/55 hover:text-black hover:bg-black/[0.05] transition-colors">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Events for this day */}
              {(eventsMap.get(selectedDate) || []).length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-black/55 uppercase tracking-wider mb-2">Events</p>
                  <div className="space-y-1.5">
                    {(eventsMap.get(selectedDate) || []).map((ev) => (
                      <button
                        key={ev.id}
                        onClick={() => openEditEvent(ev)}
                        className={`w-full text-left rounded-xl p-3 transition-colors hover:opacity-80 ${eventTypeColors[ev.type]}`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold">{ev.title}</p>
                          <span className="text-[10px] opacity-70">{eventTypeLabels[ev.type]}</span>
                        </div>
                        {ev.time && <p className="text-[10px] opacity-70 mt-0.5">{ev.time}</p>}
                        {ev.notes && <p className="text-[10px] opacity-60 mt-0.5 truncate">{ev.notes}</p>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Posts for this day */}
              {(postsMap.get(selectedDate) || []).length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-black/55 uppercase tracking-wider mb-2">Scheduled Posts</p>
                  <div className="space-y-1.5">
                    {(postsMap.get(selectedDate) || []).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => openPostPreview(p)}
                        className={`w-full text-left rounded-xl p-3 transition-colors hover:opacity-80 ${
                          p.status === "failed" ? "bg-[#ee2532]/10 text-[#c81e2a] border border-[#ee2532]/25" : p.status === "draft" ? "bg-black/[0.04] border border-dashed border-black/10" : platformColors[p.platform]
                        }`}
                      >
                        <p className="text-xs font-semibold">{accountLabel || "Account"}</p>
                        <p className="mt-0.5 text-[10px] opacity-70">
                          {formatDisplayTime(p.time)} · {formatPostStatusLabel(p.status)}
                        </p>
                        {p.caption && (
                          <p className="mt-1 line-clamp-2 text-[11px] opacity-70">{p.caption}</p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(postsMap.get(selectedDate) || []).length === 0 && (eventsMap.get(selectedDate) || []).length === 0 && !holidayMap.get(selectedDate) && (
                <p className="text-sm text-black/55 text-center py-6">Nothing scheduled for this day</p>
              )}
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-black/10 shrink-0">
              <button
                onClick={() => openNewEvent(selectedDate)}
                className="pb-btn-secondary flex-1 flex items-center justify-center gap-1.5 text-xs py-2.5"
              >
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                Add Event
              </button>
              <button
                onClick={() => openNewPost(selectedDate)}
                disabled={isPastDateKey(selectedDate, todayKey)}
                title={isPastDateKey(selectedDate, todayKey) ? "Can’t schedule posts on past dates" : undefined}
                className="pb-btn-primary flex-1 flex items-center justify-center gap-1.5 text-xs py-2.5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                Schedule Post
              </button>
            </div>
      </AnimatedOverlay>

      {/* Event Modal */}
      <AnimatedOverlay
        open={modalMode === "event"}
        onClose={() => setModalMode(null)}
        ariaLabel="Add event"
        align="bottom"
        backdropClassName="bg-black/60 backdrop-blur-sm"
        panelRef={modalRef}
        panelClassName="pb-safe-sheet w-full max-w-md max-h-[85dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white border border-black/10 p-6 shadow-2xl"
      >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-black">{editingEvent ? "Edit Event" : "Add Event"}</h3>
              <button aria-label="Close" onClick={() => setModalMode(null)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-black/55 hover:text-black hover:bg-black/[0.05] transition-colors">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-black mb-1.5">Event Title</label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="Open house, closing, meeting…"
                  className="pb-field"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-black mb-1.5">Type</label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(eventTypeLabels) as CalendarEvent["type"][]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setEventType(t)}
                      className={`rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                        eventType === t
                          ? eventTypeColors[t] + " border border-current/20"
                          : "bg-black/[0.04] border border-black/10 text-black/55 hover:text-black"
                      }`}
                    >
                      {eventTypeLabels[t]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-black mb-1.5">Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="pb-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-black mb-1.5">Time <span className="text-black/35 font-normal">optional</span></label>
                  <select
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    className="pb-field"
                  >
                    <option value="">All day</option>
                    {TIME_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>{t.display}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-black mb-1.5">Notes <span className="text-black/35 font-normal">optional</span></label>
                <textarea
                  value={eventNotes}
                  onChange={(e) => setEventNotes(e.target.value)}
                  rows={2}
                  placeholder="Any additional details…"
                  className="pb-field resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              {editingEvent && (
                <button
                  onClick={() => setConfirmDeleteEvent(true)}
                  className="rounded-xl border border-[rgba(238,37,50,0.3)] px-4 py-2.5 text-sm font-semibold text-[#ee2532] hover:bg-[rgba(238,37,50,0.1)] transition-all"
                >
                  Delete
                </button>
              )}
              <button onClick={() => setModalMode(null)} className="flex-1 rounded-xl border border-black/10 py-2.5 text-sm font-semibold text-black/55 hover:text-black hover:bg-black/[0.05] transition-all">
                Cancel
              </button>
              <button
                onClick={handleSaveEvent}
                disabled={!eventTitle.trim()}
                className="pb-btn-primary flex-1 text-sm py-2.5 disabled:opacity-50"
              >
                {editingEvent ? "Update" : "Add Event"}
              </button>
            </div>
      </AnimatedOverlay>
        </>
      </LocationGate>

      <DashboardConfirm
        open={confirmDeletePost}
        title="Cancel this post?"
        message="This removes the scheduled post from your calendar."
        confirmLabel="Cancel post"
        destructive
        onCancel={() => {
          setConfirmDeletePost(false);
          setPostPendingDelete(null);
        }}
        onConfirm={() => void handleDeletePost()}
      />
      <DashboardConfirm
        open={confirmDeleteEvent}
        title="Delete this event?"
        message="This removes the event from your calendar."
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmDeleteEvent(false)}
        onConfirm={() => void handleDeleteEvent()}
      />

      <CalendarAssistant
        locationId={locationId}
        onPostsChanged={() => void loadPosts()}
      />
    </div>
  );
}
