"use client";

import { useCallback, useRef, useState } from "react";
import { ImagePlus, Sparkles } from "lucide-react";

interface Props {
  disabled?: boolean;
  onUploaded?: (url: string) => void;
  /** Called with the AI-elevated caption + hashtags so the studio can populate its composer. */
  onElevated?: (caption: string, hashtags: string[]) => void;
  /** "card" = full drop card (default); "icon" = a single rail icon that auto-elevates. */
  variant?: "card" | "icon";
}

export default function TrashToTreasureUploadZone({
  disabled,
  onUploaded,
  onElevated,
  variant = "card",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elevating, setElevating] = useState(false);
  const [elevateError, setElevateError] = useState<string | null>(null);
  const [elevateNote, setElevateNote] = useState<string | null>(null);

  const elevateUrl = useCallback(
    async (url: string) => {
      if (disabled) return;
      setElevating(true);
      setElevateError(null);
      setElevateNote(null);
      try {
        const res = await fetch("/api/studio/elevate", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: url }),
        });
        const data = (await res.json()) as {
          caption?: string;
          hashtags?: string[];
          altText?: string;
          error?: string;
          compliance?: { blocked?: boolean; message?: string };
        };
        if (!res.ok) throw new Error(data.error || "Couldn't elevate that photo.");
        if (data.compliance?.blocked) {
          setElevateError(data.compliance.message || "Caption blocked by compliance guardrails.");
          return;
        }
        if (!data.caption) throw new Error("No caption came back. Try again.");
        onElevated?.(data.caption, data.hashtags ?? []);
        if (data.compliance?.message) setElevateNote(data.compliance.message);
      } catch (err) {
        setElevateError(err instanceof Error ? err.message : "Couldn't elevate that photo.");
      } finally {
        setElevating(false);
      }
    },
    [disabled, onElevated],
  );

  const uploadFile = useCallback(
    async (file: File): Promise<string | null> => {
      if (disabled || uploading) return null;
      setUploading(true);
      setError(null);
      setElevateError(null);
      setElevateNote(null);
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/upload", {
          method: "POST",
          credentials: "same-origin",
          body: form,
        });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !data.url) throw new Error(data.error || "Upload failed.");
        setUploadedUrl(data.url);
        onUploaded?.(data.url);
        return data.url;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not upload that file.");
        return null;
      } finally {
        setUploading(false);
      }
    },
    [disabled, onUploaded, uploading],
  );

  // icon variant: upload, then auto-elevate in one shot. card variant: upload only (manual elevate).
  const handleFile = useCallback(
    async (file: File) => {
      const url = await uploadFile(file);
      if (url && variant === "icon") await elevateUrl(url);
    },
    [uploadFile, elevateUrl, variant],
  );

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      className="sr-only"
      disabled={disabled || uploading}
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) void handleFile(file);
        e.target.value = "";
      }}
    />
  );

  // ── Icon variant — a single rail glyph (matches .pb-intent-ico) that auto-elevates ──
  if (variant === "icon") {
    const busy = uploading || elevating;
    const err = error || elevateError;
    return (
      <div className="pb-intent-item">
        <button
          type="button"
          className="pb-intent-ico pb-intent-ico-upload"
          disabled={disabled || busy}
          aria-busy={busy}
          aria-label="Add a photo — AI captions and elevates it"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          data-dragging={dragging || undefined}
        >
          {fileInput}
          <ImagePlus size={22} aria-hidden />
        </button>
        <span className="pb-intent-pop" role="tooltip">
          {err ? err : uploading ? "Uploading…" : elevating ? "Captioning…" : "Upload"}
        </span>
        <style>{`
          .pb-intent-ico-upload[data-dragging] { color: var(--red, #ee2532); }
          .pb-intent-ico-upload[aria-busy="true"] { animation: pbsUploadPulse 1s ease-in-out infinite; }
          @keyframes pbsUploadPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } }
          @media (prefers-reduced-motion: reduce) {
            .pb-intent-ico-upload[aria-busy="true"] { animation: none; opacity: 0.6; }
          }
        `}</style>
      </div>
    );
  }

  // ── Card variant (default) ──
  return (
    <div className="pb-trash-treasure">
      <div
        className={`pb-trash-drop${dragging ? " pb-trash-drop-active" : ""}${uploadedUrl ? " pb-trash-drop-has-file" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
      >
        {fileInput}
        {uploadedUrl ? (
          <img src={uploadedUrl} alt="Uploaded preview" className="pb-trash-preview" />
        ) : (
          <>
            <ImagePlus size={22} />
            <p className="pb-trash-label">Drop a raw photo — AI auto-captions and elevates it.</p>
            <p className="pb-trash-sub">{uploading ? "Uploading…" : "JPG, PNG, or WebP"}</p>
          </>
        )}
      </div>
      {uploadedUrl ? (
        <button
          type="button"
          className="pb-trash-elevate"
          onClick={() => void elevateUrl(uploadedUrl)}
          disabled={disabled || elevating}
          aria-busy={elevating}
        >
          <Sparkles size={14} />
          {elevating ? "Elevating…" : "Elevate with AI"}
        </button>
      ) : null}
      {error ? <p className="pb-trash-error">{error}</p> : null}
      {elevateError ? <p className="pb-trash-error">{elevateError}</p> : null}
      {elevateNote ? <p className="pb-trash-stub">{elevateNote}</p> : null}
      <style>{`
        .pb-trash-treasure { width: 100%; max-width: 320px; margin-top: 16px; }
        .pb-trash-drop {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 6px; min-height: 120px; padding: 16px; border-radius: 16px; cursor: pointer;
          border: 1.5px dashed rgba(0,0,0,0.14); background: rgba(255,255,255,0.72);
          transition: border-color 0.15s, background 0.15s;
        }
        .pb-trash-drop:hover:not(:has(.pb-trash-preview)) {
          border-color: rgba(238,37,50,0.35); background: rgba(238,37,50,0.04);
        }
        .pb-trash-drop-active {
          border-color: rgba(238,37,50,0.5); background: rgba(238,37,50,0.06);
        }
        .pb-trash-drop-has-file { padding: 0; overflow: hidden; cursor: default; }
        .pb-trash-label { font-size: 12.5px; font-weight: 600; text-align: center; margin: 0; }
        .pb-trash-sub { font-size: 11px; color: rgba(22,22,28,0.45); margin: 0; }
        .pb-trash-preview { width: 100%; height: 140px; object-fit: cover; display: block; }
        .pb-trash-elevate {
          display: inline-flex; align-items: center; gap: 6px; margin-top: 10px;
          padding: 7px 12px; border-radius: 10px; font-size: 12px; font-weight: 600;
          border: 1px solid rgba(238,37,50,0.25); background: rgba(238,37,50,0.06); color: #c41e2a;
          cursor: pointer; transition: background 0.15s, opacity 0.15s;
        }
        .pb-trash-elevate:hover:not(:disabled) { background: rgba(238,37,50,0.1); }
        .pb-trash-elevate:disabled { opacity: 0.6; cursor: default; }
        .pb-trash-error { font-size: 11px; color: #c41e2a; margin: 8px 0 0; }
        .pb-trash-stub {
          font-size: 11px; line-height: 1.4; color: rgba(22,22,28,0.55);
          margin: 8px 0 0; padding: 8px 10px; border-radius: 10px; background: rgba(0,0,0,0.04);
        }
        .sr-only {
          position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
          overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
        }
      `}</style>
    </div>
  );
}
