"use client";

import { useRef, useEffect, useCallback, type Dispatch, type MutableRefObject, type RefObject, type SetStateAction } from "react";
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
  /** Tenant business type — a hint for the hidden art-director prompt expansion. */
  businessType?: string;
  /** Active location — lets the server pull the brand book for art direction. */
  locationId?: string | null;
  platformPinRef: MutableRefObject<boolean>;
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
  businessType,
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
}: UseStudioGenerationParams) {
  const genTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastGenPromptRef = useRef("");

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
        retriedForQuality?: boolean;
      }>;
    },
    [imageQuality, imageSize, businessType, locationId],
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
          aspect: platform.genAspect,
          referenceImage: refForGen,
          signal: ctrl.signal,
        });
        if (data.error || !data.image) {
          await holdFloor(startedAt);
          stopProgressTimer();
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
        await holdFloor(startedAt);
        stopProgressTimer();
        setProgress(100);
        setGeneratedUrl(data.image);
        pushHistory(data.image, savedPrompt);
        lastGenPromptRef.current = savedPrompt;
        setGenState("done");
      } catch (err) {
        await holdFloor(startedAt);
        stopProgressTimer();
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
    },
    [
      prompt,
      genState,
      platform.genAspect,
      refImage,
      generatedUrl,
      requestGenerateImage,
      imageQuality,
      imageSize,
      businessType,
      locationId,
      inputRef,
      setGenState,
      setError,
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
    ],
  );

  const composeFromIntent = useCallback(async () => {
    const intent = composerBrief;
    if (!intent || genState === "generating") {
      inputRef.current?.focus();
      return;
    }
    if (resolveStudioImageRoute({
      intent,
      refImage,
      generatedUrl,
      genState,
      lastGenPrompt: lastGenPromptRef.current,
    }) === "blocked_listing_no_photo") {
      setError("Add your listing photo first — we can't show your property from an address alone.");
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
      let aspect = platform.genAspect;
      const historyLabel = intent;

      const editingFromCanvas =
        isReprompt && !!generatedUrl && shouldEditFromReference(intent, lastGenPromptRef.current, true);
      const refForGen = editingFromCanvas ? generatedUrl : refImage;
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
        lastGenPromptRef.current = intent;
        setCaptionText("");
        setCaptionTags("");
        setCaptionState("idle");
        setGenState("done");
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
      } else {
      const cRes = await fetch("/api/studio/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent,
          hasReferenceImage: !!refForGen,
          ...(locationId ? { locationId } : {}),
        }),
        signal: ctrl.signal,
      });
      const brief = await cRes.json();
      if (!cRes.ok || brief.error) {
        stopProgressTimer();
        setCaptionState("idle");
        clearTimeout(timeoutId);
        if (brief.code === "listing_photo_required") {
          setError(brief.error || "Add your listing photo first.");
          setGenState(isReprompt ? "done" : "idle");
          return;
        }
        await generate(intent, isReprompt ? "done" : "idle");
        return;
      }

      const textNamesPlatform = /instagram|facebook|tiktok|linkedin|\btwitter\b|\bx\b/i.test(intent);
      const idx = platforms.findIndex((p) => p.id === brief.platform);
      const pIdx = idx >= 0 && (textNamesPlatform || !platformPinRef.current) ? idx : platformIdx;
      if (textNamesPlatform) platformPinRef.current = false;
      setPlatformIdx(pIdx);
      aspect = platforms[pIdx].genAspect;
      imagePrompt = brief.imagePrompt;
      }

      const iData = await requestGenerateImage(imagePrompt || intent, {
        aspect,
        referenceImage: refForGen,
        sourceIntent: intent,
        listingMode: isListingBrief(intent) && !!refForGen,
        signal: ctrl.signal,
      });
      if (iData.error || !iData.image) {
        stopProgressTimer();
        setProgress(0);
        setCaptionState("idle");
        const msg = iData.error || "Generation failed";
        setError(
          msg.includes("not configured")
            ? "Image generation is not available yet. API key needs to be configured."
            : msg,
        );
        setGenState(isReprompt ? "done" : "idle");
        return;
      }

      stopProgressTimer();
      setProgress(100);
      setGeneratedUrl(iData.image);
      pushHistory(iData.image, historyLabel);
      lastGenPromptRef.current = historyLabel;
      setCaptionText("");
      setCaptionTags("");
      setCaptionState("idle");
      setGenState("done");
    } catch (err) {
      stopProgressTimer();
      setProgress(0);
      setCaptionState("idle");
      setError(
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
    platformIdx,
    platforms,
    platformPinRef,
    refImage,
    imageQuality,
    imageSize,
    businessType,
    locationId,
    inputRef,
    setGenState,
    setError,
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
    generate,
  ]);

  const setLastGenPrompt = useCallback((promptText: string) => {
    lastGenPromptRef.current = promptText.trim();
  }, []);

  return { generate, composeFromIntent, resizeToExact, setLastGenPrompt };
}
