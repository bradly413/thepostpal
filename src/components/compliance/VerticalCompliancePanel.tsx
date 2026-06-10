"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import EnforcementBadge from "@/components/compliance/EnforcementBadge";
import type { EnforcementLevel, TenantVerticalState, VerticalOption } from "@/lib/compliance/client-types";
import {
  VERTICAL_CATALOG_FALLBACK,
  suggestVerticalSlugForIndustry,
} from "@/lib/compliance/vertical-catalog";
import {
  DashboardApiError,
  fetchDashboardVerticalOptions,
  fetchDashboardVerticalState,
  updateDashboardVertical,
  formatDashboardApiMessage,
} from "@/lib/dashboard-api";
import {
  cachePendingVerticalSlug,
  getPendingVerticalSlug,
  syncPendingVerticalSlug,
} from "@/lib/onboarding-brand-sync";

interface Props {
  /** Pre-select from onboarding industry id */
  suggestedIndustryId?: string;
  /** Called after a successful save */
  onSaved?: (slug: string) => void;
  /** Compact layout for settings */
  compact?: boolean;
  /** Onboarding: render this in place of the safety note, keyed to the selected
   *  vertical slug (e.g. a per-business-type demo). */
  demoForSlug?: (slug: string) => ReactNode;
}

export default function VerticalCompliancePanel({
  suggestedIndustryId,
  onSaved,
  compact,
  demoForSlug,
}: Props) {
  const [options, setOptions] = useState<VerticalOption[]>(VERTICAL_CATALOG_FALLBACK);
  const [state, setState] = useState<TenantVerticalState | null>(null);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await syncPendingVerticalSlug().catch(() => null);

      const [opts, current] = await Promise.all([
        fetchDashboardVerticalOptions().catch(() => VERTICAL_CATALOG_FALLBACK),
        fetchDashboardVerticalState().catch(() => null),
      ]);
      setOptions(opts.length ? opts : VERTICAL_CATALOG_FALLBACK);
      setState(current);

      const pending = getPendingVerticalSlug();
      const detected =
        current?.verticalSlug ||
        pending ||
        (suggestedIndustryId ? suggestVerticalSlugForIndustry(suggestedIndustryId) : "") ||
        opts[0]?.slug ||
        "";
      setSelectedSlug(detected);
    } catch (err) {
      setError(formatDashboardApiMessage(err, "Couldn't load this right now."));
    } finally {
      setLoading(false);
    }
  }, [suggestedIndustryId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected =
    options.find((o) => o.slug === selectedSlug) ??
    options.find((o) => o.slug === state?.verticalSlug) ??
    null;

  async function handleSave() {
    if (!selectedSlug) return;
    setSaving(true);
    setError(null);
    try {
      const next = await updateDashboardVertical(selectedSlug);
      setState(next);
      setSaved(true);
      onSaved?.(selectedSlug);
      window.setTimeout(() => setSaved(false), 2200);
    } catch (err) {
      if (err instanceof DashboardApiError && err.status === 401) {
        cachePendingVerticalSlug(selectedSlug);
        setState({
          verticalSlug: selectedSlug,
          vertical: options.find((o) => o.slug === selectedSlug) ?? null,
          activeGuardrails: [],
        });
        setSaved(true);
        onSaved?.(selectedSlug);
        window.setTimeout(() => setSaved(false), 2200);
        return;
      }
      setError(formatDashboardApiMessage(err, "Couldn't save your choice."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="pb-panel">
        <p className="text-sm opacity-50">Loading…</p>
      </div>
    );
  }

  return (
    <div className={`pb-panel ${compact ? "" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="pb-panel-h">Your kind of business</h2>
          <p className="text-sm opacity-60 mt-1">
            Posterboy uses this to keep your posts on-brand and out of trouble. Pick the closest match.
          </p>
        </div>
        {selected ? <EnforcementBadge level={selected.enforcementLevel as EnforcementLevel} /> : null}
      </div>

      <label className="block text-xs font-semibold uppercase tracking-wide opacity-50 mb-2">
        Your business type
      </label>
      <select
        value={selectedSlug}
        onChange={(e) => setSelectedSlug(e.target.value)}
        className="pb-field w-full mb-4"
      >
        {options.map((opt) => (
          <option key={opt.slug} value={opt.slug}>
            {opt.parentSlug ? `  ${opt.name}` : opt.name}
          </option>
        ))}
      </select>

      {demoForSlug ? (
        <div className="mb-4">{demoForSlug(selectedSlug)}</div>
      ) : selected ? (
        <div className="rounded-xl border border-black/10 bg-white/70 p-4 mb-4 space-y-2">
          <p className="text-sm font-semibold">Posterboy keeps your posts safe.</p>
          <p className="text-xs opacity-65">
            We&apos;ll flag anything risky for your kind of business and suggest a safer way to say
            it — before it ever goes out.
          </p>
          <p className="text-[10px] opacity-45 pt-1">A helpful safety net, not legal advice.</p>
        </div>
      ) : null}

      {error ? <p className="text-xs text-[var(--pb-press)] mb-3">{error}</p> : null}
      {saved ? <p className="text-xs text-[#1f9d4d] mb-3">Saved.</p> : null}

      <button
        type="button"
        className="pb-btn-primary text-sm px-4 py-2 disabled:opacity-50"
        disabled={saving || !selectedSlug}
        onClick={() => void handleSave()}
      >
        {saving ? "Saving…" : state?.verticalSlug ? "Update" : "Looks right"}
      </button>
    </div>
  );
}
