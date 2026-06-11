"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMetaConnection } from "@/lib/use-meta-connection";
import { SITE_NAME } from "@/lib/site";
import VerticalCompliancePanel from "@/components/compliance/VerticalCompliancePanel";
import BillingSettingsPanel from "@/components/dashboard/settings/BillingSettingsPanel";
import AccountSecurityPanel from "@/components/dashboard/settings/AccountSecurityPanel";
import Link from "next/link";
import { useActiveLocation } from "@/lib/use-active-location";
import { setStoredActiveLocationId } from "@/lib/dashboard-browser-state";

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  useEffect(() => { document.title = `Settings | ${SITE_NAME}`; }, []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("profile");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { meta, reload: reloadMeta, disconnect: disconnectMeta } = useMetaConnection();
  const { locationId, locations, loading: locationLoading } = useActiveLocation();
  const [metaError, setMetaError] = useState<string | null>(null);

  const [profile, setProfile] = useState({
    name: "",
    title: "",
    email: "",
    phone: "",
    company: "",
    website: "",
  });


  useEffect(() => {
    const connected = searchParams.get("meta_connected");
    const error = searchParams.get("meta_error");
    const tab = searchParams.get("tab");
    const upgrade = searchParams.get("upgrade");
    if (tab === "billing" || upgrade) {
      setActiveTab("billing");
    }
    if (connected) {
      void reloadMeta();
      setActiveTab("account");
      router.replace("/dashboard/settings");
    }
    if (error) {
      setMetaError(decodeURIComponent(error.replace(/\+/g, " ")));
      setActiveTab("account");
      router.replace("/dashboard/settings");
    }
  }, [searchParams, router, reloadMeta]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/account/settings", { credentials: "same-origin" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          settings?: {
            profile?: Partial<typeof profile>;
          } | null;
        };
        const s = data.settings;
        if (cancelled || !s) return;
        if (s.profile) setProfile((p) => ({ ...p, ...s.profile }));
      } catch {
        /* keep defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/account/settings", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setSaveError(data?.error || "Could not save settings. Try again.");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaveError("Network error. Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  function handleConnectMeta() {
    if (locationLoading) {
      setMetaError("Loading your workspace…");
      return;
    }

    const validLocation =
      locationId && locations.some((l) => l.id === locationId)
        ? locationId
        : locations[0]?.id ?? null;

    if (!validLocation) {
      setMetaError(
        "Your workspace is still setting up. Refresh this page, then try Connect again.",
      );
      return;
    }

    setStoredActiveLocationId(validLocation);
    setMetaError(null);
    window.location.href = `/api/auth/meta/login?locationId=${encodeURIComponent(validLocation)}`;
  }

  async function handleDisconnectMeta() {
    if (!window.confirm("Disconnect Meta account?")) return;
    try {
      await disconnectMeta();
    } catch (err) {
      setMetaError(err instanceof Error ? err.message : "Could not disconnect Meta.");
    }
  }

  const tabs = [
    { id: "profile", label: "Profile" },
    { id: "brand", label: "Brand voice" },
    { id: "compliance", label: "Compliance" },
    { id: "billing", label: "Billing" },
    { id: "account", label: "Account" },
    { id: "legal", label: "Legal" },
  ];

  const initials =
    profile.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "PB";

  return (
    <div className="pb-app">
      <div className="pb-app-header">
        <h1>Settings</h1>
        <p>Manage your account and preferences</p>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Tab nav */}
        <div className="lg:w-48 shrink-0">
          <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible" style={{ scrollbarWidth: "none" }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-tab ${activeTab === tab.id ? "pb-tab-active" : ""}`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-2xl">
          {activeTab === "profile" && (
            <div className="pb-panel">
              <h2 className="pb-panel-h">Profile information</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4 mb-6">
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-semibold text-white"
                    style={{ background: "var(--pb-press)" }}
                  >
                    {initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{profile.name || "Your name"}</p>
                    <p className="text-xs opacity-55">{profile.title || "Add a title"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { key: "name", label: "Full Name", type: "text", autocomplete: "name" },
                    { key: "title", label: "Title", type: "text", autocomplete: "organization-title" },
                    { key: "email", label: "Email", type: "email", autocomplete: "email" },
                    { key: "phone", label: "Phone", type: "tel", autocomplete: "tel" },
                    { key: "company", label: "Company", type: "text", autocomplete: "organization" },
                    { key: "website", label: "Website", type: "url", autocomplete: "url" },
                  ].map((field) => (
                    <div key={field.key}>
                      <label className="pb-label">{field.label}</label>
                      <input
                        type={field.type}
                        name={field.key}
                        autoComplete={field.autocomplete}
                        value={profile[field.key as keyof typeof profile]}
                        onChange={(e) => setProfile({ ...profile, [field.key]: e.target.value })}
                        className="pb-field"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "brand" && (
            <div className="pb-panel">
              <h2 className="pb-panel-h">Brand voice</h2>
              <p className="text-sm opacity-65 mb-5">
                Tell Posterboy how your business sounds. We use this to draft posts that sound less like posts.
              </p>
              <a href="/dashboard/brand" className="pb-btn-primary text-sm py-2 px-4 inline-flex">
                Open brand intake
              </a>
            </div>
          )}

          {activeTab === "compliance" && (
            <VerticalCompliancePanel compact />
          )}

          {activeTab === "billing" && (
            <BillingSettingsPanel accountEmail={profile.email} />
          )}


          {activeTab === "account" && (
            <AccountSecurityPanel
              meta={meta}
              metaError={metaError}
              onConnectMeta={handleConnectMeta}
              onDisconnectMeta={() => void handleDisconnectMeta()}
            />
          )}

          {activeTab === "legal" && (
            <div className="pb-panel">
              <h2 className="pb-panel-h">Legal</h2>
              <p className="text-sm opacity-65 mb-5">Terms, privacy, and compliance information</p>
              <div className="space-y-3">
                {[
                  { label: "Terms of Service", desc: "Last updated May 18, 2026", href: "/terms" },
                  { label: "Privacy Policy", desc: "Data, Meta integrations, and cookies", href: "/privacy" },
                ].map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="pb-row cursor-pointer hover:bg-black/[0.04] transition-colors block"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs opacity-55 mt-0.5">{item.desc}</p>
                      </div>
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="opacity-40"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Save button */}
          {activeTab === "profile" && (
            <div className="mt-6 flex items-center gap-3 flex-wrap">
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="pb-btn-primary text-sm py-2 px-4 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
              {saved && (
                <span className="text-sm font-medium flex items-center gap-1" style={{ color: "#1f9d4d" }}>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                  Saved
                </span>
              )}
              {saveError ? (
                <span className="text-sm font-medium pb-press-text" role="alert">
                  {saveError}
                </span>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
