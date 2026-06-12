"use client";

import { useState, useRef, useEffect, useMemo, type CSSProperties } from "react";
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
  Check,
  Crop,
  Maximize2,
  Move,
  RotateCw,
  ArrowRight,
  SlidersHorizontal,
  Download,
  Undo2,
  ImagePlus,
  Shapes,
  X,
  Sparkles,
  Lock,
  History,
} from "lucide-react";
import AppSidebar from "@/components/dashboard/AppSidebar";
import { PRO_IMAGES_ADDON_PRICE } from "@/lib/plan-features";
import StudioPostChrome from "@/components/dashboard/studio/StudioPostChrome";
import InstagramPreview from "@/components/dashboard/studio/InstagramPreview";
import FacebookPreview from "@/components/dashboard/studio/FacebookPreview";
import StrategicIntentPicker from "@/components/dashboard/studio/StrategicIntentPicker";
import TrashToTreasureUploadZone from "@/components/dashboard/studio/TrashToTreasureUploadZone";
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
import FlipWords from "@/lib/ui-snippets/text/FlipWords";
import { usePlanFeatures, usePlan } from "@/components/dashboard/PlanProvider";
import { useActiveLocation } from "@/lib/use-active-location";
import { socialPlatformsFromComposerId } from "@/lib/posterboy-types";
import { useFocusTrap } from "@/components/dashboard/use-focus-trap";
import { StudioStyles } from "./studio-styles";
import { useGenHistory } from "./hooks/use-gen-history";
import { EDIT_DEFAULT, useImageEdit } from "./hooks/use-image-edit";
import { resizeToExact, useStudioGeneration } from "./hooks/use-studio-generation";

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

// Ghost-text autofill for the free-form brief (Tab to accept). Curated,
// instant, no API calls — and BRAND-AWARE: topics follow the tenant's
// business type so a salon sees salon things, not menu items.
const AUTOFILL_FORMS = [
  "an instagram post about ",
  "a facebook post about ",
  "a post about ",
  "a tiktok about ",
  "a linkedin post about ",
];
const AUTOFILL_TOPICS: { match: RegExp; topics: string[] }[] = [
  {
    match: /food|cafe|café|coffee|restaurant|bak|brew|bar|pizz|deli|kitchen|hospitality/i,
    topics: ["today's special", "something new on the menu", "our weekend brunch", "a customer favorite", "behind the counter this morning"],
  },
  {
    match: /salon|beauty|spa|barber|hair|nail|lash|aesthet/i,
    topics: ["a fresh color transformation", "this week's openings", "a client's new look", "our self-care sunday", "booking for the weekend"],
  },
  {
    match: /real ?estate|realtor|property|brokerage|homes/i,
    topics: ["our newest listing", "a just-sold home", "an open house this weekend", "a neighborhood we love", "tips for first-time buyers"],
  },
  {
    match: /fitness|gym|yoga|pilates|train|crossfit|studio/i,
    topics: ["this week's class schedule", "a member milestone", "a quick form tip", "our morning crew", "new member specials"],
  },
  {
    match: /retail|boutique|shop|store|clothing|gift/i,
    topics: ["new arrivals this week", "a staff pick", "our weekend sale", "a customer favorite", "a restock everyone asked for"],
  },
];
const PLATFORM_INK: Record<string, string> = {
  instagram: "#C13584",
  facebook: "#1877F2",
  linkedin: "#0A66C2",
  tiktok: "#3a3a3e",
  x: "#3a3a3e",
};

const AUTOFILL_GENERIC = [
  "something new this week",
  "our latest five-star review",
  "a behind-the-scenes moment",
  "an upcoming event",
];

function buildAutofillPrompts(businessType: string | null): string[] {
  const vertical = businessType
    ? AUTOFILL_TOPICS.find((v) => v.match.test(businessType))?.topics ?? []
    : [];
  const topics = [...vertical, ...AUTOFILL_GENERIC];
  const out: string[] = [];
  for (const form of AUTOFILL_FORMS) {
    for (const t of topics) out.push(form + t);
  }
  out.push("a post that we're hiring");
  return out;
}

