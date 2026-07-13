"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { templates } from "@/lib/templates";
import { type ScheduledPost } from "@/lib/schedule-store";
import { uploadMediaToS3, DashboardUploadError } from "@/lib/dashboard-upload";
import { inferMediaContentType, isVideoContentType } from "@/lib/upload-mime";
import { type CalendarEvent } from "@/lib/events-store";
import { getHolidayMap, getUpcomingHolidays } from "@/lib/holidays";
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
import LocationSwitcher from "@/components/LocationSwitcher";
import { usePlanFeatures } from "@/components/dashboard/PlanProvider";
import { LocationGate } from "@/components/dashboard/StateViews";
import { DashboardConfirm } from "@/components/dashboard/DashboardModal";
import { useFocusTrap } from "@/components/dashboard/use-focus-trap";

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

type ModalMode = "post" | "event" | "day-detail" | null;

type CalendarScheduledPost = ScheduledPost & {
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | null;
  errorLog?: string | null;
};

export default function CalendarPage() {
  useEffect(() => { document.title = `Calendar | ${SITE_NAME}`; }, []);
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week">("month");
  const [posts, setPosts] = useState<CalendarScheduledPost[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [editingPost, setEditingPost] = useState<CalendarScheduledPost | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [showHolidays, setShowHolidays] = useState(true);
  // D2: surface a genuine initial-load failure (was silently swallowed → blank
  // grid). Transient errors after a good load still keep the grid stable.
  const [loadError, setLoadError] = useState<string | null>(null);
  const [eventsLoadError, setEventsLoadError] = useState<string | null>(null);
  const loadedOkRef = useRef(false);
  const eventsLoadedOkRef = useRef(false);

  const [formTemplate, setFormTemplate] = useState(templates[0]?.id || "");
  const [formPlatform, setFormPlatform] = useState<"facebook" | "instagram" | "both">("both");
  const [formTime, setFormTime] = useState("09:00");
  const [formCaption, setFormCaption] = useState("");
  const [formStatus, setFormStatus] = useState<"scheduled" | "draft">("scheduled");
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // S3 media for the post (absolute public URL — what the Meta dispatcher needs).
  const [mediaUrl, setMediaUrl] = useState<string>("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  // On select/drop → bypass local blobs, push straight to S3, bind the returned
  // absolute publicUrl to mediaUrl + set mediaType from the file.
  async function handleMediaFile(file: File | null | undefined) {
    if (!file) return;
    setMediaError(null);
    setUploadingMedia(true);
    const inferred = inferMediaContentType(file.name, file.type);
    setMediaType(inferred && isVideoContentType(inferred) ? "video" : "image");
    try {
      const publicUrl = await uploadMediaToS3(file);
      setMediaUrl(publicUrl);
    } catch (err) {
      setMediaUrl("");
      setMediaError(
        err instanceof DashboardUploadError ? err.message : "Upload failed. Please try again.",
      );
    } finally {
      setUploadingMedia(false);
    }
  }

  const [eventTitle, setEventTitle] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventType, setEventType] = useState<CalendarEvent["type"]>("other");
  const [eventNotes, setEventNotes] = useState("");
  const [confirmDeletePost, setConfirmDeletePost] = useState(false);
  const [confirmDeleteEvent, setConfirmDeleteEvent] = useState(false);

  const { meta } = useMetaConnection();
  const features = usePlanFeatures();
  const { locationId, loading: locationLoading, error: locationError, refresh: refreshLocations } = useActiveLocation();

  useFocusTrap(modalMode !== null, modalRef, () => setModalMode(null));
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
    if (view === "month") d.setMonth(d.getMonth() - 1);
    else d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  }

  function nextPeriod() {
    const d = new Date(currentDate);
    if (view === "month") d.setMonth(d.getMonth() + 1);
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
    setEditingPost(null);
    setSelectedDate(dateKey);
    setFormTemplate(templates[0]?.id || "");
    setFormPlatform("both");
    setFormTime("09:00");
    setFormCaption("");
    setFormStatus("scheduled");
    setMediaUrl("");
    setMediaType("image");
    setMediaError(null);
    setModalMode("post");
  }

  function openEditPost(post: CalendarScheduledPost) {
    setEditingPost(post);
    setSelectedDate(post.date);
    setFormTemplate(post.templateId);
    setFormPlatform(post.platform);
    setFormTime(post.time);
    setFormCaption(post.caption);
    setFormStatus(
      post.status === "published" || post.status === "failed"
        ? "scheduled"
        : (post.status as "scheduled" | "draft"),
    );
    setMediaUrl(post.mediaUrl ?? "");
    setMediaType(post.mediaType ?? "image");
    setMediaError(null);
    setModalMode("post");
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
        date: selectedDate,
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
      setModalMode(null);
    } catch (err) {
      setPublishResult({
        type: "error",
        message: err instanceof Error ? err.message : "Publish failed",
      });
    } finally {
      setPublishing(false);
    }
  }

  async function handleSavePost(approve = false) {
    if (!locationId || uploadingMedia) return;

    const tmpl = templates.find((t) => t.id === formTemplate);
    const postData = {
      templateId: formTemplate,
      templateName: tmpl?.name || "",
      platform: formPlatform,
      date: selectedDate,
      time: formTime,
      caption: formCaption,
      status: formStatus,
      pillar: tmpl?.pillar || "",
    };

    // Scheduling always goes through "approved" — the internal cron queue.
    // Meta-native scheduling (`scheduledTime` on /api/meta/publish) is not
    // used here: Instagram's API has no native scheduling, so it would post
    // immediately, and the DB row would sit in "scheduled" forever.
    const queuedSchedule = formStatus === "scheduled" && !editingPost && !approve;

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
      if (queuedSchedule) {
        const scheduledAt = new Date(`${selectedDate}T${formTime}`);
        setPublishResult({
          type: "success",
          message: `Scheduled for ${scheduledAt.toLocaleDateString()} at ${scheduledAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`,
        });
      }
    } catch (err) {
      setPublishResult({
        type: "error",
        message: formatDashboardApiMessage(err, "Could not save this post."),
      });
      return;
    }

    setModalMode(null);
  }

  async function handleDeletePost() {
    if (!editingPost) return;
    setConfirmDeletePost(false);
    try {
      await deleteDashboardPost(editingPost.id);
      await loadPosts();
      setModalMode(null);
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

  const postsMap = new Map<string, CalendarScheduledPost[]>();
  posts.forEach((p) => {
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

  const monthName = currentDate.toLocaleString("default", { month: "long", year: "numeric" });

  const upcoming = posts
    .filter((p) => p.date >= todayKey && isCalendarPostQueued(p))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 5);

  const queuedPostCount = posts.filter(isCalendarPostQueued).length;

  const upcomingEvents = events
    .filter((e) => e.date >= todayKey)
    .sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")))
    .slice(0, 5);

  const upcomingHolidays = getUpcomingHolidays({ from: today, limit: 3 });

  function formatDisplayDate(dateKey: string) {
    const d = new Date(dateKey + "T12:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  }

  return (
    <div className="pb-app">
      <LocationGate
        loading={locationLoading}
        error={locationError}
        locationId={locationId}
        onRetry={() => void refreshLocations()}
        onCreate={() => router.push("/dashboard/organization")}
      >
      <>
      <div className="pb-app-header">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <h1>Calendar</h1>
            <p>Schedule posts, track events, and plan your content</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 self-start xl:self-auto">
            {features.multiLocation && <LocationSwitcher />}
            <button
              onClick={() => openNewEvent(todayKey)}
              className="pb-btn-secondary flex items-center gap-1.5 text-xs py-2.5 px-4"
            >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            Add Event
          </button>
          <button
            onClick={() => openNewPost(todayKey)}
            className="pb-btn-primary flex items-center gap-1.5 text-xs py-2.5 px-4"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Schedule Post
          </button>
          <a
            href="/dashboard/calendar/bulk"
            className="pb-btn-secondary inline-flex items-center gap-1.5 text-xs py-2.5 px-4"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6h16.5M3.75 12h16.5M3.75 18h16.5" />
            </svg>
            Bulk schedule
          </a>
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
        <div className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium flex items-center justify-between ${
          publishResult.type === "success" ? "bg-[rgba(31,157,77,0.1)] text-[#1f9d4d]" : "bg-[rgba(238,37,50,0.1)] text-[#ee2532]"
        }`}>
          {publishResult.message}
          <button onClick={() => setPublishResult(null)} className="ml-3 opacity-60 hover:opacity-100 transition-opacity">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 2xl:grid-cols-[minmax(0,1fr)_272px] 2xl:gap-10">
        <div className="min-w-0">
          {/* Calendar controls */}
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-black">{monthName}</h2>
              <div className="flex gap-1">
                <button onClick={prevPeriod} className="p-1.5 rounded-lg text-black/55 hover:bg-black/[0.05] hover:text-black transition-colors">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                </button>
                <button onClick={nextPeriod} className="p-1.5 rounded-lg text-black/55 hover:bg-black/[0.05] hover:text-black transition-colors">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                </button>
              </div>
              <button onClick={goToday} className="rounded-lg border border-black/10 px-2.5 py-1 text-xs font-medium text-black/55 hover:text-black hover:bg-black/[0.05] transition-all">
                Today
              </button>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" name="show-holidays" checked={showHolidays} onChange={(e) => setShowHolidays(e.target.checked)} className="rounded border-black/10 accent-[#ee2532]" />
                <span className="text-[11px] text-black/55">Holidays</span>
              </label>
              <div className="flex gap-1 rounded-xl bg-white border border-black/10 p-1">
                <button onClick={() => setView("month")} className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${view === "month" ? "bg-black/[0.04] text-black" : "text-black/55 hover:text-black"}`}>
                  Month
                </button>
                <button onClick={() => setView("week")} className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${view === "week" ? "bg-black/[0.04] text-black" : "text-black/55 hover:text-black"}`}>
                  Week
                </button>
              </div>
            </div>
          </div>

          {/* Month view */}
          {view === "month" && (
            <div className="pb-panel overflow-hidden p-0">
              <div className="grid grid-cols-7">
                {DAYS.map((d) => (
                  <div key={d} className="px-2 py-3 text-center text-xs font-bold text-black/35 border-b border-black/10">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 grid-rows-6">
                {cells.map((cell, i) => {
                  const cellPosts = postsMap.get(cell.dateKey) || [];
                  const cellEvents = eventsMap.get(cell.dateKey) || [];
                  const holiday = showHolidays ? holidayMap.get(cell.dateKey) : undefined;
                  const isToday = cell.dateKey === todayKey;
                  const overflow = calendarCellOverflow(Boolean(holiday), cellEvents.length, cellPosts.length);
                  return (
                    <div
                      key={i}
                      role="button"
                      tabIndex={0}
                      onClick={() => openDayDetail(cell.dateKey)}
                      onKeyDown={(e) => openDayFromKeyboard(e, cell.dateKey, openDayDetail)}
                      className={`min-h-[124px] overflow-hidden border-b border-r border-black/10 p-2 cursor-pointer hover:bg-black/[0.04] transition-colors text-left ${
                        !cell.currentMonth ? "opacity-40" : ""
                      }`}
                    >
                      <div className={`text-xs font-medium mb-0.5 w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday ? "bg-[#ee2532] text-white font-bold" : "text-black/55"
                      }`}>
                        {cell.day}
                      </div>
                      <div className="space-y-1">
                        {holiday && (
                          <div className="rounded px-1.5 py-0.5 text-[10px] font-semibold truncate bg-[rgba(217,119,6,0.1)] text-[#b45309]">
                            {holiday}
                          </div>
                        )}
                        {cellEvents.slice(0, 2).map((ev) => (
                          <button
                            key={ev.id}
                            onClick={(e) => { e.stopPropagation(); openEditEvent(ev); }}
                            className={`w-full text-left rounded px-1.5 py-0.5 text-[10px] font-medium truncate transition-colors hover:opacity-80 ${eventTypeColors[ev.type]}`}
                          >
                            {ev.time ? `${ev.time.slice(0,5)} ` : ""}{ev.title}
                          </button>
                        ))}
                        {cellPosts.slice(0, 2).map((p) => (
                          <button
                            key={p.id}
                            onClick={(e) => { e.stopPropagation(); openEditPost(p); }}
                            className={`w-full text-left rounded px-1.5 py-0.5 text-[10px] font-medium truncate transition-colors hover:opacity-80 ${
                              p.status === "failed" ? "bg-[#ee2532]/10 text-[#c81e2a] border border-[#ee2532]/25" : p.status === "draft" ? "bg-black/[0.04] text-black/55 border border-dashed border-black/10" : platformColors[p.platform]
                            }`}
                          >
                            {p.time.slice(0, 5)} {p.templateName}
                          </button>
                        ))}
                        {overflow > 0 && (
                          <p className="text-[10px] text-black/55 px-1.5">+{overflow} more</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Week view */}
          {view === "week" && (
            <div className="pb-panel overflow-hidden p-0">
              <div className="grid grid-cols-7">
                {getWeekDates().map((wd) => {
                  const isToday = wd.dateKey === todayKey;
                  const dayPosts = postsMap.get(wd.dateKey) || [];
                  const dayEvents = eventsMap.get(wd.dateKey) || [];
                  const holiday = showHolidays ? holidayMap.get(wd.dateKey) : undefined;
                  return (
                    <div key={wd.dateKey} className="border-r border-black/10 last:border-r-0">
                      <div className={`px-2 py-3 text-center border-b border-black/10 ${isToday ? "bg-[rgba(238,37,50,0.06)]" : ""}`}>
                        <p className="text-[10px] text-black/55 font-bold uppercase">{wd.dayName}</p>
                        <p className={`text-lg font-bold mt-0.5 ${isToday ? "text-[#ee2532]" : "text-black"}`}>{wd.day}</p>
                      </div>
                      <div
                        role="button"
                        tabIndex={0}
                        className="min-h-[400px] w-full cursor-pointer space-y-1.5 p-2 text-left transition-colors hover:bg-black/[0.04]"
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
                            className={`w-full text-left rounded-lg p-2 transition-colors hover:opacity-80 ${eventTypeColors[ev.type]}`}
                          >
                            {ev.time && <p className="text-[10px] font-bold">{ev.time.slice(0,5)}</p>}
                            <p className="text-xs font-medium truncate">{ev.title}</p>
                            <p className="text-[10px] opacity-70 capitalize">{eventTypeLabels[ev.type]}</p>
                          </button>
                        ))}
                        {dayPosts.sort((a, b) => a.time.localeCompare(b.time)).map((p) => (
                          <button
                            key={p.id}
                            onClick={(e) => { e.stopPropagation(); openEditPost(p); }}
                            className={`w-full text-left rounded-lg p-2 transition-colors hover:opacity-80 ${
                              p.status === "failed" ? "bg-[#ee2532]/10 text-[#c81e2a] border border-[#ee2532]/25" : p.status === "draft" ? "bg-black/[0.04] border border-dashed border-black/10" : platformColors[p.platform]
                            }`}
                          >
                            <p className="text-[10px] font-bold">{p.time.slice(0, 5)}</p>
                            <p className="text-xs font-medium truncate">{p.templateName}</p>
                            <p className="text-[10px] opacity-70 capitalize">{p.platform}</p>
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

        {/* Sidebar — full width below calendar until 2xl; then a calm right rail */}
        <aside className="grid grid-cols-1 gap-5 sm:grid-cols-2 2xl:grid-cols-1 2xl:gap-5">
          <div className="pb-panel p-5 sm:col-span-2 2xl:col-span-1">
            <h3 className="text-sm font-bold text-black mb-4">Upcoming Posts</h3>
            {upcoming.length === 0 ? (
              <p className="text-xs text-black/55 py-4 text-center">No upcoming posts scheduled</p>
            ) : (
              <div className="space-y-2">
                {upcoming.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => openEditPost(p)}
                    className="w-full text-left rounded-xl bg-black/[0.03] p-3 hover:bg-black/[0.05] transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-black/55">{p.date} at {p.time}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold capitalize ${platformColors[p.platform]}`}>{p.platform}</span>
                    </div>
                    <p className="text-xs font-semibold text-black">{p.templateName}</p>
                    {p.caption && <p className="text-[10px] text-black/55 truncate mt-0.5">{p.caption}</p>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="pb-panel p-5">
            <h3 className="text-sm font-bold text-black mb-4">Upcoming Events</h3>
            {upcomingEvents.length === 0 ? (
              <p className="text-xs text-black/55 py-4 text-center">No upcoming events</p>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => openEditEvent(ev)}
                    className="w-full text-left rounded-xl bg-black/[0.03] p-3 hover:bg-black/[0.05] transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-black/55">{ev.date}{ev.time ? ` at ${ev.time}` : ""}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${eventTypeColors[ev.type]}`}>{eventTypeLabels[ev.type]}</span>
                    </div>
                    <p className="text-xs font-semibold text-black">{ev.title}</p>
                    {ev.notes && <p className="text-[10px] text-black/55 truncate mt-0.5">{ev.notes}</p>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {showHolidays && upcomingHolidays.length > 0 && (
            <div className="pb-panel p-5">
              <h3 className="text-sm font-bold text-black mb-4">Upcoming Holidays</h3>
              <div className="space-y-3">
                {upcomingHolidays.map((h) => (
                  <div key={h.date} className="rounded-xl bg-[rgba(217,119,6,0.06)] border border-[rgba(217,119,6,0.15)] p-3">
                    <p className="text-[10px] font-bold text-black/55">{new Date(h.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                    <p className="text-xs font-semibold text-[#b45309]">{h.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pb-panel p-5 sm:col-span-2 2xl:col-span-1">
            <h3 className="text-sm font-bold text-black mb-4">Schedule Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-black/[0.03] p-3 text-center">
                <p className="text-xl font-semibold text-black">{queuedPostCount}</p>
                <p className="text-[10px] text-black/55 mt-0.5">Queued</p>
              </div>
              <div className="rounded-xl bg-black/[0.03] p-3 text-center">
                <p className="text-xl font-semibold text-black">{posts.filter((p) => p.status === "draft").length}</p>
                <p className="text-[10px] text-black/55 mt-0.5">Drafts</p>
              </div>
              <div className="rounded-xl bg-black/[0.03] p-3 text-center">
                <p className="text-xl font-semibold text-black">{posts.filter((p) => p.status === "published").length}</p>
                <p className="text-[10px] text-black/55 mt-0.5">Published</p>
              </div>
              <div className="rounded-xl bg-black/[0.03] p-3 text-center">
                <p className="text-xl font-semibold text-black">{events.length}</p>
                <p className="text-[10px] text-black/55 mt-0.5">Events</p>
              </div>
              {posts.some((p) => p.status === "failed") && (
                <div className="rounded-xl bg-[#ee2532]/[0.06] p-3 text-center col-span-2">
                  <p className="text-xl font-semibold text-[#c81e2a]">{posts.filter((p) => p.status === "failed").length}</p>
                  <p className="text-[10px] text-[#c81e2a]/70 mt-0.5">Failed — tap the post to retry</p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Day Detail Modal */}
      {modalMode === "day-detail" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setModalMode(null)}>
          <div ref={modalRef} role="dialog" aria-modal="true" aria-label="Day details" tabIndex={-1} className="w-full max-w-md max-h-[80vh] rounded-2xl bg-white border border-black/10 shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-black">{formatDisplayDate(selectedDate)}</h3>
                {holidayMap.get(selectedDate) && (
                  <p className="text-xs font-semibold text-[#b45309] mt-0.5">{holidayMap.get(selectedDate)}</p>
                )}
              </div>
              <button aria-label="Close" onClick={() => setModalMode(null)} className="p-1 rounded-lg text-black/55 hover:text-black hover:bg-black/[0.05] transition-colors">
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
                        onClick={() => openEditPost(p)}
                        className={`w-full text-left rounded-xl p-3 transition-colors hover:opacity-80 ${
                          p.status === "failed" ? "bg-[#ee2532]/10 text-[#c81e2a] border border-[#ee2532]/25" : p.status === "draft" ? "bg-black/[0.04] border border-dashed border-black/10" : platformColors[p.platform]
                        }`}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="text-xs font-semibold">{p.templateName}</p>
                          <span className="text-[10px] opacity-70 capitalize">{p.platform}</span>
                        </div>
                        <p className="text-[10px] opacity-70">{p.time} · {p.status}</p>
                        {p.caption && <p className="text-[10px] opacity-60 mt-0.5 truncate">{p.caption}</p>}
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
                className="pb-btn-primary flex-1 flex items-center justify-center gap-1.5 text-xs py-2.5"
              >
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                Schedule Post
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Post Modal */}
      {modalMode === "post" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setModalMode(null)}>
          <div ref={modalRef} role="dialog" aria-modal="true" aria-label="Schedule post" tabIndex={-1} className="w-full max-w-md rounded-2xl bg-white border border-black/10 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-black">{editingPost ? "Edit Post" : "Schedule Post"}</h3>
              <button aria-label="Close" onClick={() => setModalMode(null)} className="p-1 rounded-lg text-black/55 hover:text-black hover:bg-black/[0.05] transition-colors">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-4">
              {editingPost?.status === "failed" && (
                <div className="rounded-xl border border-[#ee2532]/25 bg-[#ee2532]/[0.06] p-3">
                  <p className="text-xs font-semibold text-[#c81e2a]">This post failed to publish</p>
                  {editingPost.errorLog && (
                    <p className="text-[11px] text-black/65 mt-1 break-words">{editingPost.errorLog}</p>
                  )}
                  <p className="text-[11px] text-black/55 mt-1">Updating it sends it back through the queue.</p>
                </div>
              )}
              {features.multiLocation && (
                <div>
                  <label className="block text-xs font-medium text-black mb-1.5">Posting to</label>
                  <LocationSwitcher />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-black mb-1.5">Template</label>
                <select
                  value={formTemplate}
                  onChange={(e) => setFormTemplate(e.target.value)}
                  className="pb-field"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                  <label className="block text-xs font-medium text-black mb-1.5">Time</label>
                  <select
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="pb-field"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>{t.display}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-black mb-1.5">Platform</label>
                <div className="flex gap-2">
                  {(["facebook", "instagram", "both"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setFormPlatform(p)}
                      className={`flex-1 rounded-xl py-2 text-xs font-semibold capitalize transition-all ${
                        formPlatform === p
                          ? "bg-[#ee2532] text-white"
                          : "bg-black/[0.04] border border-black/10 text-black/55 hover:text-black"
                      }`}
                    >
                      {p === "both" ? "Both" : p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-black mb-1.5">Caption</label>
                <textarea
                  value={formCaption}
                  onChange={(e) => setFormCaption(e.target.value)}
                  rows={3}
                  placeholder="Write your post caption…"
                  className="pb-field resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-black mb-1.5">Status</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFormStatus("scheduled")}
                    className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-all ${
                      formStatus === "scheduled"
                        ? "bg-[rgba(31,157,77,0.12)] text-[#1f9d4d] border border-[rgba(31,157,77,0.3)]"
                        : "bg-black/[0.04] border border-black/10 text-black/55 hover:text-black"
                    }`}
                  >
                    Schedule
                  </button>
                  <button
                    onClick={() => setFormStatus("draft")}
                    className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-all ${
                      formStatus === "draft"
                        ? "bg-[rgba(217,119,6,0.12)] text-[#b45309] border border-[rgba(217,119,6,0.3)]"
                        : "bg-black/[0.04] border border-black/10 text-black/55 hover:text-black"
                    }`}
                  >
                    Save as Draft
                  </button>
                </div>
              </div>
            </div>

            {meta?.connected && formStatus === "scheduled" && !editingPost && (
              <div className="flex items-center gap-2 rounded-lg bg-[rgba(31,157,77,0.1)] px-3 py-2 mt-4">
                <div className="h-2 w-2 rounded-full bg-[#1f9d4d]" />
                <p className="text-[11px] text-[#1f9d4d] font-medium">Connected to {meta.pageName} — will schedule via Meta Graph API</p>
              </div>
            )}

            {/* Media → S3 (absolute publicUrl for the Meta dispatcher) */}
            <div className="mt-4">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-black/55 mb-1.5">Media</label>
              <div className="relative">
                <label
                  className={`group relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-black/15 bg-white/60 backdrop-blur-xl px-4 py-6 text-center cursor-pointer transition-colors hover:border-[#ee2532]/40 ${uploadingMedia ? "pointer-events-none" : ""}`}
                >
                  {mediaUrl && mediaType === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaUrl} alt="" className="max-h-36 w-auto rounded-xl object-contain" />
                  ) : mediaUrl && mediaType === "video" ? (
                    <video src={mediaUrl} className="max-h-36 w-auto rounded-xl" muted />
                  ) : (
                    <>
                      <span className="text-sm font-medium text-black/70">Drop or choose a photo / video</span>
                      <span className="text-[11px] text-black/45">Uploads straight to your secure bucket</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*,video/*"
                    className="sr-only"
                    onChange={(e) => handleMediaFile(e.target.files?.[0])}
                    disabled={uploadingMedia}
                  />
                </label>
                {uploadingMedia && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-white/55 backdrop-blur-md">
                    <span className="h-6 w-6 rounded-full border-2 border-[#323232]/25 border-t-[#323232] animate-spin" aria-hidden />
                    <span className="text-[11px] font-medium text-[#323232]">Uploading…</span>
                  </div>
                )}
              </div>
              {mediaUrl && !uploadingMedia && (
                <button
                  type="button"
                  onClick={() => { setMediaUrl(""); setMediaError(null); }}
                  className="mt-1.5 text-[11px] text-black/45 hover:text-[#ee2532] transition-colors"
                >
                  Remove media
                </button>
              )}
              {mediaError && <p className="mt-1.5 text-[11px] text-[#ee2532]">{mediaError}</p>}
            </div>

            <div className="flex flex-wrap gap-3 mt-6">
              {editingPost && (
                <button
                  onClick={() => setConfirmDeletePost(true)}
                  className="rounded-xl border border-[rgba(238,37,50,0.3)] px-4 py-2.5 text-sm font-semibold text-[#ee2532] hover:bg-[rgba(238,37,50,0.1)] transition-all"
                >
                  Delete
                </button>
              )}
              <button onClick={() => setModalMode(null)} className="flex-1 min-w-[120px] rounded-xl border border-black/10 py-2.5 text-sm font-semibold text-black/55 hover:text-black hover:bg-black/[0.05] transition-all">
                Cancel
              </button>
              {!editingPost && meta?.connected && formStatus === "scheduled" && mediaUrl && mediaType === "image" && (
                <button
                  onClick={() => void handlePublishNow()}
                  disabled={publishing || uploadingMedia}
                  className="pb-btn-primary flex-1 min-w-[120px] text-sm py-2.5 disabled:opacity-50"
                >
                  {publishing ? "Publishing…" : "Publish now"}
                </button>
              )}
              <button
                onClick={() => void handleSavePost(false)}
                disabled={publishing || uploadingMedia}
                className="flex-1 min-w-[120px] rounded-xl border border-black/10 py-2.5 text-sm font-semibold text-black/70 hover:bg-black/[0.05] transition-all disabled:opacity-50"
              >
                {publishing ? "Saving…" : editingPost ? "Update" : "Schedule"}
              </button>
              <button
                onClick={() => void handleSavePost(true)}
                disabled={publishing || uploadingMedia}
                className="flex-1 min-w-[140px] rounded-xl border border-black/10 py-2.5 text-sm font-semibold text-black/70 hover:bg-black/[0.05] transition-all disabled:opacity-50"
                title="Approve so the dispatcher publishes at the scheduled time"
              >
                Schedule &amp; Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Modal */}
      {modalMode === "event" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setModalMode(null)}>
          <div ref={modalRef} role="dialog" aria-modal="true" aria-label="Add event" tabIndex={-1} className="w-full max-w-md rounded-2xl bg-white border border-black/10 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-black">{editingEvent ? "Edit Event" : "Add Event"}</h3>
              <button aria-label="Close" onClick={() => setModalMode(null)} className="p-1 rounded-lg text-black/55 hover:text-black hover:bg-black/[0.05] transition-colors">
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

              <div className="grid grid-cols-2 gap-3">
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
          </div>
        </div>
      )}
        </>
      </LocationGate>

      <DashboardConfirm
        open={confirmDeletePost}
        title="Delete this post?"
        message="This removes the scheduled post from your calendar."
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmDeletePost(false)}
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
    </div>
  );
}
