"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getUserPhotos, saveUserPhoto, removeUserPhoto, type StoredPhoto } from "@/lib/photo-store";

export default function PhotosPage() {
  const router = useRouter();
  const [userPhotos, setUserPhotos] = useState<StoredPhoto[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<StoredPhoto | null>(null);
  const [loaded, setLoaded] = useState<Set<string>>(new Set());
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUserPhotos(getUserPhotos());
  }, []);

  const allPhotos = userPhotos;

  const handleFiles = useCallback((files: FileList) => {
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const photo: StoredPhoto = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          src: e.target?.result as string,
          name: file.name,
        };
        saveUserPhoto(photo);
        setUserPhotos(getUserPhotos());
      };
      reader.readAsDataURL(file);
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
    removeUserPhoto(id);
    setUserPhotos(getUserPhotos());
    if (selectedPhoto?.id === id) setSelectedPhoto(null);
  }

  const isUserPhoto = (id: string) => id.length > 6;

  return (
    <div className="px-4 py-6 md:px-6 h-full flex flex-col overflow-hidden">
      <style>{`
        @keyframes cardFlyIn {
          from { opacity: 0; transform: translateY(1.5em); }
          to { opacity: 1; transform: translateY(0); }
        }
        .photo-card { animation: cardFlyIn 0.3s ease-out both; }
        .photo-card:nth-child(2) { animation-delay: 0.02s; }
        .photo-card:nth-child(3) { animation-delay: 0.04s; }
        .photo-card:nth-child(4) { animation-delay: 0.06s; }
        .photo-card:nth-child(5) { animation-delay: 0.08s; }
        .photo-card:nth-child(6) { animation-delay: 0.1s; }
        .photo-card:nth-child(n+7) { animation-delay: 0.12s; }
      `}</style>

      {/* Header */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-text font-heading">Photos</h1>
          <p className="text-sm text-text-secondary mt-1">
            {allPhotos.length} photo{allPhotos.length !== 1 && "s"} in your library
          </p>
        </div>
        <label className="flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-2 text-xs font-medium text-white hover:bg-accent/30 hover:border-accent/40 transition-all cursor-pointer self-start">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          Upload Photos
          <input type="file" multiple accept="image/*" onChange={(e) => e.target.files && handleFiles(e.target.files)} className="hidden" />
        </label>
      </div>

      {/* Drop zone */}
      <div className="flex items-center gap-4 mb-4 shrink-0">
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
          Drop photos here
        </div>
      </div>

      {/* Photo Grid */}
      {allPhotos.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <svg className="mx-auto h-16 w-16 text-text-secondary/20 mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={0.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
            <h3 className="text-base font-semibold text-text mb-1">No photos yet</h3>
            <p className="text-sm text-text-secondary">Upload photos to use in your social media templates</p>
          </div>
        </div>
      ) : (
        <div
          ref={gridRef}
          className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 auto-rows-min pb-4"
          style={{ scrollbarWidth: "none" }}
        >
          {allPhotos.map((photo) => (
            <div
              key={photo.id}
              className={`photo-card group relative rounded-xl overflow-hidden border transition-all cursor-pointer bg-surface/50 ${
                selectedPhoto?.id === photo.id
                  ? "border-accent ring-2 ring-accent/20 shadow-lg shadow-accent/10"
                  : "border-border hover:border-accent/40 hover:shadow-lg hover:shadow-black/20"
              }`}
              onClick={() => setSelectedPhoto(photo)}
            >
              {/* Thumbnail */}
              <div className="relative h-[9.75em] bg-black/20 overflow-hidden">
                <img
                  src={photo.src}
                  alt={photo.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              {/* Title bar */}
              <div className="px-3 py-2 flex items-center gap-2">
                <span className="text-xs text-text truncate flex-1">{photo.name}</span>
                {photo.id.startsWith("bp-") && (
                  <span className="shrink-0 text-[9px] font-medium text-accent-cyan/70 bg-accent-cyan/10 rounded px-1.5 py-0.5">Brand</span>
                )}
              </div>

              {/* Hover overlay with actions */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <button
                  onClick={(e) => { e.stopPropagation(); router.push("/dashboard/editor/photo-overlay"); }}
                  title="Edit in Creator Studio"
                  className="p-2.5 rounded-xl bg-white/15 text-white hover:bg-accent hover:scale-110 transition-all backdrop-blur-sm"
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  </svg>
                </button>
                {isUserPhoto(photo.id) && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemove(photo.id); }}
                    title="Delete photo"
                    className="p-2.5 rounded-xl bg-white/15 text-white hover:bg-danger hover:scale-110 transition-all backdrop-blur-sm"
                  >
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                )}</div>
            </div>
          ))}
        </div>
      )}

      {/* Photo detail modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setSelectedPhoto(null)}>
          <div className="max-w-3xl max-h-[85vh] rounded-2xl bg-surface border border-border overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold text-text">{selectedPhoto.name}</p>
                {selectedPhoto.id.startsWith("bp-") && (
                  <span className="text-[9px] font-medium text-accent-cyan/70 bg-accent-cyan/10 rounded px-1.5 py-0.5">Brand</span>
                )}
              </div>
              <button onClick={() => setSelectedPhoto(null)} className="p-1 rounded-lg text-text-secondary hover:text-text hover:bg-elevated transition-colors">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <img src={selectedPhoto.src} alt={selectedPhoto.name} className="max-h-[70vh] w-full object-contain bg-black" />
          </div>
        </div>
      )}
    </div>
  );
}
