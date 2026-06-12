"use client";

import { useRef, useEffect, useCallback, type Dispatch, type MutableRefObject, type RefObject, type SetStateAction } from "react";

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
  platformPinRef: MutableRefObject<boolean>;
  inputRef: RefObject<HTMLInputElement | null>;
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
        const res = await fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: savedPrompt,
            aspectRatio: platform.genAspect,
            ...(refImage ? { referenceImage: refImage } : {}),
            quality: imageQuality,
            ...(imageQuality === "pro" ? { imageSize } : {}),
          }),
          signal: ctrl.signal,
        });
        const data = await res.json();
        if (!res.ok || data.error) {
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
      imageQuality,
      imageSize,
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
      const cRes = await fetch("/api/studio/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent }),
        signal: ctrl.signal,
      });
      const brief = await cRes.json();
      if (!cRes.ok || brief.error) {
        stopProgressTimer();
        setCaptionState("idle");
        clearTimeout(timeoutId);
        await generate(intent, isReprompt ? "done" : "idle");
        return;
      }

      const textNamesPlatform = /instagram|facebook|tiktok|linkedin|\btwitter\b|\bx\b/i.test(intent);
      const idx = platforms.findIndex((p) => p.id === brief.platform);
      const pIdx = idx >= 0 && (textNamesPlatform || !platformPinRef.current) ? idx : platformIdx;
      if (textNamesPlatform) platformPinRef.current = false;
      setPlatformIdx(pIdx);
      const aspect = platforms[pIdx].genAspect;

      const iRes = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: brief.imagePrompt,
          aspectRatio: aspect,
          ...(refImage ? { referenceImage: refImage } : {}),
          quality: imageQuality,
          ...(imageQuality === "pro" ? { imageSize } : {}),
        }),
        signal: ctrl.signal,
      });
      const iData = await iRes.json();
      if (!iRes.ok || iData.error) {
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
      pushHistory(iData.image, intent);
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
    generate,
  ]);

  return { generate, composeFromIntent, resizeToExact };
}
