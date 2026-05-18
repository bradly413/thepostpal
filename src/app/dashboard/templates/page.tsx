"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { templates } from "@/lib/templates";

const bgPreview: Record<string, string> = {
  navy: "bg-navy",
  ivory: "bg-[#F7F3EA]",
  "photo-overlay": "bg-gradient-to-b from-[#8B95A5]/40 to-navy",
  "photo-fullbleed": "bg-gradient-to-b from-[#7E8B72]/30 to-navy/80",
  split: "bg-gradient-to-b from-navy from-50% to-[#F7F3EA] to-50%",
};

const pillarColors: Record<string, string> = {
  "Market Clarity": "bg-accent/15 text-accent",
  "Buyer / Seller Tips": "bg-warning/15 text-warning",
  "Neighborhood / Lifestyle": "bg-success/15 text-success",
  "Angie Personal": "bg-accent-cyan/15 text-accent-cyan",
  "Local Life": "bg-accent/15 text-accent",
  "Neighborhood Life": "bg-success/15 text-success",
  "Stories / Reels": "bg-warning/15 text-warning",
  "Home + Lifestyle": "bg-success/15 text-success",
  "New Listing": "bg-green-500/15 text-green-400",
  "Just Sold": "bg-blue-500/15 text-blue-400",
  "Holiday": "bg-red-500/15 text-red-400",
  "Seasonal": "bg-amber-500/15 text-amber-400",
  "Business Growth": "bg-violet-500/15 text-violet-300",
  "Promotions": "bg-pink-500/15 text-pink-300",
  "Testimonials": "bg-cyan-500/15 text-cyan-300",
  "Company Updates": "bg-slate-500/15 text-slate-300",
  "Educational": "bg-emerald-500/15 text-emerald-300",
  "Events": "bg-orange-500/15 text-orange-300",
};

const PREFERRED_PILLAR_ORDER = [
  "New Listing",
  "Just Sold",
  "Market Clarity",
  "Buyer / Seller Tips",
  "Neighborhood / Lifestyle",
  "Neighborhood Life",
  "Local Life",
  "Angie Personal",
  "Home + Lifestyle",
  "Stories / Reels",
  "Holiday",
  "Seasonal",
  "Business Growth",
  "Promotions",
  "Testimonials",
  "Company Updates",
  "Educational",
  "Events",
];

const discoveredPillars = Array.from(new Set(templates.map((t) => t.pillar)));

const orderedPillars = [
  ...PREFERRED_PILLAR_ORDER.filter((pillar) => discoveredPillars.includes(pillar)),
  ...discoveredPillars.filter((pillar) => !PREFERRED_PILLAR_ORDER.includes(pillar)).sort(),
];

const PILLARS = ["All", ...orderedPillars];

const groupedTemplates = orderedPillars
  .map((pillar) => ({ pillar, items: templates.filter((t) => t.pillar === pillar) }))
  .filter((g) => g.items.length > 0);

export default function TemplatesPage() {
  return (
    <Suspense>
      <TemplatesContent />
    </Suspense>
  );
}

