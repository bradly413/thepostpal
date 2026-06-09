"use client";

import { use, useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { templates as staticTemplates, type Template } from "@/lib/templates";
import { toPng } from "html-to-image";
import TemplateCanvas from "@/components/TemplateCanvas";
import { useMetaConnection } from "@/lib/use-meta-connection";
import { createDashboardPost } from "@/lib/dashboard-api";
import {
  platformsFromCalendarPlatform,
  scheduledForIso,
} from "@/lib/scheduled-post-mappers";
import { getStoredActiveLocationId } from "@/lib/dashboard-browser-state";
import { BRAND_PHOTOS } from "@/lib/brand-photo-assets";
import { useDashboardPhotos } from "@/lib/use-dashboard-photos";
import { useActiveLocation } from "@/lib/use-active-location";
import { uploadDashboardImage } from "@/lib/dashboard-upload";

// Industry-agnostic caption starters shown as rotating placeholders. These are
// generic prompts that work for any business (bakery, gym, salon, agency, …) —
// no hardcoded industry. The AI assistant and brand engine handle specifics.
const CAPTION_SUGGESTIONS = [
  "Something new just landed — come see what we've been working on ✨",
  "Big news to share with you all today. Here's what's happening 👇",
  "Thank you to everyone who showed up this week. We appreciate you ❤️",
  "Behind the scenes of what we do — a little look at our process.",
  "We'd love to hear from you. Drop a comment or send us a message!",
  "This week's highlight — swipe to see more →",
  "Mark your calendar — you won't want to miss what's coming up.",
  "A quick tip we think you'll find useful. Save this for later 📌",
  "Proud of the work that went into this one. Tell us what you think!",
  "New here? Here's a little about who we are and what we offer.",
];

function buildInitialFields(template: Template | undefined): Record<string, string> {
  if (!template) return {};
  const initialValues: Record<string, string> = {};
  for (const field of template.fields) {
    initialValues[field.id] = field.defaultValue;
  }
  return initialValues;
}

function useCanvasScale(template: { width: number; height: number } | undefined) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.35);

  useEffect(() => {
    if (!template || !containerRef.current) return;
    const update = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const availH = window.innerHeight * 0.62;
      const scaleByW = w / template.width;
      const scaleByH = availH / template.height;
      setScale(Math.min(scaleByW, scaleByH, 0.75));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [template]);

  return { containerRef, scale };
}

