"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { templates } from "@/lib/templates";
import {
  getScheduledPosts,
  addScheduledPost,
  deleteScheduledPost,
  updateScheduledPost,
  type ScheduledPost,
} from "@/lib/schedule-store";
import {
  getCalendarEvents,
  addCalendarEvent,
  deleteCalendarEvent,
  updateCalendarEvent,
  type CalendarEvent,
} from "@/lib/events-store";
import { getHolidayMap } from "@/lib/holidays";
import { getMetaConnection } from "@/lib/meta-store";
import { SITE_NAME } from "@/lib/site";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  const display = `${h % 12 || 12}:${m} ${h < 12 ? "AM" : "PM"}`;
  const value = `${String(h).padStart(2, "0")}:${m}`;
  return { display, value };
});

const platformColors: Record<string, string> = {
  facebook: "bg-accent/15 text-accent",
  instagram: "bg-accent-cyan/15 text-accent-cyan",
  both: "bg-success/15 text-success",
};

const eventTypeColors: Record<string, string> = {
  "open-house": "bg-warning/15 text-warning",
  closing: "bg-success/15 text-success",
  meeting: "bg-accent/15 text-accent",
  personal: "bg-accent-cyan/15 text-accent-cyan",
  other: "bg-elevated text-text-secondary",
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

type ModalMode = "post" | "event" | "day-detail" | null;

export default function CalendarPage() {
  useEffect(() => { document.title = `Calendar | ${SITE_NAME}`; }, []);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week">("month");
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [editingPost, setEditingPost] = useState<ScheduledPost | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [showHolidays, setShowHolidays] = useState(true);

  const [formTemplate, setFormTemplate] = useState(templates[0]?.id || "");
  const [formPlatform, setFormPlatform] = useState<"facebook" | "instagram" | "both">("both");
  const [formTime, setFormTime] = useState("09:00");
  const [formCaption, setFormCaption] = useState("");
  const [formStatus, setFormStatus] = useState<"scheduled" | "draft">("scheduled");
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [eventTitle, setEventTitle] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventType, setEventType] = useState<CalendarEvent["type"]>("other");
  const [eventNotes, setEventNotes] = useState("");

  const meta = typeof window !== "undefined" ? getMetaConnection() : null;
  const refreshPosts = useCallback(() => setPosts(getScheduledPosts()), []);
  const refreshEvents = useCallback(() => setEvents(getCalendarEvents()), []);

  useEffect(() => {
    refreshPosts();
    refreshEvents();
    window.addEventListener("schedule-updated", refreshPosts);
    window.addEventListener("events-updated", refreshEvents);
    return () => {
      window.removeEventListener("schedule-updated", refreshPosts);
      window.removeEventListener("events-updated", refreshEvents);
    };
  }, [refreshPosts, refreshEvents]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();
  const todayKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());

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
    setModalMode("post");
  }

  function openEditPost(post: ScheduledPost) {
    setEditingPost(post);
    setSelectedDate(post.date);
    setFormTemplate(post.templateId);
    setFormPlatform(post.platform);
    setFormTime(post.time);
    setFormCaption(post.caption);
    setFormStatus(post.status === "published" ? "scheduled" : post.status as "scheduled" | "draft");
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

  async function handleSavePost() {
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

    if (editingPost) {
      updateScheduledPost(editingPost.id, postData);
    } else {
      addScheduledPost(postData);
    }

    if (formStatus === "scheduled" && meta?.connected && !editingPost) {
      setPublishing(true);
      setPublishResult(null);
      try {
        const scheduledAt = new Date(`${selectedDate}T${formTime}`);
        const unixTime = Math.floor(scheduledAt.getTime() / 1000);

        const res = await fetch("/api/meta/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            platform: formPlatform,
            pageId: meta.pageId,
            pageToken: meta.pageToken,
            igAccountId: meta.igAccountId,
            caption: formCaption,
            scheduledTime: unixTime,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Scheduling failed");
        setPublishResult({
          type: "success",
          message: `Scheduled for ${scheduledAt.toLocaleDateString()} at ${scheduledAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`,
        });
      } catch (err) {
        setPublishResult({ type: "error", message: err instanceof Error ? err.message : "Scheduling failed" });
      }
      setPublishing(false);
    }

    setModalMode(null);
  }

  function handleDeletePost() {
    if (editingPost && window.confirm("Delete this post?")) {
      deleteScheduledPost(editingPost.id);
      setModalMode(null);
    }
  }

  function handleSaveEvent() {
    if (!eventTitle.trim()) return;
    const data = {
      title: eventTitle.trim(),
      date: selectedDate,
      time: eventTime || undefined,
      type: eventType,
      notes: eventNotes || undefined,
    };

    if (editingEvent) {
      updateCalendarEvent(editingEvent.id, data);
    } else {
      addCalendarEvent(data);
    }
    setModalMode(null);
  }

  function handleDeleteEvent() {
    if (editingEvent && window.confirm("Delete this event?")) {
      deleteCalendarEvent(editingEvent.id);
      setModalMode(null);
    }
  }

  const postsMap = new Map<string, ScheduledPost[]>();
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
    .filter((p) => p.date >= todayKey && p.status === "scheduled")
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 5);

  const upcomingEvents = events
    .filter((e) => e.date >= todayKey)
    .sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")))
    .slice(0, 5);

  const upcomingHolidays = Array.from(holidayMap.entries())
    .filter(([date]) => date >= todayKey)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 3);

  function formatDisplayDate(dateKey: string) {
    const d = new Date(dateKey + "T12:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  }

  return (
    <div className="px-4 py-6 md:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-text font-heading">Calendar</h1>
          <p className="text-sm text-text-secondary mt-1">Schedule posts, track events, and plan your content</p>
        </div>
        <div className="flex gap-2 self-start">
          <button
            onClick={() => openNewEvent(todayKey)}
            className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-medium text-text-secondary hover:text-text hover:bg-elevated transition-all"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            Add Event
          </button>
          <button
            onClick={() => openNewPost(todayKey)}
            className="flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-2 text-xs font-medium text-white hover:bg-accent/30 hover:border-accent/40 transition-all"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Schedule Post
          </button>
        </div>
      </div>

      {publishResult && (
        <div className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium flex items-center justify-between ${
          publishResult.type === "success" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
        }`}>
          {publishResult.message}
          <button onClick={() => setPublishResult(null)} className="ml-3 opacity-60 hover:opacity-100 transition-opacity">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_280px]">
        <div>
          {/* Calendar controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-text font-heading">{monthName}</h2>
              <div className="flex gap-1">
                <button onClick={prevPeriod} className="p-1.5 rounded-lg text-text-secondary hover:bg-elevated hover:text-text transition-colors">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                </button>
                <button onClick={nextPeriod} className="p-1.5 rounded-lg text-text-secondary hover:bg-elevated hover:text-text transition-colors">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                </button>
              </div>
              <button onClick={goToday} className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-text-secondary hover:text-text hover:bg-elevated transition-all">
                Today
              </button>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" name="show-holidays" checked={showHolidays} onChange={(e) => setShowHolidays(e.target.checked)} className="rounded border-border accent-accent" />
                <span className="text-[11px] text-text-secondary">Holidays</span>
              </label>
              <div className="flex gap-1 rounded-xl bg-surface border border-border p-1">
                <button onClick={() => setView("month")} className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${view === "month" ? "bg-elevated text-text" : "text-text-secondary hover:text-text"}`}>
                  Month
                </button>
                <button onClick={() => setView("week")} className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${view === "week" ? "bg-elevated text-text" : "text-text-secondary hover:text-text"}`}>
                  Week
                </button>
              </div>
            </div>
          </div>

          {/* Month view */}
          {view === "month" && (
            <div className="rounded-2xl bg-surface border border-border overflow-hidden">
              <div className="grid grid-cols-7">
                {DAYS.map((d) => (
                  <div key={d} className="px-2 py-2.5 text-center text-xs font-bold text-text-secondary/50 border-b border-border">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {cells.map((cell, i) => {
                  const cellPosts = postsMap.get(cell.dateKey) || [];
                  const cellEvents = eventsMap.get(cell.dateKey) || [];
                  const holiday = showHolidays ? holidayMap.get(cell.dateKey) : undefined;
                  const isToday = cell.dateKey === todayKey;
                  const totalItems = cellPosts.length + cellEvents.length + (holiday ? 1 : 0);
                  return (
                    <button
                      key={i}
                      onClick={() => openDayDetail(cell.dateKey)}
                      className={`min-h-[110px] border-b border-r border-border p-1.5 cursor-pointer hover:bg-elevated/30 transition-colors text-left ${
                        !cell.currentMonth ? "opacity-40" : ""
                      }`}
                    >
                      <div className={`text-xs font-medium mb-0.5 w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday ? "bg-gradient-to-br from-accent to-accent-cyan text-white font-bold" : "text-text-secondary"
                      }`}>
                        {cell.day}
                      </div>
                      <div className="space-y-0.5">
                        {holiday && (
                          <div className="rounded px-1 py-0.5 text-[9px] font-semibold truncate bg-warning/10 text-warning">
                            {holiday}
                          </div>
                        )}
                        {cellEvents.slice(0, 2).map((ev) => (
                          <button
                            key={ev.id}
                            onClick={(e) => { e.stopPropagation(); openEditEvent(ev); }}
                            className={`w-full text-left rounded px-1 py-0.5 text-[9px] font-medium truncate transition-colors hover:opacity-80 ${eventTypeColors[ev.type]}`}
                          >
                            {ev.time ? `${ev.time.slice(0,5)} ` : ""}{ev.title}
                          </button>
                        ))}
                        {cellPosts.slice(0, 2).map((p) => (
                          <button
                            key={p.id}
                            onClick={(e) => { e.stopPropagation(); openEditPost(p); }}
                            className={`w-full text-left rounded px-1 py-0.5 text-[9px] font-medium truncate transition-colors hover:opacity-80 ${
                              p.status === "draft" ? "bg-elevated text-text-secondary border border-dashed border-border" : platformColors[p.platform]
                            }`}
                          >
                            {p.time.slice(0, 5)} {p.templateName}
                          </button>
                        ))}
                        {totalItems > (holiday ? 3 : 4) && (
                          <p className="text-[9px] text-text-secondary px-1">+{totalItems - (holiday ? 3 : 4)} more</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Week view */}
          {view === "week" && (
            <div className="rounded-2xl bg-surface border border-border overflow-hidden">
              <div className="grid grid-cols-7">
                {getWeekDates().map((wd) => {
                  const isToday = wd.dateKey === todayKey;
                  const dayPosts = postsMap.get(wd.dateKey) || [];
                  const dayEvents = eventsMap.get(wd.dateKey) || [];
                  const holiday = showHolidays ? holidayMap.get(wd.dateKey) : undefined;
                  return (
                    <div key={wd.dateKey} className="border-r border-border last:border-r-0">
                      <div className={`px-2 py-3 text-center border-b border-border ${isToday ? "bg-accent/5" : ""}`}>
                        <p className="text-[10px] text-text-secondary font-bold uppercase">{wd.dayName}</p>
                        <p className={`text-lg font-bold mt-0.5 ${isToday ? "text-accent" : "text-text"}`}>{wd.day}</p>
                      </div>
                      <button
                        className="min-h-[400px] p-2 space-y-1.5 cursor-pointer hover:bg-elevated/20 transition-colors w-full text-left"
                        onClick={() => openDayDetail(wd.dateKey)}
                      >
                        {holiday && (
                          <div className="rounded-lg p-2 bg-warning/10 text-warning">
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
                              p.status === "draft" ? "bg-elevated border border-dashed border-border" : platformColors[p.platform]
                            }`}
                          >
                            <p className="text-[10px] font-bold">{p.time.slice(0, 5)}</p>
                            <p className="text-xs font-medium truncate">{p.templateName}</p>
                            <p className="text-[10px] opacity-70 capitalize">{p.platform}</p>
                          </button>
                        ))}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-surface border border-border p-4">
            <h3 className="text-sm font-bold text-text mb-3">Upcoming Posts</h3>
            {upcoming.length === 0 ? (
              <p className="text-xs text-text-secondary py-4 text-center">No upcoming posts scheduled</p>
            ) : (
              <div className="space-y-2">
                {upcoming.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => openEditPost(p)}
                    className="w-full text-left rounded-xl bg-elevated/50 p-3 hover:bg-elevated transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-text-secondary">{p.date} at {p.time}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold capitalize ${platformColors[p.platform]}`}>{p.platform}</span>
                    </div>
                    <p className="text-xs font-semibold text-text">{p.templateName}</p>
                    {p.caption && <p className="text-[10px] text-text-secondary truncate mt-0.5">{p.caption}</p>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-surface border border-border p-4">
            <h3 className="text-sm font-bold text-text mb-3">Upcoming Events</h3>
            {upcomingEvents.length === 0 ? (
              <p className="text-xs text-text-secondary py-4 text-center">No upcoming events</p>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => openEditEvent(ev)}
                    className="w-full text-left rounded-xl bg-elevated/50 p-3 hover:bg-elevated transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-text-secondary">{ev.date}{ev.time ? ` at ${ev.time}` : ""}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${eventTypeColors[ev.type]}`}>{eventTypeLabels[ev.type]}</span>
                    </div>
                    <p className="text-xs font-semibold text-text">{ev.title}</p>
                    {ev.notes && <p className="text-[10px] text-text-secondary truncate mt-0.5">{ev.notes}</p>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {showHolidays && upcomingHolidays.length > 0 && (
            <div className="rounded-2xl bg-surface border border-border p-4">
              <h3 className="text-sm font-bold text-text mb-3">Upcoming Holidays</h3>
              <div className="space-y-2">
                {upcomingHolidays.map(([date, name]) => (
                  <div key={date} className="rounded-xl bg-warning/5 border border-warning/10 p-3">
                    <p className="text-[10px] font-bold text-text-secondary">{new Date(date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                    <p className="text-xs font-semibold text-warning">{name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-surface border border-border p-4">
            <h3 className="text-sm font-bold text-text mb-3">Schedule Stats</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-elevated/50 p-3 text-center">
                <p className="text-xl font-bold text-text font-heading">{posts.filter((p) => p.status === "scheduled").length}</p>
                <p className="text-[10px] text-text-secondary mt-0.5">Scheduled</p>
              </div>
              <div className="rounded-xl bg-elevated/50 p-3 text-center">
                <p className="text-xl font-bold text-text font-heading">{posts.filter((p) => p.status === "draft").length}</p>
                <p className="text-[10px] text-text-secondary mt-0.5">Drafts</p>
              </div>
              <div className="rounded-xl bg-elevated/50 p-3 text-center">
                <p className="text-xl font-bold text-text font-heading">{posts.filter((p) => p.status === "published").length}</p>
                <p className="text-[10px] text-text-secondary mt-0.5">Published</p>
              </div>
              <div className="rounded-xl bg-elevated/50 p-3 text-center">
                <p className="text-xl font-bold text-text font-heading">{events.length}</p>
                <p className="text-[10px] text-text-secondary mt-0.5">Events</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Day Detail Modal */}
      {modalMode === "day-detail" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setModalMode(null)}>
          <div role="dialog" aria-modal="true" aria-label="Event details" className="w-full max-w-md max-h-[80vh] rounded-2xl bg-surface border border-border shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div>
                <h3 className="text-lg font-bold text-text font-heading">{formatDisplayDate(selectedDate)}</h3>
                {holidayMap.get(selectedDate) && (
                  <p className="text-xs font-semibold text-warning mt-0.5">{holidayMap.get(selectedDate)}</p>
                )}
              </div>
              <button aria-label="Close" onClick={() => setModalMode(null)} className="p-1 rounded-lg text-text-secondary hover:text-text hover:bg-elevated transition-colors">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Events for this day */}
              {(eventsMap.get(selectedDate) || []).length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2">Events</p>
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
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2">Scheduled Posts</p>
                  <div className="space-y-1.5">
                    {(postsMap.get(selectedDate) || []).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => openEditPost(p)}
                        className={`w-full text-left rounded-xl p-3 transition-colors hover:opacity-80 ${
                          p.status === "draft" ? "bg-elevated border border-dashed border-border" : platformColors[p.platform]
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
                <p className="text-sm text-text-secondary text-center py-6">Nothing scheduled for this day</p>
              )}
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-border shrink-0">
              <button
                onClick={() => openNewEvent(selectedDate)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-full border border-border py-2.5 text-xs font-medium text-text-secondary hover:text-text hover:bg-elevated transition-all"
              >
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                Add Event
              </button>
              <button
                onClick={() => openNewPost(selectedDate)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 py-2.5 text-xs font-medium text-white hover:bg-accent/30 hover:border-accent/40 transition-all"
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
          <div role="dialog" aria-modal="true" aria-label="Schedule post" className="w-full max-w-md rounded-2xl bg-surface border border-border p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-text font-heading">{editingPost ? "Edit Post" : "Schedule Post"}</h3>
              <button aria-label="Close" onClick={() => setModalMode(null)} className="p-1 rounded-lg text-text-secondary hover:text-text hover:bg-elevated transition-colors">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text mb-1.5">Template</label>
                <select
                  value={formTemplate}
                  onChange={(e) => setFormTemplate(e.target.value)}
                  className="w-full rounded-xl border border-border bg-elevated px-3 py-2.5 text-sm text-text focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text mb-1.5">Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full rounded-xl border border-border bg-elevated px-3 py-2.5 text-sm text-text focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text mb-1.5">Time</label>
                  <select
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full rounded-xl border border-border bg-elevated px-3 py-2.5 text-sm text-text focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>{t.display}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-1.5">Platform</label>
                <div className="flex gap-2">
                  {(["facebook", "instagram", "both"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setFormPlatform(p)}
                      className={`flex-1 rounded-xl py-2 text-xs font-semibold capitalize transition-all ${
                        formPlatform === p
                          ? "bg-white/15 backdrop-blur-sm border border-white/20 text-white"
                          : "bg-elevated border border-border text-text-secondary hover:text-text"
                      }`}
                    >
                      {p === "both" ? "Both" : p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-1.5">Caption</label>
                <textarea
                  value={formCaption}
                  onChange={(e) => setFormCaption(e.target.value)}
                  rows={3}
                  placeholder="Write your post caption…"
                  className="w-full rounded-xl border border-border bg-elevated px-3 py-2.5 text-sm text-text placeholder:text-text-secondary/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-1.5">Status</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFormStatus("scheduled")}
                    className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-all ${
                      formStatus === "scheduled"
                        ? "bg-success/15 text-success border border-success/30"
                        : "bg-elevated border border-border text-text-secondary hover:text-text"
                    }`}
                  >
                    Schedule
                  </button>
                  <button
                    onClick={() => setFormStatus("draft")}
                    className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-all ${
                      formStatus === "draft"
                        ? "bg-warning/15 text-warning border border-warning/30"
                        : "bg-elevated border border-border text-text-secondary hover:text-text"
                    }`}
                  >
                    Save as Draft
                  </button>
                </div>
              </div>
            </div>

            {meta?.connected && formStatus === "scheduled" && !editingPost && (
              <div className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 mt-4">
                <div className="h-2 w-2 rounded-full bg-success" />
                <p className="text-[11px] text-success font-medium">Connected to {meta.pageName} — will schedule via Meta Graph API</p>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              {editingPost && (
                <button
                  onClick={handleDeletePost}
                  className="rounded-xl border border-danger/30 px-4 py-2.5 text-sm font-semibold text-danger hover:bg-danger/10 transition-all"
                >
                  Delete
                </button>
              )}
              <button onClick={() => setModalMode(null)} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-text-secondary hover:text-text hover:bg-elevated transition-all">
                Cancel
              </button>
              <button
                onClick={handleSavePost}
                disabled={publishing}
                className="flex-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 py-2.5 text-sm font-medium text-white hover:bg-accent/30 hover:border-accent/40 transition-all disabled:opacity-50"
              >
                {publishing ? "Scheduling..." : editingPost ? "Update" : "Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Modal */}
      {modalMode === "event" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setModalMode(null)}>
          <div role="dialog" aria-modal="true" aria-label="Add event" className="w-full max-w-md rounded-2xl bg-surface border border-border p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-text font-heading">{editingEvent ? "Edit Event" : "Add Event"}</h3>
              <button aria-label="Close" onClick={() => setModalMode(null)} className="p-1 rounded-lg text-text-secondary hover:text-text hover:bg-elevated transition-colors">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text mb-1.5">Event Title</label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="Open house, closing, meeting…"
                  className="w-full rounded-xl border border-border bg-elevated px-3 py-2.5 text-sm text-text placeholder:text-text-secondary/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-1.5">Type</label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(eventTypeLabels) as CalendarEvent["type"][]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setEventType(t)}
                      className={`rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                        eventType === t
                          ? eventTypeColors[t] + " border border-current/20"
                          : "bg-elevated border border-border text-text-secondary hover:text-text"
                      }`}
                    >
                      {eventTypeLabels[t]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text mb-1.5">Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full rounded-xl border border-border bg-elevated px-3 py-2.5 text-sm text-text focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text mb-1.5">Time <span className="text-text-secondary/50 font-normal">optional</span></label>
                  <select
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    className="w-full rounded-xl border border-border bg-elevated px-3 py-2.5 text-sm text-text focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  >
                    <option value="">All day</option>
                    {TIME_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>{t.display}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-1.5">Notes <span className="text-text-secondary/50 font-normal">optional</span></label>
                <textarea
                  value={eventNotes}
                  onChange={(e) => setEventNotes(e.target.value)}
                  rows={2}
                  placeholder="Any additional details…"
                  className="w-full rounded-xl border border-border bg-elevated px-3 py-2.5 text-sm text-text placeholder:text-text-secondary/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              {editingEvent && (
                <button
                  onClick={handleDeleteEvent}
                  className="rounded-xl border border-danger/30 px-4 py-2.5 text-sm font-semibold text-danger hover:bg-danger/10 transition-all"
                >
                  Delete
                </button>
              )}
              <button onClick={() => setModalMode(null)} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-text-secondary hover:text-text hover:bg-elevated transition-all">
                Cancel
              </button>
              <button
                onClick={handleSaveEvent}
                disabled={!eventTitle.trim()}
                className="flex-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 py-2.5 text-sm font-medium text-white hover:bg-accent/30 hover:border-accent/40 transition-all disabled:opacity-50"
              >
                {editingEvent ? "Update" : "Add Event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
