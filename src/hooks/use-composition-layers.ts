"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type CompositionLayer,
  loadComposition,
  saveComposition,
  sortLayers,
} from "@/lib/composition-layers";

export function useCompositionLayers(storageKey: string | null) {
  const [layers, setLayers] = useState<CompositionLayer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const history = useRef<CompositionLayer[][]>([]);
  const [canUndo, setCanUndo] = useState(false);

  useEffect(() => {
    if (!storageKey) {
      setLayers([]);
      return;
    }
    const saved = loadComposition(storageKey);
    if (saved?.layers.length) {
      setLayers(sortLayers(saved.layers));
    } else {
      setLayers([]);
    }
    history.current = [];
    setCanUndo(false);
  }, [storageKey]);

  const persist = useCallback(
    (next: CompositionLayer[]) => {
      setLayers(next);
      if (storageKey) saveComposition(storageKey, next);
    },
    [storageKey],
  );

  const pushHistory = useCallback((snapshot: CompositionLayer[]) => {
    history.current.push(snapshot.map((l) => ({ ...l })));
    if (history.current.length > 40) history.current.shift();
    setCanUndo(true);
  }, []);

  const updateLayer = useCallback(
    (id: string, patch: Partial<CompositionLayer>) => {
      setLayers((prev) => {
        pushHistory(prev);
        const next = prev.map((l) => (l.id === id ? { ...l, ...patch } : l));
        if (storageKey) saveComposition(storageKey, next);
        return next;
      });
    },
    [pushHistory, storageKey],
  );

  const setAllLayers = useCallback(
    (next: CompositionLayer[]) => {
      setLayers((prev) => {
        pushHistory(prev);
        const sorted = sortLayers(next);
        if (storageKey) saveComposition(storageKey, sorted);
        return sorted;
      });
    },
    [pushHistory, storageKey],
  );

  const addLayer = useCallback(
    (layer: CompositionLayer) => {
      setLayers((prev) => {
        pushHistory(prev);
        const next = sortLayers([...prev, layer]);
        if (storageKey) saveComposition(storageKey, next);
        return next;
      });
      setSelectedId(layer.id);
    },
    [pushHistory, storageKey],
  );

  const removeLayer = useCallback(
    (id: string) => {
      setLayers((prev) => {
        pushHistory(prev);
        const next = prev.filter((l) => l.id !== id);
        if (storageKey) saveComposition(storageKey, next);
        return next;
      });
      setSelectedId((cur) => (cur === id ? null : cur));
    },
    [pushHistory, storageKey],
  );

  const undo = useCallback(() => {
    const prev = history.current.pop();
    if (!prev) {
      setCanUndo(false);
      return;
    }
    setCanUndo(history.current.length > 0);
    persist(sortLayers(prev));
  }, [persist]);

  const selected = layers.find((l) => l.id === selectedId) ?? null;

  return {
    layers: sortLayers(layers),
    selected,
    selectedId,
    setSelectedId,
    updateLayer,
    setAllLayers,
    addLayer,
    removeLayer,
    undo,
    canUndo,
  };
}
