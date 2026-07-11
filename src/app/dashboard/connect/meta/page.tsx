"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  completeMetaPageSelection,
  fetchMetaPendingConnection,
  formatDashboardApiMessage,
  type MetaPendingConnection,
} from "@/lib/dashboard-api";

export default function MetaPagePickerPage() {
  const router = useRouter();
  const [pending, setPending] = useState<MetaPendingConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchMetaPendingConnection();
      setPending(data);
      if (data.pages.length === 1) {
        setSelectedId(data.pages[0].id);
      }
    } catch (err) {
      setError(formatDashboardApiMessage(err, "Could not load your Facebook Pages."));
      setPending(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleConnect() {
    if (!selectedId || !pending) return;
    setSubmitting(true);
    setError(null);
    try {
      await completeMetaPageSelection(selectedId);
      const dest =
        pending.returnTo === "organization"
          ? "/dashboard/organization?meta_connected=1"
          : "/dashboard/settings?meta_connected=1";
      router.replace(dest);
    } catch (err) {
      setError(formatDashboardApiMessage(err, "Could not connect that Page."));
    } finally {
      setSubmitting(false);
    }
  }

  const cancelHref =
    pending?.returnTo === "organization" ? "/dashboard/organization" : "/dashboard/settings";

  return (
    <div className="pb-app max-w-lg mx-auto">
      <div className="pb-app-header">
        <h1>Choose a Facebook Page</h1>
        <p>
          {pending
            ? `Which Page should we connect to ${pending.locationName}?`
            : "Pick the Page for this brand."}
        </p>
      </div>

      {loading ? (
        <div className="pb-panel p-6 text-sm text-black/55">Loading your Pages…</div>
      ) : error && !pending ? (
        <div className="pb-panel p-6 space-y-4">
          <p className="text-sm text-[#ee2532]">{error}</p>
          <Link href={cancelHref} className="pb-btn-secondary text-xs py-2.5 px-4 inline-flex">
            Go back
          </Link>
        </div>
      ) : pending ? (
        <div className="space-y-4">
          <div className="pb-panel p-4 space-y-2">
            {pending.pages.map((page) => {
              const on = selectedId === page.id;
              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => setSelectedId(page.id)}
                  className={`w-full text-left rounded-xl border px-4 py-3 transition-colors ${
                    on
                      ? "border-[#ee2532]/40 bg-[#ee2532]/[0.04]"
                      : "border-black/10 bg-white hover:border-black/20"
                  }`}
                >
                  <p className="text-sm font-semibold text-black">{page.name}</p>
                  <p className="text-[11px] text-black/45 mt-0.5">Facebook Page</p>
                </button>
              );
            })}
          </div>

          {error ? <p className="text-sm text-[#ee2532] px-1">{error}</p> : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleConnect()}
              disabled={!selectedId || submitting}
              className="pb-btn-primary text-sm py-2.5 px-5 disabled:opacity-50"
            >
              {submitting ? "Connecting…" : "Connect this Page"}
            </button>
            <Link href={cancelHref} className="text-xs font-medium text-black/50 hover:text-black">
              Cancel
            </Link>
          </div>

          <p className="text-[11px] text-black/45 leading-relaxed px-1">
            Instagram Business links automatically when it is connected to this Page in Meta
            Business Suite.
          </p>
        </div>
      ) : null}
    </div>
  );
}