export default function EditorPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = use(params);
  const [template, setTemplate] = useState<Template | undefined>(() =>
    staticTemplates.find((item) => item.id === templateId)
  );
  const [templateResolved, setTemplateResolved] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [fieldsTemplateId, setFieldsTemplateId] = useState(template?.id || "");
  const [fields, setFields] = useState<Record<string, string>>(() => buildInitialFields(template));

  const [photo, setPhoto] = useState<string | null>(null);
  const [photoPos, setPhotoPos] = useState({ x: 50, y: 50 });
  const [photoZoom, setPhotoZoom] = useState(100);
  const [photoRotate, setPhotoRotate] = useState(0);
  const [caption, setCaption] = useState("");
  const [generating, setGenerating] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [publishPlatform, setPublishPlatform] = useState<"facebook" | "instagram" | "both">("both");
  const [showPublish, setShowPublish] = useState(false);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [schedulePlatform, setSchedulePlatform] = useState<"facebook" | "instagram" | "both">("both");
  const [scheduling, setScheduling] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [captionSuggIdx, setCaptionSuggIdx] = useState(0);
  const [captionSuggFade, setCaptionSuggFade] = useState(true);

  useEffect(() => {
    let isActive = true;
    async function loadCatalogTemplate() {
      try {
        const res = await fetch("/api/templates/catalog", { cache: "no-store" });
        if (!res.ok) {
          if (isActive) setTemplateResolved(true);
          return;
        }
        const payload = await res.json() as { templates?: Template[] };
        const runtimeCatalog = Array.isArray(payload.templates) ? payload.templates : [];
        const nextTemplate =
          runtimeCatalog.find((item) => item.id === templateId) ||
          staticTemplates.find((item) => item.id === templateId);
        if (!isActive) return;
        setTemplate(nextTemplate);
        setTemplateResolved(true);
      } catch {
        if (!isActive) return;
        setTemplate(staticTemplates.find((item) => item.id === templateId));
        setTemplateResolved(true);
      }
    }
    void loadCatalogTemplate();
    return () => { isActive = false; };
  }, [templateId]);

  useEffect(() => {
    if (!template) return;
    if (fieldsTemplateId === template.id) return;
    setFields(buildInitialFields(template));
    setFieldsTemplateId(template.id);
  }, [template, fieldsTemplateId]);

  useEffect(() => {
    if (caption) return;
    const interval = setInterval(() => {
      setCaptionSuggFade(false);
      setTimeout(() => {
        setCaptionSuggIdx((i) => (i + 1) % CAPTION_SUGGESTIONS.length);
        setCaptionSuggFade(true);
      }, 1200);
    }, 7000);
    return () => clearInterval(interval);
  }, [caption]);

  const { meta } = useMetaConnection();
  const { locationId } = useActiveLocation();
  const { photos: workspacePhotos, uploadAndCreate } = useDashboardPhotos(locationId);
  const { containerRef, scale } = useCanvasScale(template);

  const handlePhoto = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;
      if (!locationId) return;
      try {
        const saved = await uploadAndCreate(file);
        setPhoto(saved.src);
        setPhotoPos({ x: 50, y: 50 });
        setPhotoZoom(100);
        setPhotoRotate(0);
      } catch {
        const reader = new FileReader();
        reader.onload = (e) => {
          const src = e.target?.result as string;
          if (src) {
            setPhoto(src);
            setPhotoPos({ x: 50, y: 50 });
            setPhotoZoom(100);
            setPhotoRotate(0);
          }
        };
        reader.readAsDataURL(file);
      }
    },
    [locationId, uploadAndCreate],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) void handlePhoto(file);
    },
    [handlePhoto]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handlePhoto(file);
    },
    [handlePhoto]
  );

  async function handleAiGenerate() {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);
    setAiError(null);
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      if (data.image) {
        setPhoto(data.image);
        setAiPrompt("");
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Generation failed");
    }
    setAiGenerating(false);
  }

  async function handleDownload() {
    if (!canvasRef.current) return;
    setGenerating(true);
    try {
      const dataUrl = await toPng(canvasRef.current, {
        width: template!.width,
        height: template!.height,
        pixelRatio: 1,
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.download = `${template!.id}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
    }
    setGenerating(false);
  }

  async function handlePublish() {
    if (!canvasRef.current) return;
    if (!meta?.connected) {
      setPublishResult({
        type: "error",
        message: "Connect Facebook in Settings before publishing.",
      });
      return;
    }
    setPublishing(true);
    setPublishResult(null);
    try {
      const dataUrl = await toPng(canvasRef.current, {
        width: template!.width,
        height: template!.height,
        pixelRatio: 1,
        cacheBust: true,
      });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `${template!.id}.png`, { type: "image/png" });
      // Presigned S3 upload returns a durable public URL Meta can fetch
      // (local-disk uploads are ephemeral on Vercel and unreachable by Meta).
      const imageUrl = await uploadDashboardImage(file);

      const { buildMetaPublishPayload } = await import("@/lib/meta-publish-payload");
      const payload = await buildMetaPublishPayload({
        platform: publishPlatform,
        caption,
        imageUrl,
      });
      const res = await fetch("/api/meta/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Publish failed");
      const locationId = getStoredActiveLocationId();
      if (locationId) {
        await createDashboardPost({
          locationId,
          copy: caption,
          platforms: platformsFromCalendarPlatform(publishPlatform),
          scheduledFor: new Date().toISOString(),
          status: "published",
          templateId: template!.id,
          pillar: template!.pillar,
          mediaUrl: imageUrl,
          mediaType: "image",
        }).catch(() => {});
      }
      setPublishResult({ type: "success", message: "Posted successfully!" });
      setShowPublish(false);
    } catch (err) {
      setPublishResult({ type: "error", message: err instanceof Error ? err.message : "Publish failed" });
    }
    setPublishing(false);
  }

  async function handleSchedule() {
    if (!canvasRef.current || !scheduleDate || !scheduleTime) return;
    if (!meta?.connected) {
      setPublishResult({
        type: "error",
        message: "Connect Facebook in Settings before scheduling.",
      });
      return;
    }
    setScheduling(true);
    setPublishResult(null);
    try {
      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`);
      const now = new Date();
      if (scheduledAt.getTime() <= now.getTime() + 10 * 60 * 1000) {
        throw new Error("Schedule time must be at least 10 minutes in the future");
      }
      const unixTime = Math.floor(scheduledAt.getTime() / 1000);

      const dataUrl = await toPng(canvasRef.current, {
        width: template!.width,
        height: template!.height,
        pixelRatio: 1,
        cacheBust: true,
      });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `${template!.id}.png`, { type: "image/png" });
      // Presigned S3 upload returns a durable public URL Meta can fetch.
      const imageUrl = await uploadDashboardImage(file);

      const { buildMetaPublishPayload } = await import("@/lib/meta-publish-payload");
      const payload = await buildMetaPublishPayload({
        platform: schedulePlatform,
        caption,
        imageUrl,
        scheduledTime: unixTime,
      });
      const res = await fetch("/api/meta/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scheduling failed");

      const locationId = getStoredActiveLocationId();
      if (locationId) {
        await createDashboardPost({
          locationId,
          copy: caption,
          platforms: platformsFromCalendarPlatform(schedulePlatform),
          scheduledFor: scheduledForIso(scheduleDate, scheduleTime),
          status: "scheduled",
          templateId: template!.id,
          pillar: template!.pillar,
          mediaUrl: imageUrl,
          mediaType: "image",
        });
      }

      setPublishResult({ type: "success", message: `Scheduled for ${scheduledAt.toLocaleDateString()} at ${scheduledAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` });
      setShowSchedule(false);
      setScheduleDate("");
      setScheduleTime("");
    } catch (err) {
      setPublishResult({ type: "error", message: err instanceof Error ? err.message : "Scheduling failed" });
    }
    setScheduling(false);
  }

  if (!template) {
    if (!templateResolved) {
      return (
        <div className="flex flex-1 items-center justify-center bg-white">
          <p className="text-black/55">Loading template…</p>
        </div>
      );
    }

    return (
      <div className="flex flex-1 items-center justify-center bg-white">
        <p className="text-black/55">Template not found.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-black/10 shrink-0">
        <Link href="/dashboard/templates" className="flex items-center gap-2 text-black/55 hover:text-black transition-colors">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          <span className="text-xs font-medium">Templates</span>
        </Link>
        <h2 className="font-heading text-sm text-black">{template.name}</h2>
        <div className="w-20" />
      </div>

      <div className="flex-1 overflow-hidden px-4 py-1">
        <div className="flex gap-4 flex-col lg:flex-row h-full">
          {/* Canvas preview + AI generator */}
          <div className="flex-1 flex flex-col gap-2 overflow-hidden">
            <div ref={containerRef} className="flex justify-center">
              <div
                className="overflow-hidden rounded-xl shadow-sm ring-1 ring-black/10"
                style={{
                  width: template.width * scale,
                  height: template.height * scale,
                }}
              >
                <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
                  <TemplateCanvas
                    ref={canvasRef}
                    template={template}
                    fields={fields}
                    photo={photo}
                    photoPos={photoPos}
                    photoZoom={photoZoom}
                    photoRotate={photoRotate}
                  />
                </div>
              </div>
            </div>

            {/* Gemini Creator Studio */}
            <div className="flex flex-1 justify-center">
            <div className="flex flex-col rounded-xl border border-black/10 bg-white p-3" style={{ width: template.width * scale }}>
              <div className="flex items-center gap-2 mb-2">
                <svg className="h-4 w-4 text-[#ee2532]" viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
                <span className="text-xs font-semibold text-black tracking-wide">Gemini Creator Studio</span>
              </div>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !aiGenerating) { e.preventDefault(); handleAiGenerate(); } }}
                placeholder="Describe an image to generate…"
                className="pb-field flex-1 resize-none"
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-[10px] text-black/35">Powered by Gemini — generated images are placed directly into your template</p>
                <button
                  onClick={handleAiGenerate}
                  disabled={aiGenerating || !aiPrompt.trim()}
                  className="pb-btn-primary px-4 py-2 text-xs disabled:opacity-50 whitespace-nowrap shrink-0 ml-3"
                >
                  {aiGenerating ? (
                    <span className="flex items-center gap-1.5">
                      <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Generating
                    </span>
                  ) : "Generate"}
                </button>
              </div>
              {aiError && (
                <p className="mt-2 text-xs text-[#ee2532]">{aiError}</p>
              )}
            </div>
            </div>

          </div>

          {/* Editor sidebar */}
          <div className="w-full lg:w-72 shrink-0 space-y-3 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            {/* Photo upload */}
            {template.hasPhotoSlot && (
              <div>
                <label className="block text-sm font-medium text-black mb-2">Photo</label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`relative rounded-xl border-2 border-dashed p-6 text-center transition-colors cursor-pointer ${
                    dragOver
                      ? "border-[#ee2532] bg-[rgba(238,37,50,0.06)]"
                      : photo
                        ? "border-[#1f9d4d] bg-[rgba(31,157,77,0.06)]"
                        : "border-black/10 hover:border-[rgba(238,37,50,0.5)]"
                  }`}
                  role="button"
                  tabIndex={0}
                  onClick={() => document.getElementById("photo-input")?.click()}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); document.getElementById("photo-input")?.click(); } }}
                >
                  {photo ? (
                    <div className="space-y-2 relative">
                      <img src={photo} alt="Preview" className="mx-auto h-20 w-20 rounded-lg object-cover" />
                      <p className="text-xs text-[#1f9d4d] font-medium">Photo added! Click or drop to replace.</p>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setPhoto(null); setPhotoPos({ x: 50, y: 50 }); setPhotoZoom(100); setPhotoRotate(0); }}
                        className="absolute -top-1 -right-1 p-1 rounded-full bg-[rgba(238,37,50,0.8)] text-white hover:bg-[#ee2532] transition-colors"
                        title="Remove photo"
                      >
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <svg className="mx-auto h-8 w-8 text-black/35" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                      </svg>
                      <p className="text-sm text-black/55">Drop a photo here or click to browse</p>
                    </div>
                  )}
                  <input
                    id="photo-input"
                    type="file"
                    accept="image/*"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </div>
                <div className="mt-2 flex gap-1.5">
                  {[...BRAND_PHOTOS.slice(0, 2), ...workspacePhotos.slice(0, 2)].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setPhoto(p.src); setPhotoPos({ x: 50, y: 50 }); setPhotoZoom(100); setPhotoRotate(0); }}
                      className="relative h-11 w-11 shrink-0 rounded-lg overflow-hidden border border-black/10 hover:border-[#ee2532] transition-colors"
                    >
                      <img src={p.src} alt={p.name} className="h-full w-full object-cover" />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowPhotoPicker(true); }}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-dashed border-black/10 text-black/55 hover:border-[#ee2532] hover:text-[#ee2532] transition-colors"
                    title="View photo library"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </button>
                </div>

                {/* Photo position & zoom controls */}
                {photo && (
                  <div className="mt-3 space-y-3 rounded-xl border border-black/10 bg-white p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-black/55">Adjust Photo</span>
                      <button
                        type="button"
                        onClick={() => { setPhotoPos({ x: 50, y: 50 }); setPhotoZoom(100); setPhotoRotate(0); }}
                        className="text-[10px] text-black/35 hover:text-[#ee2532] transition-colors"
                      >
                        Reset
                      </button>
                    </div>
                    <div>
                      <label className="flex items-center justify-between text-[10px] text-black/55 mb-1">
                        <span>Zoom</span>
                        <span>{photoZoom}%</span>
                      </label>
                      <input
                        type="range"
                        min={100}
                        max={200}
                        value={photoZoom}
                        onChange={(e) => setPhotoZoom(Number(e.target.value))}
                        className="w-full h-1 accent-[#ee2532] rounded-full appearance-none bg-black/[0.04] cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="flex items-center justify-between text-[10px] text-black/55 mb-1">
                        <span>Horizontal</span>
                        <span>{photoPos.x}%</span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={photoPos.x}
                        onChange={(e) => setPhotoPos((p) => ({ ...p, x: Number(e.target.value) }))}
                        className="w-full h-1 accent-[#ee2532] rounded-full appearance-none bg-black/[0.04] cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="flex items-center justify-between text-[10px] text-black/55 mb-1">
                        <span>Vertical</span>
                        <span>{photoPos.y}%</span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={photoPos.y}
                        onChange={(e) => setPhotoPos((p) => ({ ...p, y: Number(e.target.value) }))}
                        className="w-full h-1 accent-[#ee2532] rounded-full appearance-none bg-black/[0.04] cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="flex items-center justify-between text-[10px] text-black/55 mb-1">
                        <span>Rotate</span>
                        <span>{photoRotate}°</span>
                      </label>
                      <input
                        type="range"
                        min={-180}
                        max={180}
                        value={photoRotate}
                        onChange={(e) => setPhotoRotate(Number(e.target.value))}
                        className="w-full h-1 accent-[#ee2532] rounded-full appearance-none bg-black/[0.04] cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Text fields */}
            {template.fields.map((field) => (
              <div key={field.id}>
                <label className="block text-sm font-medium text-black mb-1">
                  {field.label}
                  {field.maxLength && (
                    <span className="ml-2 text-xs text-black/55 font-normal">
                      {(fields[field.id] || "").length}/{field.maxLength}
                    </span>
                  )}
                </label>
                {field.type === "list" || field.type === "body" ? (
                  <textarea
                    value={fields[field.id] || ""}
                    onChange={(e) => setFields({ ...fields, [field.id]: e.target.value })}
                    rows={field.type === "list" ? 5 : 3}
                    className="pb-field resize-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={fields[field.id] || ""}
                    onChange={(e) => setFields({ ...fields, [field.id]: e.target.value })}
                    maxLength={field.maxLength}
                    className="pb-field"
                  />
                )}
              </div>
            ))}

            {/* Caption for social */}
            <div className="border-t border-black/10 pt-4 -mt-1" />
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Post Caption
                <span className="ml-2 text-xs text-black/55 font-normal">optional</span>
              </label>
              <div className="relative">
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Tab" && !caption) { e.preventDefault(); setCaption(CAPTION_SUGGESTIONS[captionSuggIdx]); } }}
                  rows={4}
                  placeholder=" "
                  className="pb-field resize-none placeholder:text-transparent"
                />
                {!caption && (
                  <span
                    onClick={() => setCaption(CAPTION_SUGGESTIONS[captionSuggIdx])}
                    className="absolute left-3 top-2 text-sm text-black/35 transition-opacity duration-1000 line-clamp-3 cursor-pointer hover:text-black/55"
                    style={{ opacity: captionSuggFade ? 1 : 0, right: 12 }}
                  >
                    {CAPTION_SUGGESTIONS[captionSuggIdx]}
                    <span className="block text-[10px] text-black/35 mt-1">Tap to use · or press Tab</span>
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2 pt-2">
              <button
                onClick={handleDownload}
                disabled={generating}
                className="pb-btn-primary w-full py-2.5 text-xs disabled:opacity-50"
              >
                {generating ? "Generating..." : "Download Image"}
              </button>
              {!showSchedule ? (
                <button
                  onClick={() => setShowSchedule(true)}
                  className="pb-btn-secondary flex items-center justify-center gap-1.5 w-full py-2.5 text-xs"
                >
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                  Schedule
                </button>
              ) : (
                <div className="w-full rounded-xl border border-[rgba(238,37,50,0.3)] bg-white p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-black flex items-center gap-1.5">
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Schedule Post
                    </p>
                    <button onClick={() => setShowSchedule(false)} aria-label="Close" className="text-black/55 hover:text-black transition-colors">
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      name="schedule-date"
                      aria-label="Schedule date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="pb-field flex-1"
                    />
                    <input
                      type="time"
                      name="schedule-time"
                      aria-label="Schedule time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="pb-field w-28"
                    />
                  </div>
                  <div className="flex gap-1.5">
                    {(["facebook", "instagram", "both"] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setSchedulePlatform(p)}
                        className={`flex-1 rounded-full py-1.5 text-[11px] font-medium capitalize transition-all ${
                          schedulePlatform === p
                            ? "bg-[#ee2532] text-white"
                            : "bg-black/[0.04] border border-black/10 text-black/55 hover:text-black"
                        }`}
                      >
                        {p === "both" ? "FB + IG" : p === "facebook" ? "Facebook" : "Instagram"}
                      </button>
                    ))}
                  </div>
                  {meta?.connected ? (
                    <button
                      onClick={handleSchedule}
                      disabled={scheduling || !scheduleDate || !scheduleTime}
                      className="pb-btn-primary w-full py-2 text-xs disabled:opacity-50"
                    >
                      {scheduling ? "Scheduling..." : "Schedule Post"}
                    </button>
                  ) : (
                    <Link
                      href="/dashboard/settings?tab=account"
                      className="block w-full rounded-lg border border-black/10 py-2 text-center text-xs font-medium text-black/55 hover:text-black transition-colors"
                    >
                      Connect Facebook to schedule
                    </Link>
                  )}
                </div>
              )}
              {publishResult && (
                <div className={`rounded-lg px-3 py-2 text-xs font-medium ${
                  publishResult.type === "success" ? "bg-[rgba(31,157,77,0.1)] text-[#1f9d4d]" : "bg-[rgba(238,37,50,0.1)] text-[#ee2532]"
                }`}>
                  {publishResult.message}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {showPhotoPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" role="presentation" onClick={() => setShowPhotoPicker(false)}>
          <div className="w-full max-w-lg max-h-[80vh] rounded-2xl bg-white border border-black/10 shadow-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/10">
              <h3 className="text-base font-heading text-black">Choose a Photo</h3>
              <button onClick={() => setShowPhotoPicker(false)} aria-label="Close" className="text-black/55 hover:text-black transition-colors">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div>
                <p className="text-xs font-medium text-black/55 uppercase tracking-wider mb-3">Brand Photos</p>
                <div className="grid grid-cols-4 gap-2">
                  {BRAND_PHOTOS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setPhoto(p.src); setPhotoPos({ x: 50, y: 50 }); setPhotoZoom(100); setPhotoRotate(0); setShowPhotoPicker(false); }}
                      className="group relative aspect-square rounded-lg overflow-hidden border border-black/10 hover:border-[#ee2532] transition-colors"
                    >
                      <img src={p.src} alt={p.name} width={80} height={80} className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end">
                        <span className="w-full px-1 py-0.5 text-[9px] text-white opacity-0 group-hover:opacity-100 transition-opacity truncate bg-black/50">{p.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              {workspacePhotos.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-black/55 uppercase tracking-wider mb-3">My Uploads</p>
                  <div className="grid grid-cols-4 gap-2">
                    {workspacePhotos.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { setPhoto(p.src); setPhotoPos({ x: 50, y: 50 }); setPhotoZoom(100); setPhotoRotate(0); setShowPhotoPicker(false); }}
                        className="group relative aspect-square rounded-lg overflow-hidden border border-black/10 hover:border-[#ee2532] transition-colors"
                      >
                        <img src={p.src} alt={p.name} width={80} height={80} className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end">
                          <span className="w-full px-1 py-0.5 text-[9px] text-white opacity-0 group-hover:opacity-100 transition-opacity truncate bg-black/50">{p.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
