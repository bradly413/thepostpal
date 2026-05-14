"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { type VimeoVideo, formatDuration, getThumbnail, getVideoId } from "@/lib/vimeo";

interface LocalVideo {
  id: string;
  src: string;
  name: string;
  thumbnail: string;
  duration: string;
}

type VideoItem =
  | { kind: "vimeo"; data: VimeoVideo }
  | { kind: "local"; data: LocalVideo };

type Tab = "all" | "vimeo" | "uploads";

export default function VideosPage() {
  const [vimeoVideos, setVimeoVideos] = useState<VimeoVideo[]>([]);
  const [localVideos, setLocalVideos] = useState<LocalVideo[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [tab, setTab] = useState<Tab>("all");
  const [loading, setLoading] = useState(true);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/vimeo/videos")
      .then((r) => r.json())
      .then((d) => { if (d.data) setVimeoVideos(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const allVideos: VideoItem[] = (() => {
    const vimeo: VideoItem[] = vimeoVideos.map((v) => ({ kind: "vimeo", data: v }));
    const local: VideoItem[] = localVideos.map((v) => ({ kind: "local", data: v }));
    if (tab === "vimeo") return vimeo;
    if (tab === "uploads") return local;
    return [...vimeo, ...local];
  })();

  const handleFiles = useCallback((files: FileList) => {
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("video/")) return;
      const url = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.src = url;
      video.addEventListener("loadeddata", () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        video.currentTime = 1;
        video.addEventListener("seeked", () => {
          canvas.getContext("2d")?.drawImage(video, 0, 0);
          const dur = Math.floor(video.duration);
          const m = Math.floor(dur / 60);
          const s = dur % 60;
          const newVideo: LocalVideo = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            src: url,
            name: file.name,
            thumbnail: canvas.toDataURL("image/jpeg", 0.7),
            duration: `${m}:${s.toString().padStart(2, "0")}`,
          };
          setLocalVideos((prev) => [newVideo, ...prev]);
        }, { once: true });
      });
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  function handleRemove(id: string) {
    setLocalVideos((prev) => {
      const v = prev.find((p) => p.id === id);
      if (v) URL.revokeObjectURL(v.src);
      return prev.filter((p) => p.id !== id);
    });
    if (selectedVideo?.kind === "local" && selectedVideo.data.id === id) setSelectedVideo(null);
  }

  function getItemId(item: VideoItem) {
    return item.kind === "vimeo" ? getVideoId(item.data) : item.data.id;
  }
  function getItemName(item: VideoItem) {
    return item.kind === "vimeo" ? item.data.name : item.data.name;
  }
  function getItemThumb(item: VideoItem) {
    return item.kind === "vimeo" ? getThumbnail(item.data) : item.data.thumbnail;
  }
  function getItemDuration(item: VideoItem) {
    return item.kind === "vimeo" ? formatDuration(item.data.duration) : item.data.duration;
  }

  return (
    <div className="px-4 py-6 md:px-6 h-full flex flex-col overflow-hidden">
      <style>{`
        @keyframes cardFlyIn {
          from { opacity: 0; transform: translateY(1.5em); }
          to { opacity: 1; transform: translateY(0); }
        }
        .video-card { animation: cardFlyIn 0.3s ease-out both; }
        .video-card:nth-child(2) { animation-delay: 0.02s; }
        .video-card:nth-child(3) { animation-delay: 0.04s; }
        .video-card:nth-child(4) { animation-delay: 0.06s; }
        .video-card:nth-child(5) { animation-delay: 0.08s; }
        .video-card:nth-child(6) { animation-delay: 0.1s; }
        .video-card:nth-child(n+7) { animation-delay: 0.12s; }
      `}</style>

      {/* Header */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-text font-heading">Videos</h1>
          <p className="text-sm text-text-secondary mt-1">
            {allVideos.length} video{allVideos.length !== 1 && "s"} in your library
          </p>
        </div>
        <label className="flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-2 text-xs font-medium text-white hover:bg-accent/30 hover:border-accent/40 transition-all cursor-pointer self-start">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          Upload Videos
          <input type="file" multiple accept="video/*" onChange={(e) => e.target.files && handleFiles(e.target.files)} className="hidden" />
        </label>
      </div>

      {/* Tabs + Drop zone */}
      <div className="flex items-center gap-4 mb-4 shrink-0">
        <div className="flex gap-1.5 rounded-xl bg-surface border border-border p-1">
          {(["all", "vimeo", "uploads"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                tab === t ? "bg-elevated text-text shadow-sm" : "text-text-secondary hover:text-text"
              }`}
            >
              {t === "all" ? "All" : t === "vimeo" ? "Vimeo" : "My Uploads"}
            </button>
          ))}
        </div>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-2 px-4 transition-all text-xs ${
            dragOver ? "border-accent bg-accent/5 text-accent" : "border-border/50 text-text-secondary/40 hover:border-accent/30"
          }`}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Drop videos here
        </div>
      </div>

      {/* Video Grid */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3 text-text-secondary">
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            <span className="text-sm">Loading videos...</span>
          </div>
        </div>
      ) : allVideos.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <svg className="mx-auto h-16 w-16 text-text-secondary/20 mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={0.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25z" />
            </svg>
            <h3 className="text-base font-semibold text-text mb-1">No videos yet</h3>
            <p className="text-sm text-text-secondary">Upload videos or connect Vimeo to see your content</p>
          </div>
        </div>
      ) : (
        <div
          ref={gridRef}
          className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 auto-rows-min pb-4"
          style={{ scrollbarWidth: "none" }}
        >
          {allVideos.map((item) => (
            <div
              key={getItemId(item)}
              className={`video-card group relative rounded-xl overflow-hidden border transition-all cursor-pointer bg-surface/50 ${
                selectedVideo && getItemId(selectedVideo) === getItemId(item)
                  ? "border-accent ring-2 ring-accent/20 shadow-lg shadow-accent/10"
                  : "border-border hover:border-accent/40 hover:shadow-lg hover:shadow-black/20"
              }`}
              onClick={() => setSelectedVideo(item)}
            >
              {/* Thumbnail */}
              <div className="relative h-[9.75em] bg-black/20 overflow-hidden">
                <img
                  src={getItemThumb(item)}
                  alt={getItemName(item)}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {/* Duration badge */}
                <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                  {getItemDuration(item)}
                </span>
              </div>

              {/* Title bar */}
              <div className="px-3 py-2 flex items-center gap-2">
                <span className="text-xs text-text truncate flex-1">{getItemName(item)}</span>
                {item.kind === "vimeo" && (
                  <span className="shrink-0 text-[9px] font-medium text-accent-cyan/70 bg-accent-cyan/10 rounded px-1.5 py-0.5">Vimeo</span>
                )}
              </div>

              {/* Hover overlay with actions */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedVideo(item); }}
                  title="Play video"
                  className="p-2.5 rounded-xl bg-white/15 text-white hover:bg-accent hover:scale-110 transition-all backdrop-blur-sm"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5.14v14l11-7-11-7z" />
                  </svg>
                </button>
                {item.kind === "local" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemove(item.data.id); }}
                    title="Delete video"
                    className="p-2.5 rounded-xl bg-white/15 text-white hover:bg-danger hover:scale-110 transition-all backdrop-blur-sm"
                  >
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video player modal */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setSelectedVideo(null)}>
          <div className="max-w-3xl w-full max-h-[85vh] rounded-2xl bg-surface border border-border overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold text-text">{getItemName(selectedVideo)}</p>
                {selectedVideo.kind === "vimeo" && (
                  <span className="text-[9px] font-medium text-accent-cyan/70 bg-accent-cyan/10 rounded px-1.5 py-0.5">Vimeo</span>
                )}
              </div>
              <button onClick={() => setSelectedVideo(null)} className="p-1 rounded-lg text-text-secondary hover:text-text hover:bg-elevated transition-colors">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {selectedVideo.kind === "vimeo" ? (
              <div className="w-full aspect-video bg-black">
                <iframe
                  src={`https://player.vimeo.com/video/${selectedVideo.data.uri?.split("/").pop() || ""}`}
                  className="w-full h-full"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <video src={selectedVideo.data.src} controls autoPlay className="w-full bg-black" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
