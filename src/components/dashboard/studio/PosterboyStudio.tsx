"use client";

import { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  Calendar,
  Image as ImageIcon,
  Sun,
  Eye,
  Pencil,
  LayoutGrid,
  AlignLeft,
  Tag,
  Wand2,
  Send,
  Crop,
  Maximize2,
  Move,
  RotateCw,
  ArrowRight,
  SlidersHorizontal,
  Download,
  Undo2,
  ImagePlus,
  X,
  History,
  Clapperboard,
  Plus,
  Sparkles,
  Wand2 as EnhanceIcon,
  Image as ImageTabIcon,
} from "lucide-react";
import StudioPostChrome from "@/components/dashboard/studio/StudioPostChrome";
import InstagramPreview from "@/components/dashboard/studio/InstagramPreview";
import FacebookPreview from "@/components/dashboard/studio/FacebookPreview";
import CaptionVariantPicker, { type CaptionVariant } from "@/components/dashboard/composer/CaptionVariantPicker";
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
import StudioHistoryGallery from "@/components/dashboard/studio/StudioHistoryGallery";
import { usePlanFeatures, usePlan } from "@/components/dashboard/PlanProvider";
import { useActiveLocation } from "@/lib/use-active-location";
import { LocationGate } from "@/components/dashboard/StateViews";
import { socialPlatformsFromComposerId } from "@/lib/posterboy-types";
import { useFocusTrap } from "@/components/dashboard/use-focus-trap";
import { DashboardConfirm } from "@/components/dashboard/DashboardModal";
import { StudioStyles } from "./studio-styles";
import { useGenHistory } from "./hooks/use-gen-history";
import { EDIT_DEFAULT, useImageEdit } from "./hooks/use-image-edit";
import { resizeToExact, useStudioGeneration } from "./hooks/use-studio-generation";
import { isListingBrief, isProductAdBrief } from "@/lib/studio/scene-intent";
import {
  extractReferenceImageUrl,
  looksLikeDirectImageUrl,
  looksLikeStandaloneImageUrl,
} from "@/lib/studio/reference-url";
import { extractWebsiteUrl } from "@/lib/studio/page-url";
import { enrichIntentWithSiteContext, type OpenGraphMeta } from "@/lib/studio/open-graph";
import { writeStudioScheduleHandoff } from "@/lib/studio/schedule-handoff";
import {
  startAndPollVideo,
  veoAspectForPlatform,
} from "@/lib/studio/generate-video-client";
import StudioChatThread from "@/components/dashboard/studio/StudioChatThread";
import StudioCoverflow from "@/components/dashboard/studio/StudioCoverflow";
import { carouselSlidePrompt } from "@/lib/studio/coverflow";
import {
  STUDIO_ASPECT_OPTIONS,
  enrichIntentWithFormat,
  makeUserMessage,
  makeWorkingAssistant,
  platformIdxForAspect,
  type StudioChatAspect,
  type StudioChatMessage,
  type StudioPostFormat,
} from "@/lib/studio/studio-chat";
import {
  loadPromptMemory,
  pushPromptMemory,
  recentAsksHint,
  type PromptMemoryEntry,
} from "@/lib/studio/prompt-memory";
import { canStartStudioChatTurn } from "@/lib/studio/studio-chat-guards";

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
// `publishable` = Posterboy can actually post to it today (Meta only). Others
// are preview-only until their integration ships — surfaced up front (T4).
const PLATFORMS = [
  // w/h are the EXACT output dimensions per platform (Hootsuite 2026 sizes);
  // every generation is cover-cropped to these pixels on completion.
  { id: "instagram", label: "Instagram", w: 1080, h: 1350, genAspect: "4:5", publishable: true },
  { id: "facebook", label: "Facebook", w: 1080, h: 1350, genAspect: "4:5", publishable: true },
  { id: "x", label: "X", w: 1280, h: 720, genAspect: "16:9", publishable: false },
  { id: "linkedin", label: "LinkedIn", w: 1200, h: 627, genAspect: "16:9", publishable: false },
  { id: "tiktok", label: "TikTok", w: 1080, h: 1920, genAspect: "9:16", publishable: false },
] as const;

type PostType = "photo" | "update" | "offer";
type GenState = "idle" | "generating" | "done";
type ComposerMode = "image" | "video";
type MediaKind = "image" | "video";

function buildPostCaption(body: string, tags: string, fallback: string): string {
  const combined = [body.trim(), tags.trim()].filter(Boolean).join(" ");
  return combined || fallback.trim();
}


const STUDIO_PROMPT_PLACEHOLDERS = [
  "Describe the image you want to create",
  "Make an Instagram post about…",
  "Create a launch post for…",
  "Post a weekend promo for…",
  "Share a customer story about…",
];

