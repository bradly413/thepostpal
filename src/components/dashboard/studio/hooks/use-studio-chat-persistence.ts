"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { StudioChatMessage } from "@/lib/studio/studio-chat";

const PAGE_SIZE = 80;
const SYNC_DELAY_MS = 650;
const WORKING_IMAGE_TEXT = "Preparing your image…";
const WORKING_VIDEO_TEXT = "Preparing your video…";

type HistoryResponse = {
  messages?: StudioChatMessage[];
  nextCursor?: string | null;
  error?: string;
};

type Options = {
  locationId: string | null;
  messages: StudioChatMessage[];
  setMessages: Dispatch<SetStateAction<StudioChatMessage[]>>;
  onRestoreLatest: (messages: StudioChatMessage[]) => void;
};

function normalizeMessage(message: StudioChatMessage): StudioChatMessage {
  if (message.role !== "assistant" || message.status !== "working") return message;
  return {
    ...message,
    text: message.mediaType === "video" ? WORKING_VIDEO_TEXT : WORKING_IMAGE_TEXT,
  };
}

function signature(message: StudioChatMessage): string {
  return JSON.stringify(normalizeMessage(message));
}

function recoverInterrupted(message: StudioChatMessage): StudioChatMessage {
  if (message.role !== "assistant" || message.status !== "working") return message;
  return {
    ...message,
    status: "error",
    text: "Generation was interrupted. Try again.",
  };
}

function mergeChronologically(
  older: StudioChatMessage[],
  current: StudioChatMessage[],
): StudioChatMessage[] {
  const byId = new Map<string, StudioChatMessage>();
  for (const message of [...older, ...current]) byId.set(message.id, message);
  return [...byId.values()].sort((a, b) => a.at - b.at);
}

export function useStudioChatPersistence({
  locationId,
  messages,
  setMessages,
  onRestoreLatest,
}: Options) {
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");
  const [syncError, setSyncError] = useState("");
  const hydratedLocationRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);
  const persistedSignaturesRef = useRef(new Map<string, string>());
  const restoreLatestRef = useRef(onRestoreLatest);

  useEffect(() => {
    restoreLatestRef.current = onRestoreLatest;
  }, [onRestoreLatest]);

  const loadInitial = useCallback(async () => {
    const targetLocationId = locationId;
    const requestId = ++requestIdRef.current;
    hydratedLocationRef.current = null;
    persistedSignaturesRef.current.clear();
    setNextCursor(null);
    setLoadError("");
    setSyncError("");
    setMessages([]);

    if (!targetLocationId) {
      setLoadingInitial(false);
      return;
    }

    setLoadingInitial(true);
    try {
      const response = await fetch(
        `/api/studio/history?locationId=${encodeURIComponent(targetLocationId)}&limit=${PAGE_SIZE}`,
        { cache: "no-store" },
      );
      const data = (await response.json()) as HistoryResponse;
      if (!response.ok) {
        throw new Error(data.error || "Could not load Studio history.");
      }
      if (requestId !== requestIdRef.current || locationId !== targetLocationId) return;

      const stored = Array.isArray(data.messages) ? data.messages : [];
      const recovered = stored.map(recoverInterrupted);
      for (const message of stored) {
        if (message.role === "assistant" && message.status === "working") continue;
        persistedSignaturesRef.current.set(message.id, signature(message));
      }
      hydratedLocationRef.current = targetLocationId;
      setMessages(recovered);
      setNextCursor(data.nextCursor || null);
      restoreLatestRef.current(recovered);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      hydratedLocationRef.current = targetLocationId;
      setLoadError(error instanceof Error ? error.message : "Could not load Studio history.");
    } finally {
      if (requestId === requestIdRef.current) setLoadingInitial(false);
    }
  }, [locationId, setMessages]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadInitial(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadInitial]);

  useEffect(() => {
    if (!locationId || hydratedLocationRef.current !== locationId || messages.length === 0) return;

    const dirty = messages
      .map(normalizeMessage)
      .filter((message) => persistedSignaturesRef.current.get(message.id) !== signature(message));
    if (dirty.length === 0) return;

    const timeout = window.setTimeout(async () => {
      try {
        for (let offset = 0; offset < dirty.length; offset += 120) {
          const batch = dirty.slice(offset, offset + 120);
          const response = await fetch("/api/studio/history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ locationId, messages: batch }),
          });
          const data = (await response.json()) as { error?: string };
          if (!response.ok) throw new Error(data.error || "Could not save Studio history.");
          for (const message of batch) {
            persistedSignaturesRef.current.set(message.id, signature(message));
          }
        }
        setSyncError("");
      } catch (error) {
        setSyncError(error instanceof Error ? error.message : "Could not save Studio history.");
      }
    }, syncError ? 5_000 : SYNC_DELAY_MS);

    return () => window.clearTimeout(timeout);
  }, [locationId, messages, syncError]);

  const loadEarlier = useCallback(async () => {
    if (!locationId || !nextCursor || loadingEarlier) return false;
    setLoadingEarlier(true);
    setLoadError("");
    try {
      const response = await fetch(
        `/api/studio/history?locationId=${encodeURIComponent(locationId)}&limit=${PAGE_SIZE}&before=${encodeURIComponent(nextCursor)}`,
        { cache: "no-store" },
      );
      const data = (await response.json()) as HistoryResponse;
      if (!response.ok) throw new Error(data.error || "Could not load earlier conversations.");
      const older = Array.isArray(data.messages) ? data.messages.map(recoverInterrupted) : [];
      for (const message of older) {
        persistedSignaturesRef.current.set(message.id, signature(message));
      }
      setMessages((current) => mergeChronologically(older, current));
      setNextCursor(data.nextCursor || null);
      return true;
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Could not load earlier conversations.",
      );
      return false;
    } finally {
      setLoadingEarlier(false);
    }
  }, [loadingEarlier, locationId, nextCursor, setMessages]);

  return {
    loadingInitial,
    loadingEarlier,
    hasEarlier: Boolean(nextCursor),
    loadError,
    syncError,
    loadEarlier,
    retryInitial: loadInitial,
  };
}
