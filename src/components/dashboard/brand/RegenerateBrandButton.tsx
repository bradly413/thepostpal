"use client";

import { useCallback, useState } from "react";
import type { BrandBook, OnboardingAnswers } from "@/lib/brand-book-schema";
import { regenerateAndPersistBrandBook } from "@/lib/brand-book-regenerate";
import { formatDashboardApiMessage } from "@/lib/dashboard-api";

interface RegenerateBrandButtonProps {
  book: BrandBook;
  locationId: string | null;
  onboardingAnswers: OnboardingAnswers | null;
  onRegenerated: () => void | Promise<void>;
}

export default function RegenerateBrandButton({
  book,
  locationId,
  onboardingAnswers,
  onRegenerated,
}: RegenerateBrandButtonProps) {
  const [regenerating, setRegenerating] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRegenerate = useCallback(async () => {
    if (!locationId || regenerating) return;

    setRegenerating(true);
    setError(null);
    setStatus("Regenerating…");

    try {
      const result = await regenerateAndPersistBrandBook({
        book,
        locationId,
        onboardingAnswers,
      });
      setStatus(
        result.voice === "structured"
          ? "Brand book updated (structured AI)."
          : "Brand book updated (template fallback).",
      );
      await onRegenerated();
      window.setTimeout(() => setStatus(null), 4000);
    } catch (err) {
      setError(formatDashboardApiMessage(err, "Could not regenerate brand book."));
      setStatus(null);
    } finally {
      setRegenerating(false);
    }
  }, [book, locationId, onboardingAnswers, onRegenerated, regenerating]);

  const disabled = !locationId || regenerating;

  return (
    <div
      className="flex flex-col items-end gap-2"
      style={{ fontFamily: "var(--font-sans, system-ui, sans-serif)" }}
    >
      <button
        type="button"
        onClick={() => void handleRegenerate()}
        disabled={disabled}
        aria-busy={regenerating}
        className="group inline-flex items-center gap-2.5 rounded-full border border-black/10 bg-white/55 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#323232] shadow-[0_8px_32px_-12px_rgba(0,0,0,0.12)] backdrop-blur-xl transition-all hover:border-black/18 hover:bg-white/72 disabled:pointer-events-none disabled:opacity-50"
      >
        {regenerating ? (
          <span
            className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border-2 border-[#323232]/25 border-t-[#323232] animate-spin"
            aria-hidden
          />
        ) : (
          <span
            className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#323232]/70 group-hover:bg-[#ee2532]"
            aria-hidden
          />
        )}
        {regenerating ? "Regenerating…" : "Regenerate Brand"}
      </button>

      {status && !error ? (
        <p className="text-[11px] tracking-wide text-[#323232]/70 max-w-[220px] text-right">
          {status}
        </p>
      ) : null}
      {error ? (
        <p className="text-[11px] tracking-wide text-[#b91c1c] max-w-[260px] text-right" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