export default function PosterboyStudio() {
  const [platformIdx, setPlatformIdx] = useState(0);
  const [theme, setTheme] = useState<"light" | "grid">("light");
  const [postType, setPostType] = useState<PostType>("photo");
  const [prompt, setPrompt] = useState("");
  const [selectedIntentId, setSelectedIntentId] = useState<StrategicIntentId | null>(null);
  const [intentDetail, setIntentDetail] = useState("");
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
  // Caption step (after the image is ready): the prompt bar becomes the caption brief.
  const [captionBrief, setCaptionBrief] = useState("");
  const [captionRun, setCaptionRun] = useState(0);
  // Caption ideas are generated into the existing input and cycled in place
  // (no overlay): variants[idx] populates the field, a rotate control crossfades
  // to the next. captionSourceBrief preserves the brief once the field becomes
  // the caption, so re-generation still works.
  const [captionVariants, setCaptionVariants] = useState<CaptionVariant[]>([]);
  const [captionVariantIdx, setCaptionVariantIdx] = useState(0);
  const [captionSourceBrief, setCaptionSourceBrief] = useState("");
  const [capFading, setCapFading] = useState(false);
  // After generation the bar stays on the image prompt so the user can edit or
  // re-prompt; caption writing is an explicit secondary step.
  const [promptMode, setPromptMode] = useState<"image" | "caption">("image");
  // Reset caption state whenever we're not on a finished image.
  useEffect(() => {
    if (genState !== "done") {
      setCaptionBrief("");
      setCaptionRun(0);
      setCaptionVariants([]);
      setCaptionVariantIdx(0);
      setCaptionSourceBrief("");
      setPromptMode("image");
    } else {
      setPromptMode("image");
    }
  }, [genState]);
  // The AI's caption as generated — compared to the final at publish to learn edits.
  const aiCaptionRef = useRef("");
  const clearComposeFieldForReview = useCallback(() => {
    setPrompt("");
    setSelectedIntentId(null);
    setIntentDetail("");
  }, []);
  const resetToNewImage = () => {
    carouselFillAbortRef.current?.abort();
    carouselFillAbortRef.current = null;
    carouselRunIdRef.current += 1;
    setCarouselSlides([]);
    setCarouselSelected(0);
    setGenState("idle");
    setGeneratedUrl(null);
    setShowTemplate(false);
    setPrompt("");
    setSelectedIntentId(null);
    setIntentDetail("");
    setPromptMode("image");
    setCaptionBrief("");
    setCaptionRun(0);
    setCaptionVariants([]);
    setCaptionVariantIdx(0);
    setCaptionSourceBrief("");
    setCaptionText("");
    setCaptionTags("");
    setCaptionState("idle");
    setCaptionError("");
    setError("");
    resetEdit();
    setActiveEdit(null);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };
  // Apply a generated variant into the editable caption field (and the post).
  const applyCaptionVariant = (v: CaptionVariant) => {
    aiCaptionRef.current = v.caption;
    setCaptionBrief(v.caption);
    setCaptionText(v.caption);
    setCaptionTags(v.hashtags.join(" "));
    setCaptionState("done");
    setCaptionError("");
  };
  // First batch arrives — drop option 1 into the field with a fade-in.
  const onCaptionVariants = (vs: CaptionVariant[]) => {
    setCaptionVariants(vs);
    setCaptionVariantIdx(0);
    if (!vs[0]) return;
    setCapFading(true);
    window.setTimeout(() => {
      applyCaptionVariant(vs[0]);
      setCapFading(false);
    }, 150);
  };
  // Crossfade to the next cached option, in place.
  const rotateCaption = () => {
    if (captionVariants.length < 2) return;
    const next = (captionVariantIdx + 1) % captionVariants.length;
    setCapFading(true);
    window.setTimeout(() => {
      setCaptionVariantIdx(next);
      applyCaptionVariant(captionVariants[next]);
      setCapFading(false);
    }, 150);
  };

  // Composer-bar image controls: optional reference photo (grounds the generation
  // in their real product/place) + Pro image model (Nano Banana Pro) by default.
  const [refImage, setRefImage] = useState<string | null>(null);
  const [refName, setRefName] = useState("");
  const [refImageLoading, setRefImageLoading] = useState(false);
  const refFileRef = useRef<HTMLInputElement>(null);
  const [imageQuality, setImageQuality] = useState<"standard" | "pro">("pro");
  // Nano Banana Pro defaults to 2K in /api/generate-image when quality=pro.
  const [imageSize] = useState<"1K" | "2K">("2K");
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const [reviewOptionsOpen, setReviewOptionsOpen] = useState(false);
  const reviewOptionsRef = useRef<HTMLDivElement>(null);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [placeholderFading, setPlaceholderFading] = useState(false);

  // Chat thread + bottom aspect / format controls
  const [chatMessages, setChatMessages] = useState<StudioChatMessage[]>([]);
  const pendingAssistantIdRef = useRef<string | null>(null);
  const composeInFlightRef = useRef(false);
  const pendingPromptMemoryRef = useRef<Omit<PromptMemoryEntry, "at"> | null>(null);
  const [aspectOverride, setAspectOverride] = useState<StudioChatAspect | null>(null);
  const aspectPinRef = useRef(false);
  const [aspectMenuOpen, setAspectMenuOpen] = useState(false);
  const aspectMenuRef = useRef<HTMLDivElement>(null);
  const [postFormat, setPostFormat] = useState<StudioPostFormat>("single");
  const [carouselCount, setCarouselCount] = useState(3);
  const [carouselSlides, setCarouselSlides] = useState<(string | null)[]>([]);
  const [carouselSelected, setCarouselSelected] = useState(0);
  const carouselFillAbortRef = useRef<AbortController | null>(null);
  const carouselRunIdRef = useRef(0);
  const [formatMenuOpen, setFormatMenuOpen] = useState(false);
  const formatMenuRef = useRef<HTMLDivElement>(null);
  // Composer: prompt enhance (lanes + brand grounding are automatic).
  const [enhanceBusy, setEnhanceBusy] = useState(false);
  const [recentPrompts, setRecentPrompts] = useState<PromptMemoryEntry[]>([]);
  const [softNotice, setSoftNotice] = useState("");

  const { locationId, locations, loading: locationLoading, error: locationError, refresh } =
    useActiveLocation();

  useEffect(() => {
    setRecentPrompts(loadPromptMemory(locationId));
  }, [locationId]);

  const effectiveAspect = aspectOverride || PLATFORMS[platformIdx].genAspect;

  useEffect(() => {
    if (prompt.trim() || genState !== "idle" || selectedIntentId || promptMode === "caption") return;
    const id = window.setInterval(() => {
      setPlaceholderFading(true);
      window.setTimeout(() => {
        setPlaceholderIdx((i) => (i + 1) % STUDIO_PROMPT_PLACEHOLDERS.length);
        setPlaceholderFading(false);
      }, 280);
    }, 4200);
    return () => window.clearInterval(id);
  }, [prompt, genState, selectedIntentId, promptMode]);

  const attachReferenceFromUrl = useCallback((rawUrl: string) => {
    const url = extractReferenceImageUrl(rawUrl) || rawUrl.trim();
    if (!/^https:\/\//i.test(url)) return false;
    try {
      const host = new URL(url).hostname.replace(/^www\./, "");
      setRefImage(url);
      setRefName(host);
      setError("");
      return true;
    } catch {
      return false;
    }
  }, []);

  const onRefFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    setRefImageLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      if (locationId) form.append("locationId", locationId);
      form.append("alt", file.name);
      const res = await fetch("/api/upload", {
        method: "POST",
        credentials: "same-origin",
        body: form,
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (res.ok && data.url) {
        setRefImage(data.url);
        setRefName(file.name);
        setRefImageLoading(false);
        return;
      }
    } catch {
      // Fall back to an inline data URL when upload storage is unavailable.
    }

    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const max = 1280;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.width * scale));
      c.height = Math.max(1, Math.round(img.height * scale));
      c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
      setRefImage(c.toDataURL("image/jpeg", 0.82));
      setRefName(file.name);
      setRefImageLoading(false);
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      setRefImageLoading(false);
      setError("Could not read that image. Try a JPG or PNG.");
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };
  const [composerMode, setComposerMode] = useState<ComposerMode>("image");
  const [confirmVideoSwitch, setConfirmVideoSwitch] = useState(false);
  const [mediaKind, setMediaKind] = useState<MediaKind>("image");
  const [publishing, setPublishing] = useState(false);
  const [schedulingNav, setSchedulingNav] = useState(false);
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoStatusText, setVideoStatusText] = useState("");
  const videoAbortRef = useRef<AbortController | null>(null);
  const [activeTool, setActiveTool] = useState<null | "type" | "tools" | "captions">(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const features = usePlanFeatures();
  const canUseProImage = features.proImageModel;
  const { businessType } = usePlan();

  useEffect(() => {
    if (!canUseProImage && imageQuality === "pro") setImageQuality("standard");
  }, [canUseProImage, imageQuality]);

  useEffect(() => {
    if (!modelMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (modelMenuRef.current?.contains(e.target as Node)) return;
      setModelMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [modelMenuOpen]);
  const activeLocation = useMemo(
    () => locations.find((l) => l.id === locationId) ?? null,
    [locations, locationId],
  );
  const hasCaptionReady = Boolean(captionText.trim());

  // Sparkle-T: expand a thin brief into a fuller one, in place.
  const enhancePrompt = async () => {
    const brief = prompt.trim();
    if (!brief || enhanceBusy || genState === "generating") return;
    setEnhanceBusy(true);
    try {
      const res = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: brief,
          ...(locationId ? { locationId } : {}),
          ...(businessType ? { businessType } : {}),
        }),
      });
      const data = (await res.json()) as { enhanced?: string; error?: string };
      if (res.ok && data.enhanced?.trim()) {
        setPrompt(data.enhanced.trim());
        window.setTimeout(() => {
          syncPromptHeight();
          inputRef.current?.focus();
        }, 0);
      }
    } catch {
      /* leave the brief as typed */
    } finally {
      setEnhanceBusy(false);
    }
  };
  const structuredBrief = useMemo(
    () => buildStructuredBrief(selectedIntentId, intentDetail),
    [selectedIntentId, intentDetail],
  );
  // Prefix mode: the bar reads "make a [platform] post about |" and the user
  // types only the SUBJECT ("thanksgiving"); the full sentence is composed
  // here. Full instructions / URLs / "create an image…" exit prefix mode.
  const typedOwnSentence =
    /instagram|facebook|tiktok|linkedin|\btwitter\b|\bx\b|\bpost\b|^make\b|^(create|generate|design)\b|\bimage\s+for\b|\bhttps?:\/\//i.test(
      prompt,
    );
  const prefixActive =
    genState === "idle" && composerMode === "image" && !selectedIntentId && !typedOwnSentence;
  const composerBrief = structuredBrief
    ? structuredBrief
    : prefixActive && prompt.trim()
      ? `make a ${PLATFORMS[platformIdx].id} post about ${prompt.trim()}`
      : prompt.trim();
  const previewImageLabel = useMemo(() => {
    const brief = (captionBrief || composerBrief || prompt.trim()).trim();
    return brief ? `Generated image: ${brief}` : "Generated post image";
  }, [captionBrief, composerBrief, prompt]);
  // A brief about a SPECIFIC property (listing / sold / street address) can't be
  // imagined by the model — without their photo it invents a house that isn't
  // theirs. Detect it and steer to the reference-photo flow.
  const listingBrief = useMemo(
    () => isListingBrief(`${prompt} ${intentDetail}`),
    [prompt, intentDetail],
  );
  const needsListingPhoto =
    listingBrief && !refImage && !refImageLoading && genState === "idle" && composerMode === "image";
  const selectedIntent = STRATEGIC_INTENTS.find((i) => i.id === selectedIntentId) ?? null;
  const previewHandle =
    activeLocation?.name?.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 24) || "yourbrand";
  const previewPageName = activeLocation?.name || "Your Page";
  const searchParams = useSearchParams();
  const router = useRouter();
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


  const [activeEdit, setActiveEdit] = useState<null | "scale" | "move" | "rotate" | "adjust">(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const syncPromptHeight = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  };
  useEffect(() => {
    syncPromptHeight();
  }, [prompt, intentDetail, captionBrief, genState, promptMode, selectedIntentId]);
  useEffect(() => {
    if (genState === "done" && promptMode === "image") {
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [genState, promptMode]);
  const [platformMenuOpen, setPlatformMenuOpen] = useState(false);
  const platformMenuRef = useRef<HTMLDivElement>(null);
  // true after the user explicitly picks a platform from the chip menu
  const platformPinRef = useRef(false);

  const editRailRef = useRef<HTMLDivElement>(null);
  const promptToolsRef = useRef<HTMLDivElement>(null);
  const frameWrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });

  const platform = PLATFORMS[platformIdx];

  const {
    edit,
    setEdit,
    canUndoEdit,
    undoEdit,
    resetEdit,
    canEditImage,
    onImagePointerDown,
    onImagePointerMove,
    onImagePointerUp,
    handleCropToFrame,
    handleDownloadImage,
    previewStyle,
  } = useImageEdit({
    genState,
    showTemplate,
    generatedUrl,
    platform,
    frameWrapRef,
    resizeToExact,
    setGeneratedUrl,
    setError,
    setActiveEdit,
  });

  const { genHistory, pushHistory, adoptImage } = useGenHistory({
    locationId,
    genState,
    setGeneratedUrl,
    setMediaKind,
    setComposerMode,
    setGenState,
    setShowTemplate,
    setCaptionText,
    setCaptionTags,
    setCaptionState,
    setCaptionError,
    setCaptionBrief,
    setCaptionRun,
    aiCaptionRef,
    resetEdit,
    setError,
  });

  /** Session gens for history — image always stays on the canvas frame. */
  const sessionFeed = useMemo(
    () => genHistory.filter((e) => e.source === "session").slice().reverse(),
    [genHistory],
  );

  const {
    generate,
    composeFromIntent,
    regenerateLast,
    setLastGenPrompt,
    lastGenPrompt,
  } = useStudioGeneration({
    prompt,
    composerBrief,
    genState,
    generatedUrl,
    platformIdx,
    platform,
    platforms: PLATFORMS,
    refImage,
    imageQuality,
    imageSize,
    onSoftNotice: setSoftNotice,
    businessType: businessType ?? undefined,
    locationId,
    platformPinRef,
    aspectPinRef,
    aspectOverride,
    inputRef,
    setGenState,
    setGeneratedUrl,
    setError,
    setProgress,
    setShowTemplate,
    setCaptionState,
    setCaptionText,
    setCaptionTags,
    setPlatformIdx,
    resetEdit,
    setActiveEdit,
    pushHistory,
    onAfterGenerateSuccess: clearComposeFieldForReview,
    onAfterGenerateFailure: (message) => {
      const aid = pendingAssistantIdRef.current;
      if (!aid) return;
      const chatText = /timed out/i.test(message)
        ? "Couldn't finish that one."
        : message;
      setChatMessages((prev) =>
        prev.map((m) =>
          m.id === aid && m.role === "assistant"
            ? { ...m, status: "error" as const, text: chatText }
            : m,
        ),
      );
      pendingAssistantIdRef.current = null;
      pendingPromptMemoryRef.current = null;
      composeInFlightRef.current = false;
    },
  });

  const clearCarousel = useCallback(() => {
    carouselFillAbortRef.current?.abort();
    carouselFillAbortRef.current = null;
    carouselRunIdRef.current += 1;
    setCarouselSlides([]);
    setCarouselSelected(0);
  }, []);

  const selectCarouselSlide = useCallback(
    (index: number) => {
      setCarouselSelected(index);
      const url = carouselSlides[index];
      if (url) {
        setGeneratedUrl(url);
        resetEdit();
      }
    },
    [carouselSlides, resetEdit],
  );

  const fillCarouselSlides = useCallback(
    async (heroUrl: string, intent: string, count: number) => {
      carouselFillAbortRef.current?.abort();
      const ctrl = new AbortController();
      carouselFillAbortRef.current = ctrl;
      const runId = ++carouselRunIdRef.current;
      const n = Math.min(5, Math.max(2, Math.round(count) || 3));
      setCarouselSlides(Array.from({ length: n }, (_, i) => (i === 0 ? heroUrl : null)));
      setCarouselSelected(0);

      for (let i = 1; i < n; i++) {
        if (ctrl.signal.aborted || runId !== carouselRunIdRef.current) return;
        setSoftNotice(`Generating slide ${i + 1} of ${n}…`);
        const promptText = carouselSlidePrompt(intent, i, n);
        try {
          const res = await fetch("/api/generate-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: promptText,
              aspectRatio: effectiveAspect,
              // Brand ref only — never the hero slide (that forces near-duplicates).
              ...(refImage ? { referenceImage: refImage } : {}),
              sourceIntent: intent,
              composed: true,
              quality: imageQuality,
              ...(imageQuality === "pro" ? { imageSize } : {}),
              ...(businessType ? { businessType } : {}),
              ...(locationId ? { locationId } : {}),
            }),
            signal: ctrl.signal,
          });
          const data = (await res.json()) as { image?: string; error?: string };
          if (ctrl.signal.aborted || runId !== carouselRunIdRef.current) return;
          if (res.ok && data.image) {
            const url = data.image;
            setCarouselSlides((prev) => {
              const next =
                prev.length === n
                  ? [...prev]
                  : Array.from({ length: n }, (_, j) => prev[j] ?? null);
              next[i] = url;
              return next;
            });
            pushHistory(url, `Carousel slide ${i + 1}/${n}`);
          }
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return;
        }
      }

      if (ctrl.signal.aborted || runId !== carouselRunIdRef.current) return;
      setSoftNotice("");
      setChatMessages((prev) => {
        const last = [...prev].reverse().find((m) => m.role === "assistant" && m.status === "done");
        if (!last || last.role !== "assistant") return prev;
        return prev.map((m) =>
          m.id === last.id && m.role === "assistant"
            ? {
                ...m,
                text: `Here’s your ${n}-slide carousel — use Prev / Next to browse.`,
              }
            : m,
        );
      });
    },
    [
      businessType,
      effectiveAspect,
      imageQuality,
      imageSize,
      locationId,
      pushHistory,
      refImage,
    ],
  );

  // Finalize chat assistant bubble when generation succeeds (image stays in live slot).
  useEffect(() => {
    if (genState !== "done" || !generatedUrl) return;
    const aid = pendingAssistantIdRef.current;
    if (!aid) return;
    const formatForTurn = pendingPromptMemoryRef.current?.format ?? postFormat;
    const countForTurn = pendingPromptMemoryRef.current?.carouselCount ?? carouselCount;
    setChatMessages((prev) =>
      prev.map((m) =>
        m.id === aid && m.role === "assistant"
          ? {
              ...m,
              status: "done" as const,
              text:
                formatForTurn === "carousel"
                  ? `Here’s slide 1 of ${countForTurn ?? 3} — building the rest of your carousel…`
                  : "Here’s your image.",
              aspect: effectiveAspect,
              imageUrl: generatedUrl,
            }
          : m,
      ),
    );
    const mem = pendingPromptMemoryRef.current;
    if (mem) {
      setRecentPrompts(pushPromptMemory(locationId, mem));
      pendingPromptMemoryRef.current = null;
    }
    pendingAssistantIdRef.current = null;
    composeInFlightRef.current = false;

    if (formatForTurn === "carousel") {
      const intent =
        lastGenPrompt.trim() ||
        mem?.text ||
        composerBrief.trim() ||
        prompt.trim() ||
        "Instagram carousel";
      void fillCarouselSlides(generatedUrl, intent, countForTurn ?? 3);
    } else {
      clearCarousel();
    }
  }, [
    genState,
    generatedUrl,
    effectiveAspect,
    locationId,
    postFormat,
    carouselCount,
    lastGenPrompt,
    composerBrief,
    prompt,
    fillCarouselSlides,
    clearCarousel,
  ]);

  const resolveWebsiteBrand = useCallback(
    async (
      sourceText: string,
    ): Promise<{
      imageUrl: string | null;
      imageUrls: string[];
      enrichedIntent: string | null;
      label: string | null;
      error: string | null;
    }> => {
      const pageUrl = extractWebsiteUrl(sourceText);
      if (!pageUrl) {
        return { imageUrl: null, imageUrls: [], enrichedIntent: null, label: null, error: null };
      }

      setRefImageLoading(true);
      try {
        // Cap wait so a slow/bot-walled site can't burn the whole Generate turn
        // before Director + image gen even start.
        const res = await fetch("/api/studio/preview-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ url: pageUrl }),
          signal: AbortSignal.timeout(12_000),
        });
        const data = (await res.json()) as OpenGraphMeta & {
          url?: string;
          error?: string;
          imageUrls?: string[];
        };
        if (!res.ok) {
          return {
            imageUrl: null,
            imageUrls: [],
            enrichedIntent: null,
            label: null,
            error: data.error || "Could not read that website",
          };
        }
        const meta = {
          url: data.url || pageUrl,
          title: data.title ?? null,
          description: data.description ?? null,
          imageUrl: data.imageUrl ?? null,
          siteName: data.siteName ?? null,
        };
        const imageUrls = Array.isArray(data.imageUrls)
          ? data.imageUrls.filter((u): u is string => typeof u === "string").slice(0, 4)
          : meta.imageUrl
            ? [meta.imageUrl]
            : [];
        const baseIntent = (composerBrief || prompt).trim();
        const enrichedIntent = enrichIntentWithSiteContext(
          baseIntent || `Create images for ${meta.url}`,
          meta,
        );
        let host = "website";
        try {
          host = new URL(meta.url).hostname.replace(/^www\./, "");
        } catch {
          /* keep default */
        }
        const label = meta.siteName || meta.title || host;
        return { imageUrl: meta.imageUrl, imageUrls, enrichedIntent, label, error: null };
      } catch {
        return {
          imageUrl: null,
          imageUrls: [],
          enrichedIntent: null,
          label: null,
          error: "Could not read that website",
        };
      } finally {
        setRefImageLoading(false);
      }
    },
    [composerBrief, prompt],
  );

  const runComposeFromIntent = useCallback(async (overrideUserText?: string) => {
    let nextRef = refImage;
    let briefOverride: string | undefined;
    const sourceText = `${prompt}\n${composerBrief}`;
    const pageUrl = extractWebsiteUrl(sourceText);
    const userText = (overrideUserText ?? composerBrief ?? prompt).trim();
    const gate = canStartStudioChatTurn({
      genState,
      refImageLoading,
      composeInFlight: composeInFlightRef.current,
      userText,
    });
    if (!gate.ok) {
      inputRef.current?.focus();
      return;
    }

    composeInFlightRef.current = true;
    setSoftNotice("");
    setError("");
    clearCarousel();

    // Archive current live image onto the previous assistant before a new turn.
    if (generatedUrl && genState === "done") {
      setChatMessages((prev) => {
        const lastAsst = [...prev].reverse().find((m) => m.role === "assistant");
        if (!lastAsst || lastAsst.imageUrl) return prev;
        return prev.map((m) =>
          m.id === lastAsst.id && m.role === "assistant"
            ? { ...m, imageUrl: generatedUrl, status: "done" as const }
            : m,
        );
      });
    }

    const userMsg = makeUserMessage(userText);
    const working = makeWorkingAssistant({
      format: postFormat,
      carouselCount,
      aspect: effectiveAspect,
    });
    pendingAssistantIdRef.current = working.id;
    pendingPromptMemoryRef.current = {
      text: userText,
      aspect: effectiveAspect,
      format: postFormat,
      carouselCount: postFormat === "carousel" ? carouselCount : undefined,
    };
    setChatMessages((prev) => [...prev, userMsg, working]);

    if (!nextRef) {
      const url = extractReferenceImageUrl(prompt) || extractReferenceImageUrl(composerBrief);
      if (url && looksLikeDirectImageUrl(url) && attachReferenceFromUrl(url)) nextRef = url;
    }

    // Website link → fetch og:image(s) + brand copy for multimodal GPT compose.
    let siteGrounded = false;
    let siteImageUrls: string[] = [];
    if (pageUrl) {
      const site = await resolveWebsiteBrand(sourceText);
      // Re-check in-flight: user may have navigated away; still finish this turn.
      if (site.enrichedIntent) {
        briefOverride = site.enrichedIntent;
        siteGrounded = true;
      }
      if (site.imageUrls.length > 0) {
        siteImageUrls = site.imageUrls;
      }
      if (!nextRef && site.imageUrl && !isProductAdBrief(userText) && attachReferenceFromUrl(site.imageUrl)) {
        nextRef = site.imageUrl;
        if (site.label) setRefName(site.label);
      } else if (!nextRef && site.error) {
        // Soft notice — never marks the assistant bubble as failed.
        setSoftNotice(`${site.error}. Generating from your prompt instead.`);
        // Bot-walled site: let the Director lean on general brand knowledge
        // for AESTHETICS only — inventing stats/claims is the failure mode
        // the verbatim-facts pipeline exists to prevent. Compose/director cap
        // intent at 1000 chars — clamp the base so the note always survives.
        const knowledgeNote =
          "\n\nNote: that website could not be fetched. You may draw on general knowledge of this brand's look and product category for tasteful art direction, but NEVER invent statistics, study results, review scores, or specific product claims.";
        briefOverride =
          (briefOverride || userText).slice(0, 990 - knowledgeNote.length) + knowledgeNote;
        siteGrounded = true;
      }
    }

    let intent = briefOverride || userText;
    intent = enrichIntentWithFormat(intent, postFormat, carouselCount);
    const asks = recentAsksHint(loadPromptMemory(locationId), 3);
    if (asks && !intent.includes("Recent asks:")) {
      const withAsks = `${intent}\n\n${asks}`;
      intent = withAsks.length > 980 ? withAsks.slice(0, 980) : withAsks;
    }

    await composeFromIntent(intent, nextRef, { siteGrounded, siteImageUrls });
  }, [
    attachReferenceFromUrl,
    carouselCount,
    clearCarousel,
    composeFromIntent,
    composerBrief,
    effectiveAspect,
    genState,
    generatedUrl,
    locationId,
    postFormat,
    prompt,
    refImage,
    refImageLoading,
    resolveWebsiteBrand,
  ]);

  const startCaptionGeneration = () => {
    const b = captionBrief.trim() || composerBrief.trim() || lastGenPrompt.trim();
    if (!b && !generatedUrl) return;
    setCaptionSourceBrief(b);
    setCaptionVariants([]);
    setCaptionVariantIdx(0);
    setCaptionRun((n) => n + 1);
  };

  useEffect(() => {
    document.title = "Posterboy Studio | posterboy";
  }, []);

  // Consume an incoming ?mediaUrl= ONCE on mount. Without this guard, any later
  // re-render while the param lingers in the URL overwrites a freshly generated
  // image and resets the editor (C5).
  const consumedMediaParam = useRef(false);
  useEffect(() => {
    if (consumedMediaParam.current) return;
    const mediaUrl = searchParams.get("mediaUrl");
    const type = searchParams.get("mediaType");
    if (!mediaUrl) return;
    consumedMediaParam.current = true;
    setGeneratedUrl(mediaUrl);
    setGenState("done");
    setShowTemplate(true);
    if (type !== "video") void generateCaption(); // parity with confirmToTemplate
    if (type === "video") {
      setMediaKind("video");
      setComposerMode("video");
      setPlatformIdx(PLATFORMS.findIndex((p) => p.id === "tiktok") >= 0 ? PLATFORMS.findIndex((p) => p.id === "tiktok") : 0);
    }
    const next = new URLSearchParams(searchParams.toString());
    next.delete("mediaUrl");
    next.delete("mediaType");
    const qs = next.toString();
    router.replace(qs ? `/dashboard/studio?${qs}` : "/dashboard/studio", { scroll: false });
  }, [searchParams, router]);

  // ?dupe= — Top Performing (and similar) handoffs: attach as reference + auto-generate.
  const consumedDupeParam = useRef(false);
  const pendingDupeBrief = useRef<string | null>(null);
  useEffect(() => {
    if (consumedDupeParam.current) return;
    const dupe = searchParams.get("dupe");
    if (!dupe) return;
    consumedDupeParam.current = true;
    const brief =
      searchParams.get("brief")?.trim() ||
      "Create a fresh Instagram variation of this top-performing post — same subject and energy, new composition, vivid commercial photography, no text overlay.";
    const clipped = brief.slice(0, 300);
    setComposerMode("image");
    setMediaKind("image");
    setRefImage(dupe);
    setRefName("Top performing");
    setPrompt(clipped);
    pendingDupeBrief.current = clipped;
    const next = new URLSearchParams(searchParams.toString());
    next.delete("dupe");
    next.delete("brief");
    const qs = next.toString();
    router.replace(qs ? `/dashboard/studio?${qs}` : "/dashboard/studio", { scroll: false });
  }, [searchParams, router]);

  useEffect(() => {
    const brief = pendingDupeBrief.current;
    if (!brief || !refImage || genState !== "idle") return;
    pendingDupeBrief.current = null;
    void generate(brief);
  }, [refImage, genState, generate]);

  // ?brief= — arrive with the composer pre-filled (home week rail, holiday
  // suggestions). Prefill only: the user still pulls the trigger.
  const consumedBriefParam = useRef(false);
  useEffect(() => {
    if (consumedBriefParam.current) return;
    // Owned by the ?dupe= handoff above.
    if (searchParams.get("dupe")) return;
    const brief = searchParams.get("brief");
    if (!brief) return;
    consumedBriefParam.current = true;
    setPrompt(brief.slice(0, 300));
    const next = new URLSearchParams(searchParams.toString());
    next.delete("brief");
    const qs = next.toString();
    router.replace(qs ? `/dashboard/studio?${qs}` : "/dashboard/studio", { scroll: false });
    // land ready to type the rest
    setTimeout(() => {
      const el = inputRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    }, 150);
  }, [searchParams, router]);

  // Platform / aspect / format menus: outside-click + Escape to close.
  useEffect(() => {
    if (!platformMenuOpen && !aspectMenuOpen && !formatMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (platformMenuRef.current && !platformMenuRef.current.contains(t)) {
        setPlatformMenuOpen(false);
      }
      if (aspectMenuRef.current && !aspectMenuRef.current.contains(t)) {
        setAspectMenuOpen(false);
      }
      if (formatMenuRef.current && !formatMenuRef.current.contains(t)) {
        setFormatMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPlatformMenuOpen(false);
        setAspectMenuOpen(false);
        setFormatMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [platformMenuOpen, aspectMenuOpen, formatMenuOpen]);

  // Chat UX: composer stays sticky at the bottom (no centered hero bar).
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const bar = canvas.querySelector<HTMLElement>(".prompt-bar");
    if (!bar) return;
    bar.classList.remove("is-hero");
    gsap.killTweensOf(bar);
    gsap.set(bar, { clearProps: "x,xPercent,y,yPercent,transform" });
  }, []);

  // Kill leftover GSAP transforms only — never clear width/height (React owns those).
  useEffect(() => {
    const slot = frameWrapRef.current;
    if (!slot) return;
    gsap.killTweensOf(slot);
    gsap.set(slot, { clearProps: "opacity,y,x,xPercent,yPercent,transform" });
  }, [genState, chatMessages.length]);


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

  // Stage band size — preview fills this box without overlapping chrome/composer/rail.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setStageSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Close the post-type popover on outside click (lives in the right rail).
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

  useFocusTrap(reviewOptionsOpen, reviewOptionsRef, () => setReviewOptionsOpen(false));

  useEffect(() => {
    if (!reviewOptionsOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (reviewOptionsRef.current?.contains(e.target as Node)) return;
      setReviewOptionsOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [reviewOptionsOpen]);

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

  const ASPECT_FRAME: Record<string, { w: number; h: number }> = {
    "1:1": { w: 1080, h: 1080 },
    "4:5": { w: 1080, h: 1350 },
    "9:16": { w: 1080, h: 1920 },
    "16:9": { w: 1280, h: 720 },
  };
  const frameDims =
    (aspectOverride && ASPECT_FRAME[aspectOverride]) || { w: platform.w, h: platform.h };
  const frameRatio = frameDims.w / frameDims.h;

  // Fit the preview inside the stage band (below chrome, above composer, clear of edit rail).
  const frameWrapStyle: CSSProperties = (() => {
    const railClearance = genState === "done" ? 80 : 32;
    const availW = Math.max(140, (stageSize.w || 400) - railClearance);
    const availH = Math.max(140, (stageSize.h || 300) - 24);
    const maxW = Math.min(availW, 340);
    const maxH = Math.min(availH, 420);
    let w = maxW;
    let h = w / frameRatio;
    if (h > maxH) {
      h = maxH;
      w = h * frameRatio;
    }
    w = Math.round(w);
    h = Math.round(h);
    return {
      position: "relative",
      top: "auto",
      left: "auto",
      right: "auto",
      bottom: "auto",
      transform: "none",
      width: w,
      height: showTemplate ? "auto" : h,
      maxWidth: maxW,
      maxHeight: maxH,
      margin: "0 auto",
      zIndex: 2,
    };
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
      aiCaptionRef.current = body;
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
    setComposerMode("video");
    setGenState("done");
    setShowTemplate(true);
    setCaptionState("idle");
    setVideoBusy(false);
    setVideoStatusText("");
  };

  const stopVideoJob = useCallback(() => {
    videoAbortRef.current?.abort();
    videoAbortRef.current = null;
    setVideoBusy(false);
    setVideoStatusText("");
  }, []);

  const runVeo = useCallback(
    async (opts: { prompt: string; image?: string | null }) => {
      const brief = opts.prompt.trim();
      if (!brief) {
        setError("Describe the video you want.");
        return;
      }
      if (!canUseProImage) {
        setError("Video is a Pro feature.");
        return;
      }
      stopVideoJob();
      const ctrl = new AbortController();
      videoAbortRef.current = ctrl;
      setVideoBusy(true);
      setError("");
      setShowTemplate(false);
      setGenState("generating");
      setVideoStatusText("Starting video…");
      try {
        const { videoUrl } = await startAndPollVideo({
          prompt: brief,
          image: opts.image,
          aspectRatio: veoAspectForPlatform(platform.id),
          signal: ctrl.signal,
          onStatus: (s) => {
            if (s.phase === "starting") setVideoStatusText("Starting video…");
            if (s.phase === "processing") {
              const sec = Math.round(s.elapsedMs / 1000);
              setVideoStatusText(
                sec < 20
                  ? "Generating video…"
                  : `Still generating… ${sec}s (Veo can take a few minutes)`,
              );
            }
          },
        });
        handleVideoReady(videoUrl);
        pushHistory(videoUrl, brief);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          setGenState(generatedUrl && mediaKind === "image" ? "done" : "idle");
          return;
        }
        setError(err instanceof Error ? err.message : "Video generation failed.");
        setGenState(generatedUrl && mediaKind === "image" ? "done" : "idle");
        setVideoBusy(false);
        setVideoStatusText("");
      } finally {
        videoAbortRef.current = null;
      }
    },
    [
      canUseProImage,
      generatedUrl,
      mediaKind,
      platform.id,
      pushHistory,
      stopVideoJob,
    ],
  );

  const animateCurrentImage = useCallback(() => {
    if (!generatedUrl || mediaKind !== "image") return;
    const brief =
      (composerBrief || prompt || lastGenPrompt || "Subtle cinematic motion, natural light").trim();
    void runVeo({ prompt: brief, image: generatedUrl });
  }, [composerBrief, generatedUrl, lastGenPrompt, mediaKind, prompt, runVeo]);

  const requestVideoMode = useCallback(() => {
    if (composerMode === "video") return;
    if (generatedUrl || genState === "done") {
      setConfirmVideoSwitch(true);
      return;
    }
    setComposerMode("video");
    setMediaKind("video");
  }, [composerMode, genState, generatedUrl]);

  const requestImageMode = useCallback(() => {
    if (composerMode === "image") return;
    stopVideoJob();
    setComposerMode("image");
    setMediaKind("image");
    setGenState("idle");
    setGeneratedUrl(null);
    setShowTemplate(false);
  }, [composerMode, stopVideoJob]);

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
    const platforms = socialPlatformsFromComposerId(platform.id);
    const isVideo = mediaKind === "video";

    // Edit-diff learning: if they reshaped the AI's caption before publishing,
    // record what changed so future drafts pre-apply it. Fire-and-forget.
    if (aiCaptionRef.current && captionText && aiCaptionRef.current.trim() !== captionText.trim()) {
      void fetch("/api/ai/caption-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiOriginal: aiCaptionRef.current, finalCaption: captionText }),
      }).catch(() => {});
    }

    // R3: never silently re-route a preview-only platform (TikTok used to
    // quietly publish to Instagram).
    if (!platform.publishable) {
      setError(
        `${platform.label} publishing isn't connected yet. Use the platform menu (top left) to switch to Instagram or Facebook, or download the image instead.`,
      );
      return;
    }

    const metaTarget = platform.id === "facebook" ? "facebook" : "instagram";

    setPublishing(true);
    setError("");
    // C8: the public (S3) URL Meta actually published — store THIS, not base64.
    let publishedMediaUrl: string | null = generatedUrl;
    try {
      if (metaTarget) {
        const { buildMetaPublishPayload } = await import("@/lib/meta-publish-payload");
        const exactPublish = isVideo
          ? generatedUrl
          : await resizeToExact(generatedUrl as string, frameDims.w, frameDims.h);
        const payload = await buildMetaPublishPayload({
          platform: metaTarget,
          caption: fullCaption,
          locationId,
          ...(isVideo
            ? { videoUrl: generatedUrl, mediaType: "video" as const }
            : { imageUrl: exactPublish, mediaType: "image" as const }),
        });
        publishedMediaUrl = payload.imageUrl ?? payload.videoUrl ?? generatedUrl;
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
        mediaUrl: publishedMediaUrl,
        mediaUrls: publishedMediaUrl ? [publishedMediaUrl] : [],
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

  const goToSchedule = async () => {
    if (genState !== "done" || !generatedUrl) {
      router.push("/dashboard/calendar");
      return;
    }
    setSchedulingNav(true);
    setError("");
    try {
      const { resolvePublicImageUrl } = await import("@/lib/upload-public-image");
      const exact =
        mediaKind === "image"
          ? await resizeToExact(generatedUrl, frameDims.w, frameDims.h)
          : generatedUrl;
      const mediaPublicUrl = exact ? await resolvePublicImageUrl(exact) : null;
      writeStudioScheduleHandoff({
        mediaUrl: mediaPublicUrl || exact || generatedUrl,
        mediaType: mediaKind,
        caption: buildPostCaption(captionText, captionTags, prompt),
        platformId: platform.id,
        format: postFormat,
        carouselCount: postFormat === "carousel" ? carouselCount : undefined,
        ...(postFormat === "carousel"
          ? {
              mediaUrls: carouselSlides.filter((u): u is string => !!u),
            }
          : {}),
      });
      router.push("/dashboard/calendar?from=studio");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open Schedule.");
      setSchedulingNav(false);
    }
  };

  return (
    <div className="pb-studio h-full overflow-hidden">
      <StudioStyles />
      <div className="app">

        <LocationGate
          loading={locationLoading}
          error={locationError}
          locationId={locationId}
          onRetry={() => void refresh()}
          skeleton={
            <main className={`canvas canvas-theme-${theme}`} aria-busy="true">
              <h1 className="sr-only">Studio</h1>
              <div className="canvas-wall-lines" />
              <div className="canvas-floor" />
            </main>
          }
        >
        {/* CANVAS */}
        <main
          className={`canvas canvas-theme-${theme} is-chat-layout`}
          ref={canvasRef}
          data-studio-layout="chat-v3"
        >
          <h1 className="sr-only">Studio</h1>
          <div className="canvas-wall-lines" />
          <div className="canvas-floor" />

          <div className={`canvas-top${genState === "done" ? " has-actions" : ""}`}>
            <div className="top-left">
              {/* Platform is INFERRED from the prompt (default Instagram) — no
                  pre-deciding. The chip appears once work exists, to switch. */}
              {genState !== "idle" || generatedUrl || composerMode === "video" ? (
                <div className="post-select" ref={platformMenuRef}>
                  <button
                    type="button"
                    className={`dim-chip${platformMenuOpen ? " open" : ""}`}
                    onClick={() => setPlatformMenuOpen((o) => !o)}
                    aria-expanded={platformMenuOpen}
                    aria-haspopup="listbox"
                    aria-label={`Platform: ${platform.label}, ${platform.w} by ${platform.h}`}
                  >
                    <PlatformIcon type={platform.id} />
                    <span className="post-label">{platform.label}</span>
                    <span className="post-meta">{platform.w}×{platform.h}</span>
                    <svg className="chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                  {platformMenuOpen ? (
                    <ul
                      className="post-menu"
                      role="listbox"
                      aria-label="Choose platform"
                      ref={(el) => {
                        // focus the selected option when the menu opens
                        el?.querySelectorAll("button")[platformIdx]?.focus();
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
                        e.preventDefault();
                        const opts = [...e.currentTarget.querySelectorAll("button")];
                        const cur = opts.indexOf(document.activeElement as HTMLButtonElement);
                        const next = e.key === "ArrowDown" ? Math.min(cur + 1, opts.length - 1) : Math.max(cur - 1, 0);
                        opts[next]?.focus();
                      }}
                    >
                      {PLATFORMS.map((p, i) => (
                        <li key={p.id} role="presentation">
                          <button
                            type="button"
                            className="post-option"
                            role="option"
                            aria-selected={platformIdx === i}
                            onClick={() => {
                              setPlatformIdx(i);
                              platformPinRef.current = true;
                              // Manual platform pick clears aspect pin so crop matches platform.
                              aspectPinRef.current = false;
                              setAspectOverride(null);
                              setPlatformMenuOpen(false);
                            }}
                          >
                            <span className="post-label">
                              {p.label}
                              {p.publishable ? null : <em className="post-soon"> preview only</em>}
                            </span>
                            <span className="post-meta">{p.w}×{p.h}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
              {/* Mode switching lives in the composer head tabs now. */}
            </div>

            {genState === "done" ? (
              <div className="top-actions" role="group" aria-label="Post actions">
                {mediaKind === "image" ? (
                  <button
                    type="button"
                    className="preview-toggle"
                    onClick={() => void animateCurrentImage()}
                    disabled={publishing || schedulingNav || videoBusy}
                    title="Animate this image with Veo"
                  >
                    <Clapperboard size={15} />
                    <span>{videoBusy ? "Animating…" : "Animate"}</span>
                  </button>
                ) : null}
                <button
                  type="button"
                  className="preview-toggle"
                  onClick={() => void publish()}
                  disabled={publishing || schedulingNav || videoBusy}
                  title="Publish immediately"
                >
                  <Send size={15} />
                  <span>{publishing ? "Posting…" : "Post now"}</span>
                </button>
                <button
                  type="button"
                  className="preview-toggle"
                  onClick={() => void goToSchedule()}
                  disabled={publishing || schedulingNav || videoBusy}
                  title="Open Schedule with this post"
                >
                  <Calendar size={15} />
                  <span>{schedulingNav ? "Opening…" : "Schedule"}</span>
                </button>
                {mediaKind !== "video" ? (
                  <button
                    type="button"
                    className="preview-toggle"
                    onClick={() => {
                      if (showTemplate) setShowTemplate(false);
                      else confirmToTemplate();
                    }}
                    aria-pressed={showTemplate}
                    title={showTemplate ? "Back to edit" : "Preview as post"}
                  >
                    {showTemplate ? <Pencil size={15} /> : <Eye size={15} />}
                    <span>{showTemplate ? "Edit" : "Preview"}</span>
                  </button>
                ) : null}
              </div>
            ) : null}

            <div className="top-toggles">
              <button
                type="button"
                className={historyOpen ? "active" : ""}
                onClick={() => setHistoryOpen((o) => !o)}
                aria-label="Recent creations"
                aria-haspopup="dialog"
                aria-expanded={historyOpen}
              >
                <History size={16} />
              </button>
              <button
                type="button"
                className={theme === "light" ? "active" : ""}
                onClick={() => setTheme("light")}
                aria-label="Light canvas theme"
                aria-pressed={theme === "light"}
              >
                <Sun size={16} />
              </button>
              <button
                type="button"
                className={theme === "grid" ? "active" : ""}
                onClick={() => setTheme("grid")}
                aria-label="Grid canvas theme"
                aria-pressed={theme === "grid"}
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>

          <div className="studio-body">
          <StudioChatThread
            messages={chatMessages}
            resultUrl={
              genState === "done" &&
              mediaKind === "image" &&
              postFormat !== "carousel"
                ? generatedUrl
                : null
            }
          />

          <div className="studio-stage" ref={stageRef}>
          {/* Coverflow for carousel format — prev / selected / next positions. */}
          {genState === "done" &&
          mediaKind === "image" &&
          postFormat === "carousel" &&
          carouselSlides.length > 0 &&
          !showTemplate ? (
            <StudioCoverflow
              slides={carouselSlides.map((url) => ({ url }))}
              selectedIndex={carouselSelected}
              onSelect={selectCarouselSlide}
              aspectRatio={`${frameDims.w} / ${frameDims.h}`}
            />
          ) : null}

          {/* Always-on result layer — sits above chat + frame so a blank frame
              can never hide a successful generation. */}
          {genState === "done" &&
          mediaKind === "image" &&
          generatedUrl &&
          postFormat !== "carousel" &&
          !showTemplate ? (
            <div className="studio-result-stage" data-studio-result="1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={generatedUrl}
                alt="Generated studio image"
                style={{
                  transform: `translate(${edit.x}%, ${edit.y}%) scale(${edit.scale}) rotate(${edit.rotate}deg)`,
                  filter: `brightness(${edit.brightness}%) contrast(${edit.contrast}%) saturate(${edit.saturate}%)`,
                }}
                onError={(e) => {
                  const el = e.currentTarget;
                  el.style.display = "none";
                  const host = el.parentElement;
                  if (host && !host.querySelector("[data-img-error]")) {
                    const p = document.createElement("p");
                    p.dataset.imgError = "1";
                    p.textContent = "Image data couldn’t be displayed. Try Create again.";
                    host.appendChild(p);
                    host.classList.add("studio-result-stage--missing");
                  }
                }}
              />
            </div>
          ) : null}
          {genState === "done" && mediaKind === "image" && !generatedUrl && !showTemplate ? (
            <div className="studio-result-stage studio-result-stage--missing" role="alert" data-studio-result="missing">
              <p>Generation finished but no image was returned. Try Create again.</p>
            </div>
          ) : null}

          {/* Frame lives on the canvas (not inside the chat scroller) so absolute
              positioning + % height resolve against the canvas, not a 0-height parent. */}
          {!(
            genState === "idle" &&
            !generatedUrl &&
            !showTemplate &&
            composerMode === "image" &&
            chatMessages.length === 0
          ) ? (
          <div
            ref={frameWrapRef}
            className={`frame-wrap${showTemplate ? ` as-post pc-platform-${platform.id}` : ""}${genState === "idle" && composerMode === "image" && !showTemplate ? " is-idle" : ""}${genState === "generating" ? " is-generating" : ""}${genState === "done" && mediaKind === "image" && !showTemplate ? " is-chat-result" : ""}`}
            style={frameWrapStyle}
          >
            {/* Ambient backlight: the generated image casts its own light — a
                blurred copy of itself behind the frame (sized by the selected
                aspect, since it mirrors the frame box). */}
            {generatedUrl && mediaKind === "image" && (genState === "done" || showTemplate) ? (
              <div
                className="ambient-glow"
                style={{ backgroundImage: `url(${JSON.stringify(generatedUrl)})` }}
                aria-hidden
              />
            ) : null}
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
                    imageLabel={previewImageLabel}
                  />
                ) : platform.id === "facebook" ? (
                  <FacebookPreview
                    pageName={previewPageName}
                    caption={captionState === "error" ? "" : captionText}
                    tags={captionTags}
                    mediaStyle={previewStyle}
                    aspectRatio={`${platform.w} / ${platform.h}`}
                    captionLoading={captionState === "loading"}
                    imageLabel={previewImageLabel}
                  />
                ) : (
                  <StudioPostChrome
                    platform={platform.id}
                    mediaStyle={previewStyle}
                    aspect={`${platform.w} / ${platform.h}`}
                    caption={captionState === "error" ? "" : captionText}
                    tags={captionTags}
                    captionLoading={captionState === "loading"}
                    imageLabel={previewImageLabel}
                    onClose={() => setShowTemplate(false)}
                  />
                )}
                {captionState === "error" && mediaKind !== "video" ? (
                  <p className="studio-caption-error-overlay">{captionError}</p>
                ) : null}
              </>
            ) : composerMode === "video" && genState === "idle" && !videoBusy ? (
              <div className="studio-video-compose">
                <VideoComposer
                  onComplete={handleVideoReady}
                  onError={(msg) => setError(msg)}
                  aspectHint={veoAspectForPlatform(platform.id)}
                />
              </div>
            ) : (
              <div
                className={`frame${genState === "generating" ? " generating" : ""}${genState === "done" ? " done" : ""}${genState === "idle" && composerMode === "image" ? " idle" : ""}${canEditImage ? " editable" : ""}`}
                style={{ width: "100%", height: "100%", position: "relative" }}
                onPointerDown={onImagePointerDown}
                onPointerMove={onImagePointerMove}
                onPointerUp={onImagePointerUp}
                onPointerCancel={onImagePointerUp}
              >
                <div className="emerge" style={{ opacity: emergeOpacity }} />
                {/* Preview bg layer (may start at opacity 0). Real pixels live on
                    .preview-img as a SIBLING so they are never trapped at opacity 0. */}
                <div
                  className="preview"
                  style={previewStyle}
                  role="img"
                  aria-label={previewImageLabel}
                />
                {generatedUrl && mediaKind === "image" && genState === "done" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="preview-img"
                    src={generatedUrl}
                    alt="Generated studio image"
                    style={{
                      transform: `translate(${edit.x}%, ${edit.y}%) scale(${edit.scale}) rotate(${edit.rotate}deg)`,
                      filter: `brightness(${edit.brightness}%) contrast(${edit.contrast}%) saturate(${edit.saturate}%)`,
                    }}
                  />
                ) : null}
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
                {/* T2: no fabricated percentage — staged status text only;
                    `progress` stays internal to drive the reveal animation. */}
                {genState === "generating" && (
                  <div className="gen-progress">
                    {videoBusy ? videoStatusText || "Generating video…" : statusText}
                    {videoBusy ? (
                      <button
                        type="button"
                        className="studio-video-cancel"
                        onClick={stopVideoJob}
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                )}
                {genState === "idle" && composerMode === "image" ? (
                  <div className="studio-intent-stage">
                    {/* Captions moved to the post-image step (driven by the prompt bar). */}
                  </div>
                ) : null}
              </div>
            )}
          </div>
          ) : null}

          {error ? (
            <div className="studio-error">
              <p>{error}</p>
              {/connect/i.test(error) && /meta|facebook|instagram/i.test(error) ? (
                <a className="studio-error-cta" href="/dashboard/settings?tab=account">
                  Connect Facebook
                </a>
              ) : /pro feature|upgrade to unlock/i.test(error) ? (
                <a className="studio-error-cta" href="/dashboard/settings?tab=billing">
                  Upgrade plan
                </a>
              ) : null}
              <button type="button" onClick={() => setError("")}>Dismiss</button>
            </div>
          ) : softNotice ? (
            <div className="studio-error studio-soft-notice">
              <p>{softNotice}</p>
              <button type="button" onClick={() => setSoftNotice("")}>Dismiss</button>
            </div>
          ) : null}
          </div>{/* /.studio-stage */}
          </div>{/* /.studio-body */}

          {/* Image edit tools */}
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

            </div>
          )}

          {historyOpen ? (
            <StudioHistoryGallery
              entries={genHistory}
              onClose={() => setHistoryOpen(false)}
              onPick={(e) => {
                adoptImage(e.url);
                setLastGenPrompt(e.prompt);
                clearComposeFieldForReview();
                setHistoryOpen(false);
              }}
            />
          ) : null}

          <div
            className={`prompt-bar${genState === "generating" ? " is-generating" : ""}${
              hasCaptionReady && genState === "done" ? " is-finish" : ""
            } is-chat`}
            style={{
              position: "relative",
              top: "auto",
              bottom: "auto",
              left: "auto",
              right: "auto",
              transform: "none",
              zIndex: 40,
              margin: "6px auto 12px",
              width: "min(880px, calc(100% - 24px))",
              flex: "0 0 auto",
            }}
          >
            {/* Composer head: mode tabs + brand kit (creator-studio card chrome) */}
            {genState !== "generating" ? (
              <div className="pb-bar-head">
                <div className="pb-mode-tabs" role="group" aria-label="Studio mode">
                  <button
                    type="button"
                    className={`pb-mode-tab${composerMode === "image" ? " is-active" : ""}`}
                    aria-pressed={composerMode === "image"}
                    title="Image mode"
                    onClick={requestImageMode}
                    disabled={videoBusy}
                  >
                    <ImageTabIcon size={15} strokeWidth={1.9} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className={`pb-mode-tab${composerMode === "video" ? " is-active" : ""}`}
                    aria-pressed={composerMode === "video"}
                    title="Video mode — publish coming soon in closed beta"
                    onClick={requestVideoMode}
                    disabled={videoBusy}
                  >
                    <Clapperboard size={15} strokeWidth={1.9} aria-hidden />
                  </button>
                </div>
              </div>
            ) : null}
            {promptMode !== "caption" && genState !== "generating" && recentPrompts.length > 0 ? (
              <div className="studio-recent-prompts" role="list" aria-label="Recent prompts">
                {recentPrompts.slice(0, 8).map((entry) => (
                  <button
                    key={`${entry.at}-${entry.text.slice(0, 24)}`}
                    type="button"
                    role="listitem"
                    className="studio-recent-chip"
                    title={entry.text}
                    onClick={() => {
                      setPrompt(entry.text);
                      if (entry.aspect && STUDIO_ASPECT_OPTIONS.includes(entry.aspect as StudioChatAspect)) {
                        setAspectOverride(entry.aspect as StudioChatAspect);
                        aspectPinRef.current = true;
                        setPlatformIdx(platformIdxForAspect(entry.aspect, PLATFORMS));
                      }
                      if (entry.format === "carousel") {
                        setPostFormat("carousel");
                        if (entry.carouselCount) setCarouselCount(entry.carouselCount);
                      } else if (entry.format === "single") {
                        setPostFormat("single");
                      }
                      window.setTimeout(() => {
                        syncPromptHeight();
                        inputRef.current?.focus();
                      }, 0);
                    }}
                  >
                    {entry.text.length > 36 ? `${entry.text.slice(0, 34)}…` : entry.text}
                  </button>
                ))}
              </div>
            ) : null}
            {/* Same composer field before and after generate — image lives in the chat thread */}
            {promptMode === "caption" && genState === "done" ? (
            <div className="pb-bar-input">
              <textarea
                  ref={inputRef}
                  rows={1}
                  className={`pb-bar-textarea pb-caption-field${capFading ? " is-fading" : ""}`}
                  value={captionBrief}
                  onChange={(e) => {
                    setCaptionBrief(e.target.value);
                    syncPromptHeight();
                    if (captionVariants.length > 0) setCaptionText(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (captionVariants.length === 0) startCaptionGeneration();
                    }
                  }}
                  placeholder={
                    captionVariants.length > 0
                      ? "Your caption — edit it however you like"
                      : "Writing caption options…"
                  }
                  aria-label={
                    captionVariants.length > 0 ? "Caption — editable" : "Caption"
                  }
                />
            </div>
            ) : (
            <div className="pb-bar-input">
              {selectedIntent ? (
                <>
                <button
                  type="button"
                  className="pb-plus"
                  onClick={() => refFileRef.current?.click()}
                  title="Attach a reference photo"
                  aria-label="Attach a reference photo"
                >
                  <Plus size={18} strokeWidth={2} aria-hidden />
                </button>
                <textarea
                  ref={inputRef}
                  rows={1}
                  className="pb-bar-textarea"
                  value={intentDetail}
                  onChange={(e) => {
                    setIntentDetail(e.target.value);
                    syncPromptHeight();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (
                        genState !== "generating" &&
                        !refImageLoading &&
                        !composeInFlightRef.current &&
                        composerMode === "image"
                      ) {
                        void runComposeFromIntent();
                      }
                    }
                  }}
                  placeholder={selectedIntent.detailPlaceholder}
                  disabled={genState === "generating"}
                  aria-label={`Details for ${selectedIntent.label}`}
                />
                </>
              ) : (
                <>
                {composerMode === "image" ? (
                  <button
                    type="button"
                    className="pb-plus"
                    onClick={() => refFileRef.current?.click()}
                    title="Attach a reference photo"
                    aria-label="Attach a reference photo"
                  >
                    <Plus size={18} strokeWidth={2} aria-hidden />
                  </button>
                ) : null}
                <textarea
                  ref={inputRef}
                  rows={1}
                  className={`pb-bar-textarea${placeholderFading ? " is-placeholder-fading" : ""}`}
                  value={prompt}
                  onChange={(e) => {
                    const next = e.target.value;
                    setPrompt(next);
                    syncPromptHeight();
                    // Only auto-attach clear direct image URLs — never website pages.
                    if (!refImage && !refImageLoading && composerMode === "image") {
                      if (looksLikeStandaloneImageUrl(next)) {
                        const url = extractReferenceImageUrl(next);
                        if (url) attachReferenceFromUrl(url);
                      }
                    }
                  }}
                  onPaste={(e) => {
                    const pasted = e.clipboardData.getData("text")?.trim() || "";
                    if (!pasted || refImageLoading || composerMode !== "image") return;
                    // Website / page links must paste into the field normally.
                    // Only intercept clear direct image asset URLs.
                    if (!looksLikeDirectImageUrl(pasted) && !looksLikeStandaloneImageUrl(pasted)) {
                      return;
                    }
                    const url = extractReferenceImageUrl(pasted);
                    if (!url || !looksLikeDirectImageUrl(url)) return;
                    e.preventDefault();
                    attachReferenceFromUrl(url);
                    // Bare image URL → attach only; prose+image URL → keep text in input.
                    if (!looksLikeStandaloneImageUrl(pasted)) {
                      setPrompt((prev) => {
                        const next = `${prev}${prev && !/\s$/.test(prev) ? " " : ""}${pasted}`.trim();
                        return next;
                      });
                      window.setTimeout(() => syncPromptHeight(), 0);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (
                        genState === "generating" ||
                        refImageLoading ||
                        composeInFlightRef.current ||
                        composerMode !== "image"
                      ) {
                        return;
                      }
                      if (listingBrief && !refImage) {
                        refFileRef.current?.click();
                        return;
                      }
                      const url = extractReferenceImageUrl(prompt);
                      if (url && looksLikeDirectImageUrl(url)) {
                        attachReferenceFromUrl(url);
                      }
                      void runComposeFromIntent();
                    }
                  }}
                  placeholder={STUDIO_PROMPT_PLACEHOLDERS[placeholderIdx]}
                  disabled={genState === "generating"}
                  aria-label={
                    prefixActive
                      ? `What should the ${platform.id} post be about?`
                      : "Describe your post"
                  }
                />
                {composerMode === "image" ? (
                  <button
                    type="button"
                    className={`pb-enhance${enhanceBusy ? " is-busy" : ""}`}
                    onClick={() => void enhancePrompt()}
                    disabled={enhanceBusy || !prompt.trim()}
                    title="Enhance my prompt"
                    aria-label="Enhance my prompt"
                  >
                    <EnhanceIcon size={16} strokeWidth={1.9} aria-hidden />
                  </button>
                ) : null}
                </>
              )}
            </div>
            )}

            {/* Listing briefs need THEIR photo — AI cannot know what the
                property looks like and would invent one. Non-blocking nudge. */}
            {genState === "idle" && composerMode === "image" && !refImage && listingBrief ? (
              <button
                type="button"
                className="pb-listing-nudge"
                onClick={() => refFileRef.current?.click()}
              >
                <ImagePlus size={14} aria-hidden />
                <span>
                  Posting about a real property? <strong>Add your listing photo</strong> so the
                  image shows your actual listing — not an AI guess.
                </span>
              </button>
            ) : null}

            {/* Source truth when a reference is attached — keep remove available after generate */}
            {composerMode === "image" && promptMode !== "caption" && refImage ? (
              <div className="pb-media-row">
                <div className="pb-using-source" title={refName || "Reference photo"}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={refImage} alt="" />
                  <span>Using this</span>
                  <button
                    type="button"
                    className="pb-using-clear"
                    onClick={() => {
                      setRefImage(null);
                      setRefName("");
                    }}
                    aria-label="Remove reference image"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            ) : null}

            <input
              ref={refFileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={onRefFile}
              aria-hidden
              tabIndex={-1}
            />

            {/* Same Create-post footer idle and after generate — no Regenerate/Edit/Schedule swap */}
            {genState === "idle" ||
            (genState === "done" && promptMode === "image") ||
            (genState === "done" && promptMode === "caption") ? (
              <div
                className={`pb-bar-controls${
                  hasCaptionReady && genState === "done" ? " pb-bar-controls--finish" : ""
                }`}
              >
                {genState === "done" && promptMode === "caption" ? (
                  <button
                    type="button"
                    className="pb-reprompt"
                    onClick={() => {
                      setPromptMode("image");
                      window.setTimeout(() => inputRef.current?.focus(), 0);
                    }}
                    title="Back to image prompt"
                    aria-label="Back to image prompt"
                  >
                    <RotateCw size={15} />
                    <span>Image prompt</span>
                  </button>
                ) : (
                  <>
                    <div className="pb-bar-extras">
                      {composerMode === "image" ? (
                        <>
                          <span className="pb-pill-model" ref={aspectMenuRef}>
                            <button
                              type="button"
                              className={`pb-dim-chip pb-aspect-chip${aspectOverride ? " is-pinned" : ""}`}
                              onClick={() => {
                                setAspectMenuOpen((o) => !o);
                                setFormatMenuOpen(false);
                              }}
                              aria-expanded={aspectMenuOpen}
                              aria-haspopup="listbox"
                              aria-label={`Aspect ratio: ${effectiveAspect}`}
                              title="Change aspect ratio"
                            >
                              {effectiveAspect}
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                            {aspectMenuOpen ? (
                              <div className="pb-tools-pop pb-model-pop" role="listbox" aria-label="Aspect ratio">
                                {STUDIO_ASPECT_OPTIONS.map((a) => (
                                  <button
                                    key={a}
                                    type="button"
                                    role="option"
                                    aria-selected={effectiveAspect === a}
                                    onClick={() => {
                                      setAspectOverride(a);
                                      aspectPinRef.current = true;
                                      setPlatformIdx(platformIdxForAspect(a, PLATFORMS));
                                      platformPinRef.current = true;
                                      setAspectMenuOpen(false);
                                    }}
                                  >
                                    <span className="pb-model-name">{a}</span>
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </span>
                          <span className="pb-pill-model" ref={formatMenuRef}>
                            <button
                              type="button"
                              className="pb-dim-chip pb-format-chip"
                              onClick={() => {
                                setFormatMenuOpen((o) => !o);
                                setAspectMenuOpen(false);
                              }}
                              aria-expanded={formatMenuOpen}
                              aria-haspopup="listbox"
                              aria-label={
                                postFormat === "carousel"
                                  ? `Carousel, ${carouselCount} slides`
                                  : "Single image"
                              }
                              title="Post format"
                            >
                              {postFormat === "carousel" ? `${carouselCount} images` : "1 image"}
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                            {formatMenuOpen ? (
                              <div className="pb-tools-pop pb-model-pop" role="listbox" aria-label="Post format">
                                <button
                                  type="button"
                                  role="option"
                                  aria-selected={postFormat === "single"}
                                  onClick={() => {
                                    setPostFormat("single");
                                    setFormatMenuOpen(false);
                                  }}
                                >
                                  <span className="pb-model-name">Single</span>
                                  <span className="pb-model-sub">One image</span>
                                </button>
                                {[2, 3, 4, 5].map((n) => (
                                  <button
                                    key={n}
                                    type="button"
                                    role="option"
                                    aria-selected={postFormat === "carousel" && carouselCount === n}
                                    onClick={() => {
                                      setPostFormat("carousel");
                                      setCarouselCount(n);
                                      setFormatMenuOpen(false);
                                    }}
                                  >
                                    <span className="pb-model-name">Carousel · {n}</span>
                                    <span className="pb-model-sub">Hero slide 1 of {n} (v1)</span>
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </span>
                          <span className="pb-pill-model" ref={modelMenuRef}>
                            <button
                              type="button"
                              className={`pb-model-chip${imageQuality === "pro" ? " is-pro" : ""}`}
                              onClick={() => setModelMenuOpen((o) => !o)}
                              aria-expanded={modelMenuOpen}
                              aria-haspopup="listbox"
                              aria-label={`Image quality: ${imageQuality === "pro" ? "High" : "Standard"}`}
                            >
                              {imageQuality === "pro" ? "High" : "Standard"}
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                            {modelMenuOpen ? (
                              <div className="pb-tools-pop pb-model-pop" role="listbox" aria-label="Image model">
                                <button
                                  type="button"
                                  role="option"
                                  aria-selected={imageQuality === "standard"}
                                  onClick={() => {
                                    setImageQuality("standard");
                                    setModelMenuOpen(false);
                                  }}
                                >
                                  <span className="pb-model-name">Standard</span>
                                  <span className="pb-model-sub">Fast — great for drafts</span>
                                </button>
                                <button
                                  type="button"
                                  role="option"
                                  aria-selected={imageQuality === "pro"}
                                  aria-disabled={!canUseProImage}
                                  onClick={() => {
                                    if (!canUseProImage) {
                                      setModelMenuOpen(false);
                                      router.push("/dashboard/settings?tab=billing");
                                      return;
                                    }
                                    setImageQuality("pro");
                                    setModelMenuOpen(false);
                                  }}
                                >
                                  <span className="pb-model-name">High</span>
                                  <span className="pb-model-sub">
                                    {canUseProImage
                                      ? "2K, best detail & adherence"
                                      : "Upgrade to unlock — open Billing"}
                                  </span>
                                </button>
                              </div>
                            ) : null}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </>
                )}
                <span className="pb-bar-spacer" />
                {(() => {
                  const inCaption = genState === "done" && promptMode === "caption";
                  const hasVariants = inCaption && captionVariants.length > 0;
                  const listingBlocked = needsListingPhoto && !inCaption;
                  const finishReady = inCaption && hasCaptionReady;
                  return (
                    <>
                      {finishReady ? (
                        <button
                          type="button"
                          className="pb-generate pb-generate-secondary"
                          onClick={() => {
                            if (hasVariants) rotateCaption();
                            else startCaptionGeneration();
                          }}
                          disabled={hasVariants ? captionVariants.length < 2 : false}
                          aria-label={hasVariants ? "Try another caption" : "Write more caption options"}
                        >
                          <RotateCw size={15} />
                          <span>
                            {hasVariants
                              ? `Another ${captionVariantIdx + 1}/${captionVariants.length}`
                              : "More captions"}
                          </span>
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className={`pb-generate pb-generate-primary${
                          finishReady ? " pb-generate-finish" : ""
                        }`}
                        onClick={() => {
                          if (listingBlocked) {
                            refFileRef.current?.click();
                            return;
                          }
                          if (finishReady) {
                            void publish();
                            return;
                          }
                          if (inCaption) {
                            if (hasVariants) rotateCaption();
                            else startCaptionGeneration();
                          } else if (composerMode === "video") {
                            void runVeo({ prompt: composerBrief });
                          } else if (composerBrief) {
                            void runComposeFromIntent();
                          } else if (lastGenPrompt) {
                            void runComposeFromIntent(lastGenPrompt);
                          }
                        }}
                        disabled={
                          // During generate the bar unmounts; composeInFlight covers
                          // the website-preview await before genState flips.
                          refImageLoading || videoBusy || composeInFlightRef.current
                            ? true
                            : finishReady
                              ? publishing
                              : listingBlocked
                                ? false
                                : inCaption
                                  ? hasVariants
                                    ? captionVariants.length < 2
                                    : !(captionBrief.trim() || composerBrief.trim() || generatedUrl)
                                  : !composerBrief && !lastGenPrompt
                        }
                        aria-label={
                          listingBlocked
                            ? "Add your listing photo"
                            : finishReady
                              ? "Post this now"
                              : hasVariants
                                ? "Try another caption"
                                : inCaption
                                  ? "Write caption options"
                                  : composerMode === "video"
                                    ? "Create video"
                                    : "Make a post"
                        }
                      >
                        {finishReady ? (
                          <Send size={16} />
                        ) : hasVariants ? (
                          <RotateCw size={16} />
                        ) : inCaption ? (
                          <Wand2 size={16} />
                        ) : listingBlocked ? (
                          <ImagePlus size={16} />
                        ) : composerMode === "video" ? (
                          <Clapperboard size={16} />
                        ) : (
                          <Sparkles size={16} />
                        )}
                        <span>
                          {refImageLoading
                            ? "Reading site…"
                            : videoBusy
                              ? "Generating…"
                              : listingBlocked
                              ? "Add listing photo"
                              : finishReady
                                ? "Post now"
                                : hasVariants
                                  ? `Another ${captionVariantIdx + 1}/${captionVariants.length}`
                                  : inCaption
                                    ? "Captions"
                                    : composerMode === "video"
                                      ? "Create video"
                                      : "Generate"}
                        </span>
                      </button>
                    </>
                  );
                })()}
              </div>
            ) : null}

            {/* Caption generation runs headless: variants land in the field
                above and cycle in place via the "Another" button. This only
                surfaces a thin loading / error / compliance line — no overlay
                covering the image. */}
            {genState === "done" && promptMode === "caption" && captionRun > 0 ? (
              <div className="pb-caption-status">
                <CaptionVariantPicker
                  headless
                  brief={captionSourceBrief || composerBrief}
                  sourceImage={generatedUrl}
                  platform={platform.id}
                  runSignal={captionRun}
                  hideTrigger
                  approvalPipeline={features.approvalPipeline}
                  locationId={locationId}
                  platforms={socialPlatformsFromComposerId(platform.id)}
                  onVariants={onCaptionVariants}
                  onSelect={() => {}}
                />
              </div>
            ) : null}
          </div>
        </main>
        </LocationGate>

      </div>

      <DashboardConfirm
        open={confirmVideoSwitch}
        title="Switch to video?"
        message="Your current image will be discarded."
        confirmLabel="Switch to video"
        destructive
        onConfirm={() => {
          setConfirmVideoSwitch(false);
          stopVideoJob();
          setGenState("idle");
          setGeneratedUrl(null);
          setShowTemplate(false);
          setComposerMode("video");
          setMediaKind("video");
        }}
        onCancel={() => setConfirmVideoSwitch(false)}
      />
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
