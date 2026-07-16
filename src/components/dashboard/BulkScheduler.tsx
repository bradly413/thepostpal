"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { Sparkles, ChevronUp, ChevronDown, X, CalendarDays, ChevronRight } from "lucide-react";
import { uploadMediaToS3 } from "@/lib/dashboard-upload";
import { createDashboardPost } from "@/lib/dashboard-api";
import type { SocialPlatform } from "@/lib/posterboy-types";
import {
  captionPlatformFor,
  prettyScheduleDate,
  scheduledForISO,
  todayISODate,
  type PlatformChoice,
} from "@/lib/bulk-schedule";
import { BULK_CAPTION_TONE_CHIPS } from "@/lib/bulk-caption-tones";
import { BULK_DIRECTION_PLACEHOLDERS } from "@/lib/bulk-direction-placeholders";
import { useRotatingPlaceholder } from "@/lib/use-rotating-placeholder";
import {
  buildBulkCaptionContext,
  formatCaptionVariant,
  fileToInlineImage,
  isUsableCaptionImageUrl,
} from "@/lib/bulk-caption-context";
import { useActiveLocation } from "@/lib/use-active-location";
import LocationSwitcher from "@/components/LocationSwitcher";
import { usePlanFeatures } from "@/components/dashboard/PlanProvider";
import { LocationGate } from "@/components/dashboard/StateViews";
import type { CaptionVariant } from "@/components/dashboard/composer/CaptionVariantPicker";

interface BulkItem {
  id: string;
  file: File;
  previewUrl: string;
  caption: string;
  photoNote: string;
  variants: CaptionVariant[];
  variantIndex: number;
  showVariants: boolean;
  showPhotoNote: boolean;
  mediaUrl: string | null;
  uploading: boolean;
  error: string | null;
  posted: boolean;
  captioning: boolean;
}

function platformsFor(p: PlatformChoice): SocialPlatform[] {
  if (p === "facebook") return ["facebook" as SocialPlatform];
  if (p === "instagram") return ["instagram" as SocialPlatform];
  return ["facebook", "instagram"] as SocialPlatform[];
}

let seq = 0;
function uid(): string {
  seq += 1;
  return `bulk-${Date.now()}-${seq}`;
}

