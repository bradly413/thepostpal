"use client";

import { useCallback, useEffect, useState } from "react";
import UpgradeToCommandButton from "@/components/billing/UpgradeToCommandButton";
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
      setAdAccountId((prev) => prev || acct[0]?.adAccountId || "");
    } catch (err) {
      setError(formatDashboardApiMessage(err, "Could not load Meta Ads data."));
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [locationId, features.metaAds]);

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
      <div className="pb-app space-y-4">
        <SkeletonText className="h-8 w-48" />
        <SkeletonText className="h-32 w-full" />
      </div>
    );
  }

  if (!features.metaAds) {
    return (
      <div className="pb-app">
        <div className="pb-app-header">
          <h1>Meta Ads</h1>
          <p>Build campaigns in a calm flow.</p>
        </div>
        <div className="pb-panel max-w-2xl">
          <h2 className="pb-panel-h">Meta Ads is a Command feature</h2>
          <p className="text-sm opacity-65 mb-5">
            Upgrade to Command and enable META_ADS_ENABLED to access the ad builder.
          </p>
          <UpgradeToCommandButton />
        </div>
      </div>
    );
  }

  if (!locationId) {
    return (
      <div className="pb-app">
        <NoLocationState onCreate={() => router.push("/dashboard/organization")} />
      </div>
    );
  }

  return (
    <div className="pb-app max-w-3xl">
      <div className="pb-app-header flex flex-wrap items-start gap-4">
        <div className="flex-1">
          <h1>Meta Ads</h1>
          <p>
            Build campaigns in a calm flow. Everything is created paused in Meta Ads Manager.
          </p>
        </div>
        <LocationSwitcher onChange={() => void load()} />
      </div>

      {success && (
        <p
          className="mb-4 text-sm rounded-xl px-4 py-3"
          style={{ color: "#1f9d4d", background: "rgba(31,157,77,0.08)", border: "1px solid rgba(31,157,77,0.3)" }}
        >
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
              className="pb-btn-primary text-sm py-2 px-4"
            >
              {connecting ? "Redirecting…" : "Connect Meta Ads"}
            </button>
          }
        />
      ) : (
        <form onSubmit={handleLaunch} className="space-y-4">
          <section className="pb-panel">
            <h2 className="pb-panel-h">Ad account</h2>
            <select
              value={adAccountId}
              onChange={(e) => setAdAccountId(e.target.value)}
              className="pb-field"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.adAccountId}>
                  {a.name} ({a.currency})
                </option>
              ))}
            </select>
          </section>

          <section className="pb-panel space-y-3">
            <h2 className="pb-panel-h">Objective</h2>
            <select
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="pb-field"
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
              className="pb-field"
            />
          </section>

          <section className="pb-panel">
            <h2 className="pb-panel-h">Budget and schedule</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="pb-label">Daily budget (USD)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={dailyBudget}
                  onChange={(e) => setDailyBudget(e.target.value)}
                  className="pb-field"
                />
              </div>
              <div>
                <label className="pb-label">Country</label>
                <input
                  type="text"
                  value={geo}
                  onChange={(e) => setGeo(e.target.value)}
                  className="pb-field"
                />
              </div>
              <div>
                <label className="pb-label">Start date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pb-field"
                />
              </div>
              <div>
                <label className="pb-label">End date (optional)</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pb-field"
                />
              </div>
            </div>
          </section>

          <section className="pb-panel">
            <h2 className="pb-panel-h">Audience</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="pb-label">Age min</label>
                <input
                  type="number"
                  min="18"
                  max="65"
                  value={ageMin}
                  onChange={(e) => setAgeMin(e.target.value)}
                  className="pb-field"
                />
              </div>
              <div>
                <label className="pb-label">Age max</label>
                <input
                  type="number"
                  min="18"
                  max="65"
                  value={ageMax}
                  onChange={(e) => setAgeMax(e.target.value)}
                  className="pb-field"
                />
              </div>
            </div>
          </section>

          <section className="pb-panel space-y-3">
            <h2 className="pb-panel-h">Creative</h2>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Primary text"
              className="pb-field"
            />
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Destination URL"
              className="pb-field"
            />
            <select
              value={cta}
              onChange={(e) => setCta(e.target.value)}
              className="pb-field"
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
              className="pb-field"
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
            className="pb-btn-primary w-full justify-center py-4 disabled:opacity-40"
          >
            {submitting ? "Creating paused ad…" : "Create paused ad"}
          </button>
        </form>
      )}

      {insights && insights.length > 0 && (
        <section className="pb-panel mt-10">
          <h2 className="pb-panel-h">Recent insights</h2>
          <pre className="text-[10px] font-mono opacity-55 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(insights[0], null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
}
