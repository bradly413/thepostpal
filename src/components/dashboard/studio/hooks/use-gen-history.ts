"use client";

import { useState, useRef, useEffect, useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { createDashboardPhoto, fetchDashboardPosts } from "@/lib/dashboard-api";
import type { StudioHistoryEntry } from "@/components/dashboard/studio/StudioHistoryGallery";

type GenState = "idle" | "generating" | "done";
type CaptionState = "idle" | "loading" | "done" | "error";

export type UseGenHistoryParams = {
  locationId: string | null;
  genState: GenState;
  setGeneratedUrl: Dispatch<SetStateAction<string | null>>;
  setMediaKind: Dispatch<SetStateAction<"image" | "video">>;
  setComposerMode: Dispatch<SetStateAction<"image" | "video">>;
  setGenState: Dispatch<SetStateAction<GenState>>;
  setShowTemplate: Dispatch<SetStateAction<boolean>>;
  setCaptionText: Dispatch<SetStateAction<string>>;
  setCaptionTags: Dispatch<SetStateAction<string>>;
  setCaptionState: Dispatch<SetStateAction<CaptionState>>;
  setCaptionError: Dispatch<SetStateAction<string>>;
  setCaptionBrief: Dispatch<SetStateAction<string>>;
  setCaptionRun: Dispatch<SetStateAction<number>>;
  aiCaptionRef: MutableRefObject<string>;
  resetEdit: () => void;
  setError: Dispatch<SetStateAction<string>>;
};

export function useGenHistory({
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
}: UseGenHistoryParams) {
  const [genHistory, setGenHistory] = useState<StudioHistoryEntry[]>([]);
  const savedToMediaRef = useRef<Set<string>>(new Set());

  const saveGenerationToMedia = useCallback(
    (entry: StudioHistoryEntry) => {
      if (!locationId || savedToMediaRef.current.has(entry.url)) return;
      savedToMediaRef.current.add(entry.url);
      const m = entry.url.match(/^data:(image\/[a-z+.-]+);base64,(.+)$/);
      if (!m) return;
      void (async () => {
        try {
          const bin = atob(m[2]);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          const ext = m[1].split("/")[1]?.replace("jpeg", "jpg") || "png";
          const file = new File([bytes], `generation-${entry.at}.${ext}`, { type: m[1] });
          const fd = new FormData();
          fd.append("file", file);
          fd.append("locationId", locationId);
          fd.append("alt", entry.prompt || "Studio generation");
          const res = await fetch("/api/upload", { method: "POST", credentials: "same-origin", body: fd });
          const data = (await res.json()) as { url?: string; photoId?: string; error?: string };
          if (!res.ok || !data.url) throw new Error(data.error || "upload failed");
          const hostedUrl = data.url;
          // Fallback if the upload route couldn't register the library row.
          if (!data.photoId) {
            await createDashboardPhoto({
              locationId,
              url: hostedUrl,
              mimeType: m[1],
              alt: entry.prompt || "Studio generation",
            });
          }
          savedToMediaRef.current.add(hostedUrl);
          setGenHistory((h) => h.map((e) => (e.url === entry.url ? { ...e, url: hostedUrl } : e)));
        } catch {
          savedToMediaRef.current.delete(entry.url);
        }
      })();
    },
    [locationId],
  );

  const pushHistory = useCallback((url: string, promptText: string) => {
    setGenHistory((h) =>
      [
        { url, prompt: promptText.slice(0, 120), at: Date.now(), source: "session" as const },
        ...h.filter((e) => e.url !== url),
      ].slice(0, 14),
    );
  }, []);

  // Persist every session generation into the media library (Content/Media).
  useEffect(() => {
    genHistory.filter((e) => e.source === "session").forEach(saveGenerationToMedia);
  }, [genHistory, saveGenerationToMedia]);

  useEffect(() => {
    if (!locationId) return;
    let cancelled = false;
    void (async () => {
      try {
        const posts = await fetchDashboardPosts(locationId);
        if (cancelled) return;
        const seeded = posts
          .filter(
            (p) =>
              (p.mediaType ?? "image") === "image" &&
              typeof p.mediaUrl === "string" &&
              p.mediaUrl.startsWith("http"),
          )
          .slice(0, 10)
          .map((p) => ({
            url: p.mediaUrl as string,
            prompt: p.copy.slice(0, 120),
            at: Date.parse(p.scheduledFor ?? p.createdAt) || Date.now(),
            source: "post" as const,
          }));
        setGenHistory((h) => {
          const seen = new Set(h.map((e) => e.url));
          return [...h, ...seeded.filter((e) => !seen.has(e.url))].slice(0, 14);
        });
      } catch {
        /* history is optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locationId]);

  const adoptImage = useCallback(
    (url: string) => {
      if (genState === "generating") return;
      setGeneratedUrl(url);
      setMediaKind("image");
      setComposerMode("image");
      setGenState("done");
      setShowTemplate(false);
      setCaptionText("");
      setCaptionTags("");
      setCaptionState("idle");
      setCaptionError("");
      setCaptionBrief("");
      setCaptionRun(0);
      aiCaptionRef.current = "";
      resetEdit();
      setError("");
    },
    [
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
    ],
  );

  return { genHistory, pushHistory, adoptImage };
}
