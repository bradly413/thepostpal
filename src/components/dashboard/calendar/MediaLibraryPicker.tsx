"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Film,
  Image as ImageIcon,
  Library,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { DashboardModal } from "@/components/dashboard/DashboardModal";
import {
  fetchDashboardPhotos,
  formatDashboardApiMessage,
  type DashboardPhotoRecord,
} from "@/lib/dashboard-api";

export interface LibraryMediaSelection {
  id: string;
  name: string;
  url: string;
  type: "image" | "video";
}

interface MediaLibraryPickerProps {
  open: boolean;
  locationId: string | null;
  onClose: () => void;
  onSelect: (media: LibraryMediaSelection) => void;
}

type MediaFilter = "all" | "image" | "video";

function mediaType(record: DashboardPhotoRecord): "image" | "video" {
  if (record.mimeType?.startsWith("video/")) return "video";
  if (/\.(mp4|mov|webm|m4v)(\?|$)/i.test(record.url)) return "video";
  return "image";
}

function toSelection(record: DashboardPhotoRecord): LibraryMediaSelection {
  const type = mediaType(record);
  return {
    id: record.id,
    name: record.alt?.trim() || (type === "video" ? "Library video" : "Library image"),
    url: record.url,
    type,
  };
}

export default function MediaLibraryPicker({
  open,
  locationId,
  onClose,
  onSelect,
}: MediaLibraryPickerProps) {
  const [records, setRecords] = useState<DashboardPhotoRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<MediaFilter>("all");

  const load = useCallback(async () => {
    if (!locationId) {
      setRecords([]);
      setError("Select a location before choosing media.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setRecords(await fetchDashboardPhotos(locationId));
    } catch (err) {
      setError(formatDashboardApiMessage(err, "Could not load your Library."));
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => void load());
    return () => window.cancelAnimationFrame(frame);
  }, [load, open]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((record) => {
      const type = mediaType(record);
      if (filter !== "all" && type !== filter) return false;
      if (!query) return true;
      return (record.alt || "").toLowerCase().includes(query);
    });
  }, [filter, records, search]);

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      ariaLabel="Choose from Library"
      className="pb-safe-sheet relative flex h-[82dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-black/10 bg-white shadow-2xl sm:h-[min(760px,86dvh)] sm:rounded-2xl"
    >
      <div className="shrink-0 border-b border-black/[0.08] px-4 pb-3 pt-4 sm:px-5 sm:pb-4 sm:pt-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Library size={18} className="text-[#ee2532]" aria-hidden />
              <h2 className="text-lg font-semibold tracking-tight text-black">
                Choose from Library
              </h2>
            </div>
            <p className="mt-1 text-xs text-black/45">
              Select an image or video already saved to this location.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Library"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-black/45 transition-colors hover:bg-black/[0.05] hover:text-black sm:h-9 sm:w-9"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/35"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search your Library"
              aria-label="Search Library"
              className="h-11 w-full rounded-xl border border-black/10 bg-[#f7f7f8] pl-9 pr-3 text-sm text-black outline-none transition-colors placeholder:text-black/35 focus:border-[#ee2532]/45 focus:bg-white"
            />
          </label>
          <div
            className="grid grid-cols-3 rounded-xl bg-[#f3f3f4] p-1"
            aria-label="Filter Library media"
          >
            {(["all", "image", "video"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                aria-pressed={filter === value}
                className={`min-h-10 rounded-lg px-3 text-xs font-semibold capitalize transition-colors ${
                  filter === value
                    ? "bg-white text-black shadow-sm"
                    : "text-black/45 hover:text-black/70"
                }`}
              >
                {value === "image" ? "Images" : value === "video" ? "Videos" : "All"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
        {loading ? (
          <div
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
            aria-busy="true"
            aria-label="Loading Library"
          >
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="aspect-[4/5] animate-pulse rounded-xl bg-black/[0.06]"
              />
            ))}
          </div>
        ) : error ? (
          <div role="alert" className="flex h-full min-h-52 flex-col items-center justify-center text-center">
            <p className="max-w-sm text-sm font-medium text-black/65">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-black/10 px-4 text-sm font-semibold text-black/70 transition-colors hover:bg-black/[0.04]"
            >
              <RefreshCw size={15} aria-hidden />
              Try again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-full min-h-52 flex-col items-center justify-center text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/[0.04] text-black/35">
              {filter === "video" ? (
                <Film size={21} aria-hidden />
              ) : (
                <ImageIcon size={21} aria-hidden />
              )}
            </span>
            <h3 className="mt-3 text-sm font-semibold text-black/70">
              {records.length === 0 ? "Your Library is empty" : "No matching media"}
            </h3>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-black/40">
              {records.length === 0
                ? "Upload from your device to add the first image or video."
                : "Try another search or media filter."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((record) => {
              const item = toSelection(record);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item)}
                  aria-label={`Use ${item.name} from Library`}
                  className="group min-w-0 overflow-hidden rounded-xl border border-black/[0.08] bg-white text-left transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-[#ee2532]/35 hover:shadow-[0_10px_24px_-16px_rgba(20,20,40,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ee2532] focus-visible:ring-offset-2"
                >
                  <span className="relative block aspect-[4/5] overflow-hidden bg-[#f1f1f2]">
                    {item.type === "video" ? (
                      <video
                        src={item.url}
                        className="h-full w-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.url}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    )}
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/65 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur">
                      {item.type === "video" ? (
                        <Film size={11} aria-hidden />
                      ) : (
                        <ImageIcon size={11} aria-hidden />
                      )}
                      {item.type}
                    </span>
                  </span>
                  <span className="block truncate px-2.5 py-2 text-xs font-medium text-black/65">
                    {item.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-black/[0.06] px-4 py-3 text-center text-[11px] text-black/35 sm:px-5">
        {loading ? "Loading media…" : `${filtered.length} of ${records.length} items`}
      </div>
    </DashboardModal>
  );
}
