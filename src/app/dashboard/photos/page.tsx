"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { BRAND_PHOTOS } from "@/lib/brand-photo-assets";
import { uploadDashboardImage } from "@/lib/dashboard-upload";
import { useActiveLocation } from "@/lib/use-active-location";
import {
  fetchDashboardPhotos,
  createDashboardPhoto,
  deleteDashboardPhoto,
  formatDashboardApiMessage,
  type DashboardPhotoRecord,
} from "@/lib/dashboard-api";
import LocationSwitcher from "@/components/LocationSwitcher";
import { usePlanFeatures } from "@/components/dashboard/PlanProvider";
import { SkeletonGrid, EmptyState, ErrorState, NoLocationState } from "@/components/dashboard/StateViews";

interface DisplayPhoto {
  id: string;
  src: string;
  name: string;
  pending?: boolean;
}

function toDisplay(p: DashboardPhotoRecord): DisplayPhoto {
  return { id: p.id, src: p.url, name: p.alt || "Photo" };
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function PhotosPage() {
  const router = useRouter();
  const features = usePlanFeatures();
  const { locationId, loading: locationLoading } = useActiveLocation();

  const [photos, setPhotos] = useState<DisplayPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<DisplayPhoto | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const load = useCallback(async () => {
    if (!locationId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await fetchDashboardPhotos(locationId);
      setPhotos(data.map(toDisplay));
    } catch (err) {
      setError(formatDashboardApiMessage(err, "Could not load photos."));
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    if (locationId) load();
  }, [locationId, load]);

  const handleFiles = useCallback(
    (files: FileList) => {
      if (!locationId) return;
      Array.from(files).forEach(async (file) => {
        if (!file.type.startsWith("image/")) return;

        // Optimistic: show the photo immediately from a local data URL.
        const tempId = `tmp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        const previewSrc = await readAsDataUrl(file);
        setPhotos((prev) => [{ id: tempId, src: previewSrc, name: file.name, pending: true }, ...prev]);

        try {
          const url = await uploadDashboardImage(file);
          const created = await createDashboardPhoto({
            locationId,
            url,
            mimeType: file.type,
            alt: file.name,
          });
          setPhotos((prev) => prev.map((p) => (p.id === tempId ? toDisplay(created) : p)));
        } catch (err) {
          setPhotos((prev) => prev.filter((p) => p.id !== tempId));
          showToast(formatDashboardApiMessage(err, "Could not save that photo."));
        }
      });
    },
    [locationId, showToast],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const handleRemove = useCallback(
    async (id: string) => {
      const prev = photos;
      setPhotos((cur) => cur.filter((p) => p.id !== id));
      if (selectedPhoto?.id === id) setSelectedPhoto(null);
      try {
        await deleteDashboardPhoto(id);
      } catch (err) {
        setPhotos(prev); // rollback
        showToast(formatDashboardApiMessage(err, "Could not remove that photo."));
      }
    },
    [photos, selectedPhoto, showToast],
  );

  const busy = locationLoading || loading;

  return (
    <div className="px-4 py-6 md:px-6 h-full flex flex-col overflow-hidden">
      <style>{`
        @keyframes cardFlyIn {
          from { opacity: 0; transform: translateY(1.5em); }
          to { opacity: 1; transform: translateY(0); }
        }
        .photo-card { animation: cardFlyIn 0.3s ease-out both; }
      `}</style>

      {/* Header */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-text font-heading">Photos</h1>
          <p className="text-sm text-text-secondary mt-1">
            {busy ? "Loading your library…" : `${photos.length} photo${photos.length !== 1 ? "s" : ""} in your library`}
          </p>
        </div>
        <div className="flex items-center gap-3 self-start">
          {features.multiLocation && <LocationSwitcher />}
          <label className="flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-2 text-xs font-medium text-white hover:bg-accent/30 hover:border-accent/40 transition-all cursor-pointer">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Upload Photos
            <input type="file" multiple accept="image/*" onChange={(e) => e.target.files && handleFiles(e.target.files)} className="hidden" />
          </label>
        </div>
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

      {/* Body */}
      <div className="flex-1 overflow-y-auto pb-4" style={{ scrollbarWidth: "none" }}>
        {!locationLoading && !locationId ? (
          <NoLocationState onCreate={() => router.push("/dashboard/organization")} />
        ) : busy ? (
          <SkeletonGrid count={10} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : photos.length === 0 ? (
          <EmptyState
            title="No photos yet"
            sub="Upload photos to use across your social posts and templates."
          />
        ) : (
          <div
            ref={gridRef}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 auto-rows-min"
          >
            {photos.map((photo) => (
              <div
                key={photo.id}
                className={`photo-card group relative rounded-xl overflow-hidden border transition-all cursor-pointer bg-surface/50 ${
                  selectedPhoto?.id === photo.id
                    ? "border-accent ring-2 ring-accent/20 shadow-lg shadow-accent/10"
                    : "border-border hover:border-accent/40 hover:shadow-lg hover:shadow-black/20"
                } ${photo.pending ? "opacity-70" : ""}`}
                onClick={() => setSelectedPhoto(photo)}
              >
                <div className="relative h-[9.75em] bg-black/20 overflow-hidden">
                  <img
                    src={photo.src}
                    alt={photo.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {photo.pending && (
                    <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[9px] font-medium text-white">
                      Saving…
                    </span>
                  )}
                </div>

                <div className="px-3 py-2 flex items-center gap-2">
                  <span className="text-xs text-text truncate flex-1">{photo.name}</span>
                </div>

                {!photo.pending && (
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
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemove(photo.id); }}
                      title="Delete photo"
                      className="p-2.5 rounded-xl bg-white/15 text-white hover:bg-danger hover:scale-110 transition-all backdrop-blur-sm"
                    >
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Brand starter set — static reference imagery, separate from the live library */}
        {!busy && !error && locationId && BRAND_PHOTOS.length > 0 && (
          <div className="mt-8">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-secondary/60">Brand starter set</p>
            <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
              {BRAND_PHOTOS.map((bp) => (
                <button
                  key={bp.id}
                  onClick={() => setSelectedPhoto({ id: bp.id, src: bp.src, name: bp.name })}
                  className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-border bg-black/10"
                  title={bp.name}
                >
                  <img src={bp.src} alt={bp.name} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Photo detail modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setSelectedPhoto(null)}>
          <div className="max-w-3xl max-h-[85vh] rounded-2xl bg-surface border border-border overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold text-text">{selectedPhoto.name}</p>
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

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-[#1a1a1a] px-4 py-2 text-xs text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
