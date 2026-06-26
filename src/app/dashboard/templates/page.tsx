"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { templates as staticTemplates, type Template } from "@/lib/templates";
import { EmptyState } from "@/components/dashboard/StateViews";

const bgPreview: Record<string, string> = {
  navy: "bg-navy",
  ivory: "bg-[#F7F3EA]",
  "photo-overlay": "bg-gradient-to-b from-[#8B95A5]/40 to-navy",
  "photo-fullbleed": "bg-gradient-to-b from-[#7E8B72]/30 to-navy/80",
  split: "bg-gradient-to-b from-navy from-50% to-[#F7F3EA] to-50%",
};

const pillarColors: Record<string, string> = {
  "Market Clarity": "bg-[#ee2532]/10 text-[#ee2532]",
  "Buyer / Seller Tips": "bg-amber-500/10 text-amber-700",
  "Neighborhood / Lifestyle": "bg-[#1f9d4d]/10 text-[#1f9d4d]",
  "Personal": "bg-teal-500/10 text-teal-700",
  "Local Life": "bg-[#ee2532]/10 text-[#ee2532]",
  "Neighborhood Life": "bg-[#1f9d4d]/10 text-[#1f9d4d]",
  "Stories / Reels": "bg-amber-500/10 text-amber-700",
  "Home + Lifestyle": "bg-[#1f9d4d]/10 text-[#1f9d4d]",
  "New Listing": "bg-green-500/10 text-green-700",
  "Just Sold": "bg-blue-500/10 text-blue-700",
  "Holiday": "bg-red-500/10 text-red-700",
  "Seasonal": "bg-amber-500/10 text-amber-700",
  "Business Growth": "bg-violet-500/10 text-violet-700",
  "Promotions": "bg-pink-500/10 text-pink-700",
  "Testimonials": "bg-cyan-500/10 text-cyan-700",
  "Company Updates": "bg-slate-500/10 text-slate-700",
  "Educational": "bg-emerald-500/10 text-emerald-700",
  "Events": "bg-orange-500/10 text-orange-700",
};