export default function BulkScheduler() {
  const { locationId, locations, loading: locationsLoading, error: locationsError, refresh } = useActiveLocation();
  const features = usePlanFeatures();
  const [batchDirection, setBatchDirection] = useState("");
  const [selectedTones, setSelectedTones] = useState<string[]>([]);
  const [items, setItems] = useState<BulkItem[]>([]);
  const [startDate, setStartDate] = useState(todayISODate);
  const [time, setTime] = useState("09:00");
  const [intervalDays, setIntervalDays] = useState(1);
  const [skipWeekends, setSkipWeekends] = useState(true);
  const [platform, setPlatform] = useState<PlatformChoice>("both");
  const [scheduling, setScheduling] = useState(false);
  const [done, setDone] = useState(false);
  const [generatingCaptions, setGeneratingCaptions] = useState(false);
  const [captionBatchError, setCaptionBatchError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showBrief, setShowBrief] = useState(false);
  const [showScheduleDetail, setShowScheduleDetail] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const captionQueueRef = useRef<Set<string>>(new Set());
  const autoCaptionChainRef = useRef<Promise<void>>(Promise.resolve());
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const locationName = locations.find((l) => l.id === locationId)?.name ?? "brand";

  const uploading = items.some((i) => i.uploading);
  const readyCount = items.filter((i) => i.mediaUrl).length;
  const withCaptionCount = items.filter((i) => i.mediaUrl && i.caption.trim()).length;
  const schedulableCount = items.filter((i) => i.mediaUrl && !i.posted && i.caption.trim()).length;
  const allScheduled = items.length > 0 && items.every((i) => i.posted);
  const canSchedule = !scheduling && !uploading && schedulableCount > 0 && !!locationId;
  const captioningCount = items.filter((i) => i.captioning).length;

  const { placeholder: directionPlaceholder, fading: directionPlaceholderFading } =
    useRotatingPlaceholder(BULK_DIRECTION_PLACEHOLDERS, !batchDirection.trim());

  const timeline = useMemo(
    () =>
      items.map((it, i) => ({
        id: it.id,
        iso: scheduledForISO(startDate, time, i, intervalDays, skipWeekends),
        posted: it.posted,
        hasCaption: Boolean(it.caption.trim()),
      })),
    [items, startDate, time, intervalDays, skipWeekends],
  );

  // Past-dated slots publish on the next cron tick (~5 min), not "later" —
  // warn instead of letting "Schedule" quietly post them now.
  const pastDueCount = timeline.filter(
    (slot, i) =>
      !slot.posted &&
      slot.hasCaption &&
      Boolean(items[i]?.mediaUrl) &&
      new Date(slot.iso) <= new Date(),
  ).length;

  function toggleTone(id: string) {
    setSelectedTones((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }

  function patchItem(id: string, patch: Partial<BulkItem>) {
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  interface CaptionGenerateOpts {
    inlineImage?: string | null;
    mediaUrl?: string | null;
    batchIndex?: number;
  }

  const generateCaptionsForItem = useCallback(
    async (
      itemId: string,
      priorCaptions: string[],
      batchTotal: number,
      photoNote?: string,
      opts?: CaptionGenerateOpts,
    ): Promise<string | null> => {
      if (!locationId) {
        patchItem(itemId, { error: "Workspace location not ready — refresh and try again." });
        return null;
      }
      if (captionQueueRef.current.has(itemId)) return null;

      const snapshot = itemsRef.current;
      const snapIdx = snapshot.findIndex((i) => i.id === itemId);
      const snapItem = snapIdx >= 0 ? snapshot[snapIdx] : null;
      if (!snapItem) {
        patchItem(itemId, { captioning: false, error: "Photo was removed — add it again." });
        return null;
      }

      const mediaUrl = opts?.mediaUrl ?? snapItem.mediaUrl;
      const batchIndex =
        typeof opts?.batchIndex === "number" && opts.batchIndex >= 0
          ? opts.batchIndex
          : snapIdx;
      const note = photoNote ?? snapItem.photoNote;
      // Prefer hosted URL — avoid multi‑MB data URLs (Vercel body limit).
      let inlineImage = opts?.inlineImage ?? null;
      const hasHostedUrl = isUsableCaptionImageUrl(mediaUrl);
      if (hasHostedUrl) inlineImage = null;
      const hasInline = Boolean(inlineImage?.startsWith("data:image"));

      if (!hasHostedUrl && !hasInline) {
        patchItem(itemId, {
          captioning: false,
          error: "Still uploading — wait a moment, then try Create captions.",
        });
        return null;
      }

      patchItem(itemId, { captioning: true, error: null, showVariants: false });
      captionQueueRef.current.add(itemId);
      const plat = captionPlatformFor(platform);
      const context = buildBulkCaptionContext({
        batchDirection,
        selectedToneIds: selectedTones,
        photoNote: note,
        batchIndex: batchIndex >= 0 ? batchIndex : undefined,
        batchTotal,
        priorCaptions,
      });

      try {
        const postCaption = async (body: {
          imageUrl?: string;
          inlineImage?: string;
        }) => {
          const res = await fetch("/api/ai/captions-from-image", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...body,
              platform: plat,
              locationId,
              count: 3,
              context: context || undefined,
            }),
          });
          const data = (await res.json()) as {
            variants?: CaptionVariant[];
            error?: string;
            compliance?: { blocked?: boolean; message?: string };
          };
          return { res, data };
        };

        let { res, data } = await postCaption({
          imageUrl: hasHostedUrl ? mediaUrl! : undefined,
          inlineImage: hasInline ? inlineImage! : undefined,
        });

        // S3/CloudFront may block server fetch — retry once with a compact inline JPEG.
        if (
          !res.ok &&
          hasHostedUrl &&
          !hasInline &&
          typeof data.error === "string" &&
          /process the image|valid inlineImage|https imageUrl/i.test(data.error)
        ) {
          const retryInline = await fileToInlineImage(snapItem.file);
          if (retryInline) {
            ({ res, data } = await postCaption({ inlineImage: retryInline }));
          }
        }

        if (data.compliance?.blocked) {
          patchItem(itemId, {
            captioning: false,
            error: data.compliance.message ?? "Caption blocked by compliance rules",
          });
          return null;
        }

        if (!res.ok || !data.variants?.length) {
          patchItem(itemId, {
            captioning: false,
            error: data.error ?? "Caption failed",
          });
          return null;
        }

        const caption = formatCaptionVariant(data.variants[0]);
        setItems((prev) =>
          prev.map((p) =>
            p.id === itemId
              ? {
                  ...p,
                  variants: data.variants!,
                  variantIndex: 0,
                  caption,
                  captioning: false,
                  showVariants: data.variants!.length > 1,
                }
              : p,
          ),
        );
        return caption;
      } catch {
        patchItem(itemId, { captioning: false, error: "Caption failed" });
        return null;
      } finally {
        captionQueueRef.current.delete(itemId);
      }
    },
    [locationId, platform, batchDirection, selectedTones],
  );

  const enqueueAutoCaption = useCallback(
    (itemId: string, _file: File, knownMediaUrl: string) => {
      autoCaptionChainRef.current = autoCaptionChainRef.current
        .then(async () => {
          const snapshot = itemsRef.current;
          const batchIndex = Math.max(0, snapshot.findIndex((p) => p.id === itemId));
          const prior = snapshot
            .filter((p) => p.id !== itemId && p.caption.trim())
            .map((p) => p.caption.split("\n\n")[0].trim());
          await generateCaptionsForItem(itemId, prior, snapshot.length || 1, undefined, {
            mediaUrl: knownMediaUrl,
            batchIndex,
          });
        })
        .catch(() => undefined);
    },
    [generateCaptionsForItem],
  );

  function addFiles(fileList: FileList | null) {
    if (!fileList || !fileList.length) return;
    setDone(false);
    const incoming: BulkItem[] = Array.from(fileList).map((file) => ({
      id: uid(),
      file,
      previewUrl: URL.createObjectURL(file),
      caption: "",
      photoNote: "",
      variants: [],
      variantIndex: 0,
      showVariants: false,
      showPhotoNote: false,
      mediaUrl: null,
      uploading: true,
      error: null,
      posted: false,
      captioning: false,
    }));
    setItems((prev) => [...prev, ...incoming]);

    incoming.forEach((it) => {
      uploadMediaToS3(it.file)
        .then((url) => {
          setItems((prev) =>
            prev.map((p) => (p.id === it.id ? { ...p, mediaUrl: url, uploading: false } : p)),
          );
          enqueueAutoCaption(it.id, it.file, url);
        })
        .catch((e) =>
          setItems((prev) =>
            prev.map((p) =>
              p.id === it.id
                ? {
                    ...p,
                    uploading: false,
                    error: e instanceof Error ? e.message : "Upload failed",
                  }
                : p,
            ),
          ),
        );
    });
  }

  function selectVariant(itemId: string, index: number) {
    setItems((prev) =>
      prev.map((p) => {
        if (p.id !== itemId || !p.variants[index]) return p;
        return {
          ...p,
          variantIndex: index,
          caption: formatCaptionVariant(p.variants[index]),
        };
      }),
    );
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((p) => p.id !== id));
  }

  function move(id: string, dir: -1 | 1) {
    setItems((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      const j = idx + dir;
      if (idx < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      const tmp = next[idx];
      next[idx] = next[j];
      next[j] = tmp;
      return next;
    });
  }

  async function createAllCaptions() {
    if (generatingCaptions || !locationId) {
      if (!locationId) setCaptionBatchError("Workspace location not ready — refresh and try again.");
      return;
    }
    setGeneratingCaptions(true);
    setCaptionBatchError(null);
    try {
      // Let in-flight auto captions finish so we don't collide.
      await autoCaptionChainRef.current.catch(() => undefined);

      const snapshot = itemsRef.current;
      const prior: string[] = snapshot
        .filter((p) => p.caption.trim())
        .map((p) => p.caption.split("\n\n")[0].trim());
      const targets = snapshot.filter(
        (i) => i.mediaUrl && !i.captioning && !i.caption.trim() && !i.posted,
      );
      let wrote = 0;

      for (const it of targets) {
        const inlineImage = isUsableCaptionImageUrl(it.mediaUrl)
          ? null
          : await fileToInlineImage(it.file);
        const caption = await generateCaptionsForItem(
          it.id,
          [...prior],
          snapshot.length,
          undefined,
          {
            inlineImage,
            mediaUrl: it.mediaUrl,
            batchIndex: snapshot.findIndex((p) => p.id === it.id),
          },
        );
        if (caption) {
          wrote += 1;
          prior.push(caption.split("\n\n")[0]);
        }
      }

      if (targets.length > 0 && wrote === 0) {
        setCaptionBatchError(
          "Couldn't write captions — see the error on each photo, or check that AI is configured.",
        );
      }
    } finally {
      setGeneratingCaptions(false);
    }
  }

  async function scheduleAll() {
    if (!canSchedule || !locationId) return;
    setScheduling(true);
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.mediaUrl || it.posted || !it.caption.trim()) continue;
      try {
        await createDashboardPost({
          locationId,
          copy: it.caption,
          platforms: platformsFor(platform),
          scheduledFor: scheduledForISO(startDate, time, i, intervalDays, skipWeekends),
          status: "approved",
          mediaUrl: it.mediaUrl,
          mediaType: "image",
        });
        setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, posted: true } : p)));
      } catch (e) {
        setItems((prev) =>
          prev.map((p) =>
            p.id === it.id
              ? { ...p, error: e instanceof Error ? e.message : "Couldn't schedule" }
              : p,
          ),
        );
      }
    }
    setScheduling(false);
    setDone(true);
  }

  const timeLabel = (() => {
    const [h, m] = time.split(":").map(Number);
    const d = new Date();
    d.setHours(h || 0, m || 0, 0, 0);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  })();
  const startLabel = new Date(`${startDate}T12:00:00`).toLocaleDateString([], { month: "short", day: "numeric" });
  const everyLabel = intervalDays === 1 ? "Daily" : `Every ${intervalDays} days`;
  const scheduleSummary = `${everyLabel} at ${timeLabel}, from ${startLabel}${skipWeekends ? ", skips weekends" : ""}`;
  const postedCount = items.filter((i) => i.posted).length;

  return (
    <LocationGate
      loading={locationsLoading}
      error={locationsError}
      locationId={locationId}
      onRetry={() => void refresh()}
      onCreate={() => (window.location.href = "/dashboard/organization")}
    >
      <div className="pb-app max-w-4xl mx-auto">
        <div className="pb-app-header">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-black/45 mb-2">
                <Link href="/dashboard/calendar" className="hover:text-black transition-colors">
                  Calendar
                </Link>
                <span aria-hidden="true">/</span>
                <span className="text-black/70">Bulk schedule</span>
              </div>
              <h1>Bulk schedule</h1>
              <p>Drop a batch of photos. We caption them and space them across your calendar.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
              {features.multiLocation && <LocationSwitcher />}
              <Link
                href="/dashboard/calendar"
                className="pb-btn-secondary text-xs py-2.5 px-4 inline-flex items-center gap-1.5"
              >
                <CalendarDays size={14} aria-hidden="true" />
                Back to calendar
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="space-y-4">
            <div
              role="button"
              tabIndex={0}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                addFiles(e.dataTransfer.files);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`pb-panel cursor-pointer text-center transition-colors ${
                dragOver ? "border-[#ee2532]/40 bg-[#ee2532]/[0.03]" : ""
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => addFiles(e.target.files)}
              />
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#ee2532]/10 text-[#ee2532]">
                <span className="text-2xl leading-none font-light">+</span>
              </div>
              <p className="text-sm font-semibold text-black">Drop or choose photos</p>
              <p className="mt-1 text-xs text-black/50">
                Select your whole batch at once — uploads run, then captions write automatically
              </p>
            </div>

            <div className="pb-panel">
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex rounded-full border border-black/10 bg-white p-1">
                  {(["facebook", "instagram", "both"] as PlatformChoice[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPlatform(p)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-medium capitalize transition-colors ${
                        platform === p ? "bg-[#ee2532] text-white" : "text-black/55 hover:text-black"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowScheduleDetail((v) => !v)}
                  className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-black/55 hover:text-black"
                >
                  <ChevronRight
                    size={12}
                    className={`transition-transform ${showScheduleDetail ? "rotate-90" : ""}`}
                    aria-hidden="true"
                  />
                  {showScheduleDetail ? "Done" : "Adjust"}
                </button>
              </div>
              <p className="mt-2 text-xs text-black/50">{scheduleSummary}</p>
              {showScheduleDetail && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="pb-label">Start date</span>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="pb-field w-full mt-1.5" />
                  </label>
                  <label className="block">
                    <span className="pb-label">Post time</span>
                    <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="pb-field w-full mt-1.5" />
                  </label>
                  <label className="block">
                    <span className="pb-label">Every (days)</span>
                    <input type="number" min={1} max={30} value={intervalDays} onChange={(e) => setIntervalDays(Math.max(1, Number(e.target.value) || 1))} className="pb-field w-full mt-1.5" />
                  </label>
                  <label className="flex items-center gap-3 pt-6 cursor-pointer">
                    <input type="checkbox" checked={skipWeekends} onChange={(e) => setSkipWeekends(e.target.checked)} className="rounded border-black/10 accent-[#ee2532]" />
                    <span className="text-sm text-black/70">Skip weekends</span>
                  </label>
                </div>
              )}
            </div>

            <div className="pb-panel">
              <button
                type="button"
                onClick={() => setShowBrief((v) => !v)}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="text-sm font-bold text-black">
                  Caption brief <span className="font-normal text-black/45">· optional</span>
                </span>
                <ChevronRight
                  size={14}
                  className={`text-black/40 transition-transform ${showBrief ? "rotate-90" : ""}`}
                  aria-hidden="true"
                />
              </button>
              {!showBrief && (
                <p className="mt-1 text-xs text-black/45">
                  {batchDirection.trim() || selectedTones.length
                    ? "Brief added. Captions will follow it."
                    : "Skip it and we write from your photos and brand voice."}
                </p>
              )}
              {showBrief && (
                <div className="mt-3">
                  <p className="text-xs text-black/50 mb-3 leading-relaxed">
                    Paste a caption, describe an idea, or jot loose thoughts. Anything works.
                  </p>
                  <textarea
                    value={batchDirection}
                    onChange={(e) => setBatchDirection(e.target.value)}
                    placeholder={directionPlaceholder}
                    rows={3}
                    className={`pb-field w-full resize-y text-sm${
                      directionPlaceholderFading ? " is-placeholder-fading" : ""
                    }`}
                  />
                  <div className="mt-4">
                    <span className="pb-label">Tone</span>
                    <p className="text-[11px] text-black/45 mt-1 mb-2">Tap the voice you want. Pick more than one.</p>
                    <div className="flex flex-wrap gap-2">
                      {BULK_CAPTION_TONE_CHIPS.map((chip) => {
                        const on = selectedTones.includes(chip.id);
                        return (
                          <button
                            key={chip.id}
                            type="button"
                            onClick={() => toggleTone(chip.id)}
                            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors border ${
                              on
                                ? "bg-[#ee2532] text-white border-[#ee2532]"
                                : "bg-white text-black/60 border-black/10 hover:border-black/25 hover:text-black"
                            }`}
                          >
                            {chip.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-black/55">
                    {items.length} photo{items.length === 1 ? "" : "s"}
                    {uploading ? " · uploading…" : ""}
                    {captioningCount > 0 ? ` · ${captioningCount} writing…` : ""}
                    {withCaptionCount > 0 && !uploading
                      ? ` · ${withCaptionCount} captioned`
                      : ""}
                  </p>
                  <button
                    type="button"
                    onClick={() => void createAllCaptions()}
                    disabled={generatingCaptions || uploading || readyCount === 0 || !locationId}
                    className="pb-btn-secondary text-xs py-2 px-3.5 inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Sparkles size={13} aria-hidden="true" />
                    {generatingCaptions ? "Creating captions…" : "Create captions"}
                  </button>
                </div>

                {captionBatchError ? (
                  <p className="text-sm text-[#ee2532] px-1">{captionBatchError}</p>
                ) : null}

                {items.map((it, i) => {
                  const iso = timeline[i]?.iso ?? scheduledForISO(startDate, time, i, intervalDays, skipWeekends);
                  return (
                    <div
                      key={it.id}
                      className={`pb-panel p-4 space-y-3 ${it.posted ? "opacity-80" : ""}`}
                    >
                      <div className="flex gap-3">
                        <div className="flex flex-col items-center gap-0.5 text-black/30 shrink-0">
                          <button
                            type="button"
                            aria-label="Move up"
                            onClick={() => move(it.id, -1)}
                            disabled={i === 0}
                            className="p-1 disabled:opacity-30 hover:text-black transition-colors"
                          >
                            <ChevronUp size={14} />
                          </button>
                          <span className="text-[11px] font-medium tabular-nums">{i + 1}</span>
                          <button
                            type="button"
                            aria-label="Move down"
                            onClick={() => move(it.id, 1)}
                            disabled={i === items.length - 1}
                            className="p-1 disabled:opacity-30 hover:text-black transition-colors"
                          >
                            <ChevronDown size={14} />
                          </button>
                        </div>

                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-black/[0.04]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={it.previewUrl}
                            alt=""
                            className={`h-full w-full object-cover ${it.uploading ? "opacity-50" : ""}`}
                          />
                          {it.captioning && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-[10px] font-medium text-[#ee2532]">
                              Writing…
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-2">
                          {it.variants.length > 1 && (
                            <div className="flex flex-wrap gap-1.5">
                              {it.variants.map((v, vi) => (
                                <button
                                  key={`${v.angle}-${vi}`}
                                  type="button"
                                  onClick={() => selectVariant(it.id, vi)}
                                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors border ${
                                    it.variantIndex === vi
                                      ? "bg-black/[0.06] text-black border-black/15"
                                      : "bg-white text-black/50 border-black/8 hover:text-black"
                                  }`}
                                >
                                  {v.angle}
                                </button>
                              ))}
                            </div>
                          )}

                          <textarea
                            value={it.caption}
                            onChange={(e) => patchItem(it.id, { caption: e.target.value })}
                            placeholder={it.captioning ? "Writing caption…" : "Caption appears here — or write your own"}
                            rows={3}
                            disabled={it.captioning}
                            className="pb-field w-full resize-y text-sm min-h-[72px]"
                          />

                          <div className="flex flex-wrap items-center gap-2">
                            <span className="pb-chip-soft text-[11px]">{prettyScheduleDate(iso)}</span>
                            {it.mediaUrl && !it.posted && !it.captioning && (
                              <button
                                type="button"
                                onClick={() => {
                                  const prior = items
                                    .filter((p) => p.caption.trim() && p.id !== it.id)
                                    .map((p) => p.caption.split("\n\n")[0].trim());
                                  void generateCaptionsForItem(
                                    it.id,
                                    prior,
                                    items.length,
                                    undefined,
                                    {
                                      mediaUrl: it.mediaUrl,
                                      batchIndex: i,
                                    },
                                  );
                                }}
                                className="text-[11px] font-medium text-[#ee2532] hover:underline"
                              >
                                Try other options
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => patchItem(it.id, { showPhotoNote: !it.showPhotoNote })}
                              className="text-[11px] font-medium text-black/45 hover:text-black inline-flex items-center gap-0.5"
                            >
                              <ChevronRight
                                size={12}
                                className={`transition-transform ${it.showPhotoNote ? "rotate-90" : ""}`}
                                aria-hidden="true"
                              />
                              {it.showPhotoNote ? "Hide note" : "Different from the rest?"}
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 shrink-0 min-w-[72px]">
                          {it.posted ? (
                            <span className="text-xs font-medium text-[#1f9d4d]">Scheduled</span>
                          ) : it.error ? (
                            <span className="text-[11px] text-[#ee2532] text-right max-w-[200px] leading-snug">{it.error}</span>
                          ) : it.uploading ? (
                            <span className="text-xs text-black/45">Uploading…</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => removeItem(it.id)}
                              aria-label="Remove"
                              className="p-1.5 text-black/40 hover:text-black transition-colors"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      {it.showPhotoNote && (
                        <label className="block pl-9">
                          <span className="pb-label">Note for this photo only</span>
                          <input
                            type="text"
                            value={it.photoNote}
                            onChange={(e) => patchItem(it.id, { photoNote: e.target.value })}
                            placeholder="e.g. this is the kitchen — mention the new appliances"
                            className="pb-field w-full mt-1.5 text-sm"
                          />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <div className="pb-panel p-5">
              <h3 className="text-sm font-bold text-black mb-2">Ready to publish</h3>
              <p className="text-xs text-black/50 mb-4 leading-relaxed">
                {done
                  ? `${postedCount} of ${items.length} scheduled to ${locationName}.`
                  : items.length > 0
                    ? `${schedulableCount} of ${items.length} ready · ${locationName}`
                    : "Add photos to get started."}
              </p>
              {items.length > 0 && schedulableCount < items.length - items.filter((i) => i.posted).length && (
                <p className="text-[11px] text-black/45 mb-3">
                  Create captions before scheduling, or write your own in each post.
                </p>
              )}
              {pastDueCount > 0 && !done && (
                <p className="text-[11px] text-[#c81e2a] mb-3">
                  {pastDueCount === 1 ? "1 slot is" : `${pastDueCount} slots are`} in the past and will
                  publish within minutes of scheduling. Move the start date or time to post later.
                </p>
              )}
              <button
                type="button"
                onClick={scheduleAll}
                disabled={!canSchedule}
                className={`w-full py-3 rounded-xl text-sm font-medium transition-colors ${
                  allScheduled
                    ? "bg-[#1f9d4d] text-white"
                    : canSchedule
                      ? "pb-btn-primary w-full"
                      : "bg-black/[0.06] text-black/35 cursor-default"
                }`}
              >
                {scheduling
                  ? "Scheduling…"
                  : allScheduled
                    ? "All scheduled"
                    : `Schedule ${schedulableCount || ""} post${schedulableCount === 1 ? "" : "s"}`.trim()}
              </button>
              {allScheduled && (
                <Link
                  href="/dashboard/calendar"
                  className="mt-3 block text-center text-xs font-medium text-[#ee2532] hover:underline"
                >
                  View on calendar
                </Link>
              )}
              {items.length > 0 && (
                <div className="mt-4 border-t border-black/[0.06] pt-4">
                  <p className="pb-label mb-2">Timeline</p>
                  <ul className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                    {timeline.map((slot, i) => (
                      <li
                        key={slot.id}
                        className={`flex items-center justify-between gap-2 text-xs ${
                          slot.posted ? "text-[#1f9d4d]" : slot.hasCaption ? "text-black/65" : "text-black/40"
                        }`}
                      >
                        <span className="font-medium tabular-nums text-black/40 w-5">{i + 1}</span>
                        <span className="flex-1 truncate">{prettyScheduleDate(slot.iso)}</span>
                        {slot.posted ? (
                          <span className="text-[10px] font-medium">done</span>
                        ) : slot.hasCaption ? (
                          new Date(slot.iso) <= new Date() ? (
                            <span className="text-[10px] font-medium text-[#c81e2a]">posts now</span>
                          ) : (
                            <span className="text-[10px] font-medium text-black/45">ready</span>
                          )
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </LocationGate>
  );
}
