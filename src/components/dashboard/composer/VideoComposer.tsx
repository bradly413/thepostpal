"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { uploadDashboardVideo } from "@/lib/dashboard-upload";

export type VideoAspectPreset = "9:16" | "1:1" | "4:5";

const ASPECT_DIMS: Record<VideoAspectPreset, { w: number; h: number }> = {
  "9:16": { w: 1080, h: 1920 },
  "1:1": { w: 1080, h: 1080 },
  "4:5": { w: 1080, h: 1350 },
};

interface Props {
  onComplete: (publicUrl: string) => void;
  onError: (message: string) => void;
  initialUrl?: string | null;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VideoComposer({ onComplete, onError, initialUrl }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(initialUrl ?? null);
  const [duration, setDuration] = useState(0);
  const [trimIn, setTrimIn] = useState(0);
  const [trimOut, setTrimOut] = useState(0);
  const [overlayText, setOverlayText] = useState("");
  const [aspect, setAspect] = useState<VideoAspectPreset>("9:16");
  const [exporting, setExporting] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  return (
    <div className="pb-video-composer">
      {!sourceUrl ? (
        <label className="pb-video-drop">
          <span>Upload MP4 or MOV</span>
          <input
            type="file"
            accept="video/mp4,video/quicktime,.mp4,.mov"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
        </label>
      ) : (
        <>
          <video
            ref={videoRef}
            src={sourceUrl}
            className="pb-video-preview"
            onLoadedMetadata={onVideoMeta}
            playsInline
            muted
          />
          {duration > 0 ? (
            <div className="pb-video-trim">
              <div className="pb-video-trim-labels">
                <span>In: {formatTime(trimIn)}</span>
                <span>Out: {formatTime(trimOut)}</span>
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
              />
            </div>
          ) : null}

          <div className="pb-video-aspects">
            {(["9:16", "1:1", "4:5"] as VideoAspectPreset[]).map((a) => (
              <button
                key={a}
                type="button"
                className={aspect === a ? "active" : ""}
                onClick={() => setAspect(a)}
              >
                {a === "9:16" ? "Reels 9:16" : a === "1:1" ? "Square 1:1" : "Feed 4:5"}
              </button>
            ))}
          </div>

          <label htmlFor="pb-video-caption-overlay" className="sr-only">
            Caption overlay on video (optional)
          </label>
          <input
            id="pb-video-caption-overlay"
            type="text"
            className="pb-video-overlay"
            placeholder="Caption overlay on video (optional)"
            value={overlayText}
            onChange={(e) => setOverlayText(e.target.value)}
            aria-label="Caption overlay on video (optional)"
          />

          <button
            type="button"
            className="pb-video-export"
            disabled={busy || duration <= 0}
            onClick={() => void exportTrimmed()}
          >
            {uploading ? "Uploading…" : exporting ? "Exporting…" : "Export and use in post"}
          </button>
        </>
      )}

      {process.env.NEXT_PUBLIC_FEATURE_AI_VIDEO === "true" ? (
        <div className="pb-video-ai-stub">
          <p className="pb-video-ai-label">AI Video (beta)</p>
          <p className="pb-video-ai-sub">Coming soon — generate short clips from a brief.</p>
        </div>
      ) : null}

      <style>{`
        .pb-video-composer { display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 360px; }
        .pb-video-drop {
          display: flex; align-items: center; justify-content: center;
          min-height: 120px; border: 2px dashed rgba(0,0,0,0.12); border-radius: 14px;
          font-size: 12px; font-weight: 600; color: rgba(22,22,28,0.55); cursor: pointer;
        }
        .pb-video-drop:hover { border-color: rgba(238,37,50,0.35); color: #c41e2a; }
        .pb-video-preview { width: 100%; max-height: 200px; border-radius: 12px; background: #000; object-fit: contain; }
        .pb-video-trim { display: flex; flex-direction: column; gap: 4px; }
        .pb-video-trim-labels { display: flex; justify-content: space-between; font-size: 11px; opacity: 0.6; }
        .pb-video-trim input[type=range] { width: 100%; accent-color: #ee2532; }
        .pb-video-aspects { display: flex; gap: 6px; flex-wrap: wrap; }
        .pb-video-aspects button {
          padding: 5px 10px; border-radius: 8px; font-size: 11px; font-weight: 600;
          border: 1px solid rgba(0,0,0,0.1); background: rgba(255,255,255,0.8);
        }
        .pb-video-aspects button.active { border-color: rgba(238,37,50,0.4); background: rgba(238,37,50,0.08); color: #c41e2a; }
        .pb-video-overlay {
          width: 100%; padding: 8px 10px; border-radius: 10px; font-size: 12px;
          border: 1px solid rgba(0,0,0,0.1); background: rgba(255,255,255,0.9);
        }
        .pb-video-export {
          padding: 9px 14px; border-radius: 10px; font-size: 12px; font-weight: 700;
          background: #c81e2a; color: #fff; border: none; cursor: pointer;
        }
        .pb-video-export:disabled { opacity: 0.5; cursor: not-allowed; }
        .pb-video-ai-stub {
          margin-top: 8px; padding: 10px 12px; border-radius: 10px;
          border: 1px dashed rgba(0,0,0,0.12); background: rgba(255,255,255,0.5);
        }
        .pb-video-ai-label { font-size: 11px; font-weight: 700; margin: 0 0 2px; }
        .pb-video-ai-sub { font-size: 10.5px; margin: 0; opacity: 0.55; }
      `}</style>
    </div>
  );
}