function TemplatesContent() {
  useEffect(() => { document.title = "Templates — Posterboy Social"; }, []);
  const searchParams = useSearchParams();
  const initialPillar = searchParams.get("pillar") || "All";
  const [filter, setFilter] = useState(PILLARS.includes(initialPillar) ? initialPillar : "All");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");

  const filtered = templates.filter((t) => {
    const matchesPillar = filter === "All" || t.pillar === filter;
    const matchesSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase());
    return matchesPillar && matchesSearch;
  });

  const filteredGroups = groupedTemplates
    .map((g) => ({ ...g, items: g.items.filter((t) => filtered.includes(t)) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="px-4 py-6 md:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-text font-heading">Templates</h1>
          <p className="text-sm text-text-secondary mt-1">Browse and customize your social media templates</p>
        </div>
        <Link
          href={`/dashboard/editor/${templates[0]?.id}`}
          className="flex items-center gap-1.5 rounded-full bg-accent text-white px-4 py-2 text-xs font-medium hover:bg-accent/85 shadow-sm hover:shadow-md transition-all self-start"
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Post
        </Link>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 rounded-xl bg-surface border border-border px-3 py-2 flex-1 max-w-md">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#8B95A5" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            name="search"
            aria-label="Search templates"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates…"
            className="flex-1 bg-transparent text-sm text-text placeholder:text-text-secondary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
          {search && (
            <button onClick={() => setSearch("")} aria-label="Clear search" className="text-text-secondary hover:text-text">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
        <div className="flex gap-1.5 rounded-xl bg-surface border border-border p-1">
          <button
            onClick={() => setView("grid")}
            aria-label="Grid view"
            className={`rounded-lg p-2 transition-colors ${view === "grid" ? "bg-elevated text-text" : "text-text-secondary hover:text-text"}`}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
          </button>
          <button
            onClick={() => setView("list")}
            aria-label="List view"
            className={`rounded-lg p-2 transition-colors ${view === "list" ? "bg-elevated text-text" : "text-text-secondary hover:text-text"}`}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" /></svg>
          </button>
        </div>
      </div>

      <div className="relative mb-6">
        <div className="flex gap-2 overflow-x-auto pb-3" style={{ scrollbarWidth: "none" }}>
          {PILLARS.map((p) => (
            <button
              key={p}
              onClick={() => setFilter(p)}
              className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                filter === p
                  ? "bg-accent text-white shadow-lg shadow-accent/20"
                  : "bg-surface text-text-secondary border border-border hover:border-accent/30"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="pointer-events-none absolute right-0 top-0 bottom-3 w-12 bg-gradient-to-l from-bg to-transparent" />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs text-text-secondary">{filtered.length} template{filtered.length !== 1 && "s"}</span>
      </div>

      {view === "grid" ? (
        <div className="space-y-8">
          {filteredGroups.map((group) => (
            <div key={group.pillar}>
              <div className="flex items-center gap-3 mb-3">
                <span className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${pillarColors[group.pillar] || "bg-elevated text-text-secondary"}`}>{group.pillar}</span>
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] text-text-secondary/50">{group.items.length} template{group.items.length !== 1 && "s"}</span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {group.items.map((t) => (
                  <Link
                    key={t.id}
                    href={`/dashboard/editor/${t.id}`}
                    className="group rounded-2xl bg-surface border border-border overflow-hidden hover:border-accent/40 shadow-sm hover:shadow-lg hover:shadow-accent/5 transition-all"
                  >
                    <div className={`relative aspect-[4/3] flex items-center justify-center ${bgPreview[t.bgType] || "bg-elevated"}`}>
                      <div className="text-center px-6">
                        {t.bgType === "navy" || t.bgType === "photo-overlay" || t.bgType === "split" ? (
                          <Image src="/logos/logo-white.png" alt="" width={70} height={21} className="mx-auto mb-2 opacity-40" />
                        ) : (
                          <Image src="/logos/logo-dark.png" alt="" width={70} height={21} className="mx-auto mb-2 opacity-40" />
                        )}
                        <p className="font-serif text-xs leading-snug" style={{ color: t.bgType === "ivory" ? "#041E42" : "#ffffff" }}>
                          {t.fields[1]?.defaultValue || t.fields[0]?.defaultValue}
                        </p>
                      </div>
                      <div className="absolute inset-0 bg-accent/0 group-hover:bg-accent/10 transition-colors flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-2 text-[11px] font-medium text-white">
                          Customize
                          <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="text-sm font-semibold text-text group-hover:text-accent transition-colors">{t.name}</h3>
                      <p className="text-xs text-text-secondary leading-relaxed mt-1">{t.description}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-[10px] text-text-secondary/60 bg-elevated rounded px-1.5 py-0.5">{t.width}×{t.height}</span>
                        {t.hasPhotoSlot && <span className="text-[10px] text-accent-cyan/80 bg-accent-cyan/10 rounded px-1.5 py-0.5">Photo</span>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredGroups.map((group) => (
            <div key={group.pillar}>
              <div className="flex items-center gap-3 mb-2">
                <span className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${pillarColors[group.pillar] || "bg-elevated text-text-secondary"}`}>{group.pillar}</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="space-y-2">
                {group.items.map((t) => (
                  <Link
                    key={t.id}
                    href={`/dashboard/editor/${t.id}`}
                    className="group flex items-center gap-4 rounded-xl bg-surface border border-border p-3 hover:border-accent/40 transition-all"
                  >
                    <div className={`w-16 h-16 rounded-lg flex items-center justify-center shrink-0 ${bgPreview[t.bgType] || "bg-elevated"}`}>
                      {t.bgType === "navy" || t.bgType === "photo-overlay" || t.bgType === "split" ? (
                        <Image src="/logos/logo-white.png" alt="" width={40} height={12} className="opacity-40" />
                      ) : (
                        <Image src="/logos/logo-dark.png" alt="" width={40} height={12} className="opacity-40" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-text group-hover:text-accent transition-colors">{t.name}</h3>
                      <p className="text-xs text-text-secondary truncate">{t.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-text-secondary/60 bg-elevated rounded px-1.5 py-0.5">{t.width}×{t.height}</span>
                      {t.hasPhotoSlot && <span className="text-[10px] text-accent-cyan/80 bg-accent-cyan/10 rounded px-1.5 py-0.5">Photo</span>}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
