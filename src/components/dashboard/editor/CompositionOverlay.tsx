"use client";

import { useCallback, useRef } from "react";
import type { CompositionLayer } from "@/lib/composition-layers";

interface Props {
  width: number;
  height: number;
  layers: CompositionLayer[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, patch: Partial<CompositionLayer>) => void;
}

export default function CompositionOverlay({
  width,
  height,
  layers,
  selectedId,
  onSelect,
  onUpdate,
}: Props) {
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent, layer: CompositionLayer) => {
      e.stopPropagation();
      onSelect(layer.id);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = {
        id: layer.id,
        startX: e.clientX,
        startY: e.clientY,
        originX: layer.x,
        originY: layer.y,
      };
    },
    [onSelect],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      const dx = ((e.clientX - dragRef.current.startX) / width) * 100;
      const dy = ((e.clientY - dragRef.current.startY) / height) * 100;
      onUpdate(dragRef.current.id, {
        x: Math.max(0, Math.min(100 - 5, dragRef.current.originX + dx)),
        y: Math.max(0, Math.min(100 - 5, dragRef.current.originY + dy)),
      });
    },
    [height, onUpdate, width],
  );

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  return (
    <div
      className="absolute inset-0 z-30"
      style={{ width, height }}
      onClick={() => onSelect(null)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {layers.map((layer) => {
        const selected = layer.id === selectedId;
        const style: React.CSSProperties = {
          position: "absolute",
          left: `${layer.x}%`,
          top: `${layer.y}%`,
          width: `${layer.width}%`,
          height: layer.type === "text" ? "auto" : `${layer.height}%`,
          transform: `rotate(${layer.rotation}deg)`,
          zIndex: layer.zIndex,
          cursor: "grab",
          outline: selected ? "2px solid rgba(238,37,50,0.75)" : undefined,
          outlineOffset: 2,
        };

        if (layer.type === "text") {
          return (
            <div
              key={layer.id}
              role="presentation"
              style={{
                ...style,
                fontSize: (layer.fontSize ?? 32) * (width / 1080),
                fontFamily: layer.fontFamily,
                color: layer.color,
                fontWeight: layer.fontWeight ?? 700,
                textAlign: layer.align ?? "center",
                lineHeight: 1.15,
                userSelect: "none",
                whiteSpace: "pre-wrap",
              }}
              onPointerDown={(e) => onPointerDown(e, layer)}
            >
              {layer.text}
            </div>
          );
        }

        if (layer.type === "shape") {
          return (
            <div
              key={layer.id}
              role="presentation"
              style={{
                ...style,
                background: layer.fill ?? "rgba(238,37,50,0.8)",
                opacity: layer.opacity ?? 1,
                borderRadius: layer.shape === "circle" ? "50%" : 8,
              }}
              onPointerDown={(e) => onPointerDown(e, layer)}
            />
          );
        }

        if (layer.type === "image" && layer.src) {
          return (
            <img
              key={layer.id}
              src={layer.src}
              alt=""
              draggable={false}
              style={{
                ...style,
                objectFit: "cover",
              }}
              onPointerDown={(e) => onPointerDown(e, layer)}
            />
          );
        }

        return null;
      })}
    </div>
  );
}
