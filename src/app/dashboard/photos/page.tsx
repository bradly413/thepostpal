"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { uploadMediaToS3 } from "@/lib/dashboard-upload";
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

interface DisplayMedia {
  id: string;
  src: string;
  name: string;
  kind: "image" | "video";
  createdAt: string;
  pending?: boolean;
}

function mediaKind(mime: string | null | undefined, url: string): "image" | "video" {
  if (mime?.startsWith("video/")) return "video";
  if (/\.(mp4|mov|webm|m4v)(\?|$)/i.test(url)) return "video";
  return "image";
}

function toDisplay(p: DashboardPhotoRecord): DisplayMedia {
  return {
    id: p.id,
    src: p.url,
    name: p.alt || "Media",
    kind: mediaKind(p.mimeType, p.url),
    createdAt: p.createdAt,
  };
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

  const [media, setMedia] = useState<DisplayMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selected, setSelected] = useState<DisplayMedia | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "image" | "video">("all");
  const [sortDir, setSortDir] = useState<"newest" | "oldest">("newest");
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
      setMedia(data.map(toDisplay));
    } catch (err) {
      setError(formatDashboardApiMessage(err, "Could not load media."));
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    if (locationId) load();
  }, [locationId, load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return media
      .filter((item) => {
        if (filter !== "all" && item.kind !== filter) return false;
        if (!q) return true;
        return item.name.toLowerCase().includes(q);
      })
      .sort((a, b) =>
        sortDir === "newest"
          ? b.createdAt.localeCompare(a.createdAt)
          : a.createdAt.localeCompare(b.createdAt),
      );
  }, [media, search, filter, sortDir]);

  const handleFiles = useCallback(
    (files: FileList) => {
      if (!locationId) return;
      Array.from(files).forEach(async (file) => {
        const isImage = file.type.startsWith("image/") || (!file.type && /\.(jpe?g|png|gif|webp|heic)$/i.test(file.name));
        const isVideo = file.type.startsWith("video/") || /\.(mp4|mov|webm)$/i.test(file.name);
        if (!isImage && !isVideo) {
          showToast(`${file.name} isn't a supported image or video.`);
          return;
        }

        const tempId = `tmp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        const previewSrc = isImage ? await readAsDataUrl(file) : URL.createObjectURL(file);
        setMedia((prev) => [
          {
            id: tempId,
            src: previewSrc,
            name: file.name,
            kind: isVideo ? "video" : "image",
            createdAt: new Date().toISOString(),
            pending: true,
          },
          ...prev,
        ]);

        try {
          const url = await uploadMediaToS3(file);
          const created = await createDashboardPhoto({
            locationId,
            url,
            mimeType: file.type || null,
            alt: file.name,
          });
          setMedia((prev) => prev.map((p) => (p.id === tempId ? toDisplay(created) : p)));
        } catch (err) {
          setMedia((prev) => prev.filter((p) => p.id !== tempId));
          showToast(formatDashboardApiMessage(err, "Could not save that file."));
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
      const prev = media;
      setMedia((cur) => cur.filter((p) => p.id !== id));
      if (selected?.id === id) setSelected(null);
      try {
        await deleteDashboardPhoto(id);
      } catch (err) {
        setMedia(prev);
        showToast(formatDashboardApiMessage(err, "Could not remove that file."));
      }
    },
    [media, selected, showToast],
  );

  const openInStudio = (item: DisplayMedia) => {
    const params = new URLSearchParams({
      mediaUrl: item.src,
      mediaType: item.kind,
    });
    router.push(`/dashboard/studio?${params.toString()}`);
  };

  const openInEditor = (item: DisplayMedia) => {
    if (item.kind !== "image") {
      showToast("Video opens in Studio. Images open in Creator Studio.");
      openInStudio(item);
      return;
    }
    const params = new URLSearchParams({ photoUrl: item.src, photoId: item.id });
    router.push(`/dashboard/editor/photo-overlay?${params.toString()}`);
  };

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

      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold font-heading">Media</h1>
          <p className="text-sm opacity-60 mt-1">
            {busy
              ? "Loading your library…"
              : `${filtered.length} item${filtered.length !== 1 ? "s" : ""}${search || filter !== "all" ? " (filtered)" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-3 self-start flex-wrap">
          {features.multiLocation && <LocationSwitcher />}
          <label className="pb-btn-primary flex items-center gap-1.5 px-4 py-2 text-xs font-medium cursor-pointer">
            Upload
            <input
              type="file"
              multiple
              accept="image/*,video/mp4,video/quicktime,.mp4,.mov"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4 shrink-0">
        <input
          type="search"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[180px] rounded-xl border border-black/10 px-3 py-2 text-sm bg-white/80"
        />
        <div className="flex gap-1">
          {(["all", "image", "video"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition-colors ${
                filter === f
                  ? "border-[var(--pb-press)] bg-[rgba(238,37,50,0.08)] text-[var(--pb-press)]"
                  : "border-black/10 opacity-60 hover:opacity-90"
              }`}
            >
              {f === "all" ? "All" : f === "image" ? "Images" : "Video"}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSortDir((d) => (d === "newest" ? "oldest" : "newest"))}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold border border-black/15 text-black/70 hover:text-black transition-colors"
            aria-label={`Sort by date, currently ${sortDir} first`}
          >
            {sortDir === "newest" ? "Newest first" : "Oldest first"}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4 shrink-0">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-2 px-4 transition-all text-xs ${
            dragOver ? "border-[var(--pb-press)] bg-[rgba(238,37,50,0.05)] pb-press-text" : "border-black/10 opacity-45 hover:border-[var(--pb-press)]/40"
          }`}
        >
          Drop images or video here
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-4" style={{ scrollbarWidth: "none" }}>
        {!locationLoading && !locationId ? (
          <NoLocationState onCreate={() => router.push("/dashboard/organization")} />
        ) : busy ? (
          <SkeletonGrid count={10} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={media.length === 0 ? "No media yet" : "No matches"}
            sub={
              media.length === 0
                ? "Upload images and short videos for posts, templates, and Reels."
                : "Try a different search or filter."
            }
          />
        ) : (
          <div
            ref={gridRef}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 auto-rows-min"
          >
            {filtered.map((item) => (
              <div
                key={item.id}
                className={`photo-card group relative rounded-xl overflow-hidden border transition-all cursor-pointer bg-white ${
                  selected?.id === item.id
                    ? "border-[var(--pb-press)] ring-2 ring-[rgba(238,37,50,0.2)] shadow-lg"
                    : "border-black/10 hover:border-[var(--pb-press)]/40 hover:shadow-lg"
                } ${item.pending ? "opacity-70" : ""}`}
                onClick={() => setSelected(item)}
              >
                <div className="relative h-[9.75em] bg-black/5 overflow-hidden">
                  {item.kind === "video" ? (
                    <video src={item.src} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
                  ) : (
                    <img
                      src={item.src}
                      alt={item.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  )}
                  <span
                    className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                      item.kind === "video" ? "bg-black/65 text-white" : "bg-white/90 text-black/70"
                    }`}
                  >
                    {item.kind}
                  </span>
                  {item.pending && (
                    <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[9px] font-medium text-white">
                      Saving…
                    </span>
                  )}
                </div>

                <div className="px-3 py-2 flex items-center gap-2">
                  <span className="text-xs truncate flex-1">{item.name}</span>
                </div>

                {!item.pending && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 flex-wrap p-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); openInStudio(item); }}
                      title="Use in composer"
                      className="px-2.5 py-1.5 rounded-lg bg-white/90 text-[10px] font-semibold text-black/80 hover:bg-[var(--pb-press)] hover:text-white transition-all"
                    >
                      Composer
                    </button>
                    {item.kind === "image" ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); openInEditor(item); }}
                        title="Edit in Creator Studio"
                        className="p-2 rounded-xl bg-white/90 text-black/80 hover:bg-[var(--pb-press)] hover:text-white transition-all"
                      >
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </button>
                    ) : null}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemove(item.id); }}
                      title="Delete"
                      className="p-2 rounded-xl bg-white/90 text-black/80 hover:bg-[var(--pb-press)] hover:text-white transition-all"
                    >
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="max-w-3xl max-h-[85vh] rounded-2xl bg-white border border-black/10 overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-black/10">
              <p className="text-sm font-semibold">{selected.name}</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openInStudio(selected)}
                  className="pb-btn-secondary text-xs px-3 py-1.5"
                >
                  Use in composer
                </button>
                <button onClick={() => setSelected(null)} className="p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 transition-colors">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            {selected.kind === "video" ? (
              <video src={selected.src} controls className="max-h-[70vh] w-full object-contain bg-black" />
            ) : (
              <img src={selected.src} alt={selected.name} className="max-h-[70vh] w-full object-contain bg-black" />
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-[#1a1a1a] px-4 py-2 text-xs text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
