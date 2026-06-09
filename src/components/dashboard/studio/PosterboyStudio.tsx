"use client";

import { useState, useRef, useEffect, useMemo, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  Sparkles,
  Calendar,
  Image as ImageIcon,
  Settings,
  Sun,
  Eye,
  Pencil,
  LayoutGrid,
  AlignLeft,
  Tag,
  Zap,
  Wand2,
  Send,
  Check,
  Crop,
  Maximize2,
  Move,
  RotateCw,
  SlidersHorizontal,
  Download,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import AppSidebar from "@/components/dashboard/AppSidebar";
import StudioPostChrome from "@/components/dashboard/studio/StudioPostChrome";
import InstagramPreview from "@/components/dashboard/studio/InstagramPreview";
import FacebookPreview from "@/components/dashboard/studio/FacebookPreview";
import StrategicIntentPicker from "@/components/dashboard/studio/StrategicIntentPicker";
import ProactiveNudgeBanner from "@/components/dashboard/studio/ProactiveNudgeBanner";
import TrashToTreasureUploadZone from "@/components/dashboard/studio/TrashToTreasureUploadZone";
import CaptionVariantPicker from "@/components/dashboard/composer/CaptionVariantPicker";
import {
  buildStructuredBrief,
  STRATEGIC_INTENTS,
  type StrategicIntentId,
} from "@/lib/studio/strategic-intents";
import VideoComposer from "@/components/dashboard/composer/VideoComposer";
import CompositionOverlay from "@/components/dashboard/editor/CompositionOverlay";
import { createTextLayer, compositionStorageKey } from "@/lib/composition-layers";
import { useCompositionLayers } from "@/hooks/use-composition-layers";
import { createDashboardPost } from "@/lib/dashboard-api";
import { usePlanFeatures } from "@/components/dashboard/PlanProvider";
import { useActiveLocation } from "@/lib/use-active-location";
import type { SocialPlatform } from "@/lib/posterboy-types";

/**
 * Posterboy Social - Studio (responsive)
 *
 * Drop-in: app/(app)/studio/page.tsx
 * Stack: Next.js (App Router) / React 19 / Tailwind 4 + lucide-react
 *
 * Layout note: the responsive shell + canvas + control rail are driven by a
 * namespaced <style> block scoped under `.pb-studio`, so it cannot collide with
 * the rest of the app's Tailwind. This is the exact CSS validated visually at
 * 1440 / 1300 / 1000 / 800 / 390 px. Breakpoints:
 *   >=1380px  desktop  - sidebar | canvas | rail
 *   <=1379px  tablet   - rail drops below canvas as a horizontal control bar
 *   <=860px   sm       - sidebar becomes a top bar; controls grid
 *   <=600px   mobile   - full stack; frame + prompt scale up
 *
 * Wiring TODOs marked inline (generate -> /api/generate, publish -> /api/publish).
 */

gsap.registerPlugin(useGSAP);

// Post target per platform, with the recommended feed-post pixel size.
// `genAspect` is forwarded to the image API (mapped to a supported ratio);
// `w`/`h` drive the morphing canvas frame.
const PLATFORMS = [
  { id: "instagram", label: "Instagram", w: 1080, h: 1350, genAspect: "4:5" },
  { id: "facebook", label: "Facebook", w: 1200, h: 630, genAspect: "16:9" },
  { id: "x", label: "X", w: 1600, h: 900, genAspect: "16:9" },
  { id: "linkedin", label: "LinkedIn", w: 1200, h: 627, genAspect: "16:9" },
  { id: "tiktok", label: "TikTok", w: 1080, h: 1920, genAspect: "9:16" },
] as const;

type PostType = "photo" | "update" | "offer";
type WhenOption = "now" | "schedule";
type GenState = "idle" | "generating" | "done";
type ComposerMode = "image" | "video";
type MediaKind = "image" | "video";

function defaultScheduleDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function studioPlatforms(platformId: string): SocialPlatform[] {
  if (platformId === "facebook") return ["facebook"];
  if (platformId === "instagram" || platformId === "tiktok") return ["instagram"];
  return ["facebook", "instagram"];
}

function buildPostCaption(body: string, tags: string, fallback: string): string {
  const combined = [body.trim(), tags.trim()].filter(Boolean).join(" ");
  return combined || fallback.trim();
}

// Short example prompts that typewriter-rotate through the composer placeholder.
const PROMPT_EXAMPLES = [
  "an Instagram post about our weekend sale",
  "a Facebook post for our new menu",
  "a TikTok about today's special",
  "a post that we're hiring",
  "we just hit 1,000 followers",
  "a grand opening announcement",
  "a quick thank-you to our customers",
  "a LinkedIn post about our latest project",
];

export default function PosterboyStudio() {
  const [platformIdx, setPlatformIdx] = useState(0);
  const [theme, setTheme] = useState<"light" | "grid">("light");
  const [postType, setPostType] = useState<PostType>("photo");
  const [when, setWhen] = useState<WhenOption>("now");
  const [prompt, setPrompt] = useState("");
  const [selectedIntentId, setSelectedIntentId] = useState<StrategicIntentId | null>(null);
  const [intentDetail, setIntentDetail] = useState("");
  const [freeFormMode, setFreeFormMode] = useState(false);
  const [genState, setGenState] = useState<GenState>("idle");
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [publishState, setPublishState] = useState<"idle" | "published">("idle");
  const [progress, setProgress] = useState(0);
  const [showTemplate, setShowTemplate] = useState(false);
  const [captionState, setCaptionState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [captionText, setCaptionText] = useState("");
  const [captionTags, setCaptionTags] = useState("");
  const [captionError, setCaptionError] = useState("");
  const [composerMode, setComposerMode] = useState<ComposerMode>("image");
  const [mediaKind, setMediaKind] = useState<MediaKind>("image");
  const [scheduleDate, setScheduleDate] = useState(defaultScheduleDate);
  const [scheduleTime, setScheduleTime] = useState("10:00");
  const [publishing, setPublishing] = useState(false);
  const [activeTool, setActiveTool] = useState<null | "type" | "tools" | "captions">(null);
  const [placeholderText, setPlaceholderText] = useState(`Make a post — e.g. “${PROMPT_EXAMPLES[0]}”`);
  const { locationId, locations } = useActiveLocation();
  const features = usePlanFeatures();
  const activeLocation = useMemo(
    () => locations.find((l) => l.id === locationId) ?? null,
    [locations, locationId],
  );
  const structuredBrief = useMemo(
    () => (freeFormMode ? prompt.trim() : buildStructuredBrief(selectedIntentId, intentDetail)),
    [freeFormMode, prompt, selectedIntentId, intentDetail],
  );
  const composerBrief = structuredBrief || prompt.trim();
  const selectedIntent = STRATEGIC_INTENTS.find((i) => i.id === selectedIntentId) ?? null;
  const previewHandle =
    activeLocation?.name?.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 24) || "yourbrand";
  const previewPageName = activeLocation?.name || "Your Page";
  const searchParams = useSearchParams();
  const studioLayerKey = locationId ? compositionStorageKey(locationId, "studio") : null;
  const {
    layers: studioLayers,
    selectedId: studioSelectedId,
    setSelectedId: setStudioSelectedId,
    updateLayer: updateStudioLayer,
    addLayer: addStudioLayer,
    undo: undoStudioLayers,
    canUndo: canUndoStudioLayers,
  } = useCompositionLayers(studioLayerKey);

  // Typewriter-rotate short example prompts in the placeholder while it's empty.
  useEffect(() => {
    if (prompt.trim() || genState === "generating") return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const render = (s: string) => setPlaceholderText(`Make a post — e.g. “${s}”`);
    if (reduce) {
      render(PROMPT_EXAMPLES[0]);
      return;
    }
    let ex = 0;
    let ci = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const full = PROMPT_EXAMPLES[ex];
      if (!deleting) {
        ci++;
        render(full.slice(0, ci));
        if (ci >= full.length) {
          deleting = true;
          timer = setTimeout(tick, 1700);
          return;
        }
        timer = setTimeout(tick, 42 + Math.random() * 38);
      } else {
        ci--;
        render(full.slice(0, ci));
        if (ci <= 0) {
          deleting = false;
          ex = (ex + 1) % PROMPT_EXAMPLES.length;
          timer = setTimeout(tick, 280);
          return;
        }
        timer = setTimeout(tick, 22);
      }
    };
    timer = setTimeout(tick, 500);
    return () => clearTimeout(timer);
  }, [prompt, genState]);

  const EDIT_DEFAULT = { scale: 1, x: 0, y: 0, rotate: 0, brightness: 100, contrast: 100, saturate: 100 };
  const [edit, setEdit] = useState(EDIT_DEFAULT);
  // Undo history for image edits — debounced so a full drag/slide collapses to a
  // single step. Additive: it only records & restores, never alters edit behavior.
  const editHistory = useRef<(typeof EDIT_DEFAULT)[]>([]);
  const lastCommittedEdit = useRef(EDIT_DEFAULT);
  const undoingEdit = useRef(false);
  const editCommitTimer = useRef<number | null>(null);
  const [canUndoEdit, setCanUndoEdit] = useState(false);
  useEffect(() => {
    if (undoingEdit.current) { undoingEdit.current = false; lastCommittedEdit.current = edit; return; }
    const prev = lastCommittedEdit.current;
    if (editCommitTimer.current) clearTimeout(editCommitTimer.current);
    editCommitTimer.current = window.setTimeout(() => {
      if (JSON.stringify(prev) !== JSON.stringify(edit)) {
        editHistory.current.push(prev);
        if (editHistory.current.length > 50) editHistory.current.shift();
        setCanUndoEdit(true);
      }
      lastCommittedEdit.current = edit;
    }, 350);
    return () => { if (editCommitTimer.current) clearTimeout(editCommitTimer.current); };
  }, [edit]);
  function undoEdit() {
    const prev = editHistory.current.pop();
    if (!prev) return;
    undoingEdit.current = true;
    setEdit(prev);
    setCanUndoEdit(editHistory.current.length > 0);
  }
  const [activeEdit, setActiveEdit] = useState<null | "scale" | "move" | "rotate" | "adjust">(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toolRailRef = useRef<HTMLDivElement>(null);
  const editRailRef = useRef<HTMLDivElement>(null);
  const promptToolsRef = useRef<HTMLDivElement>(null);
  const frameWrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const dragRef = useRef<{ px: number; py: number; ex: number; ey: number } | null>(null);
  const genTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    document.title = "Posterboy Studio | posterboy";
  }, []);

  useEffect(() => {
    const mediaUrl = searchParams.get("mediaUrl");
    const type = searchParams.get("mediaType");
    if (!mediaUrl) return;
    setGeneratedUrl(mediaUrl);
    setGenState("done");
    setShowTemplate(true);
    if (type === "video") {
      setMediaKind("video");
      setComposerMode("video");
      setPlatformIdx(PLATFORMS.findIndex((p) => p.id === "tiktok") >= 0 ? PLATFORMS.findIndex((p) => p.id === "tiktok") : 0);
    }
  }, [searchParams]);

  // Track the canvas size so the board can be sized in exact pixels — both
  // width and height then animate smoothly between platform aspect ratios.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const measure = () => setCanvasSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Scroll to zoom the generated image (non-passive so it can preventDefault).
  useEffect(() => {
    const el = frameWrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (genState !== "done" || showTemplate) return;
      e.preventDefault();
      setEdit((s) => ({
        ...s,
        scale: Math.max(0.5, Math.min(3, Number((s.scale - e.deltaY * 0.0015).toFixed(3)))),
      }));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [genState, showTemplate]);

  // Close the post-type / tools popover on outside click (lives in the
  // right rail and the prompt bar respectively).
  useEffect(() => {
    if (!activeTool) return;
    const onDocClick = (e: MouseEvent) => {
      const n = e.target as Node;
      if (editRailRef.current?.contains(n) || promptToolsRef.current?.contains(n)) return;
      setActiveTool(null);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [activeTool]);

  // Close the edit-rail popover on outside click.
  useEffect(() => {
    if (!activeEdit) return;
    const onDocClick = (e: MouseEvent) => {
      if (!editRailRef.current?.contains(e.target as Node)) setActiveEdit(null);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [activeEdit]);

  // Illuminated glass-frame entrance: a luminous border traces around the
  // existing image, a diagonal sheen sweeps, then the post chrome reveals.
  useGSAP(
    () => {
      const card = frameWrapRef.current;
      if (!card || !showTemplate || genState !== "done") return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const border = card.querySelector<HTMLElement>(".glass-border");
      const sheen = card.querySelector<HTMLElement>(".glass-sheen");
      const chrome = card.querySelectorAll(".pc-reveal");
      const tl = gsap.timeline();
      tl.from(card, { autoAlpha: 0, duration: 0.45, ease: "power2.out" }, 0);

      if (border) {
        // The illuminated white border glows + orbits continuously via CSS
        // (pbsBorderSpin); the entrance just fades it in around the image.
        tl.from(border, { autoAlpha: 0, duration: 0.6, ease: "power2.out" }, 0.05);
      }

      if (sheen) {
        tl.fromTo(
          sheen,
          { xPercent: -135, autoAlpha: 0 },
          { xPercent: 135, autoAlpha: 0.55, duration: 1.05, ease: "power1.inOut" },
          0.12,
        ).to(sheen, { autoAlpha: 0.12, duration: 0.35, ease: "power1.out" }, ">-0.05");
      }

      tl.from(
        chrome,
        { autoAlpha: 0, y: 12, duration: 0.5, stagger: 0.1, ease: "power2.out" },
        0.3,
      );
    },
    { dependencies: [showTemplate, genState], scope: frameWrapRef },
  );

  // Selected platform + the frame size that fits a square stage while
  // preserving the post's aspect ratio (both dims as % so they transition).
  const platform = PLATFORMS[platformIdx];
  const frameRatio = platform.w / platform.h;
  // Size the board to the post's aspect ratio in exact pixels (computed from
  // the measured canvas) so both width and height transition smoothly between
  // platforms; landscape stays wide, portrait stays tall, centered above the
  // prompt. Falls back to aspect-ratio sizing before the first measurement.
  const frameWrapStyle: CSSProperties = (() => {
    const { w: cw, h: ch } = canvasSize;
    if (!cw || !ch) {
      return frameRatio >= 1
        ? { width: "min(58%, 600px)", height: "auto", aspectRatio: `${platform.w} / ${platform.h}`, maxHeight: "58%" }
        : { height: "min(58%, 560px)", width: "auto", aspectRatio: `${platform.w} / ${platform.h}`, maxWidth: "56%" };
    }
    const fitW = Math.min(cw * 0.58, 600);
    const fitH = Math.min(ch * 0.58, 560);
    let w = fitW;
    let h = fitW / frameRatio;
    if (h > fitH) {
      h = fitH;
      w = fitH * frameRatio;
    }
    return { width: `${Math.round(w)}px`, height: `${Math.round(h)}px` };
  })();

  // Generation choreography — staged status text + warm color emergence.
  const statusText =
    genState !== "generating"
      ? ""
      : progress < 8
        ? "Thinking…"
        : progress < 28
          ? "Analyzing the request…"
          : progress < 99
            ? "Generating…"
            : "Finishing…";
  const emergeOpacity =
    genState === "generating"
      ? Math.max(0, Math.min(0.85, ((progress - 58) / 38) * 0.85))
      : 0;

  // Direct manipulation — drag to pan, wheel to zoom the generated image.
  const canEditImage = genState === "done" && !showTemplate;
  const clampPan = (v: number) => Math.max(-50, Math.min(50, v));
  const onImagePointerDown = (e: React.PointerEvent) => {
    if (!canEditImage) return;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Pointer capture can fail in some environments; dragging still works.
    }
    dragRef.current = { px: e.clientX, py: e.clientY, ex: edit.x, ey: edit.y };
  };
  const onImagePointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    const box = frameWrapRef.current?.getBoundingClientRect();
    if (!d || !box) return;
    const nx = d.ex + ((e.clientX - d.px) / box.width) * 100;
    const ny = d.ey + ((e.clientY - d.py) / box.height) * 100;
    setEdit((s) => ({ ...s, x: clampPan(nx), y: clampPan(ny) }));
  };
  const onImagePointerUp = () => {
    dragRef.current = null;
  };

  // Crop to the post's aspect ratio — center-crop the generated image to the
  // current platform frame (e.g. square source -> 4:5 portrait) on a canvas.
  // Canvas drawImage of a data-URL source is reliable (no DOM rasterization,
  // no CORS taint) — html-to-image does NOT reliably capture a CSS background-image.
  function handleCropToFrame() {
    if (genState !== "done" || !generatedUrl) return;
    const img = new window.Image();
    img.onload = () => {
      const targetAR = platform.w / platform.h;
      const srcAR = img.width / img.height;
      let sw = img.width;
      let sh = img.height;
      if (srcAR > targetAR) sw = sh * targetAR; // too wide -> trim sides
      else sh = sw / targetAR; // too tall -> trim top/bottom
      const sx = (img.width - sw) / 2;
      const sy = (img.height - sh) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(sw);
      canvas.height = Math.round(sh);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      editHistory.current = [];
      setCanUndoEdit(false);
      setEdit(EDIT_DEFAULT);
      lastCommittedEdit.current = EDIT_DEFAULT;
      setActiveEdit(null);
      setGeneratedUrl(canvas.toDataURL("image/png"));
    };
    img.onerror = () => setError("Couldn't crop the image. Try again.");
    img.src = generatedUrl;
  }

  // Download the generated image. The source is a base64 data URL, so a direct
  // anchor download is reliable (and reflects any prior crop).
  function handleDownloadImage() {
    if (genState !== "done" || !generatedUrl) return;
    const a = document.createElement("a");
    a.download = `posterboy-${Date.now()}.png`;
    a.href = generatedUrl;
    a.click();
  }

  // Image edit transforms — applied to the preview, carry into the post mockup.
  const previewStyle = {
    ...(genState === "done" && generatedUrl ? { backgroundImage: `url('${generatedUrl}')` } : {}),
    transform: `translate(${edit.x}%, ${edit.y}%) scale(${edit.scale}) rotate(${edit.rotate}deg)`,
    filter: `brightness(${edit.brightness}%) contrast(${edit.contrast}%) saturate(${edit.saturate}%)`,
  };

  // Clear the progress timer if the component unmounts mid-generation.
  useEffect(() => () => {
    if (genTimer.current) clearInterval(genTimer.current);
  }, []);

  const generate = async () => {
    if (!prompt.trim() || genState === "generating") {
      inputRef.current?.focus();
      return;
    }
    setGenState("generating");
    setError("");
    setProgress(0);
    setShowTemplate(false);
    setCaptionState("idle");
    setCaptionText("");
    setCaptionTags("");
    setEdit(EDIT_DEFAULT);
    setActiveEdit(null);

    // Simulated diffusion progress: climbs quickly, eases as it nears the
    // cap, then snaps to 100% when the real image arrives.
    if (genTimer.current) clearInterval(genTimer.current);
    genTimer.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 92) return p;
        const inc =
          p < 30 ? 4 + Math.random() * 5 : p < 70 ? 1.6 + Math.random() * 2.6 : 0.5 + Math.random() * 1.2;
        return Math.min(92, p + inc);
      });
    }, 240);
    const stopTimer = () => {
      if (genTimer.current) {
        clearInterval(genTimer.current);
        genTimer.current = null;
      }
    };
    // Keep the "thinking → analyzing" choreography perceptible even when the
    // request resolves (or fails) instantly.
    const startedAt = Date.now();
    const holdFloor = async () => {
      const elapsed = Date.now() - startedAt;
      if (elapsed < 1600) await new Promise((r) => setTimeout(r, 1600 - elapsed));
    };

    const savedPrompt = prompt.trim();
    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 60_000);
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: savedPrompt,
          aspectRatio: platform.genAspect,
        }),
        signal: ctrl.signal,
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        await holdFloor();
        stopTimer();
        setProgress(0);
        const msg = data.error || "Generation failed";
        setError(
          msg.includes("not configured")
            ? "Image generation is not available yet. API key needs to be configured."
            : msg,
        );
        setGenState("idle");
        return;
      }
      await holdFloor();
      stopTimer();
      setProgress(100);
      setGeneratedUrl(data.image);
      setGenState("done");
    } catch (err) {
      await holdFloor();
      stopTimer();
      setProgress(0);
      setError(
        err instanceof DOMException && err.name === "AbortError"
          ? "Generation timed out. Please try again."
          : "Network error. Please try again.",
      );
      setGenState("idle");
    } finally {
      clearTimeout(timeoutId);
    }
  };

  // Non-technical composer: one plain-language intent ("make an instagram post
  // about our weekend sale") → /api/studio/compose (infers platform, writes a
  // real image prompt + brand-voice caption) → generates the image → shows the
  // finished post preview. Falls back to a raw image generation if the intent
  // router is unavailable.
  const composeFromIntent = async () => {
    const intent = composerBrief;
    if (!intent || genState === "generating") {
      inputRef.current?.focus();
      return;
    }
    setGenState("generating");
    setError("");
    setProgress(0);
    setShowTemplate(false);
    setCaptionState("loading");
    setCaptionText("");
    setCaptionTags("");
    setEdit(EDIT_DEFAULT);
    setActiveEdit(null);

    if (genTimer.current) clearInterval(genTimer.current);
    genTimer.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 92) return p;
        const inc =
          p < 30 ? 4 + Math.random() * 5 : p < 70 ? 1.6 + Math.random() * 2.6 : 0.5 + Math.random() * 1.2;
        return Math.min(92, p + inc);
      });
    }, 240);
    const stopTimer = () => {
      if (genTimer.current) {
        clearInterval(genTimer.current);
        genTimer.current = null;
      }
    };

    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 60_000);
    try {
      // 1) intent → structured brief
      const cRes = await fetch("/api/studio/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent }),
        signal: ctrl.signal,
      });
      const brief = await cRes.json();
      if (!cRes.ok || brief.error) {
        // Graceful fallback: treat the text as a raw image prompt.
        stopTimer();
        setCaptionState("idle");
        clearTimeout(timeoutId);
        await generate();
        return;
      }

      // 2) switch to the inferred platform
      const idx = PLATFORMS.findIndex((p) => p.id === brief.platform);
      const pIdx = idx >= 0 ? idx : 0;
      setPlatformIdx(pIdx);
      const aspect = PLATFORMS[pIdx].genAspect;

      // 3) generate the image from the translated prompt
      const iRes = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: brief.imagePrompt, aspectRatio: aspect }),
        signal: ctrl.signal,
      });
      const iData = await iRes.json();
      if (!iRes.ok || iData.error) {
        stopTimer();
        setProgress(0);
        setCaptionState("idle");
        const msg = iData.error || "Generation failed";
        setError(
          msg.includes("not configured")
            ? "Image generation is not available yet. API key needs to be configured."
            : msg,
        );
        setGenState("idle");
        return;
      }

      // 4) assemble the finished post preview
      stopTimer();
      setProgress(100);
      setGeneratedUrl(iData.image);
      setCaptionText(brief.caption || "");
      setCaptionTags(
        Array.isArray(brief.hashtags) && brief.hashtags.length
          ? brief.hashtags.map((h: string) => `#${h}`).join(" ")
          : "",
      );
      setCaptionState("done");
      setGenState("done");
      setShowTemplate(true);
    } catch (err) {
      stopTimer();
      setProgress(0);
      setCaptionState("idle");
      setError(
        err instanceof DOMException && err.name === "AbortError"
          ? "Timed out. Please try again."
          : "Network error. Please try again.",
      );
      setGenState("idle");
    } finally {
      clearTimeout(timeoutId);
    }
  };

  // Parse the /api/ai response into a caption body + a hashtag string.
  const parseCaption = (raw: string): { body: string; tags: string } => {
    const text = (raw || "").trim();
    const fenced = text.match(/---\s*([\s\S]*?)\s*---/);
    let body = (fenced ? fenced[1] : text).trim();
    const hashLine = text.match(/\*\*Hashtags:\*\*\s*([^\n]*)/i);
    let tags = hashLine ? hashLine[1].trim() : "";
    body = body.replace(/\*\*Hashtags:\*\*[\s\S]*$/i, "").replace(/^---|---$/g, "").trim();
    if (!tags) {
      const inline = body.match(/(#\S+(?:\s+#\S+)*)\s*$/);
      if (inline) {
        tags = inline[1].trim();
        body = body.slice(0, inline.index).trim();
      }
    }
    return { body, tags };
  };

  const generateCaption = async () => {
    setCaptionState("loading");
    setCaptionText("");
    setCaptionTags("");
    setCaptionError("");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Write a short, engaging ${platform.label} caption (1–2 sentences) for a post featuring this image: "${prompt.trim() || "a brand image"}". Then add 4–6 relevant hashtags.`,
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error || !data.message) {
        setCaptionState("error");
        setCaptionError(data.error || "Could not generate a caption. Try Generate options instead.");
        return;
      }
      const { body, tags } = parseCaption(data.message);
      setCaptionText(body);
      setCaptionTags(tags);
      setCaptionState("done");
    } catch {
      setCaptionState("error");
      setCaptionError("Caption assist failed. Try again or use Generate options.");
    }
  };

  const confirmToTemplate = () => {
    if (genState !== "done" || !generatedUrl) return;
    setShowTemplate(true);
    if (!captionText.trim()) void generateCaption();
  };

  const handleVideoReady = (url: string) => {
    setGeneratedUrl(url);
    setMediaKind("video");
    setGenState("done");
    setShowTemplate(true);
    setCaptionState("idle");
  };

  const publish = async () => {
    if (genState !== "done" || !generatedUrl) {
      inputRef.current?.focus();
      return;
    }
    if (!locationId) {
      setError("Choose a location before publishing.");
      return;
    }

    const fullCaption = buildPostCaption(captionText, captionTags, prompt);
    const platforms = studioPlatforms(platform.id);
    const isVideo = mediaKind === "video";

    if (when === "schedule") {
      if (!scheduleDate || !scheduleTime) {
        setError("Pick a date and time for scheduling.");
        return;
      }
      const scheduledFor = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();
      if (Number.isNaN(Date.parse(scheduledFor))) {
        setError("Invalid schedule date or time.");
        return;
      }
      setPublishing(true);
      setError("");
      try {
        await createDashboardPost({
          locationId,
          copy: fullCaption,
          platforms,
          status: "scheduled",
          scheduledFor,
          mediaUrl: generatedUrl,
          mediaUrls: [generatedUrl],
          mediaType: isVideo ? "video" : "image",
        });
        setPublishState("published");
        setTimeout(() => setPublishState("idle"), 2200);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not schedule post.");
      } finally {
        setPublishing(false);
      }
      return;
    }

    const metaTarget =
      platform.id === "facebook"
        ? "facebook"
        : platform.id === "instagram" || platform.id === "tiktok"
          ? "instagram"
          : null;

    setPublishing(true);
    setError("");
    try {
      if (metaTarget) {
        const { buildMetaPublishPayload } = await import("@/lib/meta-publish-payload");
        const payload = await buildMetaPublishPayload({
          platform: metaTarget,
          caption: fullCaption,
          ...(isVideo
            ? { videoUrl: generatedUrl, mediaType: "video" as const }
            : { imageUrl: generatedUrl, mediaType: "image" as const }),
        });
        const res = await fetch("/api/meta/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Publish failed. Connect Meta in Settings.");
          return;
        }
      } else {
        setError(`Direct publishing to ${platform.label} isn't available yet — it posts to Instagram or Facebook.`);
        return;
      }

      await createDashboardPost({
        locationId,
        copy: fullCaption,
        platforms,
        status: "published",
        scheduledFor: new Date().toISOString(),
        mediaUrl: generatedUrl,
        mediaUrls: [generatedUrl],
        mediaType: isVideo ? "video" : "image",
      });
      setPublishState("published");
      setTimeout(() => setPublishState("idle"), 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish right now.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="pb-studio h-full overflow-hidden">
      <StudioStyles />
      <div className="app">

        {/* SIDEBAR — shared across the whole dashboard */}
        <div style={{ gridArea: "sidebar", minWidth: 0 }}>
          <AppSidebar />
        </div>

        {/* CANVAS */}
        <main className="canvas" ref={canvasRef}>
          <div className="canvas-wall-lines" />
          <div className="canvas-floor" />
          <ProactiveNudgeBanner />

          <div className="canvas-top">
            {genState === "done" ? (
              <button
                type="button"
                className="preview-toggle"
                onClick={() => setShowTemplate((v) => !v)}
                aria-pressed={showTemplate}
                title={showTemplate ? "Back to edit" : "Preview as post"}
              >
                {showTemplate ? <Pencil size={15} /> : <Eye size={15} />}
                <span>{showTemplate ? "Edit" : "Preview"}</span>
              </button>
            ) : (
              <div />
            )}
            <div className="top-toggles">
              <button className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")}><Sun size={16} /></button>
              <button className={theme === "grid" ? "active" : ""} onClick={() => setTheme("grid")}><LayoutGrid size={16} /></button>
            </div>
          </div>

          {/* Minimal control rail — left of the image */}
          <div className="tool-rail" ref={toolRailRef}>
            {PLATFORMS.map((p, i) => (
              <div className="rail-item" key={p.id}>
                <button
                  type="button"
                  className={`rail-ico${platformIdx === i ? " active" : ""}`}
                  onClick={() => setPlatformIdx(i)}
                  aria-pressed={platformIdx === i}
                  title={p.label}
                >
                  <PlatformIcon type={p.id} />
                </button>
                {platformIdx === i && (
                  <span className="rail-ico-label">{p.label}</span>
                )}
              </div>
            ))}

            <span className="rail-div" />

            <button
              type="button"
              className={`rail-ico rail-publish${publishState === "published" ? " published" : ""}`}
              onClick={() => void publish()}
              disabled={genState !== "done" || !generatedUrl || publishing}
              title={
                publishState === "published"
                  ? when === "schedule"
                    ? "Scheduled"
                    : "Published"
                  : when === "schedule"
                    ? "Schedule"
                    : "Publish"
              }
            >
              {publishState === "published" ? <Check size={19} strokeWidth={2.5} /> : <Send size={19} />}
            </button>
          </div>

          {/* Intent rail — mirrors the tool-rail on the opposite (right) edge */}
          {genState === "idle" && composerMode === "image" && !freeFormMode ? (
            <StrategicIntentPicker
              selectedId={selectedIntentId}
              onSelect={(id) => {
                setSelectedIntentId(id);
                setIntentDetail("");
              }}
              onFreeForm={() => {
                setFreeFormMode(true);
                setSelectedIntentId(null);
                setIntentDetail("");
              }}
            />
          ) : null}

          <div
            ref={frameWrapRef}
            className={`frame-wrap${showTemplate ? ` as-post pc-platform-${platform.id}` : ""}`}
            style={showTemplate ? undefined : frameWrapStyle}
          >
            {showTemplate ? (
              <>
                <div className="glass-border" aria-hidden="true" />
                <div className="glass-sheen" aria-hidden="true" />
                {mediaKind === "video" ? (
                  <div className="studio-video-preview">
                    <video src={generatedUrl ?? undefined} controls playsInline className="studio-video-el" />
                    <div className="studio-video-cap">
                      {captionState === "loading" ? (
                        <span className="pc-skel"><span /><span /></span>
                      ) : (
                        <>
                          {captionText}
                          {captionTags ? <span className="pc-tags"> {captionTags}</span> : null}
                        </>
                      )}
                      {captionError ? <p className="studio-caption-error">{captionError}</p> : null}
                    </div>
                  </div>
                ) : platform.id === "instagram" ? (
                  <InstagramPreview
                    handle={previewHandle}
                    caption={captionState === "error" ? "" : captionText}
                    tags={captionTags}
                    mediaStyle={previewStyle}
                    aspectRatio={`${platform.w} / ${platform.h}`}
                    captionLoading={captionState === "loading"}
                  />
                ) : platform.id === "facebook" ? (
                  <FacebookPreview
                    pageName={previewPageName}
                    caption={captionState === "error" ? "" : captionText}
                    tags={captionTags}
                    mediaStyle={previewStyle}
                    aspectRatio={`${platform.w} / ${platform.h}`}
                    captionLoading={captionState === "loading"}
                  />
                ) : (
                  <StudioPostChrome
                    platform={platform.id}
                    mediaStyle={previewStyle}
                    aspect={`${platform.w} / ${platform.h}`}
                    caption={captionState === "error" ? "" : captionText}
                    tags={captionTags}
                    captionLoading={captionState === "loading"}
                    onClose={() => setShowTemplate(false)}
                  />
                )}
                {captionState === "error" && mediaKind !== "video" ? (
                  <p className="studio-caption-error-overlay">{captionError}</p>
                ) : null}
                {showTemplate ? (
                  <div className="studio-caption-tools">
                    <CaptionVariantPicker
                      brief={composerBrief || captionText}
                      platform={platform.id}
                      disabled={genState === "generating"}
                      approvalPipeline={features.approvalPipeline}
                      locationId={locationId}
                      platforms={studioPlatforms(platform.id)}
                      onSelect={(v) => {
                        setCaptionText(v.caption);
                        setCaptionTags(v.hashtags.join(" "));
                        setCaptionState("done");
                        setCaptionError("");
                      }}
                    />
                  </div>
                ) : null}
              </>
            ) : composerMode === "video" && genState === "idle" ? (
              <div className="studio-video-compose">
                <VideoComposer
                  onComplete={handleVideoReady}
                  onError={(msg) => setError(msg)}
                />
              </div>
            ) : (
              <div
                className={`frame${genState === "generating" ? " generating" : ""}${genState === "done" ? " done" : ""}${canEditImage ? " editable" : ""}`}
                style={{ width: "100%", height: "100%", position: "relative" }}
                onPointerDown={onImagePointerDown}
                onPointerMove={onImagePointerMove}
                onPointerUp={onImagePointerUp}
                onPointerCancel={onImagePointerUp}
              >
                <div className="emerge" style={{ opacity: emergeOpacity }} />
                <div className="preview" style={previewStyle} />
                {genState === "done" && mediaKind === "image" ? (
                  <CompositionOverlay
                    width={platform.w}
                    height={platform.h}
                    layers={studioLayers}
                    selectedId={studioSelectedId}
                    onSelect={setStudioSelectedId}
                    onUpdate={updateStudioLayer}
                  />
                ) : null}
                {genState === "generating" && (
                  <div className="gen-progress">{Math.round(progress)}%</div>
                )}
                {genState === "idle" && composerMode === "image" ? (
                  <div className="studio-intent-stage">
                    {freeFormMode ? (
                      <p className="studio-freeform-hint">
                        Free-form brief — describe the post in your own words below.
                        <button
                          type="button"
                          onClick={() => {
                            setFreeFormMode(false);
                            setPrompt("");
                          }}
                        >
                          Back to intents
                        </button>
                      </p>
                    ) : null}
                    <TrashToTreasureUploadZone
                      onUploaded={(url) => {
                        setGeneratedUrl(url);
                        setGenState("done");
                        setMediaKind("image");
                        setShowTemplate(false);
                      }}
                      onElevated={(caption, hashtags) => {
                        setCaptionText(caption);
                        setCaptionTags(hashtags.join(" "));
                        setCaptionState("done");
                        setCaptionError("");
                      }}
                    />
                    {composerBrief ? (
                      <div className="studio-intent-captions">
                        <CaptionVariantPicker
                          brief={composerBrief}
                          platform={platform.id}
                          approvalPipeline={features.approvalPipeline}
                          locationId={locationId}
                          platforms={studioPlatforms(platform.id)}
                          onSelect={(v) => {
                            setCaptionText(v.caption);
                            setCaptionTags(v.hashtags.join(" "));
                            setCaptionState("done");
                            setCaptionError("");
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Image edit tools — right of the image, mirrors the left rail */}
          {genState === "done" && !showTemplate && (
            <div className="tool-rail edit-rail" ref={editRailRef}>
              <div className="rail-item">
                <button
                  type="button"
                  className={`rail-ico${activeTool === "type" ? " open" : ""}`}
                  onClick={() => { setActiveEdit(null); setActiveTool((t) => (t === "type" ? null : "type")); }}
                  data-tooltrigger
                  title="Post type"
                  aria-label={`Post type: ${postType}`}
                >
                  {postType === "photo" ? <ImageIcon size={19} /> : postType === "update" ? <AlignLeft size={19} /> : <Tag size={19} />}
                </button>
                {activeTool === "type" && (
                  <div className="rail-pop">
                    <button className={postType === "photo" ? "active" : ""} onClick={() => { setPostType("photo"); setActiveTool(null); }}><ImageIcon size={15} /><span>Photo</span></button>
                    <button className={postType === "update" ? "active" : ""} onClick={() => { setPostType("update"); setActiveTool(null); }}><AlignLeft size={15} /><span>Update</span></button>
                    <button className={postType === "offer" ? "active" : ""} onClick={() => { setPostType("offer"); setActiveTool(null); }}><Tag size={15} /><span>Offer</span></button>
                  </div>
                )}
              </div>
              <button type="button" className="rail-ico" title="Crop to frame" aria-label="Crop to frame" onClick={handleCropToFrame}><Crop size={19} /></button>
              <button
                type="button"
                className="rail-ico"
                title="Add text layer"
                aria-label="Add text layer"
                onClick={() => addStudioLayer(createTextLayer({ zIndex: 20 }))}
              >
                <AlignLeft size={19} />
              </button>
              <button type="button" className="rail-ico" title="Download image" aria-label="Download image" onClick={handleDownloadImage}><Download size={19} /></button>
              <button
                type="button"
                className="rail-ico"
                title="Undo"
                aria-label="Undo"
                onClick={() => { if (canUndoStudioLayers) undoStudioLayers(); else undoEdit(); }}
                disabled={!canUndoEdit && !canUndoStudioLayers}
              >
                <Undo2 size={19} />
              </button>

              <div className="rail-item">
                <button type="button" className={`rail-ico${activeEdit === "scale" ? " open" : ""}`} onClick={() => setActiveEdit((t) => (t === "scale" ? null : "scale"))} title="Scale"><Maximize2 size={19} /></button>
                {activeEdit === "scale" && (
                  <div className="rail-pop edit-pop">
                    <div className="edit-row"><span>Zoom</span><span className="edit-val">{Math.round(edit.scale * 100)}%</span></div>
                    <input type="range" min={50} max={300} value={Math.round(edit.scale * 100)} onChange={(e) => setEdit((s) => ({ ...s, scale: Number(e.target.value) / 100 }))} />
                  </div>
                )}
              </div>

              <div className="rail-item">
                <button type="button" className={`rail-ico${activeEdit === "move" ? " open" : ""}`} onClick={() => setActiveEdit((t) => (t === "move" ? null : "move"))} title="Move"><Move size={19} /></button>
                {activeEdit === "move" && (
                  <div className="rail-pop edit-pop">
                    <div className="edit-row"><span>Horizontal</span><span className="edit-val">{edit.x}%</span></div>
                    <input type="range" min={-50} max={50} value={edit.x} onChange={(e) => setEdit((s) => ({ ...s, x: Number(e.target.value) }))} />
                    <div className="edit-row"><span>Vertical</span><span className="edit-val">{edit.y}%</span></div>
                    <input type="range" min={-50} max={50} value={edit.y} onChange={(e) => setEdit((s) => ({ ...s, y: Number(e.target.value) }))} />
                  </div>
                )}
              </div>

              <div className="rail-item">
                <button type="button" className={`rail-ico${activeEdit === "rotate" ? " open" : ""}`} onClick={() => setActiveEdit((t) => (t === "rotate" ? null : "rotate"))} title="Rotate"><RotateCw size={19} /></button>
                {activeEdit === "rotate" && (
                  <div className="rail-pop edit-pop">
                    <div className="edit-row"><span>Rotate</span><span className="edit-val">{edit.rotate}°</span></div>
                    <input type="range" min={-180} max={180} value={edit.rotate} onChange={(e) => setEdit((s) => ({ ...s, rotate: Number(e.target.value) }))} />
                  </div>
                )}
              </div>

              <div className="rail-item">
                <button type="button" className={`rail-ico${activeEdit === "adjust" ? " open" : ""}`} onClick={() => setActiveEdit((t) => (t === "adjust" ? null : "adjust"))} title="Adjust"><SlidersHorizontal size={19} /></button>
                {activeEdit === "adjust" && (
                  <div className="rail-pop edit-pop">
                    <div className="edit-row"><span>Brightness</span><span className="edit-val">{edit.brightness}%</span></div>
                    <input type="range" min={50} max={150} value={edit.brightness} onChange={(e) => setEdit((s) => ({ ...s, brightness: Number(e.target.value) }))} />
                    <div className="edit-row"><span>Contrast</span><span className="edit-val">{edit.contrast}%</span></div>
                    <input type="range" min={50} max={150} value={edit.contrast} onChange={(e) => setEdit((s) => ({ ...s, contrast: Number(e.target.value) }))} />
                    <div className="edit-row"><span>Saturation</span><span className="edit-val">{edit.saturate}%</span></div>
                    <input type="range" min={0} max={200} value={edit.saturate} onChange={(e) => setEdit((s) => ({ ...s, saturate: Number(e.target.value) }))} />
                    <button type="button" className="edit-reset" onClick={() => setEdit(EDIT_DEFAULT)}>Reset all</button>
                  </div>
                )}
              </div>

              <span className="rail-div" />
              <button
                type="button"
                className="rail-ico rail-confirm"
                onClick={confirmToTemplate}
                title="Confirm — preview as post"
                aria-label="Confirm — preview as post"
              >
                <Check size={19} strokeWidth={2.5} />
              </button>
            </div>
          )}

          {error ? (
            <div className="studio-error">
              <p>{error}</p>
              <button type="button" onClick={() => setError("")}>Dismiss</button>
            </div>
          ) : null}

          {genState === "generating" && (
            <div className="gen-status">
              <span className="gen-dots"><i /><i /><i /></span>
              <span>{statusText}</span>
            </div>
          )}

          {when === "schedule" ? (
            <div className="studio-schedule-row">
              <Calendar size={14} />
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                aria-label="Schedule date"
              />
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                aria-label="Schedule time"
              />
            </div>
          ) : null}

          <div className={`prompt-bar${genState === "generating" ? " is-generating" : ""}`}>
            <button
              type="button"
              className="pb-util"
              onClick={() => setWhen((w) => (w === "now" ? "schedule" : "now"))}
              title={when === "now" ? "Post now" : "Scheduled"}
              aria-label={when === "now" ? "Post now" : "Scheduled"}
            >
              {when === "now" ? <Zap size={18} /> : <Calendar size={18} />}
            </button>
            <button
              type="button"
              className={`pb-util${composerMode === "video" ? " active" : ""}`}
              onClick={() => {
                setComposerMode((m) => (m === "image" ? "video" : "image"));
                if (composerMode === "image") {
                  setGenState("idle");
                  setGeneratedUrl(null);
                  setShowTemplate(false);
                }
              }}
              title={composerMode === "image" ? "Switch to video" : "Switch to image"}
              aria-label={composerMode === "image" ? "Video mode" : "Image mode"}
            >
              <ImageIcon size={18} />
            </button>
            {freeFormMode ? (
              <input
                ref={inputRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && genState !== "generating" && void composeFromIntent()
                }
                placeholder={placeholderText}
                disabled={genState === "generating"}
              />
            ) : selectedIntent ? (
              <input
                ref={inputRef}
                value={intentDetail}
                onChange={(e) => setIntentDetail(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && genState !== "generating" && void composeFromIntent()
                }
                placeholder={selectedIntent.detailPlaceholder}
                disabled={genState === "generating"}
                aria-label={`Details for ${selectedIntent.label}`}
              />
            ) : (
              <span className="prompt-intent-hint">
                Pick an intent above, or{" "}
                <button
                  type="button"
                  onClick={() => setFreeFormMode(true)}
                  disabled={genState === "generating"}
                >
                  write your own
                </button>
              </span>
            )}
            <div className="pb-tool" ref={promptToolsRef}>
              {activeTool === "tools" && (
                <div className="pb-tools-pop">
                  <button type="button" onClick={() => { setActiveTool("captions"); setActiveEdit(null); }}>
                    <span>Caption options</span>
                  </button>
                  <button type="button" onClick={() => void generateCaption()}>
                    <span>Caption assist</span>
                  </button>
                  <button type="button"><span>Brand kit</span></button>
                </div>
              )}
              {activeTool === "captions" && (
                <div className="pb-tools-pop pb-tools-pop-wide">
                  <CaptionVariantPicker
                    brief={composerBrief || captionText}
                    platform={platform.id}
                    approvalPipeline={features.approvalPipeline}
                    locationId={locationId}
                    platforms={studioPlatforms(platform.id)}
                    onSelect={(v) => {
                      setCaptionText(v.caption);
                      setCaptionTags(v.hashtags.join(" "));
                      setCaptionState("done");
                      setCaptionError("");
                      setActiveTool(null);
                    }}
                  />
                </div>
              )}
              <button
                type="button"
                className={`pb-util${activeTool === "tools" ? " active" : ""}`}
                onClick={() => { setActiveEdit(null); setActiveTool((t) => (t === "tools" ? null : "tools")); }}
                data-tooltrigger
                title="Tools"
              >
                <Sparkles size={18} />
              </button>
            </div>
            <button
              type="button"
              className="magic-wand"
              onClick={() => void composeFromIntent()}
              disabled={
                genState === "generating" ||
                composerMode === "video" ||
                (!freeFormMode && !selectedIntentId && !composerBrief)
              }
              aria-label="Make a post"
            >
              <Wand2 size={20} />
            </button>
          </div>
        </main>

      </div>
    </div>
  );
}

function PlatformIcon({ type }: { type: string }) {
  if (type === "instagram") {
    return (
      <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (type === "facebook") {
    return (
      <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
        <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === "x") {
    return (
      <svg className="icon" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.65l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
      </svg>
    );
  }
  if (type === "linkedin") {
    return (
      <svg className="icon" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden>
        <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z" />
      </svg>
    );
  }
  // tiktok
  return (
    <svg className="icon" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden>
      <path d="M16.6 5.82a4.28 4.28 0 0 1-1.06-2.82h-3.2v12.93a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 0 1 0-5.18c.27 0 .52.04.77.12V9.91a5.85 5.85 0 0 0-.77-.05 5.8 5.8 0 1 0 5.8 5.8V9.01a7.5 7.5 0 0 0 4.38 1.4V7.2a4.28 4.28 0 0 1-3.33-1.38Z" />
    </svg>
  );
}

function StudioStyles() {
  return (
    <style>{`
.pb-studio {
    --bg: #ececee;
    --card: #ffffff;
    --ink: #0d0d10;
    --ink-2: #2a2a2e;
    --muted: #6b6b73;
    --muted-2: #9a9aa3;
    --line: #ececef;
    --line-2: #e3e3e7;
    --red: #ee2532;
    --red-soft: #fff1f2;
    --green: #1aa260;
    --shadow-sm: 0 1px 2px rgba(15, 15, 20, 0.04), 0 1px 1px rgba(15, 15, 20, 0.02);
    --shadow-md: 0 4px 18px rgba(15, 15, 20, 0.06), 0 1px 2px rgba(15, 15, 20, 0.04);
    --radius: 20px;
    --radius-sm: 12px;
    --serif: "Fraunces", "Times New Roman", serif;
    --sans: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
  }.pb-studio * { box-sizing: border-box; margin: 0; padding: 0; }.pb-studio {
    font-family: var(--sans);
    background: var(--bg);
    color: var(--ink);
    font-size: 14px;
    line-height: 1.4;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow-x: hidden;
    height: 100%;
  }.pb-studio button { font-family: inherit; cursor: pointer; border: none; background: none; color: inherit; }.pb-studio button:disabled { cursor: not-allowed; opacity: 0.45; }.pb-studio input { font-family: inherit; }.pb-studio input:disabled { opacity: 0.6; }.pb-studio a.btn-outline { text-decoration: none; color: inherit; }.pb-studio .app {
    display: grid;
    grid-template-columns: 260px minmax(0, 1fr);
    grid-template-areas: "sidebar canvas";
    gap: 18px;
    padding: 18px;
    min-height: 100%;
    height: 100%;
    max-width: 1700px;
    margin: 0 auto;
    align-items: stretch;
  }.pb-studio .studio-error {
    position: absolute;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 30;
    width: min(420px, 90%);
    padding: 12px 16px;
    border-radius: 12px;
    border: 1px solid rgba(238, 37, 50, 0.25);
    background: rgba(255, 255, 255, 0.92);
    color: #b91c1c;
    font-size: 13px;
    text-align: center;
    box-shadow: 0 8px 24px rgba(15, 15, 20, 0.12);
  }.pb-studio .studio-error button {
    margin-top: 8px;
    font-size: 12px;
    font-weight: 500;
    color: #ee2532;
  }.pb-studio .sidebar { grid-area: sidebar; min-width: 0; }.pb-studio .canvas { grid-area: canvas;  min-width: 0; }.pb-studio .right-rail { grid-area: rail;    min-width: 0; }.pb-studio /* ============ SIDEBAR ============ */
  .sidebar {
    background: var(--card);
    border-radius: var(--radius);
    padding: 24px 20px;
    display: flex;
    flex-direction: column;
    box-shadow: var(--shadow-sm);
  }.pb-studio .logo {
    font-weight: 800;
    font-size: 20px;
    letter-spacing: -0.02em;
    margin-bottom: 24px;
    text-decoration: none;
    color: var(--ink);
    display: inline-block;
    width: fit-content;
    cursor: pointer;
    transition: opacity 0.15s ease;
  }
  .pb-studio .logo:hover { opacity: 0.7; }.pb-studio .logo .red { color: var(--red); }.pb-studio .studio-title {
    font-family: var(--serif);
    font-size: 36px;
    font-weight: 500;
    letter-spacing: -0.02em;
    margin-bottom: 28px;
    line-height: 1;
  }.pb-studio .nav { display: flex; flex-direction: column; gap: 2px; margin-bottom: 24px;   }.pb-studio .nav a {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 14px;
    border-radius: 10px;
    color: var(--ink-2);
    font-size: 14px;
    font-weight: 500;
    text-decoration: none;
    transition: background 0.15s ease;
  }.pb-studio .nav a:hover { background: #f6f6f8; }.pb-studio .nav a.active {
    background: #f4f4f6;
    color: var(--ink);
    font-weight: 600;
  }.pb-studio .nav a.active svg { color: var(--red); }.pb-studio .nav a svg { width: 18px; height: 18px; color: var(--ink-2); }.pb-studio .voice-card {
    margin-top: auto;
    background: #fafafb;
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 16px;
    margin-bottom: 12px;
  }.pb-studio .voice-card .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin-bottom: 6px; font-weight: 500; }.pb-studio .voice-card .voice-select {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    margin-bottom: 12px;
  }.pb-studio .voice-card .voice-select svg { width: 14px; height: 14px; color: var(--muted); }.pb-studio .voice-card .desc {
    font-family: var(--serif);
    font-size: 15px;
    font-weight: 400;
    line-height: 1.4;
    color: var(--ink-2);
    margin-bottom: 14px;
  }.pb-studio .voice-card .manage {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 12px;
    border-top: 1px solid var(--line);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
  }.pb-studio .voice-card .manage svg { width: 14px; height: 14px; color: var(--muted); }.pb-studio .workspace {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 6px;
    cursor: pointer;
    border-radius: 10px;
  }.pb-studio .workspace .ws-avatar {
    width: 36px; height: 36px;
    background: #1a1a1c;
    color: white;
    border-radius: 10px;
    display: grid;
    place-items: center;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.02em;
  }.pb-studio .workspace .ws-name { font-size: 13.5px; font-weight: 600; line-height: 1.2; }.pb-studio .workspace .ws-plan { font-size: 12px; color: var(--muted); margin-top: 2px; }.pb-studio .workspace .ws-chev { margin-left: auto; color: var(--muted-2); }.pb-studio /* ============ CANVAS ============ */
  .canvas {
    position: relative;
    border-radius: var(--radius);
    overflow: hidden;
    min-height: 760px;
    /* Concrete studio gradient — warm cool gray fall */
    background:
      radial-gradient(ellipse 65% 45% at 50% 48%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.08) 30%, transparent 65%),
      linear-gradient(180deg,
        #c4bdb6 0%,
        #b3aca5 20%,
        #a09993 45%,
        #8d8780 65%,
        #79736d 85%,
        #6a655f 100%
      );
    box-shadow: var(--shadow-md);
  }.pb-studio /* Side wall shadows for depth */
  .canvas::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      linear-gradient(90deg, rgba(0,0,0,0.14) 0%, rgba(0,0,0,0) 18%),
      linear-gradient(270deg, rgba(0,0,0,0.14) 0%, rgba(0,0,0,0) 18%);
    pointer-events: none;
    z-index: 1;
  }.pb-studio /* Concrete noise texture */
  .canvas::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
    opacity: 0.18;
    mix-blend-mode: multiply;
    pointer-events: none;
    z-index: 2;
  }.pb-studio /* Tile-like horizontal lines on the wall */
  .canvas-wall-lines {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(to bottom, transparent 32%, rgba(0,0,0,0.05) 32.5%, transparent 33%),
      linear-gradient(to right, transparent 33%, rgba(0,0,0,0.04) 33.3%, transparent 33.6%, transparent 66%, rgba(0,0,0,0.04) 66.3%, transparent 66.6%);
    pointer-events: none;
    z-index: 2;
    opacity: 0.6;
  }.pb-studio /* Floor with subtle reflection */
  .canvas-floor {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 28%;
    background:
      linear-gradient(180deg,
        transparent 0%,
        rgba(50,45,40,0.08) 30%,
        rgba(50,45,40,0.22) 80%,
        rgba(40,35,30,0.32) 100%
      );
    pointer-events: none;
    z-index: 3;
  }.pb-studio /* Floor tile seams */
  .canvas-floor::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(to right, transparent 49.5%, rgba(0,0,0,0.06) 50%, transparent 50.5%);
    transform: perspective(800px) rotateX(60deg);
    transform-origin: center bottom;
    opacity: 0.7;
  }.pb-studio /* Canvas top toolbar */
  .canvas-top {
    position: absolute;
    top: 20px;
    left: 20px;
    right: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    z-index: 20;
  }.pb-studio .dim-chip {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    background: rgba(255,255,255,0.85);
    backdrop-filter: blur(12px) saturate(160%);
    -webkit-backdrop-filter: blur(12px) saturate(160%);
    border: 1px solid rgba(255,255,255,0.4);
    border-radius: 12px;
    padding: 10px 14px;
    font-size: 13.5px;
    font-weight: 500;
    color: var(--ink);
    cursor: pointer;
    box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  }.pb-studio .dim-chip svg { width: 15px; height: 15px; color: var(--ink-2); }.pb-studio .dim-chip--static { cursor: default; }.pb-studio .dim-chip .post-label { font-weight: 600; }.pb-studio .dim-chip .post-meta { color: var(--muted); font-weight: 500; font-variant-numeric: tabular-nums; }.pb-studio .dim-chip .chev { color: var(--muted); transition: transform 0.2s ease; }.pb-studio .dim-chip.open .chev { transform: rotate(180deg); }.pb-studio .post-select { position: relative; }.pb-studio .post-menu {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    min-width: 220px;
    list-style: none;
    margin: 0;
    padding: 6px;
    background: rgba(255,255,255,0.92);
    backdrop-filter: blur(16px) saturate(160%);
    -webkit-backdrop-filter: blur(16px) saturate(160%);
    border: 1px solid rgba(255,255,255,0.5);
    border-radius: 14px;
    box-shadow: 0 10px 34px rgba(0,0,0,0.18);
    z-index: 30;
    animation: pbsMenuIn 0.16s ease;
  }@keyframes pbsMenuIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }.pb-studio .post-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    width: 100%;
    padding: 9px 12px;
    border-radius: 9px;
    font-size: 13.5px;
    color: var(--ink);
    transition: background 0.14s ease;
  }.pb-studio .post-option:hover { background: rgba(0,0,0,0.05); }.pb-studio .post-option.active { background: rgba(0,0,0,0.06); font-weight: 600; }.pb-studio .post-option .po-dim { color: var(--muted); font-size: 12px; font-variant-numeric: tabular-nums; }.pb-studio .top-toggles {
    display: flex;
    background: rgba(255,255,255,0.85);
    backdrop-filter: blur(12px) saturate(160%);
    -webkit-backdrop-filter: blur(12px) saturate(160%);
    border: 1px solid rgba(255,255,255,0.4);
    border-radius: 12px;
    padding: 4px;
    gap: 2px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  }.pb-studio .top-toggles button {
    width: 36px; height: 30px;
    display: grid;
    place-items: center;
    border-radius: 8px;
    color: var(--ink-2);
    transition: background 0.15s ease;
  }.pb-studio .top-toggles button.active { background: white; box-shadow: 0 1px 2px rgba(0,0,0,0.06); }.pb-studio .top-toggles button:not(.active):hover { background: rgba(255,255,255,0.5); }.pb-studio .top-toggles button svg { width: 16px; height: 16px; }.pb-studio .preview-toggle {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 8px 14px; border-radius: 12px;
    background: rgba(255,255,255,0.7);
    backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(0,0,0,0.06);
    box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    font-size: 13px; font-weight: 600; color: var(--ink);
    cursor: pointer; transition: background 0.2s ease, transform 0.2s ease, color 0.2s ease;
  }.pb-studio .preview-toggle:hover { background: #fff; transform: translateY(-1px); }.pb-studio .preview-toggle svg { width: 15px; height: 15px; }.pb-studio .preview-toggle[aria-pressed="true"] { background: var(--red, #ee2532); color: #fff; border-color: transparent; box-shadow: 0 6px 18px -6px rgba(238,37,50,0.55); }.pb-studio /* Minimal control rail — left of the image */
  .tool-rail {
    position: absolute;
    left: 26px;
    top: 50%;
    transform: translateY(-54%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    z-index: 18;
  }.pb-studio .tool-rail .rail-item { position: relative; display: flex; }.pb-studio .tool-rail .rail-ico {
    width: 46px;
    height: 46px;
    display: grid;
    place-items: center;
    border-radius: 13px;
    color: var(--ink-2);
    background: transparent;
    transition: color 0.16s ease, background 0.16s ease, transform 0.16s ease, box-shadow 0.16s ease;
  }.pb-studio .tool-rail .rail-ico:hover { color: var(--ink-2); }.pb-studio .tool-rail .rail-ico:hover svg { filter: drop-shadow(0 0 4px rgba(255,255,255,0.6)); }.pb-studio .tool-rail .rail-ico.active, .pb-studio .tool-rail .rail-ico.open {
    background: transparent;
    color: #fff;
  }.pb-studio .tool-rail .rail-ico.active svg, .pb-studio .tool-rail .rail-ico.open svg {
    filter: drop-shadow(0 0 5px rgba(255,255,255,0.95)) drop-shadow(0 0 11px rgba(255,255,255,0.7)) drop-shadow(0 0 1px rgba(0,0,0,0.35));
  }.pb-studio .tool-rail .rail-ico svg { width: 19px; height: 19px; transition: filter 0.2s ease; }.pb-studio .tool-rail .rail-ico-label {
    position: absolute;
    left: calc(100% + 10px);
    top: 50%;
    transform: translateY(-50%);
    white-space: nowrap;
    font-size: 12.5px;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: #fff;
    text-shadow: 0 0 5px rgba(255,255,255,0.95), 0 0 11px rgba(255,255,255,0.65), 0 0 2px rgba(0,0,0,0.5);
    pointer-events: none;
    z-index: 19;
    animation: pbsLabelIn 0.22s ease;
  }@keyframes pbsLabelIn {
    from { opacity: 0; transform: translateY(-50%) translateX(-5px); }
    to { opacity: 1; transform: translateY(-50%) translateX(0); }
  }.pb-studio .tool-rail .rail-ico:disabled { opacity: 0.35; }.pb-studio .tool-rail .rail-div {
    width: 20px;
    height: 1px;
    background: rgba(15,15,20,0.12);
    margin: 7px 0;
  }.pb-studio .tool-rail .rail-publish:not(:disabled) {
    color: #fff;
    background: var(--ink);
  }.pb-studio .tool-rail .rail-publish:not(:disabled):hover { transform: translateY(-1px); background: #000; }.pb-studio .tool-rail .rail-publish.published:not(:disabled) { background: var(--green); }.pb-studio .edit-rail { left: auto; right: 26px; }.pb-studio .tool-rail .rail-confirm:not(:disabled) { color: #fff; background: var(--green); }.pb-studio .tool-rail .rail-confirm:not(:disabled):hover { transform: translateY(-1px); background: #15924f; }.pb-studio .tool-rail.edit-rail .rail-pop { left: auto; right: calc(100% + 12px); }.pb-studio .edit-pop { padding: 12px; min-width: 190px; }.pb-studio .edit-pop .edit-row { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--ink); font-weight: 500; padding: 0 2px; }.pb-studio .edit-pop .edit-row:not(:first-child) { margin-top: 9px; }.pb-studio .edit-pop .edit-val { color: var(--muted); font-variant-numeric: tabular-nums; }.pb-studio .edit-pop input[type="range"] { width: 100%; height: 4px; -webkit-appearance: none; appearance: none; background: var(--line-2); border-radius: 4px; margin: 5px 0 2px; cursor: pointer; }.pb-studio .edit-pop input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 15px; height: 15px; border-radius: 50%; background: var(--ink); cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.25); }.pb-studio .edit-pop input[type="range"]::-moz-range-thumb { width: 15px; height: 15px; border: none; border-radius: 50%; background: var(--ink); cursor: pointer; }.pb-studio .edit-pop .edit-reset { display: block; margin-top: 12px; width: 100%; padding: 8px; border-radius: 8px; font-size: 12px; font-weight: 600; text-align: center; color: var(--muted); background: rgba(0,0,0,0.05); }.pb-studio .edit-pop .edit-reset:hover { background: rgba(0,0,0,0.09); color: var(--ink); }.pb-studio .tool-rail .rail-pop {
    position: absolute;
    left: calc(100% + 12px);
    top: 50%;
    transform: translateY(-50%);
    min-width: 188px;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    background: rgba(255,255,255,0.85);
    backdrop-filter: blur(20px) saturate(160%);
    -webkit-backdrop-filter: blur(20px) saturate(160%);
    border: 1px solid rgba(255,255,255,0.55);
    border-radius: 14px;
    box-shadow: 0 14px 38px rgba(0,0,0,0.18);
    z-index: 20;
    animation: pbsPopIn 0.16s ease;
  }@keyframes pbsPopIn {
    from { opacity: 0; transform: translateY(-50%) translateX(-6px); }
    to { opacity: 1; transform: translateY(-50%) translateX(0); }
  }.pb-studio .tool-rail .rail-pop button {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 9px 12px;
    border-radius: 9px;
    font-size: 13.5px;
    color: var(--ink);
    transition: background 0.14s ease;
  }.pb-studio .tool-rail .rail-pop button svg { width: 15px; height: 15px; color: var(--muted); }.pb-studio .tool-rail .rail-pop button:hover { background: rgba(0,0,0,0.05); }.pb-studio .tool-rail .rail-pop button.active { background: rgba(0,0,0,0.06); font-weight: 600; }.pb-studio .tool-rail .rail-pop button.active svg { color: var(--red); }.pb-studio .tool-rail .rail-pop .pro-tag {
    margin-left: auto;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: var(--muted-2);
    border: 1px solid var(--line-2);
    border-radius: 5px;
    padding: 1px 5px;
  }.pb-studio /* The glowing magic frame */
  .frame-wrap {
    position: absolute;
    top: calc((100% - 132px) / 2);
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10;
    display: grid;
    place-items: center;
    transition: width 0.5s cubic-bezier(0.65, 0, 0.35, 1), height 0.5s cubic-bezier(0.65, 0, 0.35, 1);
  }.pb-studio /* Glow spill behind the frame */
  .frame-wrap::before {
    content: '';
    position: absolute;
    inset: -40%;
    background: radial-gradient(circle at center,
      rgba(255,255,255,0.55) 0%,
      rgba(255,255,255,0.28) 18%,
      rgba(255,255,255,0.12) 35%,
      rgba(255,255,255,0.05) 55%,
      transparent 75%
    );
    filter: blur(6px);
    pointer-events: none;
    animation: pbsGlow 5s ease-in-out infinite;
  }.pb-studio .frame {
    position: relative;
    width: 100%;
    height: 100%;
    transition: width 0.55s cubic-bezier(0.65, 0, 0.35, 1), height 0.55s cubic-bezier(0.65, 0, 0.35, 1);
    background: linear-gradient(180deg, #fbfbfb 0%, #efefef 100%);
    border-radius: 4px;
    border: 1.5px solid rgba(255,255,255,1);
    box-shadow:
      inset 0 0 0 1px rgba(255,255,255,1),
      inset 0 0 40px rgba(255,255,255,0.95),
      0 0 1px 1px rgba(255,255,255,0.85),
      0 0 30px 4px rgba(255,255,255,0.55),
      0 0 60px 12px rgba(255,255,255,0.35),
      0 0 120px 30px rgba(255,255,255,0.18),
      0 18px 50px rgba(0,0,0,0.25);
    overflow: hidden;
    animation: pbsFrame 5s ease-in-out infinite;
  }@keyframes pbsGlow {
    0%, 100% { opacity: 0.85; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.04); }
  }@keyframes pbsFrame {
    0%, 100% {
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,1),
        inset 0 0 40px rgba(255,255,255,0.95),
        0 0 1px 1px rgba(255,255,255,0.85),
        0 0 30px 4px rgba(255,255,255,0.55),
        0 0 60px 12px rgba(255,255,255,0.35),
        0 0 120px 30px rgba(255,255,255,0.18),
        0 18px 50px rgba(0,0,0,0.25);
    }
    50% {
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,1),
        inset 0 0 50px rgba(255,255,255,1),
        0 0 1px 1px rgba(255,255,255,0.95),
        0 0 40px 6px rgba(255,255,255,0.65),
        0 0 80px 18px rgba(255,255,255,0.42),
        0 0 160px 40px rgba(255,255,255,0.22),
        0 18px 50px rgba(0,0,0,0.28);
    }
  }.pb-studio /* Generating state */
  .frame.generating {
    background: linear-gradient(180deg, #edeae5 0%, #e0ddd6 100%);
  }.pb-studio .frame.generating::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(105deg,
      rgba(255,255,255,0) 32%,
      rgba(255,255,255,0.78) 50%,
      rgba(255,255,255,0) 68%
    );
    background-size: 250% 100%;
    animation: pbsSweepA 2.6s ease-in-out infinite;
    z-index: 2;
  }.pb-studio .frame.generating::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(255deg,
      rgba(217,119,87,0) 36%,
      rgba(217,119,87,0.18) 50%,
      rgba(217,119,87,0) 64%
    );
    background-size: 250% 100%;
    animation: pbsSweepB 3.4s ease-in-out infinite;
    z-index: 2;
  }@keyframes pbsSweepA {
    0% { background-position: 130% 50%; }
    100% { background-position: -30% 50%; }
  }@keyframes pbsSweepB {
    0% { background-position: -30% 50%; }
    100% { background-position: 130% 50%; }
  }.pb-studio .frame .emerge {
    position: absolute;
    inset: -6%;
    background:
      radial-gradient(42% 48% at 30% 34%, rgba(212,168,83,0.6), transparent 70%),
      radial-gradient(46% 42% at 72% 64%, rgba(217,119,87,0.55), transparent 72%),
      radial-gradient(52% 56% at 52% 82%, rgba(150,112,80,0.5), transparent 75%);
    filter: blur(20px);
    opacity: 0;
    transition: opacity 0.5s ease;
    z-index: 3;
    pointer-events: none;
  }.pb-studio .frame .gen-progress {
    position: absolute;
    top: 12px;
    right: 12px;
    font-size: 12px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: rgba(40,32,24,0.62);
    background: rgba(255,255,255,0.72);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    padding: 4px 9px;
    border-radius: 8px;
    z-index: 6;
  }.pb-studio .frame .preview {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    opacity: 0;
    transition: opacity 0.4s ease-out;
    z-index: 4;
  }.pb-studio .frame.done .preview { opacity: 1; }.pb-studio .frame.editable { cursor: grab; touch-action: none; }.pb-studio .frame.editable:active { cursor: grabbing; }.pb-studio /* The empty state caption (subtle, .pb-studio only visible on hover) */
  .frame-hint {
    position: absolute;
    bottom: 14px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(0,0,0,0.3);
    font-weight: 500;
    opacity: 0;
    transition: opacity 0.2s;
    z-index: 4;
  }.pb-studio .frame:hover .frame-hint { opacity: 1; }
  .pb-studio .frame { transition: filter 0.85s cubic-bezier(0.2,0.7,0.2,1); }
  .pb-studio .frame:not(.generating):not(.done) { filter: brightness(0.88) saturate(0.92); }
  @media (prefers-reduced-motion: no-preference) {
    .pb-studio .frame.done { animation: pbsIlluminate 1.15s ease; }
  }
  @keyframes pbsIlluminate {
    0% { filter: brightness(0.88) saturate(0.92); }
    42% { filter: brightness(1.13) saturate(1.05) drop-shadow(0 0 26px rgba(238,37,50,0.26)); }
    100% { filter: brightness(1); }
  }
  .pb-studio .studio-intent-stage {
    position: absolute; inset: 0; z-index: 5; display: flex; flex-direction: column;
    align-items: center; justify-content: center; padding: 24px 16px 16px;
    overflow-y: auto; background: rgba(255,255,255,0.55); backdrop-filter: blur(8px);
  }.pb-studio .studio-intent-captions {
    width: 100%; max-width: 420px; margin-top: 14px; padding-top: 12px;
    border-top: 1px solid rgba(0,0,0,0.06);
  }.pb-studio .studio-freeform-hint {
    font-size: 12.5px; line-height: 1.45; color: rgba(22,22,28,0.55); text-align: center;
    max-width: 360px; margin: 0 0 8px;
  }.pb-studio .studio-freeform-hint button {
    display: block; margin: 8px auto 0; font-size: 12px; font-weight: 600;
    color: #c41e2a; text-decoration: underline; text-underline-offset: 3px;
  }.pb-studio .prompt-intent-hint {
    flex: 1; min-width: 0; font-size: 14px; color: rgba(22,22,28,0.45); padding: 0 4px;
  }.pb-studio .prompt-intent-hint button {
    font-weight: 600; color: #c41e2a; text-decoration: underline; text-underline-offset: 3px;
  }.pb-studio /* Confirm checkmark — appears after the image is generated */
  .confirm-check {
    position: absolute;
    bottom: -20px;
    right: -20px;
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: var(--ink);
    background: transparent;
    backdrop-filter: blur(14px) saturate(150%);
    -webkit-backdrop-filter: blur(14px) saturate(150%);
    border: 1.5px solid rgba(255,255,255,0.55);
    box-shadow: 0 6px 20px rgba(0,0,0,0.16), inset 0 0 0 1px rgba(255,255,255,0.14);
    z-index: 12;
    animation: pbsCheckIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) 0.35s both;
    transition: transform 0.18s ease, background 0.18s ease;
  }.pb-studio .confirm-check:hover { transform: scale(1.08); background: rgba(255,255,255,0.16); }@keyframes pbsCheckIn {
    from { opacity: 0; transform: scale(0.5); }
    to { opacity: 1; transform: scale(1); }
  }.pb-studio /* Glassmorphism post-preview template */
  .post-template {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    z-index: 25;
    background: rgba(12,12,16,0.6);
    animation: pbsTplIn 0.5s ease-out both;
  }@keyframes pbsTplIn { from { opacity: 0; } to { opacity: 1; } }.pb-studio .post-template .ptpl-blobs {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(34% 30% at 22% 26%, rgba(236,72,153,0.55), transparent 60%),
      radial-gradient(30% 28% at 78% 32%, rgba(139,92,246,0.55), transparent 60%),
      radial-gradient(36% 34% at 30% 80%, rgba(168,85,247,0.5), transparent 62%),
      radial-gradient(32% 30% at 80% 78%, rgba(99,102,241,0.5), transparent 62%);
    filter: blur(40px);
    animation: pbsBlobDrift 9s ease-in-out infinite alternate;
  }@keyframes pbsBlobDrift {
    from { transform: scale(1) translateY(0); }
    to { transform: scale(1.08) translateY(-2%); }
  }.pb-studio .post-template .ptpl-card {
    position: relative;
    z-index: 2;
    width: min(330px, 66%);
    max-height: 88%;
    overflow: hidden;
    border-radius: 18px;
    padding: 4px 0 14px;
    background: rgba(255,255,255,0.09);
    backdrop-filter: blur(22px) saturate(150%);
    -webkit-backdrop-filter: blur(22px) saturate(150%);
    border: 1px solid rgba(255,255,255,0.4);
    box-shadow:
      0 22px 60px rgba(0,0,0,0.45),
      inset 0 1px 0 rgba(255,255,255,0.5),
      inset 0 0 0 1px rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.92);
    font-size: 13px;
    animation: pbsCardIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) 0.05s both;
  }@keyframes pbsCardIn {
    from { opacity: 0; transform: translateY(12px) scale(0.97); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }@property --ptpl-angle {
    syntax: '<angle>';
    initial-value: 0deg;
    inherits: false;
  }.pb-studio .post-template .ptpl-card::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1.5px;
    pointer-events: none;
    z-index: 7;
    background: conic-gradient(from var(--ptpl-angle), transparent 0deg, transparent 285deg, rgba(255,255,255,0.35) 320deg, rgba(255,255,255,0.95) 350deg, rgba(255,255,255,0.4) 358deg, transparent 360deg);
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    mask-composite: exclude;
    animation: pbsBorderTrace 1.05s cubic-bezier(0.4, 0, 0.2, 1) 0.05s both;
  }@keyframes pbsBorderTrace {
    0% { --ptpl-angle: 0deg; opacity: 1; }
    78% { opacity: 1; }
    100% { --ptpl-angle: 360deg; opacity: 0; }
  }.pb-studio .post-template .ptpl-card::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    z-index: 6;
    background: linear-gradient(118deg, transparent 30%, rgba(255,255,255,0.45) 43%, rgba(255,255,255,0.1) 50%, transparent 60%);
    opacity: 0.1;
    animation: pbsGlassSheen 1.2s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both;
  }@keyframes pbsGlassSheen {
    0% { opacity: 0; transform: translateX(-45%); }
    55% { opacity: 0.5; }
    100% { opacity: 0.1; transform: translateX(0); }
  }.pb-studio .frame-wrap.as-post {
    aspect-ratio: auto;
    width: min(360px, 58%);
    max-width: 380px;
    height: auto;
    max-height: calc(100% - 150px);
    top: calc((100% - 132px) / 2);
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    place-items: stretch;
    overflow: hidden;
    border-radius: 20px;
    padding-bottom: 12px;
    background: rgba(255,255,255,0.74);
    backdrop-filter: blur(28px) saturate(160%);
    -webkit-backdrop-filter: blur(28px) saturate(160%);
    border: 1px solid rgba(255,255,255,0.9);
    box-shadow:
      0 0 0 1px rgba(255,255,255,0.55),
      0 0 24px 6px rgba(255,255,255,0.8),
      0 0 64px 20px rgba(255,255,255,0.45),
      0 30px 70px -26px rgba(20,20,45,0.5),
      inset 0 1px 0 rgba(255,255,255,0.95);
    color: rgba(22,22,28,0.92);
    font-size: 13px;
  }.pb-studio .frame-wrap.as-post.pc-platform-facebook,
  .pb-studio .frame-wrap.as-post.pc-platform-x,
  .pb-studio .frame-wrap.as-post.pc-platform-linkedin {
    width: min(424px, 64%);
    max-width: 440px;
  }.pb-studio .frame-wrap.as-post.pc-platform-tiktok {
    background: #0b0b0d;
    padding-bottom: 0;
    width: min(250px, 42%);
    max-width: 270px;
    aspect-ratio: 9 / 16;
    height: auto;
    max-height: calc(100% - 110px);
    border: 1px solid rgba(255,255,255,0.5);
  }@property --glass-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
  @keyframes pbsBorderSpin { to { --glass-angle: 360deg; } }
  .pb-studio .frame-wrap.as-post .glass-border {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 2px;
    pointer-events: none;
    z-index: 7;
    background: conic-gradient(from var(--glass-angle, 0deg),
      rgba(255,255,255,0.55) 0deg,
      rgba(255,255,255,0.55) 200deg,
      rgba(255,255,255,0.9) 288deg,
      rgba(255,255,255,1) 322deg,
      rgba(255,255,255,1) 340deg,
      rgba(255,255,255,0.6) 360deg);
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    mask-composite: exclude;
    filter: drop-shadow(0 0 5px rgba(255,255,255,0.85)) drop-shadow(0 0 2px rgba(255,255,255,0.9));
    animation: pbsBorderSpin 4s linear infinite;
  }@media (prefers-reduced-motion: reduce) {
    .pb-studio .frame-wrap.as-post .glass-border { animation: none; }
  }
  .pb-studio .frame-wrap.as-post .glass-sheen {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    z-index: 6;
    opacity: 0;
    background: linear-gradient(115deg, transparent 38%, rgba(255,255,255,0.55) 49%, rgba(255,255,255,0.12) 53%, transparent 64%);
  }.pb-studio .frame-wrap.as-post .frame {
    width: 100% !important;
    height: auto !important;
    max-height: min(42vh, 400px);
    flex: none;
    border: none;
    border-radius: 0;
    box-shadow: none;
    animation: none;
    background: #161616;
  }.pb-studio .frame-wrap.as-post .frame .preview { transition: none; }.pb-studio .frame-wrap.as-post .ptpl-close { z-index: 8; top: 12px; right: 12px; }.pb-studio .ptpl-foot { position: relative; z-index: 2; padding-top: 2px; }.pb-studio .ptpl-head {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 9px 12px;
  }.pb-studio .ptpl-avatar {
    width: 30px; height: 30px;
    border-radius: 50%;
    flex: none;
    background: linear-gradient(135deg, #f9ce34 0%, #ee2a7b 50%, #6228d7 100%);
    border: 2px solid rgba(255,255,255,0.92);
  }.pb-studio .ptpl-name { font-weight: 600; }.pb-studio .ptpl-more { margin-left: auto; letter-spacing: 1px; opacity: 0.8; }.pb-studio .ptpl-media {
    width: 100%;
    max-height: 360px;
    background-size: cover;
    background-position: center;
  }.pb-studio .ptpl-actions {
    display: flex;
    align-items: center;
    padding: 11px 12px 2px;
  }.pb-studio .ptpl-act-left { display: inline-flex; align-items: center; gap: 15px; }.pb-studio .ptpl-actions svg { display: block; }.pb-studio .ptpl-like { color: #ed4956; }.pb-studio .ptpl-dots { display: inline-flex; gap: 4px; margin: 0 auto; }.pb-studio .ptpl-dots i { width: 5px; height: 5px; border-radius: 50%; background: rgba(22,22,28,0.22); }.pb-studio .ptpl-dots i:first-child { background: #5aa7ff; }.pb-studio .ptpl-likes { font-weight: 600; padding: 4px 12px 3px; }.pb-studio .ptpl-caption { padding: 0 12px; line-height: 1.45; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }.pb-studio .ptpl-cname { font-weight: 600; }.pb-studio .ptpl-tags { color: #1d6fd6; }.pb-studio .ptpl-comments { padding: 6px 12px 0; color: rgba(22,22,28,0.5); }.pb-studio .ptpl-time { padding: 5px 12px 0; font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; color: rgba(22,22,28,0.42); }.pb-studio .ptpl-caption-skel { display: block; margin-top: 6px; }.pb-studio .ptpl-caption-skel span {
    display: block;
    height: 8px;
    margin-bottom: 6px;
    border-radius: 4px;
    background: linear-gradient(90deg, rgba(0,0,0,0.05), rgba(0,0,0,0.12), rgba(0,0,0,0.05));
    background-size: 200% 100%;
    animation: pbsCapSkel 1.3s ease-in-out infinite;
  }.pb-studio .ptpl-caption-skel span:nth-child(1) { width: 96%; }.pb-studio .ptpl-caption-skel span:nth-child(2) { width: 78%; }.pb-studio .ptpl-caption-skel span:nth-child(3) { width: 54%; }@keyframes pbsCapSkel {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }.pb-studio .ptpl-close {
    position: absolute;
    top: 14px;
    right: 16px;
    z-index: 3;
    width: 30px; height: 30px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: 22px;
    line-height: 1;
    color: rgba(22,22,28,0.7);
    background: rgba(255,255,255,0.6);
    border: 1px solid rgba(0,0,0,0.08);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }.pb-studio .ptpl-close:hover { background: rgba(255,255,255,0.85); }.pb-studio /* Prompt bar — glass morphism */
  .prompt-bar {
    position: absolute;
    bottom: 56px;
    left: 50%;
    transform: translateX(-50%);
    width: min(680px, 78%);
    height: 76px;
    background: rgba(255, 255, 255, 0.22);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border: 1.5px solid rgba(255, 255, 255, 0.42);
    border-radius: 16px;
    display: flex;
    align-items: center;
    padding: 0 20px 0 26px;
    gap: 12px;
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.5),
      0 10px 40px rgba(0,0,0,0.18);
    z-index: 15;
    transition: all 0.25s ease;
  }.pb-studio .prompt-bar:focus-within {
    background: rgba(255, 255, 255, 0.35);
    border-color: rgba(255, 255, 255, 0.7);
    transform: translateX(-50%) translateY(-2px);
  }.pb-studio .prompt-bar.is-generating {
    border-color: rgba(217,119,87,0.55);
    animation: pbsAgentPulse 2s ease-in-out infinite;
  }@keyframes pbsAgentPulse {
    0%, 100% {
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.5), 0 0 0 1px rgba(217,119,87,0.32), 0 0 18px 2px rgba(217,119,87,0.22), 0 10px 40px rgba(0,0,0,0.18);
    }
    50% {
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.5), 0 0 0 1px rgba(217,119,87,0.6), 0 0 30px 7px rgba(217,119,87,0.4), 0 10px 40px rgba(0,0,0,0.2);
    }
  }.pb-studio .gen-status {
    position: absolute;
    bottom: 128px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    font-weight: 500;
    color: rgba(40,32,24,0.72);
    background: rgba(255,255,255,0.7);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    padding: 7px 15px;
    border-radius: 999px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.1);
    z-index: 16;
    animation: pbsStatusIn 0.3s ease-out;
  }@keyframes pbsStatusIn {
    from { opacity: 0; transform: translateX(-50%) translateY(4px); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
  }.pb-studio .gen-dots {
    display: inline-flex;
    gap: 4px;
  }.pb-studio .gen-dots i {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: rgb(217,119,87);
    animation: pbsDot 1.4s ease-in-out infinite;
  }.pb-studio .gen-dots i:nth-child(2) { animation-delay: 0.2s; }.pb-studio .gen-dots i:nth-child(3) { animation-delay: 0.4s; }@keyframes pbsDot {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 1; }
  }.pb-studio .prompt-bar .pb-util {
    width: 38px;
    height: 38px;
    flex: none;
    display: grid;
    place-items: center;
    border-radius: 10px;
    color: var(--ink-2);
    transition: background 0.15s ease, color 0.15s ease;
  }.pb-studio .prompt-bar .pb-util:hover { background: rgba(0,0,0,0.05); }.pb-studio .prompt-bar .pb-util.active { color: var(--ink); background: rgba(0,0,0,0.07); }.pb-studio .prompt-bar .pb-util svg { width: 18px; height: 18px; }.pb-studio .prompt-bar .pb-tool { position: relative; display: flex; flex: none; }.pb-studio .pb-tools-pop {
    position: absolute;
    bottom: calc(100% + 12px);
    right: 0;
    min-width: 190px;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    background: rgba(255,255,255,0.92);
    backdrop-filter: blur(20px) saturate(160%);
    -webkit-backdrop-filter: blur(20px) saturate(160%);
    border: 1px solid rgba(255,255,255,0.55);
    border-radius: 14px;
    box-shadow: 0 14px 38px rgba(0,0,0,0.2);
    z-index: 30;
    animation: pbsPopUp 0.16s ease;
  }@keyframes pbsPopUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }.pb-studio .pb-tools-pop button {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 9px 12px;
    border-radius: 9px;
    font-size: 13.5px;
    color: var(--ink);
    transition: background 0.14s ease;
  }.pb-studio .pb-tools-pop button:hover { background: rgba(0,0,0,0.05); }.pb-studio .pb-tools-pop .pro-tag {
    margin-left: auto;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: var(--muted-2);
    border: 1px solid var(--line-2);
    border-radius: 5px;
    padding: 1px 5px;
  }.pb-studio .prompt-bar input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    font-size: 15.5px;
    font-weight: 400;
    color: rgba(20, 20, 25, 0.85);
  }.pb-studio .prompt-bar input::placeholder {
    color: rgba(20, 20, 25, 0.5);
  }.pb-studio .studio-schedule-row {
    position: absolute; bottom: 96px; left: 50%; transform: translateX(-50%);
    display: flex; align-items: center; gap: 8px; padding: 8px 12px;
    border-radius: 12px; background: rgba(255,255,255,0.88);
    border: 1px solid rgba(0,0,0,0.08); font-size: 12px; z-index: 6;
  }.pb-studio .studio-schedule-row input {
    border: 1px solid rgba(0,0,0,0.1); border-radius: 8px; padding: 4px 8px; font-size: 12px;
  }.pb-studio .studio-video-compose {
    display: flex; align-items: center; justify-content: center;
    width: 100%; height: 100%; padding: 24px;
  }.pb-studio .studio-video-preview {
    width: 100%; height: 100%; display: flex; flex-direction: column;
    background: #fff; border-radius: inherit; overflow: hidden;
  }.pb-studio .studio-video-el { width: 100%; flex: 1; object-fit: contain; background: #000; }
  .pb-studio .studio-video-cap { padding: 10px 14px; font-size: 13px; line-height: 1.4; }
  .pb-studio .studio-caption-error, .pb-studio .studio-caption-error-overlay {
    font-size: 11.5px; color: #c41e2a; margin: 6px 0 0;
  }.pb-studio .studio-caption-error-overlay {
    position: absolute; bottom: 12px; left: 14px; right: 14px;
    padding: 8px 10px; border-radius: 10px; background: rgba(255,255,255,0.92);
    border: 1px solid rgba(238,37,50,0.2); z-index: 8;
  }.pb-studio .studio-caption-tools {
    position: absolute; bottom: 10px; right: 10px; z-index: 8; max-width: 240px;
  .pb-studio .pb-tools-pop-wide { min-width: 220px; padding: 10px; }
  .pb-studio .magic-wand {
    width: 44px; height: 44px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    background: rgba(255,255,255,0.45);
    border: 1px solid rgba(255,255,255,0.5);
    transition: all 0.15s ease;
  }.pb-studio .magic-wand:hover {
    background: var(--red);
    border-color: var(--red);
    transform: scale(1.05);
  }.pb-studio .magic-wand:hover svg { color: white; }.pb-studio .magic-wand svg { width: 20px; height: 20px; color: rgba(20,20,25,0.8); transition: color 0.15s; }.pb-studio /* ============ RIGHT RAIL ============ */
  .right-rail {
    background: var(--card);
    border-radius: var(--radius);
    padding: 22px 20px;
    display: flex;
    flex-direction: column;
    box-shadow: var(--shadow-sm);
  }.pb-studio .rail-section { margin-bottom: 22px; }.pb-studio .rail-label {
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--muted);
    font-weight: 600;
    margin-bottom: 10px;
  }.pb-studio /* Post type segmented control */
  .post-type {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 4px;
    background: #f4f4f6;
    border-radius: 10px;
    padding: 4px;
  }.pb-studio .post-type button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 6px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    color: var(--muted);
    transition: all 0.15s ease;
  }.pb-studio .post-type button.active {
    background: white;
    color: var(--ink);
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    font-weight: 600;
  }.pb-studio .post-type button svg { width: 14px; height: 14px; }.pb-studio /* Selectable list items */
  .list-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 11px 14px;
    border: 1px solid var(--line);
    border-radius: 11px;
    margin-bottom: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
  }.pb-studio .list-row:hover { background: #fafafa; }.pb-studio .list-row.active {
    border-color: var(--ink);
    background: #fafafa;
  }.pb-studio .list-row svg.icon { width: 16px; height: 16px; color: var(--ink-2); }.pb-studio .list-row .lbl { flex: 1; font-size: 13.5px; font-weight: 500; }.pb-studio .list-row .check {
    width: 12px; height: 12px;
    border-radius: 50%;
    border: 1.5px solid var(--line-2);
    transition: all 0.15s ease;
  }.pb-studio .list-row.active .check {
    background: var(--ink);
    border-color: var(--ink);
    position: relative;
  }.pb-studio .list-row.active .check::after {
    content: '';
    width: 4px; height: 4px;
    background: white;
    border-radius: 50%;
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
  }.pb-studio /* Tools list */
  .tool-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 11px 0;
    border-bottom: 1px solid var(--line);
    cursor: pointer;
    transition: opacity 0.15s ease;
  }.pb-studio .tool-row:last-child { border-bottom: none; }.pb-studio .tool-row:hover { opacity: 0.7; }.pb-studio .tool-row .label {
    flex: 1;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-2);
  }.pb-studio .tool-row .pro-tag {
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: var(--red);
    background: var(--red-soft);
    padding: 2px 6px;
    border-radius: 4px;
  }.pb-studio .tool-row svg { width: 14px; height: 14px; color: var(--muted-2); }.pb-studio /* Bottom actions */
  .rail-actions {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-top: 18px;
  }.pb-studio .btn-outline {
    width: 100%;
    background: white;
    border: 1px solid var(--line-2);
    border-radius: 12px;
    padding: 13px;
    font-size: 14px;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }.pb-studio .btn-outline:hover { background: #fafafa; }.pb-studio .btn-outline svg { width: 15px; height: 15px; color: var(--ink-2); }.pb-studio .btn-publish {
    width: 100%;
    background: #0d0d10;
    color: white;
    border-radius: 12px;
    padding: 14px;
    font-size: 14px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.15s ease;
  }.pb-studio .btn-publish:hover { background: #1a1a1d; transform: translateY(-1px); }.pb-studio .btn-publish:active { transform: translateY(0); }.pb-studio .btn-publish svg { width: 15px; height: 15px; }@media (max-width: 1379px) {.pb-studio .app {
      grid-template-columns: 232px minmax(0, 1fr);
      grid-template-areas: "sidebar canvas";
    }.pb-studio .canvas { min-height: 620px; }.pb-studio /* Rail becomes a horizontal control strip under the canvas */
    .right-rail {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 22px 28px;
      align-items: start;
      padding: 22px 24px;
    }.pb-studio .rail-section { margin-bottom: 0; }.pb-studio .rail-actions { grid-column: 1 / -1; margin-top: 4px; flex-direction: row; padding-top: 18px; border-top: 1px solid var(--line); }.pb-studio .rail-actions .btn-outline, .pb-studio .rail-actions .btn-publish { flex: 1; }.pb-studio /* keep the tools block from stretching oddly */
    .right-rail > .rail-section:nth-of-type(n) { min-width: 0; }}@media (max-width: 860px) {.pb-studio .app { grid-template-columns: minmax(0, 1fr); grid-template-areas: "sidebar" "canvas"; }.pb-studio .sidebar { flex-direction: row; flex-wrap: wrap; align-items: center; gap: 12px 14px; padding: 16px 18px; }.pb-studio .studio-title { display: none; }.pb-studio /* "Studio" wordmark hidden in compact bar */
    .logo { margin-bottom: 0; margin-right: auto; }.pb-studio .nav { flex-direction: row; flex-wrap: wrap; width: 100%; margin-bottom: 0; gap: 4px; }.pb-studio .nav a { padding: 9px 14px; background: #f4f4f6; }.pb-studio .nav a.active { background: #ececef; }.pb-studio .voice-card, .pb-studio .workspace { display: none; }.pb-studio /* secondary on small screens */

    .canvas { min-height: 540px; }.pb-studio .right-rail { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }}@media (max-width: 600px) {.pb-studio .app { padding: 10px; gap: 12px; }.pb-studio .canvas { min-height: 460px; }.pb-studio .frame-wrap { width: 64%; max-width: 320px; transform: translate(-50%, -60%); }.pb-studio .prompt-bar { width: 90%; height: 64px; bottom: 22px; padding: 0 14px 0 20px; }.pb-studio .prompt-bar input { font-size: 14px; }.pb-studio .magic-wand { width: 40px; height: 40px; }.pb-studio .canvas-top { top: 14px; left: 14px; right: 14px; }.pb-studio .dim-chip { padding: 8px 12px; font-size: 12.5px; }.pb-studio .right-rail { grid-template-columns: minmax(0, 1fr); padding: 20px; }.pb-studio .rail-actions { flex-direction: column; }.pb-studio .rail-actions .btn-outline, .pb-studio .rail-actions .btn-publish { flex: none; width: 100%; }}@media (max-width: 380px) {.pb-studio .frame-wrap { width: 72%; }.pb-studio .nav a span { font-size: 13px; }}
    `}</style>
  );
}
