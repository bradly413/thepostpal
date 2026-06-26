"use client";

import { useEffect, useState } from "react";
import { uploadMediaToS3 } from "@/lib/dashboard-upload";
import {
  createDashboardPost,
  fetchDashboardLocations,
  type DashboardLocationRecord,
} from "@/lib/dashboard-api";
import { getStoredActiveLocationId } from "@/lib/dashboard-browser-state";
import type { SocialPlatform } from "@/lib/posterboy-types";

type PlatformChoice = "facebook" | "instagram" | "both";

interface BulkItem {
  id: string;
  file: File;
  previewUrl: string;
  caption: string;
  mediaUrl: string | null;
  uploading: boolean;
  error: string | null;
  posted: boolean;
  captioning: boolean;
}

function platformsFor(p: PlatformChoice): SocialPlatform[] {
  if (p === "facebook") return ["facebook" as SocialPlatform];
  if (p === "instagram") return ["instagram" as SocialPlatform];
  return ["facebook", "instagram"] as SocialPlatform[];
}

function todayISODate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function scheduledForISO(startDate: string, time: string, offsetDays: number): string {
  const [y, m, day] = startDate.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const base = new Date(y, m - 1, day, hh, mm, 0, 0);
  base.setDate(base.getDate() + offsetDays);
  return base.toISOString();
}

function prettyDate(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " · " +
    d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  );
}

let seq = 0;
function uid(): string {
  seq += 1;
  return `bulk-${Date.now()}-${seq}`;
}

const RED = "#ee2532";

