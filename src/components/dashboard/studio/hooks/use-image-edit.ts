"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type CSSProperties,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";

export const EDIT_DEFAULT = {
  scale: 1,
  x: 0,
  y: 0,
  rotate: 0,
  brightness: 100,
  contrast: 100,
  saturate: 100,
};

type GenState = "idle" | "generating" | "done";

type PlatformDims = { w: number; h: number; id: string };

export type UseImageEditParams = {
  genState: GenState;
  showTemplate: boolean;
  generatedUrl: string | null;
  platform: PlatformDims;
  frameWrapRef: RefObject<HTMLDivElement | null>;
  resizeToExact: (dataUrl: string, w: number, h: number) => Promise<string>;
  setGeneratedUrl: Dispatch<SetStateAction<string | null>>;
  setError: (msg: string) => void;
  setActiveEdit: React.Dispatch<React.SetStateAction<null | "scale" | "move" | "rotate" | "adjust">>;
};

export function useImageEdit({
  genState,
  showTemplate,
  generatedUrl,
  platform,
  frameWrapRef,
  resizeToExact,
  setGeneratedUrl,
  setError,
  setActiveEdit,
}: UseImageEditParams) {
  const [edit, setEdit] = useState(EDIT_DEFAULT);
  const editHistory = useRef<(typeof EDIT_DEFAULT)[]>([]);
  const lastCommittedEdit = useRef(EDIT_DEFAULT);
  const undoingEdit = useRef(false);
  const editCommitTimer = useRef<number | null>(null);
  const [canUndoEdit, setCanUndoEdit] = useState(false);
  const dragRef = useRef<{ px: number; py: number; ex: number; ey: number } | null>(null);

  const resetEdit = useCallback(() => {
    editHistory.current = [];
    setCanUndoEdit(false);
    setEdit(EDIT_DEFAULT);
    lastCommittedEdit.current = EDIT_DEFAULT;
    setActiveEdit(null);
  }, [setActiveEdit]);

  useEffect(() => {
    if (undoingEdit.current) {
      undoingEdit.current = false;
      lastCommittedEdit.current = edit;
      return;
    }
    const prev = lastCommittedEdit.current;
    if (editCommitTimer.current) clearTimeout(editCommitTimer.current);
    editCommitTimer.current = window.setTimeout(() => {
      if (JSON.stringify(prev) !== JSON.stringify(edit)) {
        editHistory.current.push(prev);
        if (editHistory.current.length > 50) editHistory.current.shift();
        setCanUndoEdit(true);
      }
      lastCommittedEdit.current = edit;
    }, 350);
    return () => {
      if (editCommitTimer.current) clearTimeout(editCommitTimer.current);
    };
  }, [edit]);

  const undoEdit = useCallback(() => {
    const prev = editHistory.current.pop();
    if (!prev) return;
    undoingEdit.current = true;
    setEdit(prev);
    setCanUndoEdit(editHistory.current.length > 0);
  }, []);

  useEffect(() => {
    const el = frameWrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (genState !== "done" || showTemplate) return;
      e.preventDefault();
      setEdit((s) => ({
        ...s,
        scale: Math.max(0.5, Math.min(3, Number((s.scale - e.deltaY * 0.0015).toFixed(3)))),
      }));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [genState, showTemplate, frameWrapRef]);

  const canEditImage = genState === "done" && !showTemplate;
  const clampPan = (v: number) => Math.max(-50, Math.min(50, v));

  const onImagePointerDown = (e: React.PointerEvent) => {
    if (!canEditImage) return;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* pointer capture optional */
    }
    dragRef.current = { px: e.clientX, py: e.clientY, ex: edit.x, ey: edit.y };
  };

  const onImagePointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    const box = frameWrapRef.current?.getBoundingClientRect();
    if (!d || !box) return;
    const nx = d.ex + ((e.clientX - d.px) / box.width) * 100;
    const ny = d.ey + ((e.clientY - d.py) / box.height) * 100;
    setEdit((s) => ({ ...s, x: clampPan(nx), y: clampPan(ny) }));
  };

  const onImagePointerUp = () => {
    dragRef.current = null;
  };

  const handleCropToFrame = useCallback(() => {
    if (genState !== "done" || !generatedUrl) return;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const targetAR = platform.w / platform.h;
      const srcAR = img.width / img.height;
      let sw = img.width;
      let sh = img.height;
      if (srcAR > targetAR) sw = sh * targetAR;
      else sh = sw / targetAR;
      const sx = (img.width - sw) / 2;
      const sy = (img.height - sh) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(sw);
      canvas.height = Math.round(sh);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      try {
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        const out = canvas.toDataURL("image/png");
        editHistory.current = [];
        setCanUndoEdit(false);
        setEdit(EDIT_DEFAULT);
        lastCommittedEdit.current = EDIT_DEFAULT;
        setActiveEdit(null);
        setGeneratedUrl(out);
      } catch {
        setError("This image can't be cropped here (it's hosted externally). Download it instead.");
      }
    };
    img.onerror = () => setError("Couldn't crop the image. Try again.");
    img.src = generatedUrl;
  }, [genState, generatedUrl, platform.w, platform.h, setGeneratedUrl, setError, setActiveEdit]);

  const handleDownloadImage = useCallback(async () => {
    if (genState !== "done" || !generatedUrl) return;
    const a = document.createElement("a");
    a.download = `posterboy-${platform.id}-${platform.w}x${platform.h}.jpg`;
    a.href = await resizeToExact(generatedUrl, platform.w, platform.h);
    a.click();
  }, [genState, generatedUrl, platform, resizeToExact]);

  const previewStyle: CSSProperties = {
    ...(generatedUrl && (genState === "done" || genState === "generating")
      ? // JSON.stringify → safe CSS url("...") even for data: / query strings
        { backgroundImage: `url(${JSON.stringify(generatedUrl)})` }
      : {}),
    transform: `translate(${edit.x}%, ${edit.y}%) scale(${edit.scale}) rotate(${edit.rotate}deg)`,
    filter: `brightness(${edit.brightness}%) contrast(${edit.contrast}%) saturate(${edit.saturate}%)`,
  };

  return {
    edit,
    setEdit,
    canUndoEdit,
    undoEdit,
    resetEdit,
    canEditImage,
    onImagePointerDown,
    onImagePointerMove,
    onImagePointerUp,
    handleCropToFrame,
    handleDownloadImage,
    previewStyle,
  };
}
