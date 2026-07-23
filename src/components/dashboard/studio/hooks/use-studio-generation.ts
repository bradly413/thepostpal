"use client";

import { useRef, useEffect, useCallback, useState, type Dispatch, type MutableRefObject, type RefObject, type SetStateAction } from "react";
import { buildFallbackEditPrompt, shouldEditFromReference } from "@/lib/studio/reprompt-delta";
import { inferPlatformIdFromIntent, isListingBrief } from "@/lib/studio/scene-intent";
import { resolveStudioImageRoute } from "@/lib/studio/studio-image-routing";

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
          ...(imageEngine === "design" ? { engine: "gpt" } : {}),
          ...(brandLock ? {} : { brandLock: false }),
          quality: imageQuality,
          ...(imageQuality === "pro" ? { imageSize } : {}),
          ...(businessType ? { businessType } : {}),
          ...(locationId ? { locationId } : {}),
        }),
        signal: opts.signal,
      });
      return res.json() as Promise<{
        image?: string;
        error?: string;
        modelId?: string;
        retriedForQuality?: boolean;
      }>;
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

      const ctrl = new AbortController();
      const timeoutId = setTimeout(() => ctrl.abort(), 60_000);
      try {
        const editingFromCanvas =
          recoverGenState === "done" &&
          !!generatedUrl &&
          shouldEditFromReference(savedPrompt, lastGenPromptRef.current, true);
        const refForGen = editingFromCanvas ? generatedUrl : refImage;

        const data = await requestGenerateImage(savedPrompt, {
          aspect: resolveAspect(),
          referenceImage: refForGen,
          signal: ctrl.signal,
        });
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
        await holdFloor(startedAt);
        stopProgressTimer();
        setProgress(0);
        failGenerate(
          err instanceof DOMException && err.name === "AbortError"
            ? "Generation timed out. Please try again."
            : "Network error. Please try again.",
        );
        setGenState("idle");
      } finally {
        clearTimeout(timeoutId);
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
      setGeneratedUrl,
      pushHistory,
      rememberGenPrompt,
    ],
  );

  const composeFromIntent = useCallback(async (
    overrideBrief?: string,
    overrideRefImage?: string | null,
  ) => {
    const intent = (overrideBrief ?? composerBrief).trim();
    const activeRef = overrideRefImage !== undefined ? overrideRefImage : refImage;
    if (!intent || genState === "generating") {
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

    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 60_000);
    try {
      let imagePrompt: string | null = null;
      let aspect = resolveAspect();
      let directorComposed = false;
      let allowTextOnImage = false;
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
        clearTimeout(timeoutId);
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
          signal: ctrl.signal,
        });
        const rData = (await rRes.json()) as { imagePrompt?: string; error?: string };
        if (rRes.ok && rData.imagePrompt) {
          imagePrompt = rData.imagePrompt;
        } else {
          imagePrompt = buildFallbackEditPrompt(intent);
        }
      } else if (imageRoute === "compose_generate" || imageRoute === "direct_generate") {
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
            signal: ctrl.signal,
          });
          const d = (await dRes.json()) as {
            platform?: string;
            imagePrompt?: string;
            allowText?: boolean;
            clarify?: string;
            error?: string;
            code?: string;
          };
          if (!dRes.ok && d.code === "listing_photo_required") {
            stopProgressTimer();
            setCaptionState("idle");
            clearTimeout(timeoutId);
            failGenerate(d.error || "Add your listing photo first.");
            setGenState(isReprompt ? "done" : "idle");
            return;
          }
          if (dRes.ok && d.clarify) {
            // One clarifying question — no generation until it's answered.
            stopProgressTimer();
            setProgress(0);
            setCaptionState("idle");
            clearTimeout(timeoutId);
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
            directorComposed = true;
          }
        } catch {
          // Director unreachable — legacy fallback below.
        }

        if (!directorComposed && imageRoute === "compose_generate") {
          const cRes = await fetch("/api/studio/compose", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              intent,
              hasReferenceImage: !!refForGen,
              ...(locationId ? { locationId } : {}),
              ...(brandLock ? {} : { brandLock: false }),
            }),
            signal: ctrl.signal,
          });
          const brief = await cRes.json();
          if (!cRes.ok || brief.error) {
            if (brief.code === "listing_photo_required") {
              stopProgressTimer();
              setCaptionState("idle");
              clearTimeout(timeoutId);
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
        } else if (!directorComposed) {
          // direct_generate fallback — the server-side art director still
          // brand-grounds it (composed:false).
          imagePrompt = intent;
        }
      }

      const iData = await requestGenerateImage(imagePrompt || intent, {
        aspect,
        referenceImage: refForGen,
        sourceIntent: intent,
        listingMode: isListingBrief(intent) && !!refForGen,
        // Composed = a Claude step (Director/compose/reprompt) already shaped
        // this prompt. Only un-directed direct briefs stay composed:false so
        // the server-side art director can brand-ground them.
        composed:
          directorComposed ||
          imageRoute === "compose_generate" ||
          imageRoute === "reprompt_edit",
        allowText: allowTextOnImage,
        signal: ctrl.signal,
      });
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
      // Honest engine attribution: forcing Design Studio can silently fall
      // back to Gemini (no OpenAI key, or a reference photo is attached).
      if (imageEngine === "design" && iData.modelId && !iData.modelId.includes("gpt")) {
        onSoftNotice?.(
          "Design Studio wasn't available for this one — generated with Posterboy Visual instead.",
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
      stopProgressTimer();
      setProgress(0);
      setCaptionState("idle");
      failGenerate(
        err instanceof DOMException && err.name === "AbortError"
          ? "Timed out. Please try again."
          : "Network error. Please try again.",
      );
      setGenState(isReprompt ? "done" : "idle");
    } finally {
      clearTimeout(timeoutId);
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
  };
}
