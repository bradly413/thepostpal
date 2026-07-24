"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Clapperboard,
  Clock3,
  Sparkles,
  Upload,
  Volume2,
} from "lucide-react";
import { uploadDashboardVideo } from "@/lib/dashboard-upload";
import type { VideoGenAspect } from "@/lib/studio/generate-video-client";
import styles from "./VideoComposer.module.css";

export type VideoAspectPreset = "9:16" | "1:1" | "4:5";

const ASPECT_DIMS: Record<VideoAspectPreset, { w: number; h: number }> = {
  "9:16": { w: 1080, h: 1920 },
  "1:1": { w: 1080, h: 1080 },
  "4:5": { w: 1080, h: 1350 },
};

interface Props {
  onComplete: (publicUrl: string, details?: { prompt?: string }) => void;
  onError: (message: string) => void;
  initialUrl?: string | null;
  /** Veo aspect for AI generation (upload export can still use other presets). */
  aspectHint?: VideoGenAspect;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VideoComposer({
  onComplete,
  onError,
  initialUrl,
  aspectHint = "9:16",
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(initialUrl ?? null);
  const [duration, setDuration] = useState(0);
  const [trimIn, setTrimIn] = useState(0);
  const [trimOut, setTrimOut] = useState(0);
  const [overlayText, setOverlayText] = useState("");
  const [aspect, setAspect] = useState<VideoAspectPreset>("9:16");
  const [exporting, setExporting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    return () => {
      if (sourceUrl?.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
    };
  }, [sourceUrl]);

  const onFile = useCallback((file: File) => {
    const ok =
      file.type.startsWith("video/") ||
      /\.(mp4|mov)$/i.test(file.name);
    if (!ok) {
      onError("Upload an MP4 or MOV video.");
      return;
    }
    if (sourceUrl?.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
    const url = URL.createObjectURL(file);
    setSourceUrl(url);
    setTrimIn(0);
    setTrimOut(0);
  }, [onError, sourceUrl]);

  const onVideoMeta = () => {
    const v = videoRef.current;
    if (!v || !Number.isFinite(v.duration)) return;
    setDuration(v.duration);
    setTrimOut(v.duration);
  };

  const exportTrimmed = async () => {
    const v = videoRef.current;
    if (!v || !sourceUrl) return;
    if (trimOut <= trimIn) {
      onError("Set an out point after the in point.");
      return;
    }

    setExporting(true);
    try {
      const { w, h } = ASPECT_DIMS[aspect];
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");

      const stream = canvas.captureStream(30);
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const done = new Promise<Blob>((resolve, reject) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
        recorder.onerror = () => reject(new Error("Recording failed"));
      });

      recorder.start(100);
      v.pause();
      v.currentTime = trimIn;
      await new Promise<void>((r) => {
        v.onseeked = () => r();
      });

      const drawFrame = () => {
        const vw = v.videoWidth;
        const vh = v.videoHeight;
        const targetRatio = w / h;
        const videoRatio = vw / vh;
        let sx = 0;
        let sy = 0;
        let sw = vw;
        let sh = vh;
        if (videoRatio > targetRatio) {
          sw = vh * targetRatio;
          sx = (vw - sw) / 2;
        } else {
          sh = vw / targetRatio;
          sy = (vh - sh) / 2;
        }
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(v, sx, sy, sw, sh, 0, 0, w, h);
        if (overlayText.trim()) {
          ctx.font = `bold ${Math.round(h * 0.04)}px system-ui, sans-serif`;
          ctx.fillStyle = "rgba(0,0,0,0.45)";
          const pad = Math.round(h * 0.04);
          const textY = h - pad * 2;
          const metrics = ctx.measureText(overlayText);
          ctx.fillRect(pad, textY - Math.round(h * 0.05), metrics.width + pad, Math.round(h * 0.06));
          ctx.fillStyle = "#fff";
          ctx.fillText(overlayText, pad + 4, textY);
        }
      };

      await v.play();
      const start = performance.now();
      const segmentMs = (trimOut - trimIn) * 1000;

      await new Promise<void>((resolve) => {
        const tick = () => {
          if (v.currentTime >= trimOut || performance.now() - start >= segmentMs + 200) {
            v.pause();
            resolve();
            return;
          }
          drawFrame();
          requestAnimationFrame(tick);
        };
        drawFrame();
        requestAnimationFrame(tick);
      });

      recorder.stop();
      const blob = await done;
      setUploading(true);
      const file = new File([blob], `reel-${Date.now()}.webm`, { type: blob.type });
      const publicUrl = await uploadDashboardVideo(file);
      onComplete(publicUrl);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not export video.");
    } finally {
      setExporting(false);
      setUploading(false);
    }
  };

  const busy = exporting || uploading;
  const outputLabel = aspectHint === "9:16" ? "Vertical 9:16" : "Landscape 16:9";

  return (
    <section
      className={styles.composer}
      aria-labelledby="pb-video-composer-title"
      data-video-composer="true"
    >
      <div className={styles.workspace}>
        <div className={styles.briefPane}>
          <div className={styles.eyebrow}>
            <Sparkles size={14} strokeWidth={2} aria-hidden />
            <span>AI video</span>
            <span className={styles.model}>Veo</span>
          </div>
          <div className={styles.headingGroup}>
            <h2 id="pb-video-composer-title">Create an 8-second video</h2>
            <p>Describe the shot in the prompt below, or upload a finished clip.</p>
          </div>
          <div className={styles.specs} aria-label="Video output details">
            <span><Clock3 size={14} aria-hidden />8 seconds</span>
            <span><Volume2 size={14} aria-hidden />Audio included</span>
            <span><Clapperboard size={14} aria-hidden />{outputLabel}</span>
          </div>
          <div className={styles.promptGuide}>
            <span>Prompt structure</span>
            <p><strong>Subject</strong> + action + camera movement + lighting</p>
            <blockquote>
              “A chef plates a vibrant dish in soft kitchen light as the camera gently pushes in.”
            </blockquote>
          </div>
        </div>

        <div
          className={`${styles.previewPane}${dragActive ? ` ${styles.dragActive}` : ""}`}
          onDragEnter={(event) => {
            event.preventDefault();
            if (!busy) setDragActive(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setDragActive(false);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragActive(false);
            const file = event.dataTransfer.files?.[0];
            if (file && !busy) onFile(file);
          }}
        >
          <div className={styles.previewMeta}>
            <span>{sourceUrl ? "Preview" : "Video canvas"}</span>
            <span>{outputLabel}</span>
          </div>
          {sourceUrl ? (
            <>
              <video
                ref={videoRef}
                src={sourceUrl}
                className={styles.preview}
                onLoadedMetadata={onVideoMeta}
                controls
                playsInline
                muted
              />
              <button
                type="button"
                className={styles.replaceAction}
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
              >
                <Upload size={14} aria-hidden />
                Replace video
              </button>
            </>
          ) : (
            <div className={styles.emptyState}>
              <span className={styles.uploadMark}><Upload size={24} strokeWidth={1.8} /></span>
              <strong>Upload your own video</strong>
              <span>Drop an MP4 or MOV here, or choose a file.</span>
              <button
                type="button"
                className={styles.uploadAction}
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
              >
                Choose video
              </button>
            </div>
          )}
          <input
            ref={fileInputRef}
            id="pb-video-upload"
            type="file"
            accept="video/mp4,video/quicktime,.mp4,.mov"
            className={styles.visuallyHidden}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onFile(file);
              event.currentTarget.value = "";
            }}
            disabled={busy}
          />
        </div>
      </div>

      {sourceUrl ? (
        <div className={styles.editor} aria-label="Video finishing controls">
          {duration > 0 ? (
            <div className={styles.trim}>
              <div className={styles.controlHeading}>
                <span>Trim</span>
                <span>{formatTime(trimIn)}–{formatTime(trimOut)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={duration}
                step={0.1}
                value={trimIn}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setTrimIn(Math.min(v, trimOut - 0.1));
                  if (videoRef.current) videoRef.current.currentTime = v;
                }}
                aria-label="Video trim start"
                aria-valuetext={formatTime(trimIn)}
              />
              <input
                type="range"
                min={0}
                max={duration}
                step={0.1}
                value={trimOut}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setTrimOut(Math.max(v, trimIn + 0.1));
                }}
                aria-label="Video trim end"
                aria-valuetext={formatTime(trimOut)}
              />
            </div>
          ) : null}

          <div className={styles.aspectControl}>
            <span className={styles.controlLabel}>Crop</span>
            <div className={styles.aspects} role="group" aria-label="Video crop">
            {(["9:16", "1:1", "4:5"] as VideoAspectPreset[]).map((a) => (
              <button
                key={a}
                type="button"
                  className={aspect === a ? styles.active : ""}
                onClick={() => setAspect(a)}
                  aria-pressed={aspect === a}
              >
                  {a}
              </button>
            ))}
            </div>
          </div>

          <label className={styles.overlayControl} htmlFor="pb-video-caption-overlay">
            <span className={styles.controlLabel}>Text overlay</span>
            <input
              id="pb-video-caption-overlay"
              type="text"
              className={styles.overlayInput}
              placeholder="Optional caption"
              value={overlayText}
              onChange={(e) => setOverlayText(e.target.value)}
            />
          </label>

          <button
            type="button"
            className={styles.useAction}
            disabled={busy || duration <= 0}
            onClick={() => void exportTrimmed()}
          >
            {uploading ? "Uploading…" : exporting ? "Exporting…" : "Export and use in post"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