const PREFERRED_PILLAR_ORDER = [
  "New Listing",
  "Just Sold",
  "Market Clarity",
  "Buyer / Seller Tips",
  "Neighborhood / Lifestyle",
  "Neighborhood Life",
  "Local Life",
  "Personal",
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

function buildPillarModel(templateCatalog: Template[]) {
  const discoveredPillars = Array.from(new Set(templateCatalog.map((t) => t.pillar)));
  const orderedPillars = [
    ...PREFERRED_PILLAR_ORDER.filter((pillar) => discoveredPillars.includes(pillar)),
    ...discoveredPillars.filter((pillar) => !PREFERRED_PILLAR_ORDER.includes(pillar)).sort(),
  ];

  return {
    pillars: ["All", ...orderedPillars],
    groupedTemplates: orderedPillars
      .map((pillar) => ({ pillar, items: templateCatalog.filter((t) => t.pillar === pillar) }))
      .filter((group) => group.items.length > 0),
  };
}

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
  const [templateCatalog, setTemplateCatalog] = useState<Template[]>(staticTemplates);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [didInitFilter, setDidInitFilter] = useState(false);

  useEffect(() => {
    let isActive = true;
    async function loadCatalog() {
      try {
        const res = await fetch("/api/templates/catalog", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json() as { templates?: Template[] };
        if (!isActive || !Array.isArray(data.templates)) return;
        setTemplateCatalog(data.templates);
      } catch {
        // Keep static fallback if catalog endpoint is unavailable.
      }
    }
    void loadCatalog();
    return () => { isActive = false; };
  }, []);

  const { pillars, groupedTemplates } = useMemo(
    () => buildPillarModel(templateCatalog),
    [templateCatalog]
  );

  useEffect(() => {
    if (didInitFilter) return;
    setFilter(pillars.includes(initialPillar) ? initialPillar : "All");
    setDidInitFilter(true);
  }, [didInitFilter, initialPillar, pillars]);

  const filtered = templateCatalog.filter((t) => {
    const matchesPillar = filter === "All" || t.pillar === filter;
    const matchesSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase());
    return matchesPillar && matchesSearch;
  });

  const filteredGroups = groupedTemplates
    .map((g) => ({ ...g, items: g.items.filter((t) => filtered.includes(t)) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="pb-app">
      <div className="pb-app-header flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1>Templates</h1>
          <p>Browse and customize your social media templates</p>
        </div>
        <Link
          href={`/dashboard/editor/${templateCatalog[0]?.id}`}
          className="pb-btn-primary text-sm py-2 px-4 inline-flex items-center gap-1.5 self-start"
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Post
        </Link>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 rounded-xl bg-white border border-black/10 px-3 py-2 flex-1 max-w-md">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#111" strokeWidth={2} className="opacity-45">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            name="search"
            aria-label="Search templates"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates…"
            className="flex-1 bg-transparent text-sm placeholder:opacity-45 focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch("")} aria-label="Clear search" className="opacity-55 hover:opacity-100 transition-opacity">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
        <div className="flex gap-1.5 rounded-xl bg-white border border-black/10 p-1">
          <button
            onClick={() => setView("grid")}
            aria-label="Grid view"
            className={`rounded-lg p-2 transition-colors ${view === "grid" ? "bg-black/[0.06]" : "opacity-55 hover:opacity-100"}`}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
          </button>
          <button
            onClick={() => setView("list")}
            aria-label="List view"
            className={`rounded-lg p-2 transition-colors ${view === "list" ? "bg-black/[0.06]" : "opacity-55 hover:opacity-100"}`}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" /></svg>
          </button>
        </div>
      </div>

      <div className="relative mb-6">
        <div className="flex gap-2 overflow-x-auto pb-3" style={{ scrollbarWidth: "none" }}>
          {pillars.map((p) => (
            <button
              key={p}
              onClick={() => setFilter(p)}
              className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                filter === p
                  ? "text-white"
                  : "bg-white text-current opacity-65 border border-black/10 hover:opacity-100"
              }`}
              style={filter === p ? { background: "var(--pb-press)" } : undefined}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="pointer-events-none absolute right-0 top-0 bottom-3 w-12 bg-gradient-to-l from-[#FAF7F1] to-transparent" />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs opacity-55">{filtered.length} template{filtered.length !== 1 && "s"}</span>
      </div>

      {filteredGroups.length === 0 ? (
        <EmptyState
          title="No matches"
          sub={templateCatalog.length === 0 ? "No templates are available yet." : "Try another pillar or search term."}
        />
      ) : view === "grid" ? (
        <div className="space-y-8">
          {filteredGroups.map((group) => (
            <div key={group.pillar}>
              <div className="flex items-center gap-3 mb-3">
                <span className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${pillarColors[group.pillar] || "bg-black/[0.05] opacity-65"}`}>{group.pillar}</span>
                <div className="flex-1 h-px bg-black/10" />
                <span className="text-[10px] opacity-45">{group.items.length} template{group.items.length !== 1 && "s"}</span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {group.items.map((t) => (
                  <Link
                    key={t.id}
                    href={`/dashboard/editor/${t.id}`}
                    className="group rounded-2xl bg-white border border-black/10 overflow-hidden hover:border-[#ee2532]/40 transition-all"
                  >
                    <div className={`relative aspect-[4/3] flex items-center justify-center ${bgPreview[t.bgType] || "bg-black/[0.04]"}`}>
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
                      <div className="absolute inset-0 bg-[#ee2532]/0 group-hover:bg-[#ee2532]/10 transition-colors flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-2 text-[11px] font-medium text-white">
                          Customize
                          <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="text-sm font-semibold group-hover:pb-press-text transition-colors">{t.name}</h3>
                      <p className="text-xs opacity-60 leading-relaxed mt-1">{t.description}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-[10px] opacity-55 bg-black/[0.05] rounded px-1.5 py-0.5">{t.width}×{t.height}</span>
                        {t.hasPhotoSlot && <span className="text-[10px] text-teal-700 bg-teal-500/10 rounded px-1.5 py-0.5">Photo</span>}
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
                <span className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${pillarColors[group.pillar] || "bg-black/[0.05] opacity-65"}`}>{group.pillar}</span>
                <div className="flex-1 h-px bg-black/10" />
              </div>
              <div className="space-y-2">
                {group.items.map((t) => (
                  <Link
                    key={t.id}
                    href={`/dashboard/editor/${t.id}`}
                    className="group flex items-center gap-4 rounded-xl bg-white border border-black/10 p-3 hover:border-[#ee2532]/40 transition-all"
                  >
                    <div className={`w-16 h-16 rounded-lg flex items-center justify-center shrink-0 ${bgPreview[t.bgType] || "bg-black/[0.04]"}`}>
                      {t.bgType === "navy" || t.bgType === "photo-overlay" || t.bgType === "split" ? (
                        <Image src="/logos/logo-white.png" alt="" width={40} height={12} className="opacity-40" />
                      ) : (
                        <Image src="/logos/logo-dark.png" alt="" width={40} height={12} className="opacity-40" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold group-hover:pb-press-text transition-colors">{t.name}</h3>
                      <p className="text-xs opacity-60 truncate">{t.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] opacity-55 bg-black/[0.05] rounded px-1.5 py-0.5">{t.width}×{t.height}</span>
                      {t.hasPhotoSlot && <span className="text-[10px] text-teal-700 bg-teal-500/10 rounded px-1.5 py-0.5">Photo</span>}
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
