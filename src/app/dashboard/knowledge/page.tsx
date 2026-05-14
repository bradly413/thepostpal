"use client";

import { useState, useEffect, useCallback } from "react";

const CATEGORIES = [
  "Neighborhood Guides",
  "Market Analysis",
  "Things to Do",
  "Holiday / Seasonal",
  "Local Events",
  "Buyer Tips",
  "Seller Tips",
] as const;

type Category = (typeof CATEGORIES)[number];

interface Article {
  id: string;
  title: string;
  category: Category;
  content: string;
  createdAt: string;
}

const categoryColors: Record<string, string> = {
  "Neighborhood Guides": "bg-success/15 text-success",
  "Market Analysis": "bg-accent/15 text-accent",
  "Things to Do": "bg-warning/15 text-warning",
  "Holiday / Seasonal": "bg-red-500/15 text-red-400",
  "Local Events": "bg-accent-cyan/15 text-accent-cyan",
  "Buyer Tips": "bg-blue-500/15 text-blue-400",
  "Seller Tips": "bg-amber-500/15 text-amber-400",
};

export default function KnowledgePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"All" | Category>("All");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("Neighborhood Guides");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchArticles = useCallback(async () => {
    try {
      const res = await fetch("/api/knowledge");
      const data = await res.json();
      setArticles(data.articles || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  async function handleSave() {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), category, content: content.trim() }),
      });
      if (res.ok) {
        setTitle("");
        setContent("");
        setCategory("Neighborhood Guides");
        setShowAdd(false);
        fetchArticles();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch("/api/knowledge", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setArticles((prev) => prev.filter((a) => a.id !== id));
      if (expanded === id) setExpanded(null);
    }
  }

  const filtered = articles.filter((a) => {
    const matchesCat = filter === "All" || a.category === filter;
    const matchesSearch =
      !search ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.content.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const grouped = CATEGORIES.map((cat) => ({
    category: cat,
    items: filtered.filter((a) => a.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="px-4 py-6 md:px-6 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-text font-heading">Knowledge Base</h1>
          <p className="text-sm text-text-secondary mt-1">
            {articles.length} article{articles.length !== 1 && "s"} — feeds the AI assistant with local expertise
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-2 text-xs font-medium text-white hover:bg-accent/30 hover:border-accent/40 transition-all self-start"
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Article
        </button>
      </div>

      {/* Add Article Panel */}
      {showAdd && (
        <div className="mb-5 rounded-2xl border border-accent/30 bg-surface/80 backdrop-blur-sm p-5 space-y-4 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text">New Article</h2>
            <button onClick={() => setShowAdd(false)} className="text-text-secondary hover:text-text transition-colors">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Article title..."
              maxLength={200}
              className="flex-1 rounded-xl border border-border bg-elevated px-3 py-2.5 text-sm text-text placeholder:text-text-secondary/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="rounded-xl border border-border bg-elevated px-3 py-2.5 text-sm text-text focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 [color-scheme:dark]"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste article content here... neighborhoods, market stats, local events, tips, etc."
            rows={10}
            className="w-full rounded-xl border border-border bg-elevated px-3 py-2.5 text-sm text-text placeholder:text-text-secondary/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 resize-y"
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-text-secondary/50">
              {content.length.toLocaleString()} characters
            </span>
            <button
              onClick={handleSave}
              disabled={saving || !title.trim() || !content.trim()}
              className="rounded-full bg-white/15 backdrop-blur-sm border border-white/20 px-5 py-2 text-xs font-medium text-white hover:bg-accent/30 hover:border-accent/40 transition-all disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Article"}
            </button>
          </div>
        </div>
      )}

      {/* Search + Filter */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center shrink-0">
        <div className="flex items-center gap-2 rounded-xl bg-surface border border-border px-3 py-2 flex-1 max-w-md">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#8B95A5" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search articles..."
            className="flex-1 bg-transparent text-sm text-text placeholder:text-text-secondary/50 focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-text-secondary hover:text-text">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <span className="text-xs text-text-secondary">{filtered.length} result{filtered.length !== 1 && "s"}</span>
      </div>

      {/* Category pills */}
      <div className="relative mb-4 shrink-0">
        <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
          {["All", ...CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c as "All" | Category)}
              className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                filter === c
                  ? "bg-accent text-white shadow-lg shadow-accent/20"
                  : "bg-surface text-text-secondary border border-border hover:border-accent/30"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="pointer-events-none absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-bg to-transparent" />
      </div>

      {/* Articles List */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-text-secondary">Loading articles...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <svg className="mx-auto h-16 w-16 text-text-secondary/20 mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={0.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            <h3 className="text-base font-semibold text-text mb-1">No articles yet</h3>
            <p className="text-sm text-text-secondary">Add articles to build the AI assistant&apos;s local knowledge</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-6 pb-4" style={{ scrollbarWidth: "none" }}>
          {grouped.map((group) => (
            <div key={group.category}>
              <div className="flex items-center gap-3 mb-2">
                <span className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${categoryColors[group.category] || "bg-elevated text-text-secondary"}`}>
                  {group.category}
                </span>
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] text-text-secondary/50">
                  {group.items.length} article{group.items.length !== 1 && "s"}
                </span>
              </div>
              <div className="space-y-2">
                {group.items.map((article) => (
                  <div
                    key={article.id}
                    className="rounded-xl bg-surface border border-border overflow-hidden hover:border-accent/30 transition-all"
                  >
                    <div
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                      onClick={() => setExpanded(expanded === article.id ? null : article.id)}
                    >
                      <svg
                        width="14"
                        height="14"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        className={`text-text-secondary shrink-0 transition-transform ${expanded === article.id ? "rotate-90" : ""}`}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-text truncate">{article.title}</h3>
                        <p className="text-[11px] text-text-secondary/60 mt-0.5">
                          {new Date(article.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          {" · "}
                          {article.content.length.toLocaleString()} chars
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(article.id);
                        }}
                        className="shrink-0 p-1.5 rounded-lg text-text-secondary/40 hover:text-danger hover:bg-danger/10 transition-all"
                        title="Delete article"
                      >
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                    {expanded === article.id && (
                      <div className="px-4 pb-4 pt-1 border-t border-border">
                        <pre className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap font-sans max-h-80 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                          {article.content}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
