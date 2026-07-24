"use client";

import { useRef, useEffect, useCallback, useState, type Dispatch, type MutableRefObject, type RefObject, type SetStateAction } from "react";
import { buildFallbackEditPrompt, shouldEditFromReference } from "@/lib/studio/reprompt-delta";
import {
  buildProductAdPrompt,
  inferPlatformIdFromIntent,
  isListingBrief,
  isProductAdBrief,
} from "@/lib/studio/scene-intent";
import { resolveStudioImageRoute } from "@/lib/studio/studio-image-routing";
import { STUDIO_IMAGE_CLIENT_TIMEOUT_MS } from "@/lib/studio/image-generation-budget";

type GenState = "idle" | "generating" | "done";
type CaptionState = "idle" | "loading" | "done" | "error";

type Platform = {
  id: string;
  label: string;
  w: number;
  h: number;
  genAspect: string;
  publishable: boolean;
};

/** Director / compose / reprompt — must stay under /api/studio/director maxDuration. */
const STUDIO_DIRECTOR_CLIENT_MS = 35_000;
/** Product-ad compose + image gen — follows the route's coordinated provider budget. */
const STUDIO_GENERATE_CLIENT_MS = STUDIO_IMAGE_CLIENT_TIMEOUT_MS;

type AbortHandle = {
  signal: AbortSignal;
  abort: () => void;
  clear: () => void;
};

type TrackedImageRequest = AbortHandle & { id: number };

function abortAfter(ms: number): AbortHandle {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  return {
    signal: ctrl.signal,
    abort: () => ctrl.abort(),
    clear: () => clearTimeout(id),
  };
}

