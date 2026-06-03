"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import LocationSwitcher from "@/components/LocationSwitcher";
import { usePlan } from "@/components/dashboard/PlanProvider";
import {
  EmptyState,
  ErrorState,
  NoLocationState,
  SkeletonText,
} from "@/components/dashboard/StateViews";
import {
  fetchDashboardMetaAdAccounts,
  fetchDashboardMetaAdInsights,
  fetchDashboardMetaAdsAuthUrl,
  fetchDashboardPhotos,
  formatDashboardApiMessage,
  launchDashboardMetaAd,
  type DashboardMetaAdAccountRecord,
  type DashboardPhotoRecord,
} from "@/lib/dashboard-api";
import { useActiveLocation } from "@/lib/use-active-location";

const OBJECTIVES = [
  { id: "OUTCOME_TRAFFIC", label: "Traffic" },
  { id: "OUTCOME_LEADS", label: "Leads" },
  { id: "OUTCOME_AWARENESS", label: "Awareness" },
  { id: "OUTCOME_ENGAGEMENT", label: "Engagement" },
  { id: "OUTCOME_SALES", label: "Sales" },
] as const;

const CTAS = [
  "LEARN_MORE",
  "SHOP_NOW",
  "SIGN_UP",
  "CONTACT_US",
  "BOOK_TRAVEL",
] as const;

