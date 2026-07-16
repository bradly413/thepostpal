"use client";

import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LocationSwitcher from "@/components/LocationSwitcher";
import { useActiveLocation } from "@/lib/use-active-location";
import { LocationGate } from "@/components/dashboard/StateViews";
import {
  createDashboardPost,
  fetchDashboardPost,
  formatDashboardApiMessage,
  submitDashboardPost,
  updateDashboardPost,
} from "@/lib/dashboard-api";
import type { SocialPlatform } from "@/lib/posterboy-types";
import { MICROCOPY, PRODUCT } from "@/lib/posterboy-copy";

const PLATFORMS: SocialPlatform[] = ["instagram", "facebook"];

function EditorInner() {
  const router = useRouter();
  const params = useSearchParams();
  const draftId = params.get("draft");
  const {
    locationId,
    setLocationId,
    loading: locationLoading,
    error: locationError,
    refresh: refreshLocations,
  } = useActiveLocation();

  const [copy, setCopy] = useState("");
  const [platforms, setPlatforms] = useState<SocialPlatform[]>(["instagram"]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(Boolean(draftId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDraft() {
      if (!draftId) return;
      try {
        setLoading(true);
        setError(null);
        const draft = await fetchDashboardPost(draftId);
        if (cancelled) return;
        setCopy(draft.copy);
        setPlatforms(draft.platforms);
        if (draft.locationId) {
          setLocationId(draft.locationId);
        }
      } catch (err) {
        if (!cancelled) {
          setError(formatDashboardApiMessage(err, "Could not load this draft."));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDraft();
    return () => {
      cancelled = true;
    };
  }, [draftId]);

  function togglePlatform(p: SocialPlatform) {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  }

  async function persistDraft(sendForReview = false): Promise<string | null> {
    if (!locationId) {
      setError("Choose a location before drafting.");
      return null;
    }

    try {
      setError(null);
      let currentId = draftId;

      if (currentId) {
        await updateDashboardPost(currentId, {
          copy,
          platforms,
          status: sendForReview ? "draft" : "draft",
        });
      } else {
        const created = await createDashboardPost({
          locationId,
          copy,
          platforms,
        });
        currentId = created.id;
      }

      if (sendForReview && currentId) {
        await submitDashboardPost(currentId);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      return currentId ?? null;
    } catch (err) {
      setError(formatDashboardApiMessage(err, MICROCOPY.error));
      return null;
    }
  }

  async function handleSave(sendForReview = false) {
    const nextId = await persistDraft(sendForReview);
    if (nextId && !draftId) {
      router.replace(`/dashboard/editor?draft=${nextId}`);
    }
  }

  async function handlePress() {
    const nextId = await persistDraft(true);
    if (nextId) {
      router.push("/dashboard/drafts");
    }
  }

  if (loading) {
    return (
      <div className="pb-app max-w-2xl">
        <div className="space-y-6">
          <div className="h-10 w-40 animate-pulse rounded-full bg-black/[0.05]" />
          <div className="h-48 animate-pulse rounded-[24px] bg-black/[0.05]" />
          <div className="h-20 animate-pulse rounded-[24px] bg-black/[0.05]" />
        </div>
      </div>
    );
  }

  if (error && draftId && !copy) {
    return (
      <div className="pb-app max-w-2xl">
        <div className="rounded-[28px] border border-[#e6ddd1] bg-[#fbf8f3] px-6 py-8 text-sm text-[#6c645a] shadow-[0_16px_40px_-34px_rgba(10,10,10,0.35)]">
          <p className="font-medium text-[#1f1d19]">That draft is no longer available.</p>
          <p className="mt-2 leading-6">{error}</p>
          <div className="mt-4 flex gap-3">
            <Link href="/dashboard/drafts" className="pb-btn-primary text-sm">
              Back to content
            </Link>
            <button type="button" className="pb-btn-secondary text-sm" onClick={() => router.refresh()}>
              Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-app max-w-2xl">
      <div className="pb-app-header flex flex-wrap items-start gap-4">
        <div className="flex-1">
          <h1>{PRODUCT.editor}</h1>
          <p>{MICROCOPY.rewrite}</p>
          <p className="text-sm opacity-70 mt-1">{MICROCOPY.twoSentences}</p>
        </div>
        <LocationSwitcher value={locationId} onChange={setLocationId} />
      </div>

      <LocationGate
        loading={locationLoading}
        error={locationError}
        locationId={locationId}
        onRetry={() => void refreshLocations()}
      >
      <div className="space-y-6">
        <label className="block">
          <span className="text-xs uppercase tracking-widest opacity-50">Post copy</span>
          <textarea
            value={copy}
            onChange={(e) => setCopy(e.target.value)}
            rows={5}
            className="mt-2 w-full border border-black/10 p-4 bg-white text-base leading-relaxed resize-y"
            placeholder="Two sentences. That's enough."
          />
        </label>

        {error && <p className="text-sm text-[#8f6a64]">{error}</p>}

        <fieldset>
          <legend className="text-xs uppercase tracking-widest opacity-50 mb-2">Platforms</legend>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => togglePlatform(p)}
                className={`px-3 py-1.5 text-sm border ${platforms.includes(p) ? "bg-[#111] text-[#FAF7F1] border-[#111]" : "border-black/15"}`}
              >
                {p}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-wrap gap-2">
          <button type="button" className="pb-btn-primary text-sm" onClick={() => void handleSave(false)}>
            Save draft
          </button>
          <button type="button" className="pb-btn-secondary text-sm" onClick={() => void handleSave(true)}>
            Send for approval
          </button>
          <button type="button" className="pb-btn-primary pb-btn-press text-sm" onClick={() => void handlePress()}>
            Press
          </button>
        </div>

        <p className="text-sm opacity-60">{MICROCOPY.voiceLearn}</p>
      </div>
      </LocationGate>

      {saved && <div className="pb-toast" role="status">{MICROCOPY.saved}</div>}
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div className="pb-empty">{MICROCOPY.loading}</div>}>
      <EditorInner />
    </Suspense>
  );
}
