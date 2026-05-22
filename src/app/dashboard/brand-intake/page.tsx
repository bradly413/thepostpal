"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createFromBrandIntake } from "@/lib/organization-store";
import type { BusinessGoal, SocialPlatform } from "@/lib/posterboy-types";
import { INTAKE } from "@/lib/posterboy-copy";

const BUSINESS_TYPES = [
  "bakery", "restaurant", "realtor", "salon", "nonprofit", "local service", "retail", "other",
];

const GOALS: { id: BusinessGoal; label: string }[] = [
  { id: "leads", label: "Leads" },
  { id: "foot_traffic", label: "Foot traffic" },
  { id: "trust", label: "Trust" },
  { id: "recruiting", label: "Recruiting" },
  { id: "announcements", label: "Announcements" },
  { id: "events", label: "Events" },
  { id: "look_alive", label: "Just look alive online" },
];

const PLATFORMS: SocialPlatform[] = ["instagram", "facebook", "linkedin", "tiktok"];

export default function BrandIntakePage() {
  const router = useRouter();
  const [saved, setSaved] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [locationCount, setLocationCount] = useState(1);
  const [website, setWebsite] = useState("");
  const [services, setServices] = useState("");
  const [audience, setAudience] = useState("");
  const [tonePreferences, setTonePreferences] = useState("");
  const [bannedPhrases, setBannedPhrases] = useState("");
  const [preferredPhrases, setPreferredPhrases] = useState("");
  const [recurringOffers, setRecurringOffers] = useState("");
  const [seasonalMoments, setSeasonalMoments] = useState("");
  const [platforms, setPlatforms] = useState<SocialPlatform[]>(["instagram", "facebook"]);
  const [goals, setGoals] = useState<BusinessGoal[]>(["look_alive"]);

  function togglePlatform(p: SocialPlatform) {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  function toggleGoal(g: BusinessGoal) {
    setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createFromBrandIntake({
      businessName,
      businessType,
      locationCount,
      website,
      services,
      audience,
      tonePreferences: tonePreferences.split(",").map((s) => s.trim()).filter(Boolean),
      bannedPhrases: bannedPhrases.split(",").map((s) => s.trim()).filter(Boolean),
      preferredPhrases: preferredPhrases.split(",").map((s) => s.trim()).filter(Boolean),
      recurringOffers,
      seasonalMoments,
      platforms,
      goals,
    });
    setSaved(true);
    setTimeout(() => router.push("/dashboard/drafts"), 1500);
  }

  const fieldClass = "w-full border border-black/10 px-3 py-2 bg-white text-sm mt-1";

  return (
    <div className="pb-app max-w-xl">
      <div className="pb-app-header">
        <h1>Brand intake</h1>
        <p>{INTAKE.soundLessLikePosts}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block text-sm">
          Business name
          <input required value={businessName} onChange={(e) => setBusinessName(e.target.value)} className={fieldClass} />
        </label>

        <label className="block text-sm">
          Business type
          <select required value={businessType} onChange={(e) => setBusinessType(e.target.value)} className={fieldClass}>
            <option value="">Select…</option>
            {BUSINESS_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          Number of locations
          <input type="number" min={1} value={locationCount} onChange={(e) => setLocationCount(Number(e.target.value))} className={fieldClass} />
        </label>

        <label className="block text-sm">
          Website
          <input value={website} onChange={(e) => setWebsite(e.target.value)} className={fieldClass} placeholder="yoursite.com" />
        </label>

        <label className="block text-sm">
          {INTAKE.whatTheyBuy}
          <textarea required value={services} onChange={(e) => setServices(e.target.value)} rows={2} className={fieldClass} />
        </label>

        <label className="block text-sm">
          Audience
          <textarea value={audience} onChange={(e) => setAudience(e.target.value)} rows={2} className={fieldClass} />
        </label>

        <label className="block text-sm">
          Tone preferences
          <input value={tonePreferences} onChange={(e) => setTonePreferences(e.target.value)} className={fieldClass} placeholder="calm, dry, warm (comma-separated)" />
        </label>

        <label className="block text-sm">
          {INTAKE.wordsToAvoid}
          <input value={bannedPhrases} onChange={(e) => setBannedPhrases(e.target.value)} className={fieldClass} placeholder="artisanal, yummy, synergy" />
        </label>

        <label className="block text-sm">
          Preferred phrases
          <input value={preferredPhrases} onChange={(e) => setPreferredPhrases(e.target.value)} className={fieldClass} />
        </label>

        <label className="block text-sm">
          Recurring offers
          <input value={recurringOffers} onChange={(e) => setRecurringOffers(e.target.value)} className={fieldClass} />
        </label>

        <label className="block text-sm">
          Seasonal moments
          <input value={seasonalMoments} onChange={(e) => setSeasonalMoments(e.target.value)} className={fieldClass} placeholder="holidays, local events…" />
        </label>

        <fieldset>
          <legend className="text-sm">Social platforms</legend>
          <div className="flex flex-wrap gap-2 mt-2">
            {PLATFORMS.map((p) => (
              <button key={p} type="button" onClick={() => togglePlatform(p)} className={`px-3 py-1 text-sm border ${platforms.includes(p) ? "bg-[#111] text-white" : ""}`}>
                {p}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm">Goals</legend>
          <div className="flex flex-wrap gap-2 mt-2">
            {GOALS.map((g) => (
              <button key={g.id} type="button" onClick={() => toggleGoal(g.id)} className={`px-3 py-1 text-sm border ${goals.includes(g.id) ? "bg-[#111] text-white" : ""}`}>
                {g.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="border border-dashed border-black/15 p-6 text-sm opacity-60">
          Logo upload — coming soon. Photo upload — coming soon.
        </div>

        <button type="submit" className="pb-btn-primary">Save brand profile</button>
      </form>

      {saved && <div className="pb-toast" role="status">Saved. Quietly.</div>}
    </div>
  );
}
