export type LayerType = "image" | "text" | "shape";
export type TextAlign = "left" | "center" | "right";
export type ShapeKind = "rect" | "circle";

export interface CompositionLayer {
  id: string;
  type: LayerType;
  zIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  align?: TextAlign;
  fontWeight?: number;
  src?: string;
  shape?: ShapeKind;
  fill?: string;
  opacity?: number;
}

export interface CompositionDocument {
  version: 1;
  layers: CompositionLayer[];
  updatedAt: string;
}

export function compositionStorageKey(locationId: string, templateId: string): string {
  return `pb-composition:${locationId}:${templateId}`;
}

export function loadComposition(key: string): CompositionDocument | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CompositionDocument;
    if (parsed.version !== 1 || !Array.isArray(parsed.layers)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveComposition(key: string, layers: CompositionLayer[]): void {
  if (typeof window === "undefined") return;
  const doc: CompositionDocument = {
    version: 1,
    layers,
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(key, JSON.stringify(doc));
}

export function createTextLayer(partial?: Partial<CompositionLayer>): CompositionLayer {
  return {
    id: `layer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    type: "text",
    zIndex: partial?.zIndex ?? 10,
    x: partial?.x ?? 10,
    y: partial?.y ?? 40,
    width: partial?.width ?? 80,
    height: partial?.height ?? 18,
    rotation: 0,
    text: partial?.text ?? "Your headline",
    fontSize: partial?.fontSize ?? 42,
    fontFamily: partial?.fontFamily ?? "system-ui, sans-serif",
    color: partial?.color ?? "#ffffff",
    align: partial?.align ?? "center",
    fontWeight: partial?.fontWeight ?? 700,
    ...partial,
  };
}

export function createShapeLayer(shape: ShapeKind = "rect"): CompositionLayer {
  return {
    id: `layer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    type: "shape",
    zIndex: 5,
    x: 20,
    y: 60,
    width: 60,
    height: shape === "circle" ? 20 : 12,
    rotation: 0,
    shape,
    fill: "rgba(238,37,50,0.85)",
    opacity: 1,
  };
}

export function createImageLayer(src: string): CompositionLayer {
  return {
    id: `layer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    type: "image",
    zIndex: 2,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    src,
  };
}

export function sortLayers(layers: CompositionLayer[]): CompositionLayer[] {
  return [...layers].sort((a, b) => a.zIndex - b.zIndex);
}

export function bringForward(layers: CompositionLayer[], id: string): CompositionLayer[] {
  const sorted = sortLayers(layers);
  const idx = sorted.findIndex((l) => l.id === id);
  if (idx < 0 || idx >= sorted.length - 1) return layers;
  const next = sorted[idx + 1];
  return layers.map((l) => {
    if (l.id === id) return { ...l, zIndex: next.zIndex };
    if (l.id === next.id) return { ...l, zIndex: sorted[idx].zIndex };
    return l;
  });
}

export function sendBackward(layers: CompositionLayer[], id: string): CompositionLayer[] {
  const sorted = sortLayers(layers);
  const idx = sorted.findIndex((l) => l.id === id);
  if (idx <= 0) return layers;
  const prev = sorted[idx - 1];
  return layers.map((l) => {
    if (l.id === id) return { ...l, zIndex: prev.zIndex };
    if (l.id === prev.id) return { ...l, zIndex: sorted[idx].zIndex };
    return l;
  });
}