export default function BulkScheduler() {
  const [locations, setLocations] = useState<DashboardLocationRecord[]>([]);
  const [locationId, setLocationId] = useState("");
  const [items, setItems] = useState<BulkItem[]>([]);
  const [startDate, setStartDate] = useState(todayISODate);
  const [time, setTime] = useState("09:00");
  const [intervalDays, setIntervalDays] = useState(1);
  const [platform, setPlatform] = useState<PlatformChoice>("both");
  const [scheduling, setScheduling] = useState(false);
  const [done, setDone] = useState(false);
  const [generatingCaptions, setGeneratingCaptions] = useState(false);

  useEffect(() => {
    fetchDashboardLocations()
      .then((locs) => {
        setLocations(locs);
        const active = getStoredActiveLocationId();
        const pick = locs.find((l) => l.id === active) ?? locs[0];
        if (pick) setLocationId(pick.id);
      })
      .catch(() => {});
  }, []);

  function addFiles(fileList: FileList | null) {
    if (!fileList || !fileList.length) return;
    setDone(false);
    const incoming: BulkItem[] = Array.from(fileList).map((file) => ({
      id: uid(),
      file,
      previewUrl: URL.createObjectURL(file),
      caption: "",
      mediaUrl: null,
      uploading: true,
      error: null,
      posted: false,
      captioning: false,
    }));
    setItems((prev) => [...prev, ...incoming]);
    incoming.forEach((it) => {
      uploadMediaToS3(it.file)
        .then((url) =>
          setItems((prev) =>
            prev.map((p) => (p.id === it.id ? { ...p, mediaUrl: url, uploading: false } : p)),
          ),
        )
        .catch((e) =>
          setItems((prev) =>
            prev.map((p) =>
              p.id === it.id
                ? { ...p, uploading: false, error: e instanceof Error ? e.message : "Upload failed" }
                : p,
            ),
          ),
        );
    });
  }

  function setCaption(id: string, caption: string) {
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, caption } : p)));
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((p) => p.id !== id));
  }

  function move(id: string, dir: -1 | 1) {
    setItems((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      const j = idx + dir;
      if (idx < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      const tmp = next[idx];
      next[idx] = next[j];
      next[j] = tmp;
      return next;
    });
  }

  const uploading = items.some((i) => i.uploading);
  const readyCount = items.filter((i) => i.mediaUrl).length;
  const canSchedule = !scheduling && !uploading && readyCount > 0 && !!locationId;

  async function generateAllCaptions() {
    if (generatingCaptions) return;
    setGeneratingCaptions(true);
    const plat = platform === "facebook" ? "facebook" : "instagram";
    const targets = items.filter((i) => i.mediaUrl && !i.captioning);
    for (const it of targets) {
      if (!it.mediaUrl) continue;
      setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, captioning: true } : p)));
      try {
        const res = await fetch("/api/ai/caption-from-image", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: it.mediaUrl, platform: plat }),
        });
        const data = (await res.json()) as { caption?: string; hashtags?: string[]; error?: string };
        if (res.ok && data.caption) {
          const tags = Array.isArray(data.hashtags) && data.hashtags.length ? "\n\n" + data.hashtags.join(" ") : "";
          const caption = data.caption + tags;
          setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, caption, captioning: false } : p)));
        } else {
          setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, captioning: false } : p)));
        }
      } catch {
        setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, captioning: false } : p)));
      }
    }
    setGeneratingCaptions(false);
  }

  async function scheduleAll() {
    if (!canSchedule) return;
    setScheduling(true);
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.mediaUrl || it.posted) continue;
      try {
        await createDashboardPost({
          locationId,
          copy: it.caption,
          platforms: platformsFor(platform),
          scheduledFor: scheduledForISO(startDate, time, i * intervalDays),
          status: "approved",
          mediaUrl: it.mediaUrl,
          mediaType: "image",
        });
        setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, posted: true } : p)));
      } catch (e) {
        setItems((prev) =>
          prev.map((p) =>
            p.id === it.id
              ? { ...p, error: e instanceof Error ? e.message : "Couldn't schedule" }
              : p,
          ),
        );
      }
    }
    setScheduling(false);
    setDone(true);
  }

  const postedCount = items.filter((i) => i.posted).length;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "8px 4px 48px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
        <h1 style={{ fontSize: 26, fontWeight: 600, margin: 0 }}>Bulk schedule</h1>
        <span style={{ fontSize: 13, color: "#8a8a8a" }}>Drop in a batch, set the cadence once, schedule it all.</span>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", margin: "16px 0" }}>
        <label style={{ fontSize: 13, color: "#555", display: "flex", alignItems: "center", gap: 8 }}>
          Posting to
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #e0e0e0", fontSize: 14, background: "#fff" }}
          >
            {locations.length === 0 && <option value="">No brands yet</option>}
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </label>

        <div style={{ display: "inline-flex", border: "1px solid #e8e8e8", borderRadius: 999, overflow: "hidden" }}>
          {(["facebook", "instagram", "both"] as PlatformChoice[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlatform(p)}
              style={{
                padding: "7px 14px",
                fontSize: 13,
                border: "none",
                cursor: "pointer",
                textTransform: "capitalize",
                background: platform === p ? RED : "transparent",
                color: platform === p ? "#fff" : "#555",
                fontWeight: platform === p ? 500 : 400,
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "12px 14px", background: "#fffafa", border: "1px solid #f3d3d6", borderRadius: 12, marginBottom: 16, fontSize: 13, color: "#3a3a3a" }}>
        <span>Start</span>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: "6px 9px", borderRadius: 8, border: "1px solid #e4e4e4", fontSize: 13 }} />
        <span>· every</span>
        <input type="number" min={1} max={30} value={intervalDays} onChange={(e) => setIntervalDays(Math.max(1, Number(e.target.value) || 1))} style={{ width: 56, padding: "6px 9px", borderRadius: 8, border: "1px solid #e4e4e4", fontSize: 13 }} />
        <span>day(s) at</span>
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ padding: "6px 9px", borderRadius: 8, border: "1px solid #e4e4e4", fontSize: 13 }} />
        <span style={{ marginLeft: "auto", color: "#9a9a9a", fontSize: 12 }}>auto-dates the whole batch</span>
      </div>

      <label
        style={{ display: "block", border: "1.5px dashed #e0a3a8", borderRadius: 12, padding: "26px 16px", textAlign: "center", background: "#fffdfd", cursor: "pointer", marginBottom: 18 }}
      >
        <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => addFiles(e.target.files)} />
        <div style={{ fontSize: 24, color: RED, lineHeight: 1 }}>+</div>
        <div style={{ fontSize: 14, fontWeight: 500, color: "#1a1a1a", marginTop: 6 }}>Drop or choose photos</div>
        <div style={{ fontSize: 12, color: "#9a9a9a", marginTop: 2 }}>Select all your tiles at once · uploads to your secure bucket, served via CDN</div>
      </label>

      {items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={generateAllCaptions}
              disabled={generatingCaptions || uploading || readyCount === 0}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 10,
                border: `1px solid ${RED}`,
                background: generatingCaptions ? "#fdeaec" : "#fff",
                color: RED,
                fontSize: 13,
                fontWeight: 500,
                cursor: generatingCaptions || uploading || readyCount === 0 ? "not-allowed" : "pointer",
                opacity: uploading || readyCount === 0 ? 0.5 : 1,
              }}
            >
              <span aria-hidden="true">✨</span>
              {generatingCaptions ? "Writing captions…" : "Caption all with AI"}
            </button>
          </div>
          {items.map((it, i) => {
            const iso = scheduledForISO(startDate, time, i * intervalDays);
            return (
              <div key={it.id} style={{ display: "flex", gap: 12, padding: 10, background: "#fff", border: "1px solid #ececec", borderRadius: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, color: "#c4c4c4" }}>
                  <button type="button" aria-label="Move up" onClick={() => move(it.id, -1)} disabled={i === 0} style={{ border: "none", background: "none", cursor: "pointer", color: i === 0 ? "#e4e4e4" : "#9a9a9a", fontSize: 12, lineHeight: 1 }}>▲</button>
                  <span style={{ fontSize: 12, textAlign: "center", color: "#b0b0b0" }}>{i + 1}</span>
                  <button type="button" aria-label="Move down" onClick={() => move(it.id, 1)} disabled={i === items.length - 1} style={{ border: "none", background: "none", cursor: "pointer", color: i === items.length - 1 ? "#e4e4e4" : "#9a9a9a", fontSize: 12, lineHeight: 1 }}>▼</button>
                </div>

                <div style={{ width: 56, height: 56, borderRadius: 8, background: "#f1f1f1", flex: "none", overflow: "hidden", position: "relative" }}>
                  { /* eslint-disable-next-line @next/next/no-img-element */ }
                  <img src={it.previewUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: it.uploading ? 0.5 : 1 }} />
                </div>

                <textarea
                  value={it.caption}
                  onChange={(e) => setCaption(it.id, e.target.value)}
                  placeholder="Write a caption…"
                  rows={2}
                  style={{ flex: 1, resize: "vertical", padding: "8px 10px", border: "1px solid #e8e8e8", borderRadius: 8, fontSize: 13, fontFamily: "inherit" }}
                />

                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, minWidth: 110 }}>
                  <span style={{ fontSize: 12, color: "#555", background: "#f4f4f4", padding: "4px 8px", borderRadius: 7, whiteSpace: "nowrap" }}>{prettyDate(iso)}</span>
                  {it.posted ? (
                    <span style={{ fontSize: 12, color: "#1f7a3d", fontWeight: 500 }}>Scheduled ✓</span>
                  ) : it.error ? (
                    <span style={{ fontSize: 11, color: "#a32d2d", textAlign: "right" }}>{it.error}</span>
                  ) : it.uploading ? (
                    <span style={{ fontSize: 12, color: "#9a9a9a" }}>Uploading…</span>
                  ) : it.captioning ? (
                    <span style={{ fontSize: 12, color: RED }}>✨ writing…</span>
                  ) : (
                    <button type="button" onClick={() => removeItem(it.id)} style={{ fontSize: 12, color: "#9a9a9a", border: "none", background: "none", cursor: "pointer" }}>Remove</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 18 }}>
        <span style={{ fontSize: 13, color: "#9a9a9a" }}>
          {done
            ? `${postedCount} of ${items.length} scheduled to ${locations.find((l) => l.id === locationId)?.name ?? "brand"}.`
            : items.length > 0
              ? `${items.length} post${items.length === 1 ? "" : "s"}${uploading ? " · uploading…" : ""}`
              : "No posts yet"}
        </span>
        <button
          type="button"
          onClick={scheduleAll}
          disabled={!canSchedule}
          style={{
            padding: "11px 20px",
            borderRadius: 11,
            border: "none",
            fontSize: 14,
            fontWeight: 500,
            color: "#fff",
            background: canSchedule ? RED : "#e3b9bc",
            cursor: canSchedule ? "pointer" : "not-allowed",
          }}
        >
          {scheduling ? "Scheduling…" : `Schedule all ${readyCount || ""}`.trim()}
        </button>
      </div>
    </div>
  );
}