export default function MetaAdsBuilderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { features, loading: planLoading } = usePlan();
  const { locationId, loading: locationLoading } = useActiveLocation();

  const [accounts, setAccounts] = useState<DashboardMetaAdAccountRecord[]>([]);
  const [photos, setPhotos] = useState<DashboardPhotoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [insights, setInsights] = useState<unknown[] | null>(null);

  const [adAccountId, setAdAccountId] = useState("");
  const [objective, setObjective] = useState<string>(OBJECTIVES[0].id);
  const [dailyBudget, setDailyBudget] = useState("20");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [geo, setGeo] = useState("US");
  const [ageMin, setAgeMin] = useState("25");
  const [ageMax, setAgeMax] = useState("55");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [cta, setCta] = useState<string>(CTAS[0]);
  const [imageUrl, setImageUrl] = useState("");
  const [campaignName, setCampaignName] = useState("Posterboy campaign");

  useEffect(() => {
    if (searchParams.get("meta_ads_connected") === "1") {
      setSuccess("Meta Ads connected. Select an ad account to continue.");
    }
    const err = searchParams.get("meta_ads_error");
    if (err) setError(decodeURIComponent(err));
  }, [searchParams]);

  const load = useCallback(async () => {
    if (!locationId || !features.metaAds) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const [acct, photoList] = await Promise.all([
        fetchDashboardMetaAdAccounts(locationId),
        fetchDashboardPhotos(locationId),
      ]);
      setAccounts(acct);
      setPhotos(photoList);
      if (acct.length > 0 && !adAccountId) {
        setAdAccountId(acct[0].adAccountId);
      }
    } catch (err) {
      setError(formatDashboardApiMessage(err, "Could not load Meta Ads data."));
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [locationId, features.metaAds, adAccountId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleConnectAds() {
    if (!locationId) return;
    setConnecting(true);
    setError(null);
    try {
      const url = await fetchDashboardMetaAdsAuthUrl(locationId);
      window.location.href = url;
    } catch (err) {
      setError(formatDashboardApiMessage(err, "Could not start Meta Ads authorization."));
      setConnecting(false);
    }
  }

  async function handleLaunch(e: React.FormEvent) {
    e.preventDefault();
    if (!locationId || !adAccountId) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const startTime = startDate
        ? new Date(`${startDate}T09:00:00`).toISOString()
        : new Date().toISOString();
      const result = await launchDashboardMetaAd({
        locationId,
        adAccountId,
        campaignName,
        objective,
        dailyBudgetCents: Math.round(parseFloat(dailyBudget) * 100),
        startTime,
        endTime: endDate ? new Date(`${endDate}T23:59:00`).toISOString() : undefined,
        geoCountries: [geo.trim().toUpperCase()],
        ageMin: parseInt(ageMin, 10),
        ageMax: parseInt(ageMax, 10),
        message,
        link,
        callToAction: cta,
        imageUrl,
      });
      setSuccess(result.message || "Created as PAUSED in Meta Ads Manager");

      const insightRes = await fetchDashboardMetaAdInsights(locationId, adAccountId);
      setInsights(insightRes.insights?.data ?? []);
    } catch (err) {
      setError(formatDashboardApiMessage(err, "Could not create the ad."));
    } finally {
      setSubmitting(false);
    }
  }

  if (planLoading || locationLoading) {
    return (
      <div className="pb-app p-6 space-y-4">
        <SkeletonText className="h-8 w-48" />
        <SkeletonText className="h-32 w-full" />
      </div>
    );
  }

  if (!features.metaAds) {
    return (
      <div className="pb-app p-6">
        <EmptyState
          title="Meta Ads is a Command feature"
          sub="Upgrade to Command and enable META_ADS_ENABLED to access the ad builder."
          action={
            <Link href="/pricing" className="text-sm underline">
              View pricing
            </Link>
          }
        />
      </div>
    );
  }

  if (!locationId) {
    return (
      <div className="pb-app p-6">
        <NoLocationState onCreate={() => router.push("/dashboard/organization")} />
      </div>
    );
  }

  return (
    <div className="pb-app px-4 py-6 md:px-8 max-w-3xl">
      <div className="flex flex-wrap items-start gap-4 mb-8">
        <div className="flex-1">
          <h1 className="text-xl font-heading font-semibold text-text">Meta Ads</h1>
          <p className="text-sm text-text-secondary mt-1">
            Build campaigns in a calm flow. Everything is created paused in Meta Ads Manager.
          </p>
        </div>
        <LocationSwitcher onChange={() => void load()} />
      </div>

      {success && (
        <p className="mb-4 text-sm text-success border border-success/30 rounded-xl px-4 py-3 bg-success/5">
          {success}
        </p>
      )}

      {error && (
        <div className="mb-4">
          <ErrorState message={error} onRetry={() => void load()} />
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <SkeletonText className="h-12 w-full" />
          <SkeletonText className="h-40 w-full" />
        </div>
      ) : accounts.length === 0 ? (
        <EmptyState
          title="Connect Meta Ads"
          sub="Authorize ads_management separately from organic publishing. No spend until you unpause in Meta."
          action={
            <button
              type="button"
              disabled={connecting}
              onClick={() => void handleConnectAds()}
              className="rounded-full bg-[#1a1a1a] px-5 py-2 text-sm text-white"
            >
              {connecting ? "Redirecting…" : "Connect Meta Ads"}
            </button>
          }
        />
      ) : (
        <form onSubmit={handleLaunch} className="space-y-8">
          <section className="space-y-3">
            <h2 className="text-xs uppercase tracking-widest text-text-secondary">Ad account</h2>
            <select
              value={adAccountId}
              onChange={(e) => setAdAccountId(e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-bg"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.adAccountId}>
                  {a.name} ({a.currency})
                </option>
              ))}
            </select>
          </section>

          <section className="space-y-3">
            <h2 className="text-xs uppercase tracking-widest text-text-secondary">Objective</h2>
            <select
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-bg"
            >
              {OBJECTIVES.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Campaign name"
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-bg"
            />
          </section>

          <section className="space-y-3">
            <h2 className="text-xs uppercase tracking-widest text-text-secondary">Budget and schedule</h2>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                Daily budget (USD)
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={dailyBudget}
                  onChange={(e) => setDailyBudget(e.target.value)}
                  className="mt-1 w-full border border-border rounded-xl px-3 py-2 text-sm bg-bg"
                />
              </label>
              <label className="text-sm">
                Country
                <input
                  type="text"
                  value={geo}
                  onChange={(e) => setGeo(e.target.value)}
                  className="mt-1 w-full border border-border rounded-xl px-3 py-2 text-sm bg-bg"
                />
              </label>
              <label className="text-sm">
                Start date
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 w-full border border-border rounded-xl px-3 py-2 text-sm bg-bg"
                />
              </label>
              <label className="text-sm">
                End date (optional)
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 w-full border border-border rounded-xl px-3 py-2 text-sm bg-bg"
                />
              </label>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xs uppercase tracking-widest text-text-secondary">Audience</h2>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                Age min
                <input
                  type="number"
                  min="18"
                  max="65"
                  value={ageMin}
                  onChange={(e) => setAgeMin(e.target.value)}
                  className="mt-1 w-full border border-border rounded-xl px-3 py-2 text-sm bg-bg"
                />
              </label>
              <label className="text-sm">
                Age max
                <input
                  type="number"
                  min="18"
                  max="65"
                  value={ageMax}
                  onChange={(e) => setAgeMax(e.target.value)}
                  className="mt-1 w-full border border-border rounded-xl px-3 py-2 text-sm bg-bg"
                />
              </label>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xs uppercase tracking-widest text-text-secondary">Creative</h2>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Primary text"
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-bg"
            />
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Destination URL"
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-bg"
            />
            <select
              value={cta}
              onChange={(e) => setCta(e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-bg"
            >
              {CTAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-bg"
            >
              <option value="">Select photo asset</option>
              {photos.map((p) => (
                <option key={p.id} value={p.url}>
                  {p.alt || p.id}
                </option>
              ))}
            </select>
          </section>

          <button
            type="submit"
            disabled={submitting || !imageUrl || !message || !link}
            className="w-full rounded-2xl bg-[#1a1a1a] text-white py-4 text-sm tracking-wide disabled:opacity-40"
          >
            {submitting ? "Creating paused ad…" : "Create paused ad"}
          </button>
        </form>
      )}

      {insights && insights.length > 0 && (
        <section className="mt-10 border border-border rounded-2xl p-4">
          <h2 className="text-xs uppercase tracking-widest text-text-secondary mb-2">Recent insights</h2>
          <pre className="text-[10px] font-mono text-text-secondary overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(insights[0], null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
}
