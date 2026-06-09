"use client";

import {
  bringForward,
  createShapeLayer,
  createTextLayer,
  sendBackward,
  type CompositionLayer,
} from "@/lib/composition-layers";

interface Props {
  layers: CompositionLayer[];
  selected: CompositionLayer | null;
  canUndo: boolean;
  onAddText: () => void;
  onAddShape: () => void;
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: Partial<CompositionLayer>) => void;
  onRemove: (id: string) => void;
  onReorder: (layers: CompositionLayer[]) => void;
  onUndo: () => void;
}

export default function LayerPanel({
  layers,
  selected,
  canUndo,
  onAddText,
  onAddShape,
  onSelect,
  onUpdate,
  onRemove,
  onReorder,
  onUndo,
}: Props) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-black">Layers</span>
        <button
          type="button"
          className="text-[10px] font-semibold opacity-50 hover:opacity-100 disabled:opacity-30"
          disabled={!canUndo}
          onClick={onUndo}
        >
          Undo
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button type="button" className="pb-btn-secondary text-xs px-3 py-1.5" onClick={onAddText}>
          Add text
        </button>
        <button
          type="button"
          className="pb-btn-secondary text-xs px-3 py-1.5"
          onClick={() => {
            onAddShape();
          }}
        >
          Add shape
        </button>
      </div>

      <div className="space-y-1 max-h-36 overflow-y-auto">
        {[...layers].reverse().map((layer) => (
          <button
            key={layer.id}
            type="button"
            onClick={() => onSelect(layer.id)}
            className={`w-full text-left rounded-lg px-2 py-1.5 text-xs border transition-colors ${
              selected?.id === layer.id
                ? "border-[var(--pb-press)] bg-[rgba(238,37,50,0.06)]"
                : "border-transparent hover:bg-black/[0.03]"
            }`}
          >
            {layer.type === "text"
              ? `Text: ${(layer.text ?? "").slice(0, 24)}`
              : layer.type === "shape"
                ? `Shape (${layer.shape})`
                : "Image layer"}
          </button>
        ))}
        {layers.length === 0 ? (
          <p className="text-xs opacity-45">No overlay layers yet.</p>
        ) : null}
      </div>

      {selected ? (
        <div className="space-y-2 pt-2 border-t border-black/10">
          {selected.type === "text" ? (
            <>
              <textarea
                value={selected.text ?? ""}
                onChange={(e) => onUpdate(selected.id, { text: e.target.value })}
                className="pb-field text-xs min-h-[60px] resize-none"
                placeholder="Layer text"
              />
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[10px] opacity-55">
                  Size
                  <input
                    type="number"
                    min={12}
                    max={120}
                    value={selected.fontSize ?? 32}
                    onChange={(e) => onUpdate(selected.id, { fontSize: Number(e.target.value) })}
                    className="pb-field mt-1 text-xs w-full"
                  />
                </label>
                <label className="text-[10px] opacity-55">
                  Color
                  <input
                    type="color"
                    value={selected.color ?? "#ffffff"}
                    onChange={(e) => onUpdate(selected.id, { color: e.target.value })}
                    className="mt-1 h-8 w-full rounded-lg border border-black/10"
                  />
                </label>
              </div>
              <div className="flex gap-1">
                {(["left", "center", "right"] as const).map((align) => (
                  <button
                    key={align}
                    type="button"
                    className={`flex-1 text-[10px] py-1 rounded-md border ${
                      selected.align === align
                        ? "border-[var(--pb-press)] text-[var(--pb-press)]"
                        : "border-black/10 opacity-60"
                    }`}
                    onClick={() => onUpdate(selected.id, { align })}
                  >
                    {align}
                  </button>
                ))}
              </div>
            </>
          ) : selected.type === "shape" ? (
            <label className="text-[10px] opacity-55 block">
              Fill
              <input
                type="color"
                value={selected.fill?.startsWith("#") ? selected.fill : "#ee2532"}
                onChange={(e) => onUpdate(selected.id, { fill: e.target.value })}
                className="mt-1 h-8 w-full rounded-lg border border-black/10"
              />
            </label>
          ) : null}

          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              className="text-[10px] font-semibold opacity-60 hover:opacity-100"
              onClick={() => onReorder(bringForward(layers, selected.id))}
            >
              Bring forward
            </button>
            <button
              type="button"
              className="text-[10px] font-semibold opacity-60 hover:opacity-100"
              onClick={() => onReorder(sendBackward(layers, selected.id))}
            >
              Send back
            </button>
            <button
              type="button"
              className="text-[10px] font-semibold text-[var(--pb-press)] ml-auto"
              onClick={() => onRemove(selected.id)}
            >
              Delete layer
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { createTextLayer, createShapeLayer };