/** Cover-crop a generated image to the platform's exact pixel dimensions. */
export function resizeToExact(dataUrl: string, w: number, h: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        if (img.width === w && img.height === h) return resolve(dataUrl);
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const ctx = c.getContext("2d");
        if (!ctx) return resolve(dataUrl);
        const sc = Math.max(w / img.width, h / img.height);
        const dw = img.width * sc;
        const dh = img.height * sc;
        ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
        resolve(c.toDataURL("image/jpeg", 0.92));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export type UseStudioGenerationParams = {
  prompt: string;
  composerBrief: string;
  genState: GenState;
  generatedUrl: string | null;
  platformIdx: number;
  platform: Platform;
  platforms: readonly Platform[];
  refImage: string | null;
  imageQuality: "standard" | "pro";
  imageSize: "1K" | "2K";
  /** "design" forces the GPT layout engine; "auto" lets the Director route. */
  imageEngine?: "auto" | "design";
  /** OFF = creative freedom: brand palette/style context is not injected. */
  brandLock?: boolean;
  /** Tenant business type — a hint for the hidden art-director prompt expansion. */
  businessType?: string;
  /** Active location — lets the server pull the brand book for art direction. */
  locationId?: string | null;
  platformPinRef: MutableRefObject<boolean>;
  /** When true, aspectOverride wins over platform.genAspect / compose inference. */
  aspectPinRef: MutableRefObject<boolean>;
  aspectOverride: string | null;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  setGenState: Dispatch<SetStateAction<GenState>>;
  setGeneratedUrl: Dispatch<SetStateAction<string | null>>;
  setError: Dispatch<SetStateAction<string>>;
  setProgress: Dispatch<SetStateAction<number>>;
  setShowTemplate: Dispatch<SetStateAction<boolean>>;
  setCaptionState: Dispatch<SetStateAction<CaptionState>>;
  setCaptionText: Dispatch<SetStateAction<string>>;
  setCaptionTags: Dispatch<SetStateAction<string>>;
  setPlatformIdx: Dispatch<SetStateAction<number>>;
  resetEdit: () => void;
  setActiveEdit: Dispatch<SetStateAction<null | "scale" | "move" | "rotate" | "adjust">>;
  pushHistory: (url: string, promptText: string) => void;
  /** Clear the compose field after a successful generate so review mode shows “Describe changes…”. */
  onAfterGenerateSuccess?: () => void;
  /** Fatal generate/compose failure (not soft notices). */
  onAfterGenerateFailure?: (message: string) => void;
  /** Non-fatal heads-up (e.g. Design Studio fell back to Gemini). */
  onSoftNotice?: (message: string) => void;
};

export function useStudioGeneration({
  prompt,
  composerBrief,
  genState,
  generatedUrl,
  platformIdx,
  platform,
  platforms,
  refImage,
  imageQuality,
  imageSize,
  imageEngine = "auto",
  brandLock = true,
  businessType,
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
  onAfterGenerateSuccess,
  onAfterGenerateFailure,
  onSoftNotice,
}: UseStudioGenerationParams) {
  const resolveAspect = useCallback(() => {
    if (aspectPinRef.current && aspectOverride) return aspectOverride;
    return platform.genAspect;
  }, [aspectOverride, aspectPinRef, platform.genAspect]);
  const genTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeImageRequestRef = useRef<TrackedImageRequest | null>(null);
  const nextImageRequestIdRef = useRef(0);
  const [imageRequestStartedAt, setImageRequestStartedAt] = useState<number | null>(null);
  const lastGenPromptRef = useRef("");
  const [lastGenPrompt, setLastGenPromptState] = useState("");
  const rememberGenPrompt = useCallback((promptText: string) => {
    const next = promptText.trim();
    lastGenPromptRef.current = next;
    setLastGenPromptState(next);
  }, []);
  const onAfterGenerateSuccessRef = useRef(onAfterGenerateSuccess);
  const onAfterGenerateFailureRef = useRef(onAfterGenerateFailure);
  useEffect(() => {
    onAfterGenerateSuccessRef.current = onAfterGenerateSuccess;
  }, [onAfterGenerateSuccess]);
  useEffect(() => {
    onAfterGenerateFailureRef.current = onAfterGenerateFailure;
  }, [onAfterGenerateFailure]);
  const failGenerate = useCallback((message: string) => {
    setError(message);
    onAfterGenerateFailureRef.current?.(message);
  }, [setError]);

  useEffect(
    () => () => {
      if (genTimer.current) clearInterval(genTimer.current);
      activeImageRequestRef.current?.abort();
      activeImageRequestRef.current?.clear();
      activeImageRequestRef.current = null;
    },
    [],
  );

  const startProgressTimer = useCallback(() => {
    if (genTimer.current) clearInterval(genTimer.current);
    genTimer.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 92) return p;
        const inc =
          p < 30 ? 4 + Math.random() * 5 : p < 70 ? 1.6 + Math.random() * 2.6 : 0.5 + Math.random() * 1.2;
        return Math.min(92, p + inc);
      });
    }, 240);
  }, [setProgress]);

  const stopProgressTimer = useCallback(() => {
    if (genTimer.current) {
      clearInterval(genTimer.current);
      genTimer.current = null;
    }
  }, []);

  const beginImageRequest = useCallback((): TrackedImageRequest => {
    const previous = activeImageRequestRef.current;
    previous?.abort();
    previous?.clear();

    const handle = abortAfter(STUDIO_GENERATE_CLIENT_MS);
    const request = { ...handle, id: ++nextImageRequestIdRef.current };
    activeImageRequestRef.current = request;
    setImageRequestStartedAt(Date.now());
    return request;
  }, []);

  const isCurrentImageRequest = useCallback(
    (id: number) => activeImageRequestRef.current?.id === id,
    [],
  );

  const finishImageRequest = useCallback((request: TrackedImageRequest) => {
    request.clear();
    if (activeImageRequestRef.current?.id !== request.id) return;
    activeImageRequestRef.current = null;
    setImageRequestStartedAt(null);
  }, []);

  const cancelImageRequest = useCallback(() => {
    const request = activeImageRequestRef.current;
    if (!request) return false;
    activeImageRequestRef.current = null;
    request.clear();
    request.abort();
    setImageRequestStartedAt(null);
    stopProgressTimer();
    return true;
  }, [stopProgressTimer]);

  const holdFloor = useCallback(async (startedAt: number) => {
    const elapsed = Date.now() - startedAt;
    if (elapsed < 1600) await new Promise((r) => setTimeout(r, 1600 - elapsed));
  }, []);

  const requestGenerateImage = useCallback(
    async (
      promptText: string,
      opts: {
        aspect: string;
        referenceImage?: string | null;
        sourceIntent?: string;
        listingMode?: boolean;
        /** Prompt already came from /api/studio/compose — skip a second expand. */
        composed?: boolean;
        /** Director-approved text-on-image (promo/offer typography). */
        allowText?: boolean;
        /** Director classified this as a designed graphic → GPT layout engine. */
        designLane?: boolean;
        /** Multimodal GPT vision inputs (site product shots — not Gemini edits). */
        inputImages?: string[];
        visionDetail?: "auto" | "low" | "high" | "original";
        signal: AbortSignal;
      },
    ) => {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText,
          aspectRatio: opts.aspect,
          ...(opts.referenceImage ? { referenceImage: opts.referenceImage } : {}),
          ...(opts.sourceIntent ? { sourceIntent: opts.sourceIntent } : {}),
          ...(opts.listingMode ? { listingMode: true } : {}),
          ...(opts.composed ? { composed: true } : {}),
          ...(opts.allowText ? { allowText: true } : {}),
          ...(opts.designLane ? { designLane: true } : {}),
          ...(opts.inputImages?.length ? { inputImages: opts.inputImages } : {}),
          ...(opts.visionDetail ? { visionDetail: opts.visionDetail } : {}),
          // engine=gpt is bake-off only (disables Gemini fallback) — never send for design lane.
          ...(imageEngine === "design" ? { engine: "gpt" } : {}),
          ...(brandLock ? {} : { brandLock: false }),
          quality: imageQuality,
          ...(imageQuality === "pro" ? { imageSize } : {}),
          ...(businessType ? { businessType } : {}),
          ...(locationId ? { locationId } : {}),
        }),
        signal: opts.signal,
      });
      let data: {
        image?: string;
        error?: string;
        modelId?: string;
        engineFallback?: "gemini";
        retriedForQuality?: boolean;
      };
      try {
        data = (await res.json()) as typeof data;
      } catch {
        return {
          error: res.ok
            ? "Generation returned an invalid response. Try again."
            : `Generation failed (${res.status}). Try again.`,
        };
      }
      if (!res.ok && !data.error) {
        data.error =
          res.status === 504
            ? "Generation timed out on the server. Try Standard quality or a shorter brief."
            : `Generation failed (${res.status}). Try again.`;
      }
      return data;
    },
    [imageQuality, imageSize, imageEngine, brandLock, businessType, locationId],
  );

  const generate = useCallback(
    async (overridePrompt?: string, recoverGenState: GenState = "idle") => {
      const savedPrompt = (overridePrompt ?? prompt.trim()).trim();
      if (!savedPrompt) {
        stopProgressTimer();
        setProgress(0);
        setGenState(recoverGenState);
        setError("Add a brief before generating.");
        inputRef.current?.focus();
        return;
      }
      if (!overridePrompt && genState === "generating") {
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
      resetEdit();
      setActiveEdit(null);

      startProgressTimer();
      const startedAt = Date.now();

      const genAbort = beginImageRequest();
      try {
        const editingFromCanvas =
          recoverGenState === "done" &&
          !!generatedUrl &&
          shouldEditFromReference(savedPrompt, lastGenPromptRef.current, true);
        const refForGen = editingFromCanvas ? generatedUrl : refImage;

        const data = await requestGenerateImage(savedPrompt, {
          aspect: resolveAspect(),
          referenceImage: refForGen,
          signal: genAbort.signal,
        });
        if (!isCurrentImageRequest(genAbort.id)) return;
        if (data.error || !data.image) {
          await holdFloor(startedAt);
          stopProgressTimer();
          setProgress(0);
          const msg = data.error || "Generation failed";
          failGenerate(
            msg.includes("not configured")
              ? "Image generation is not available yet. API key needs to be configured."
              : msg,
          );
          setGenState("idle");
          return;
        }
        await holdFloor(startedAt);
        stopProgressTimer();
        setProgress(100);
        setGeneratedUrl(data.image);
        pushHistory(data.image, savedPrompt);
        rememberGenPrompt(savedPrompt);
        setGenState("done");
        onAfterGenerateSuccessRef.current?.();
      } catch (err) {
        if (!isCurrentImageRequest(genAbort.id)) return;
        await holdFloor(startedAt);
        stopProgressTimer();
        setProgress(0);
        failGenerate(
          err instanceof DOMException && err.name === "AbortError"
            ? "Generation timed out. Please try again."
            : err instanceof TypeError
              ? "Lost connection to the server. Hard-refresh and try again."
              : err instanceof Error && err.message
                ? err.message
                : "Network error. Please try again.",
        );
        setGenState("idle");
      } finally {
        finishImageRequest(genAbort);
      }
    },
    [
      prompt,
      genState,
      resolveAspect,
      refImage,
      generatedUrl,
      requestGenerateImage,
      imageQuality,
      imageSize,
      businessType,
      locationId,
      inputRef,
      setGenState,
      failGenerate,
      setProgress,
      setShowTemplate,
      setCaptionState,
      setCaptionText,
      setCaptionTags,
      resetEdit,
      setActiveEdit,
      startProgressTimer,
      stopProgressTimer,
      holdFloor,
      beginImageRequest,
      isCurrentImageRequest,
      finishImageRequest,
      setGeneratedUrl,
      pushHistory,
      rememberGenPrompt,
    ],
  );

  const composeFromIntent = useCallback(async (
    overrideBrief?: string,
    overrideRefImage?: string | null,
    opts?: { siteGrounded?: boolean; siteImageUrls?: string[] },
  ) => {
    const intent = (overrideBrief ?? composerBrief).trim();
    const activeRef = overrideRefImage !== undefined ? overrideRefImage : refImage;
    if (!intent) {
      inputRef.current?.focus();
      return;
    }
    if (resolveStudioImageRoute({
      intent,
      refImage: activeRef,
      generatedUrl,
      genState,
      lastGenPrompt: lastGenPromptRef.current,
    }) === "blocked_listing_no_photo") {
      failGenerate("Add your listing photo first — we can't show your property from an address alone.");
      inputRef.current?.focus();
      return;
    }
    const isReprompt = genState === "done" && !!generatedUrl;
    setGenState("generating");
    setError("");
    setProgress(0);
    setShowTemplate(false);
    setCaptionState("idle");
    if (!isReprompt) {
      setCaptionText("");
      setCaptionTags("");
    }
    resetEdit();
    setActiveEdit(null);

    startProgressTimer();

    // Separate budgets: Director must not steal the image-gen abort window.
    const planAbort = abortAfter(STUDIO_DIRECTOR_CLIENT_MS);
    let genAbort: TrackedImageRequest | null = null;
    try {
      let imagePrompt: string | null = null;
      let aspect = resolveAspect();
      let directorComposed = false;
      let allowTextOnImage = false;
      let directorWantsDesign = false;
      const historyLabel = intent;

      const editingFromCanvas =
        isReprompt && !!generatedUrl && shouldEditFromReference(intent, lastGenPromptRef.current, true);
      const refForGen = editingFromCanvas ? generatedUrl : activeRef;
      const imageRoute = resolveStudioImageRoute({
        intent,
        refImage: refForGen,
        generatedUrl,
        genState,
        lastGenPrompt: lastGenPromptRef.current,
      });

      if (imageRoute === "listing_passthrough" && refForGen) {
        const inferred = inferPlatformIdFromIntent(intent);
        const idx = inferred ? platforms.findIndex((p) => p.id === inferred) : -1;
        const pIdx = idx >= 0 ? idx : platformIdx;
        if (idx >= 0) setPlatformIdx(pIdx);
        const plat = platforms[pIdx];
        const startedAt = Date.now();
        const fitted = await resizeToExact(refForGen!, plat.w, plat.h);
        const elapsed = Date.now() - startedAt;
        if (elapsed < 900) await new Promise((r) => setTimeout(r, 900 - elapsed));
        stopProgressTimer();
        setProgress(100);
        setGeneratedUrl(fitted);
        pushHistory(fitted, intent);
        rememberGenPrompt(intent);
        setCaptionText("");
        setCaptionTags("");
        setCaptionState("idle");
        setGenState("done");
        onAfterGenerateSuccessRef.current?.();
        return;
      }

      if (imageRoute === "reprompt_edit") {
        const rRes = await fetch("/api/studio/reprompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            delta: intent,
            previousPrompt: lastGenPromptRef.current || intent,
            referenceImage: generatedUrl,
            ...(locationId ? { locationId } : {}),
          }),
          signal: planAbort.signal,
        });
        const rData = (await rRes.json()) as { imagePrompt?: string; error?: string };
        if (rRes.ok && rData.imagePrompt) {
          imagePrompt = rData.imagePrompt;
        } else {
          imagePrompt = buildFallbackEditPrompt(intent);
        }
      } else if (imageRoute === "compose_generate" || imageRoute === "direct_generate") {
        if (opts?.siteGrounded) {
          // preview-url already enriched brand context — skip Director to save
          // a full Claude round-trip before image gen (common timeout source).
          const textNamesPlatform =
            /instagram|facebook|tiktok|linkedin|\btwitter\b|\bx\b/i.test(intent);
          const inferred = inferPlatformIdFromIntent(intent);
          const idx = inferred ? platforms.findIndex((p) => p.id === inferred) : -1;
          const pIdx = idx >= 0 && (textNamesPlatform || !platformPinRef.current) ? idx : platformIdx;
          if (idx >= 0) setPlatformIdx(pIdx);
          aspect =
            aspectPinRef.current && aspectOverride
              ? aspectOverride
              : platforms[pIdx].genAspect;
          // Site pull already enriched the brief — skip the server-side art-director
          // expand (extra Claude hop that caused Vercel 90s kills → "Network error").
          directorComposed = true;
          const productAd = isProductAdBrief(intent);
          if (productAd) {
            directorWantsDesign = true;
            imagePrompt = buildProductAdPrompt(intent, {
              hasReferenceImages: (opts?.siteImageUrls?.length ?? 0) > 0,
            });
          } else {
            imagePrompt = intent;
          }
        } else {
        // Studio Director: one Claude turn that classifies the ask AND
        // art-directs a brand-aware prompt (platform, text-on-image, clarify).
        // The legacy compose path below is the fallback — the Director is
        // never a single point of failure for generation.
        try {
          const dRes = await fetch("/api/studio/director", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              intent,
              hasReferenceImage: !!refForGen,
              ...(lastGenPromptRef.current ? { lastGenPrompt: lastGenPromptRef.current } : {}),
              ...(businessType ? { businessType } : {}),
              ...(locationId ? { locationId } : {}),
              ...(brandLock ? {} : { brandLock: false }),
              ...(imageEngine === "design" ? { designLane: true } : {}),
            }),
            signal: planAbort.signal,
          });
          const d = (await dRes.json()) as {
            platform?: string;
            lane?: string;
            imagePrompt?: string;
            allowText?: boolean;
            clarify?: string;
            error?: string;
            code?: string;
          };
          if (!dRes.ok && d.code === "listing_photo_required") {
            stopProgressTimer();
            setCaptionState("idle");
            failGenerate(d.error || "Add your listing photo first.");
            setGenState(isReprompt ? "done" : "idle");
            return;
          }
          if (dRes.ok && d.clarify) {
            // One clarifying question — no generation until it's answered.
            stopProgressTimer();
            setProgress(0);
            setCaptionState("idle");
            failGenerate(d.clarify);
            setGenState(isReprompt ? "done" : "idle");
            return;
          }
          if (dRes.ok && d.imagePrompt) {
            const textNamesPlatform =
              /instagram|facebook|tiktok|linkedin|\btwitter\b|\bx\b/i.test(intent);
            const idx = platforms.findIndex((p) => p.id === d.platform);
            const pIdx =
              idx >= 0 && (textNamesPlatform || !platformPinRef.current) ? idx : platformIdx;
            if (textNamesPlatform) platformPinRef.current = false;
            setPlatformIdx(pIdx);
            aspect =
              aspectPinRef.current && aspectOverride
                ? aspectOverride
                : platforms[pIdx].genAspect;
            imagePrompt = d.imagePrompt;
            allowTextOnImage = d.allowText === true;
            directorWantsDesign = d.lane === "design";
            directorComposed = true;
          }
        } catch {
          // Director timed out / unreachable — legacy fallback below.
          // Image generate still gets a fresh abort budget.
        }

        if (!directorComposed && imageRoute === "compose_generate") {
          // Fresh budget if Director ate the first abort window.
          planAbort.clear();
          const composeAbort = abortAfter(STUDIO_DIRECTOR_CLIENT_MS);
          try {
            const cRes = await fetch("/api/studio/compose", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                intent,
                hasReferenceImage: !!refForGen,
                ...(locationId ? { locationId } : {}),
                ...(brandLock ? {} : { brandLock: false }),
              }),
              signal: composeAbort.signal,
            });
            const brief = await cRes.json();
            if (!cRes.ok || brief.error) {
              if (brief.code === "listing_photo_required") {
                stopProgressTimer();
                setCaptionState("idle");
                failGenerate(brief.error || "Add your listing photo first.");
                setGenState(isReprompt ? "done" : "idle");
                return;
              }
              // Compose failed — fall through with the raw intent.
              imagePrompt = intent;
            } else {
              const textNamesPlatform =
                /instagram|facebook|tiktok|linkedin|\btwitter\b|\bx\b/i.test(intent);
              const idx = platforms.findIndex((p) => p.id === brief.platform);
              const pIdx =
                idx >= 0 && (textNamesPlatform || !platformPinRef.current) ? idx : platformIdx;
              if (textNamesPlatform) platformPinRef.current = false;
              setPlatformIdx(pIdx);
              aspect =
                aspectPinRef.current && aspectOverride
                  ? aspectOverride
                  : platforms[pIdx].genAspect;
              imagePrompt = brief.imagePrompt;
            }
          } finally {
            composeAbort.clear();
          }
        } else if (!directorComposed) {
          // direct_generate fallback — the server-side art director still
          // brand-grounds it (composed:false).
          imagePrompt = intent;
        }
        }
      }

      planAbort.clear();
      genAbort = beginImageRequest();
      const productAdTurn = isProductAdBrief(intent);
      const siteVisionUrls = opts?.siteImageUrls?.filter(Boolean) ?? [];
      const useVisionInputs = productAdTurn && siteVisionUrls.length > 0;
      const iData = await requestGenerateImage(imagePrompt || intent, {
        aspect,
        referenceImage: useVisionInputs ? null : refForGen,
        sourceIntent: intent,
        listingMode: isListingBrief(intent) && !!refForGen,
        composed:
          directorComposed ||
          imageRoute === "reprompt_edit",
        allowText: allowTextOnImage,
        designLane: directorWantsDesign,
        ...(useVisionInputs
          ? { inputImages: siteVisionUrls, visionDetail: "high" as const }
          : {}),
        signal: genAbort.signal,
      });
      if (!isCurrentImageRequest(genAbort.id)) return;
      if (iData.error || !iData.image) {
        stopProgressTimer();
        setProgress(0);
        setCaptionState("idle");
        const msg = iData.error || "Generation failed";
        failGenerate(
          msg.includes("not configured")
            ? "Image generation is not available yet. API key needs to be configured."
            : msg,
        );
        setGenState(isReprompt ? "done" : "idle");
        return;
      }

      stopProgressTimer();
      setProgress(100);
      // Honest attribution when GPT Image 2 fell back to Gemini.
      if (iData.engineFallback === "gemini") {
        onSoftNotice?.(
          "GPT Image 2 took longer than expected — Posterboy Visual completed this version.",
        );
      }
      setGeneratedUrl(iData.image);
      pushHistory(iData.image, historyLabel);
      rememberGenPrompt(historyLabel);
      setCaptionText("");
      setCaptionTags("");
      setCaptionState("idle");
      setGenState("done");
      onAfterGenerateSuccessRef.current?.();
    } catch (err) {
      if (genAbort && !isCurrentImageRequest(genAbort.id)) return;
      stopProgressTimer();
      setProgress(0);
      setCaptionState("idle");
      failGenerate(
        err instanceof DOMException && err.name === "AbortError"
          ? "Timed out. Try Standard quality or a shorter brief."
          : err instanceof TypeError
            ? "Lost connection to the server. Hard-refresh and try again."
            : err instanceof Error && err.message
              ? err.message
              : "Network error. Please try again.",
      );
      setGenState(isReprompt ? "done" : "idle");
    } finally {
      planAbort.clear();
      if (genAbort) finishImageRequest(genAbort);
    }
  }, [
    composerBrief,
    genState,
    generatedUrl,
    imageEngine,
    brandLock,
    onSoftNotice,
    platformIdx,
    platforms,
    platformPinRef,
    aspectPinRef,
    aspectOverride,
    resolveAspect,
    refImage,
    imageQuality,
    imageSize,
    businessType,
    locationId,
    inputRef,
    setGenState,
    failGenerate,
    setProgress,
    setShowTemplate,
    setCaptionState,
    setCaptionText,
    setCaptionTags,
    resetEdit,
    setActiveEdit,
    startProgressTimer,
    stopProgressTimer,
    setPlatformIdx,
    setGeneratedUrl,
    pushHistory,
    requestGenerateImage,
    rememberGenPrompt,
    beginImageRequest,
    isCurrentImageRequest,
    finishImageRequest,
  ]);

  const regenerateLast = useCallback(async () => {
    const last = lastGenPromptRef.current.trim();
    if (!last) {
      inputRef.current?.focus();
      return;
    }
    await composeFromIntent(last);
  }, [composeFromIntent, inputRef]);

  const setLastGenPrompt = useCallback(
    (promptText: string) => {
      rememberGenPrompt(promptText);
    },
    [rememberGenPrompt],
  );

  return {
    generate,
    composeFromIntent,
    regenerateLast,
    resizeToExact,
    setLastGenPrompt,
    lastGenPrompt,
    imageRequestStartedAt,
    cancelImageRequest,
  };
}
