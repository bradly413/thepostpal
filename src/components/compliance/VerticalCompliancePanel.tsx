"use client";

import { useCallback, useEffect, useState } from "react";
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
}

export default function VerticalCompliancePanel({
  suggestedIndustryId,
  onSaved,
  compact,
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
      setError(formatDashboardApiMessage(err, "Could not load compliance settings."));
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

  const displayGuardrails =
    state?.verticalSlug === selectedSlug && state.activeGuardrails.length
      ? state.activeGuardrails
      : selected
        ? [
            selected.guardrailSummary,
            selected.regulatoryBody
              ? `Regulatory context: ${selected.regulatoryBody}`
              : "Light brand-voice suggestions",
          ]
        : [];

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
      setError(formatDashboardApiMessage(err, "Could not save compliance vertical."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="pb-panel">
        <p className="text-sm opacity-50">Loading compliance vertical…</p>
      </div>
    );
  }

  return (
    <div className={`pb-panel ${compact ? "" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="pb-panel-h">Compliance vertical</h2>
          <p className="text-sm opacity-60 mt-1">
            Guardrails keep generated copy on-brand and out of trouble. Confirm or change your industry vertical.
          </p>
        </div>
        {selected ? <EnforcementBadge level={selected.enforcementLevel as EnforcementLevel} /> : null}
      </div>

      <label className="block text-xs font-semibold uppercase tracking-wide opacity-50 mb-2">
        Your vertical
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

      {selected ? (
        <div className="rounded-xl border border-black/10 bg-white/70 p-4 mb-4 space-y-2">
          <p className="text-sm font-semibold">{selected.guardrailSummary}</p>
          <ul className="text-xs opacity-65 space-y-1 list-disc pl-4">
            {displayGuardrails.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="text-[10px] opacity-45 pt-1">
            Posterboy applies guardrails and review routing — not guaranteed regulatory compliance.
          </p>
        </div>
      ) : null}

      {error ? <p className="text-xs text-[var(--pb-press)] mb-3">{error}</p> : null}
      {saved ? <p className="text-xs text-[#1f9d4d] mb-3">Compliance vertical saved.</p> : null}

      <button
        type="button"
        className="pb-btn-primary text-sm px-4 py-2 disabled:opacity-50"
        disabled={saving || !selectedSlug}
        onClick={() => void handleSave()}
      >
        {saving ? "Saving…" : state?.verticalSlug ? "Update vertical" : "Confirm vertical"}
      </button>
    </div>
  );
}