type PostType = "photo" | "update" | "offer";
type WhenOption = "now" | "schedule";
type GenState = "idle" | "generating" | "done";
type ComposerMode = "image" | "video";
type MediaKind = "image" | "video";

function defaultScheduleDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildPostCaption(body: string, tags: string, fallback: string): string {
  const combined = [body.trim(), tags.trim()].filter(Boolean).join(" ");
  return combined || fallback.trim();
}


export default function PosterboyStudio() {
  const [platformIdx, setPlatformIdx] = useState(0);
  const [theme, setTheme] = useState<"light" | "grid">("light");
  const [postType, setPostType] = useState<PostType>("photo");
  const [when, setWhen] = useState<WhenOption>("now");
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
  // When an image is done the bar lands on a "review" gate (image ready) — the
  // user explicitly steps into caption writing, rather than being dropped into
  // it. From review they can also re-prompt a new image.
  const [promptMode, setPromptMode] = useState<"image" | "review" | "caption">("image");
  // Reset the caption step whenever we're not on a finished image.
  useEffect(() => {
    if (genState !== "done") {
      setCaptionBrief("");
      setCaptionRun(0);
      setCaptionVariants([]);
      setCaptionVariantIdx(0);
      setCaptionSourceBrief("");
      setPromptMode("image");
    } else {
      setPromptMode("review");
    }
  }, [genState]);
  // The AI's caption as generated — compared to the final at publish to learn edits.
  const aiCaptionRef = useRef("");
  const submitCaption = () => {
    const b = captionBrief.trim();
    if (!b) return;
    setCaptionSourceBrief(b); // keep the brief; the field becomes the caption
    setCaptionVariants([]);
    setCaptionVariantIdx(0);
    setCaptionRun((n) => n + 1);
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
  // in their real product/place) + plan-gated model quality (Nano Banana Pro).
  const [refImage, setRefImage] = useState<string | null>(null);
  const [refName, setRefName] = useState("");
  const refFileRef = useRef<HTMLInputElement>(null);
  const [imageQuality, setImageQuality] = useState<"standard" | "pro">("standard");
  const [imageSize, setImageSize] = useState<"1K" | "2K">("1K");
  const [qualityOpen, setQualityOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  const onRefFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      // Downscale to keep the data URL well under request limits.
      const max = 1536;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.width * scale));
      c.height = Math.max(1, Math.round(img.height * scale));
      c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
      setRefImage(c.toDataURL("image/jpeg", 0.85));
      setRefName(file.name);
      URL.revokeObjectURL(url);
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  };
  const [composerMode, setComposerMode] = useState<ComposerMode>("image");
  const [mediaKind, setMediaKind] = useState<MediaKind>("image");
  const [scheduleDate, setScheduleDate] = useState(defaultScheduleDate);
  const [scheduleTime, setScheduleTime] = useState("10:00");
  const [publishing, setPublishing] = useState(false);
  const [activeTool, setActiveTool] = useState<null | "type" | "tools" | "captions">(null);
  const { locationId, locations } = useActiveLocation();

  const [historyOpen, setHistoryOpen] = useState(false);
  const features = usePlanFeatures();
  const { businessType } = usePlan();
  const activeLocation = useMemo(
    () => locations.find((l) => l.id === locationId) ?? null,
    [locations, locationId],
  );
  const structuredBrief = useMemo(
    () => buildStructuredBrief(selectedIntentId, intentDetail),
    [selectedIntentId, intentDetail],
  );
  // Prefix mode: the bar reads "make a [platform] post about |" and the user
  // types only the SUBJECT ("thanksgiving"); the full sentence is composed
  // here. Typing a platform/post sentence of your own exits prefix mode.
  const typedOwnSentence = /instagram|facebook|tiktok|linkedin|\btwitter\b|\bx\b|\bpost\b|^make\b/i.test(prompt);
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
  const listingBrief = useMemo(() => {
    const text = `${prompt} ${intentDetail}`;
    return /\b(listing|just\s+sold|sold\s+at|open\s+house|under\s+contract|new\s+on\s+the\s+market|\d{2,6}\s+[a-z][a-z'.\s]{2,40}(dr|drive|st|street|rd|road|ln|lane|ave|avenue|ct|court|blvd|boulevard|cir|circle|way|pl|place|ter|terrace))\b/i.test(
      text,
    );
  }, [prompt, intentDetail]);
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [platformMenuOpen, setPlatformMenuOpen] = useState(false);
  const platformMenuRef = useRef<HTMLDivElement>(null);
  // true after the user explicitly picks a platform from the chip menu
  const platformPinRef = useRef(false);

  // Ghost completion for the free-form brief: first curated prompt that
  // extends what's typed (case-insensitive). Tab accepts it.
  const autofillPrompts = useMemo(() => buildAutofillPrompts(businessType), [businessType]);
  const ghostRest = useMemo(() => {
    if (genState === "generating") return "";
    const typed = prompt.toLowerCase();
    if (typed !== typed.trimStart()) return "";
    if (prefixActive) {
      // prefix mode: the user is typing the SUBJECT — complete it from the
      // "post about …" tails of the curated prompts.
      if (typed.trim().length < 2) return "";
      const needle = ` post about ${typed}`;
      const hit = autofillPrompts.find((a) => {
        const i = a.indexOf(needle);
        return i >= 0 && a.length > i + needle.length;
      });
      if (!hit) return "";
      const i = hit.indexOf(needle);
      return hit.slice(i + needle.length);
    }
    if (typed.trim().length < 4) return "";
    const hit = autofillPrompts.find((a) => a.startsWith(typed) && a.length > typed.length);
    return hit ? hit.slice(typed.length) : "";
  }, [prompt, genState, autofillPrompts, prefixActive]);
  const editRailRef = useRef<HTMLDivElement>(null);
  const promptToolsRef = useRef<HTMLDivElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const toolsMenuRef = useRef<HTMLDivElement>(null);
  const frameWrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });

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

  const { generate, composeFromIntent } = useStudioGeneration({
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
    businessType: businessType ?? undefined,
    locationId,
    platformPinRef,
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
  });

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

  // ?brief= — arrive with the composer pre-filled (home week rail, holiday
  // suggestions). Prefill only: the user still pulls the trigger.
  const consumedBriefParam = useRef(false);
  useEffect(() => {
    if (consumedBriefParam.current) return;
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

  // Platform chip menu: outside-click + Escape to close.
  useEffect(() => {
    if (!platformMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (platformMenuRef.current && !platformMenuRef.current.contains(e.target as Node)) {
        setPlatformMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPlatformMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [platformMenuOpen]);

  // Hero composer: while the room is empty the bar + intent strip sit dead
  // center; the moment creation starts they glide down to their working
  // position at the bottom (GSAP owns their transform).
  const composerHeroInit = useRef(false);
  const heroMountAtRef = useRef(0);
  const heroTweensRef = useRef<gsap.core.Tween[]>([]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!heroMountAtRef.current) heroMountAtRef.current = performance.now();
    const bar = canvas.querySelector<HTMLElement>(".prompt-bar");
    const rail = canvas.querySelector<HTMLElement>(".pb-intent-rail");
    if (!bar) return;
    const els = rail ? [bar, rail] : [bar];
    heroTweensRef.current.forEach((t) => t.kill());
    heroTweensRef.current = [];
    const heroIdle =
      genState === "idle" && composerMode === "image" && !generatedUrl && !showTemplate;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // distance from the group's resting spot (bottom-anchored) to room center
    const heroDelta = () => {
      const cH = canvas.clientHeight;
      const topEdge = cH - 96 - bar.offsetHeight;
      const bottomEdge = rail ? cH - 14 : cH - 96;
      return cH / 2 - (topEdge + bottomEdge) / 2;
    };

    // a deep link (?mediaUrl=) flips state right after mount — snap, don't glide
    const justMounted = performance.now() - heroMountAtRef.current < 600;
    // NB: every set/tween below pins `x: 0` alongside `xPercent: -50`. The CSS
    // base rule centers the bar with `transform: translateX(-50%)`; GSAP reads
    // that resolved matrix as an absolute x (≈ -halfWidth px) and would ADD its
    // own -50% on top → double-shifted off-screen left. Zeroing x makes
    // xPercent the sole horizontal centering. Do not drop the `x: 0`.
    if (heroIdle) {
      if (!composerHeroInit.current || reduce || justMounted) {
        gsap.set(els, { x: 0, xPercent: -50, y: heroDelta() });
      } else {
        heroTweensRef.current.push(
          gsap.to(els, { x: 0, xPercent: -50, y: heroDelta(), duration: 0.7, ease: "power3.inOut" }),
        );
      }
      composerHeroInit.current = true;
      const onResize = () => gsap.set(els, { x: 0, xPercent: -50, y: heroDelta() });
      window.addEventListener("resize", onResize);
      return () => {
        window.removeEventListener("resize", onResize);
        heroTweensRef.current.forEach((t) => t.kill());
        heroTweensRef.current = [];
      };
    }
    composerHeroInit.current = true;
    if (reduce || justMounted) gsap.set(els, { x: 0, xPercent: -50, y: 0 });
    else heroTweensRef.current.push(gsap.to(els, { x: 0, xPercent: -50, y: 0, duration: 0.85, ease: "power3.inOut" }));
    return () => {
      heroTweensRef.current.forEach((t) => t.kill());
      heroTweensRef.current = [];
    };
  }, [genState, composerMode, generatedUrl, showTemplate]);


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

  // Close the post-type / tools popover on outside click (lives in the
  // right rail and the prompt bar respectively).
  useEffect(() => {
    if (!activeTool && !qualityOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const n = e.target as Node;
      if (editRailRef.current?.contains(n) || promptToolsRef.current?.contains(n)) return;
      if (modelMenuRef.current?.contains(n)) return;
      if (toolsMenuRef.current?.contains(n)) return;
      setActiveTool(null);
      setQualityOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [activeTool, qualityOpen]);

  useFocusTrap(qualityOpen, modelMenuRef, () => setQualityOpen(false));
  useFocusTrap(toolsOpen, toolsMenuRef, () => setToolsOpen(false));

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

  const frameRatio = platform.w / platform.h;

  const frameWrapStyle: CSSProperties = (() => {
    const { w: cw, h: ch } = canvasSize;
    if (!cw || !ch) {
      return frameRatio >= 1
        ? { width: "min(58%, 600px)", height: "auto", aspectRatio: `${platform.w} / ${platform.h}`, maxHeight: "52%" }
        : { height: "min(52%, 520px)", width: "auto", aspectRatio: `${platform.w} / ${platform.h}`, maxWidth: "56%" };
    }
    const fitW = Math.min(cw * 0.58, 600);
    // height capped tighter so the image clears the lifted prompt bar
    const fitH = Math.min(ch * 0.52, 520);
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

    if (when === "schedule") {
      if (!scheduleDate || !scheduleTime) {
        setError("Pick a date and time for scheduling.");
        return;
      }
      const localScheduled = new Date(`${scheduleDate}T${scheduleTime}:00`);
      if (Number.isNaN(localScheduled.getTime())) {
        setError("Invalid schedule date or time.");
        return;
      }
      const scheduledFor = localScheduled.toISOString();
      setPublishing(true);
      setError("");
      try {
        // C8: store a fetchable URL, not in-memory base64 — the publish cron hands
        // mediaUrl straight to Meta, which cannot fetch a data: URI.
        const { resolvePublicImageUrl } = await import("@/lib/upload-public-image");
        // R1: exact platform pixels are produced HERE, from the native image,
        // against the platform selected at publish time.
        const exactNow =
          generatedUrl && mediaKind === "image"
            ? await resizeToExact(generatedUrl, platform.w, platform.h)
            : generatedUrl;
        const mediaPublicUrl = exactNow ? await resolvePublicImageUrl(exactNow) : null;
        await createDashboardPost({
          locationId,
          copy: fullCaption,
          platforms,
          // "approved" = the INTERNAL publish queue (cron-publish READY_STATUSES).
          // "scheduled" is reserved for posts natively scheduled on Meta's side;
          // writing it here left posts sitting in the DB forever.
          status: "approved",
          scheduledFor,
          mediaUrl: mediaPublicUrl,
          mediaUrls: mediaPublicUrl ? [mediaPublicUrl] : [],
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

    // R3: never silently re-route a preview-only platform (TikTok used to
    // quietly publish to Instagram). Block with a way forward instead.
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
          : await resizeToExact(generatedUrl as string, platform.w, platform.h);
        const payload = await buildMetaPublishPayload({
          platform: metaTarget,
          caption: fullCaption,
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

  return (
    <div className="pb-studio h-full overflow-hidden">
      <StudioStyles />
      <div className="app">

        {/* SIDEBAR — shared across the whole dashboard */}
        <div style={{ gridArea: "sidebar", minWidth: 0 }}>
          <AppSidebar />
        </div>

        {/* CANVAS */}
        <main className={`canvas canvas-theme-${theme}`} ref={canvasRef}>
          <h1 className="sr-only">Studio</h1>
          <div className="canvas-wall-lines" />
          <div className="canvas-floor" />

          <div className="canvas-top">
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
              {genState === "done" ? (
                <button
                  type="button"
                  className={`preview-toggle${when === "schedule" ? " is-sched" : ""}`}
                  onClick={() => setWhen((w) => (w === "now" ? "schedule" : "now"))}
                  aria-pressed={when === "schedule"}
                  title={when === "schedule" ? "Will schedule for the chosen time" : "Will publish immediately"}
                >
                  <Calendar size={15} />
                  <span>{when === "schedule" ? "Scheduled" : "Post now"}</span>
                </button>
              ) : null}
              {genState === "done" && mediaKind !== "video" ? (
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
              ) : null}
            </div>
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

          {/* On-canvas 3D stack: the last few generations recede behind the live
              image, fading into the white on both sides. Click one to bring it
              back front-and-center. */}
          {composerMode === "image" && !showTemplate ? (
            <div className="gen-stack" aria-label="Recent generations">
              {genHistory
                .filter((e) => e.source === "session" && e.url !== generatedUrl)
                .slice(0, 3)
                .map((e, i) => (
                  <button
                    key={`${e.at}-${e.url.slice(0, 32)}`}
                    type="button"
                    className={`gs-card gs-${i}`}
                    onClick={() => adoptImage(e.url)}
                    aria-label={`Bring back: ${e.prompt || "earlier generation"}`}
                    title={e.prompt}
                  >
                    <span className="gs-img" style={{ backgroundImage: `url('${e.url}')` }} aria-hidden />
                    <span className="gs-fade" aria-hidden />
                  </button>
                ))}
            </div>
          ) : null}

          <div
            ref={frameWrapRef}
            className={`frame-wrap${showTemplate ? ` as-post pc-platform-${platform.id}` : ""}${genState === "idle" && composerMode === "image" && !showTemplate ? " is-idle" : ""}`}
            style={showTemplate ? undefined : frameWrapStyle}
          >
            {/* Ambient backlight: the generated image casts its own light — a
                blurred copy of itself behind the frame (sized by the selected
                aspect, since it mirrors the frame box). */}
            {generatedUrl && mediaKind === "image" && (genState === "done" || showTemplate) ? (
              <div
                className="ambient-glow"
                style={{ backgroundImage: `url('${generatedUrl}')` }}
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
            ) : composerMode === "video" && genState === "idle" ? (
              <div className="studio-video-compose">
                <VideoComposer
                  onComplete={handleVideoReady}
                  onError={(msg) => setError(msg)}
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
                <div
                  className="preview"
                  style={previewStyle}
                  role="img"
                  aria-label={previewImageLabel}
                />
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
                  <div className="gen-progress">{statusText}</div>
                )}
                {genState === "idle" && composerMode === "image" ? (
                  <div className="studio-intent-stage">
                    {/* Captions moved to the post-image step (driven by the prompt bar). */}
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
                className={`rail-ico rail-publish${publishState === "published" ? " published" : ""}`}
                onClick={() => void publish()}
                disabled={publishing}
                title={
                  publishState === "published"
                    ? when === "schedule" ? "Scheduled" : "Published"
                    : when === "schedule" ? "Schedule" : "Publish"
                }
                aria-label={when === "schedule" ? "Schedule this post" : "Publish this post"}
              >
                {publishState === "published" ? <Check size={19} strokeWidth={2.5} /> : <Send size={19} />}
              </button>
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
              {/* "not connected" errors get a real path to the fix, not a hint */}
              {/connect/i.test(error) && /meta|facebook|instagram/i.test(error) ? (
                <a className="studio-error-cta" href="/dashboard/settings">
                  Connect Facebook
                </a>
              ) : null}
              <button type="button" onClick={() => setError("")}>Dismiss</button>
            </div>
          ) : null}

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

          {historyOpen ? (
            <StudioHistoryGallery
              entries={genHistory}
              onClose={() => setHistoryOpen(false)}
              onPick={(e) => {
                adoptImage(e.url);
                setHistoryOpen(false);
              }}
            />
          ) : null}

          <div className={`prompt-bar${genState === "generating" ? " is-generating" : ""}`}>
            {/* row 1 — the brief / caption input */}
            <div className="pb-bar-input">
              {genState === "done" && promptMode === "review" ? (
                <div className="pb-ready" role="status" aria-live="polite">
                  <span className="pb-ready-title">Your image is ready</span>
                  <span className="pb-ready-sub">Write a caption next, or make another image.</span>
                </div>
              ) : genState === "done" && promptMode === "caption" ? (
                <input
                  ref={inputRef}
                  className={`pb-caption-field${capFading ? " is-fading" : ""}`}
                  value={captionBrief}
                  onChange={(e) => {
                    setCaptionBrief(e.target.value);
                    // once the field holds a caption, edits ARE the caption
                    if (captionVariants.length > 0) setCaptionText(e.target.value);
                  }}
                  onKeyDown={(e) =>
                    e.key === "Enter" && captionVariants.length === 0 && submitCaption()
                  }
                  placeholder={
                    captionVariants.length > 0
                      ? "Your caption — edit it however you like"
                      : "What should the caption be about?"
                  }
                  aria-label={
                    captionVariants.length > 0 ? "Caption — editable" : "What should the caption be about?"
                  }
                />
              ) : selectedIntent ? (
                <input
                  ref={inputRef}
                  value={intentDetail}
                  onChange={(e) => setIntentDetail(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    genState !== "generating" &&
                    composerMode === "image" &&
                    void composeFromIntent()
                  }
                  placeholder={selectedIntent.detailPlaceholder}
                  disabled={genState === "generating"}
                  aria-label={`Details for ${selectedIntent.label}`}
                />
              ) : (
                <div className="pb-ghost-wrap">
                  {/* The lead-in is REAL: the user types only the subject and
                      the full "make a [platform] post about …" is composed at
                      submit. Empty = flipping platforms; typing freezes it to
                      the selected platform. */}
                  {/* Lead-in is a teaser only: it shows while the field is
                      empty (flipping platforms) and clears the instant the
                      user types, so they see just their own words. The full
                      "make a [platform] post about …" is still composed at
                      submit via composerBrief. */}
                  {prefixActive && !prompt ? (
                    <span className="pb-prefix" aria-hidden>
                      <span>make a&nbsp;</span>
                      <FlipWords
                        words={["instagram", "facebook", "linkedin", "tiktok", "x"]}
                        colors={PLATFORM_INK}
                      />
                      <span>&nbsp;post about&nbsp;</span>
                    </span>
                  ) : null}
                  <span className="pb-input-shell">
                    <input
                      ref={inputRef}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Tab" && ghostRest) {
                          e.preventDefault();
                          setPrompt(prompt + ghostRest);
                          return;
                        }
                        // R5: Enter must not fire the image pipeline while the
                        // video composer is open (it would unmount it mid-config).
                        if (e.key === "Enter" && genState !== "generating" && composerMode === "image")
                          void composeFromIntent();
                      }}
                      placeholder={
                        genState === "done" && promptMode === "image"
                          ? "Describe the new image you want…"
                          : prefixActive
                            ? "…"
                            : ""
                      }
                      disabled={genState === "generating"}
                      aria-label={
                        genState === "done"
                          ? "Describe a new image"
                          : prefixActive
                            ? `What should the ${platform.id} post be about?`
                            : "Describe your post"
                      }
                    />
                    <span className="sr-only" aria-live="polite">
                      {ghostRest ? `Suggestion: ${prompt}${ghostRest} — press Tab to accept.` : ""}
                    </span>
                    {ghostRest ? (
                      <div className="pb-ghost" aria-hidden>
                        <span className="pb-ghost-typed">{prompt}</span>
                        <span className="pb-ghost-rest">{ghostRest}</span>
                        <span className="pb-ghost-key">tab</span>
                      </div>
                    ) : null}
                  </span>
                </div>
              )}
            </div>

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

            {/* row 2 — controls left, Generate right */}
            <div className="pb-bar-controls">
              <button
                type="button"
                className={`pb-util${composerMode === "video" ? " active" : ""}`}
                onClick={() => {
                  if (composerMode === "image") {
                    if (
                      genState === "done" &&
                      generatedUrl &&
                      !window.confirm("Switch to video? Your current image will be discarded.")
                    ) {
                      return;
                    }
                    setGenState("idle");
                    setGeneratedUrl(null);
                    setShowTemplate(false);
                    setComposerMode("video");
                  } else {
                    setComposerMode("image");
                  }
                }}
                title={composerMode === "image" ? "Switch to video" : "Switch to image"}
                aria-label={composerMode === "image" ? "Video mode" : "Image mode"}
              >
                <ImageIcon size={18} />
              </button>

              {/* Platform cue — once the user types, the flipping lead-in is
                  gone, so surface which platform they're posting to (it's set
                  in the top-left menu; default Instagram). Read-only status. */}
              {prefixActive && prompt.trim() ? (
                <span
                  className="pb-plat-cue"
                  title={`Posting to ${platform.label} — change it in the menu at the top left`}
                >
                  <PlatformIcon type={platform.id} />
                  <span>{platform.label}</span>
                </span>
              ) : null}

              {genState === "done" && (promptMode === "review" || promptMode === "caption") ? (
                <button
                  type="button"
                  className="pb-reprompt"
                  onClick={() => {
                    setPromptMode("image");
                    window.setTimeout(() => inputRef.current?.focus(), 0);
                  }}
                  title="Generate a different image"
                  aria-label="New image — re-prompt"
                >
                  <RotateCw size={15} />
                  <span>New image</span>
                </button>
              ) : composerMode === "image" ? (
                <>
                  {/* Tools — post-angle shortcuts, written out, in a menu */}
                  {genState === "idle" ? (
                    <div className="pb-tool" ref={toolsMenuRef}>
                      <button
                        type="button"
                        className={`pb-tools-trigger${toolsOpen ? " is-open" : ""}${selectedIntentId ? " has-intent" : ""}`}
                        onClick={() => setToolsOpen((v) => !v)}
                        aria-haspopup="menu"
                        aria-expanded={toolsOpen}
                        title="Post ideas"
                      >
                        <Shapes size={15} />
                        <span>{selectedIntent ? selectedIntent.label : "Ideas"}</span>
                      </button>
                      {toolsOpen ? (
                        <StrategicIntentPicker
                          selectedId={selectedIntentId}
                          onClose={() => setToolsOpen(false)}
                          onSelect={(id) => {
                            setSelectedIntentId((cur) => (cur === id ? null : id));
                            setIntentDetail("");
                          }}
                          uploadSlot={
                            <TrashToTreasureUploadZone
                              variant="menu-row"
                              onUploaded={(url) => { adoptImage(url); setToolsOpen(false); }}
                              onElevated={(caption, hashtags) => {
                                setCaptionText(caption);
                                setCaptionTags(hashtags.join(" "));
                                setCaptionState("done");
                                setCaptionError("");
                              }}
                            />
                          }
                        />
                      ) : null}
                    </div>
                  ) : null}

                  {/* reference photo — grounds the generation in their real stuff */}
                  <input
                    ref={refFileRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={onRefFile}
                    aria-hidden
                  />
                  {refImage ? (
                    <span className="pb-ref-chip has-image" title={refName}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={refImage} alt="" />
                      <span className="pb-ref-label">Reference</span>
                      <button
                        type="button"
                        onClick={() => { setRefImage(null); setRefName(""); }}
                        aria-label="Remove reference image"
                      >
                        <X size={13} />
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="pb-ref-chip"
                      onClick={() => refFileRef.current?.click()}
                      title="Use one of your real photos as the starting point"
                    >
                      <ImagePlus size={15} />
                      <span>Image reference</span>
                    </button>
                  )}

                  {/* model quality — Standard / Pro (plan-gated) */}
                  <div className="pb-tool" ref={modelMenuRef}>
                    <button
                      type="button"
                      className={`pb-model-chip${imageQuality === "pro" ? " is-pro" : ""}`}
                      onClick={() => setQualityOpen((v) => !v)}
                      aria-haspopup="menu"
                      aria-expanded={qualityOpen}
                      aria-controls="studio-model-menu"
                    >
                      {imageQuality === "pro" ? <Sparkles size={14} /> : null}
                      <span>{imageQuality === "pro" ? "Pro" : "Standard"}</span>
                    </button>
                    {qualityOpen && (
                      <div id="studio-model-menu" className="pb-tools-pop pb-model-pop" role="menu">
                        <button
                          type="button"
                          role="menuitem"
                          className={imageQuality === "standard" ? "active" : ""}
                          onClick={() => { setImageQuality("standard"); setQualityOpen(false); }}
                        >
                          <span className="pb-model-name">Standard</span>
                          <span className="pb-model-sub">Fast, everyday posts</span>
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          className={imageQuality === "pro" ? "active" : ""}
                          disabled={!features.proImageModel}
                          onClick={() => {
                            if (!features.proImageModel) return;
                            setImageQuality("pro");
                            setQualityOpen(false);
                          }}
                        >
                          <span className="pb-model-name">
                            Pro {features.proImageModel ? <Sparkles size={13} /> : <Lock size={13} />}
                          </span>
                          <span className="pb-model-sub">
                            {features.proImageModel
                              ? "Sharper detail, truer references, 2K"
                              : `Sharper detail, truer references, 2K — add-on, $${PRO_IMAGES_ADDON_PRICE}/mo`}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* aspect (from platform) + size (Pro only) */}
                  <span className="pb-dim-chip" title="Aspect ratio follows the selected platform">
                    {platform.genAspect}
                    {imageQuality === "pro" ? (
                      <button
                        type="button"
                        className="pb-size-toggle"
                        onClick={() => setImageSize((s) => (s === "1K" ? "2K" : "1K"))}
                        aria-label={`Image size ${imageSize} — click to switch`}
                      >
                        · {imageSize}
                      </button>
                    ) : null}
                  </span>
                </>
              ) : null}

              <span className="pb-bar-spacer" />

              {(() => {
                const inReview = genState === "done" && promptMode === "review";
                const inCaption = genState === "done" && promptMode === "caption";
                const hasVariants = inCaption && captionVariants.length > 0;
                return (
                  <button
                    type="button"
                    className="pb-generate"
                    onClick={() => {
                      if (inReview) {
                        setPromptMode("caption");
                        window.setTimeout(() => inputRef.current?.focus(), 0);
                      } else if (inCaption) {
                        if (hasVariants) rotateCaption();
                        else submitCaption();
                      } else {
                        void composeFromIntent();
                      }
                    }}
                    disabled={
                      inReview
                        ? false
                        : inCaption
                          ? hasVariants
                            ? captionVariants.length < 2
                            : !captionBrief.trim()
                          : genState === "generating" || composerMode === "video" || !composerBrief
                    }
                    aria-label={
                      inReview
                        ? "Write a caption"
                        : hasVariants
                          ? "Try another caption"
                          : inCaption
                            ? "Write caption options"
                            : "Make a post"
                    }
                  >
                    {inReview ? (
                      <ArrowRight size={16} />
                    ) : hasVariants ? (
                      <RotateCw size={16} />
                    ) : (
                      <Wand2 size={16} />
                    )}
                    <span>
                      {inReview
                        ? "Write caption"
                        : hasVariants
                          ? `Another ${captionVariantIdx + 1}/${captionVariants.length}`
                          : inCaption
                            ? "Captions"
                            : "Generate"}
                    </span>
                  </button>
                );
              })()}
            </div>

            {/* Caption generation runs headless: variants land in the field
                above and cycle in place via the "Another" button. This only
                surfaces a thin loading / error / compliance line — no overlay
                covering the image. */}
            {genState === "done" && promptMode === "caption" && captionRun > 0 ? (
              <div className="pb-caption-status">
                <CaptionVariantPicker
                  headless
                  brief={captionSourceBrief || composerBrief}
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
