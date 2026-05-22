"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LocationSwitcher from "@/components/LocationSwitcher";
import {
  getDraft,
  createDraftFromEditor,
  updateDraft,
  pressDraft,
} from "@/lib/drafts-store";
import { getActiveLocation } from "@/lib/organization-store";
import type { SocialPlatform } from "@/lib/posterboy-types";
import { MICROCOPY, PRODUCT } from "@/lib/posterboy-copy";

const PLATFORMS: SocialPlatform[] = ["instagram", "facebook", "linkedin"];

function EditorInner() {
  const router = useRouter();
  const params = useSearchParams();
  const draftId = params.get("draft");

  const [copy, setCopy] = useState("");
  const [platforms, setPlatforms] = useState<SocialPlatform[]>(["instagram"]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (draftId) {
      const draft = getDraft(draftId);
      if (draft) {
        setCopy(draft.copy);
        setPlatforms(draft.platforms);
      }
    }
  }, [draftId]);

  function togglePlatform(p: SocialPlatform) {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  }

  function handleSave(sendForReview = true) {
    const loc = getActiveLocation();
    if (!loc) return;

    if (draftId) {
      updateDraft(draftId, {
        copy,
        platforms,
        status: sendForReview ? "needs_review" : undefined,
      });
    } else {
      createDraftFromEditor({
        copy,
        platforms,
        locationId: loc.id,
      });
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handlePress() {
    handleSave(false);
    if (draftId) {
      pressDraft(draftId);
    }
    router.push("/dashboard/drafts");
  }

  return (
    <div className="pb-app max-w-2xl">
      <div className="pb-app-header flex flex-wrap items-start gap-4">
        <div className="flex-1">
          <h1>{PRODUCT.editor}</h1>
          <p>{MICROCOPY.rewrite}</p>
          <p className="text-sm opacity-70 mt-1">{MICROCOPY.twoSentences}</p>
        </div>
        <LocationSwitcher />
      </div>

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
          <button type="button" className="pb-btn-primary text-sm" onClick={() => handleSave(true)}>
            Save draft
          </button>
          <button type="button" className="pb-btn-secondary text-sm" onClick={() => handleSave(true)}>
            Send for approval
          </button>
          <button type="button" className="pb-btn-primary pb-btn-press text-sm" onClick={handlePress}>
            Press
          </button>
        </div>

        <p className="text-sm opacity-60">{MICROCOPY.voiceLearn}</p>
      </div>

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
