"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMetaConnection } from "@/lib/use-meta-connection";
import { getStoredActiveLocationId } from "@/lib/dashboard-browser-state";
import { SITE_NAME } from "@/lib/site";

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
  const { meta, reload: reloadMeta, disconnect: disconnectMeta } = useMetaConnection();
  const [metaError, setMetaError] = useState<string | null>(null);

  const [profile, setProfile] = useState({
    name: "",
    title: "",
    email: "",
    phone: "",
    company: "",
    website: "",
  });

  const [posting, setPosting] = useState({
    defaultPlatform: "both",
    defaultTime: "09:00",
    autoHashtags: true,
    watermark: true,
  });

  const [notifications, setNotifications] = useState({
    emailScheduled: true,
    emailPublished: false,
    emailWeekly: true,
  });

  useEffect(() => {
    const connected = searchParams.get("meta_connected");
    const error = searchParams.get("meta_error");
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
    try {
      const s = localStorage.getItem("app-settings");
      if (s) {
        const data = JSON.parse(s);
        if (data.profile) setProfile(data.profile);
        if (data.posting) setPosting(data.posting);
        if (data.notifications) setNotifications(data.notifications);
      }
    } catch {}
  }, []);

  function handleSave() {
    localStorage.setItem("app-settings", JSON.stringify({ profile, posting, notifications }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleConnectMeta() {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID;
    if (!appId) {
      setMetaError("Meta App ID not configured. Add NEXT_PUBLIC_META_APP_ID to .env.local");
      return;
    }
    const redirect = encodeURIComponent(window.location.origin + "/api/meta/callback");
    const scopes = "pages_show_list,pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish";
    // Generate a random state for CSRF protection and store it in a cookie
    const state = crypto.randomUUID();
    const locationId = getStoredActiveLocationId();
    if (!locationId) {
      setMetaError("Choose a location in the dashboard before connecting Meta.");
      return;
    }
    document.cookie = `meta_oauth_state=${state}; path=/; max-age=600; samesite=lax${window.location.protocol === "https:" ? "; secure" : ""}`;
    document.cookie = `meta_oauth_location_id=${locationId}; path=/; max-age=600; samesite=lax${window.location.protocol === "https:" ? "; secure" : ""}`;
    window.location.href = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirect}&scope=${scopes}&response_type=code&state=${state}`;
  }

  async function handleDisconnectMeta() {
    if (!window.confirm("Disconnect Meta account?")) return;
    try {
      await disconnectMeta();
    } catch (err) {
      setMetaError(err instanceof Error ? err.message : "Could not disconnect Meta.");
    }
  }

  function handleLogout() {
    document.cookie = "session=; path=/; max-age=0";
    router.push("/sign-in");
  }

  const tabs = [
    { id: "profile", label: "Profile" },
    { id: "brand", label: "Brand voice" },
    { id: "account", label: "Account" },
    { id: "posting", label: "Posting" },
    { id: "notifications", label: "Notifications" },
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

          {activeTab === "posting" && (
            <div className="pb-panel">
              <h2 className="pb-panel-h">Posting preferences</h2>
              <div className="space-y-5">
                <div>
                  <label className="pb-label">Default Platform</label>
                  <div className="flex gap-2">
                    {["facebook", "instagram", "both"].map((p) => (
                      <button
                        key={p}
                        onClick={() => setPosting({ ...posting, defaultPlatform: p })}
                        className={`flex-1 rounded-xl py-2.5 text-xs font-semibold capitalize transition-all ${
                          posting.defaultPlatform === p
                            ? "text-white"
                            : "border border-black/10 bg-black/[0.02] opacity-65 hover:opacity-100"
                        }`}
                        style={posting.defaultPlatform === p ? { background: "var(--pb-press)" } : undefined}
                      >
                        {p === "both" ? "Both" : p}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="pb-label">Default Post Time</label>
                  <input
                    type="time"
                    value={posting.defaultTime}
                    onChange={(e) => setPosting({ ...posting, defaultTime: e.target.value })}
                    className="pb-field"
                    style={{ width: "auto" }}
                  />
                </div>
                {[
                  { key: "autoHashtags", label: "Auto-generate hashtags", desc: "Add relevant hashtags when creating captions" },
                  { key: "watermark", label: "Include brand watermark", desc: "Show your logo on downloaded images" },
                ].map((toggle) => {
                  const on = !!posting[toggle.key as keyof typeof posting];
                  return (
                    <div key={toggle.key} className="pb-row">
                      <div>
                        <p className="text-sm font-medium">{toggle.label}</p>
                        <p className="text-xs opacity-55 mt-0.5">{toggle.desc}</p>
                      </div>
                      <button
                        role="switch"
                        aria-checked={on}
                        onClick={() => setPosting({ ...posting, [toggle.key]: !on })}
                        className={`pb-toggle ${on ? "pb-toggle-on" : ""}`}
                      >
                        <span className="pb-toggle-knob" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="pb-panel">
              <h2 className="pb-panel-h">Notification preferences</h2>
              <div className="space-y-3">
                {[
                  { key: "emailScheduled", label: "Scheduled post reminders", desc: "Get notified before a scheduled post goes live" },
                  { key: "emailPublished", label: "Post published confirmation", desc: "Get notified when a post is successfully published" },
                  { key: "emailWeekly", label: "Weekly performance digest", desc: "Receive a weekly summary of your content performance" },
                ].map((item) => {
                  const on = !!notifications[item.key as keyof typeof notifications];
                  return (
                    <div key={item.key} className="pb-row">
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs opacity-55 mt-0.5">{item.desc}</p>
                      </div>
                      <button
                        role="switch"
                        aria-checked={on}
                        onClick={() => setNotifications({ ...notifications, [item.key]: !on })}
                        className={`pb-toggle ${on ? "pb-toggle-on" : ""}`}
                      >
                        <span className="pb-toggle-knob" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "account" && (
            <div className="space-y-4">
              <div className="pb-panel">
                <h2 className="pb-panel-h">Account</h2>
                <p className="text-sm opacity-65 mb-4">Manage your account access and security</p>
                <div className="space-y-3">
                  <div className="pb-row">
                    <div>
                      <p className="text-sm font-medium">Change Password</p>
                      <p className="text-xs opacity-55 mt-0.5">Update your account password</p>
                    </div>
                    <span className="pb-chip-soft">Coming soon</span>
                  </div>
                  <div className="pb-row" style={{ display: "block" }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Connected Accounts</p>
                        <p className="text-xs opacity-55 mt-0.5">Facebook and Instagram connections</p>
                      </div>
                    </div>
                    {metaError && (
                      <div className="rounded-lg px-3 py-2 mt-3" style={{ background: "rgba(238,37,50,0.08)", border: "1px solid rgba(238,37,50,0.2)" }}>
                        <p className="text-xs pb-press-text">{metaError}</p>
                      </div>
                    )}
                    {meta?.connected ? (
                      <div className="space-y-2 mt-3">
                        <div className="flex items-center gap-3 rounded-lg bg-white p-3 border border-black/10">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "rgba(59,130,246,0.12)" }}>
                            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#3b82f6" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" /></svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{meta.pageName}</p>
                            <p className="text-[10px]" style={{ color: "#1f9d4d" }}>Connected</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-lg bg-white p-3 border border-black/10">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "rgba(236,72,153,0.12)" }}>
                            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#ec4899" strokeWidth={1.5}><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium">Instagram</p>
                            <p className="text-[10px] opacity-55">{meta.igAccountId ? "Business account linked" : "No business account found"}</p>
                          </div>
                        </div>
                        <button
                          onClick={handleDisconnectMeta}
                          className="w-full rounded-lg border border-black/10 py-2 text-xs font-medium opacity-65 hover:opacity-100 hover:pb-press-text transition-all"
                        >
                          Disconnect
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleConnectMeta}
                        className="pb-btn-primary w-full flex items-center justify-center gap-2 text-xs py-2.5 mt-3"
                      >
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" /></svg>
                        Connect with Facebook
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="pb-panel pb-panel-danger">
                <h2 className="pb-panel-h pb-press-text">Danger zone</h2>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Sign Out</p>
                    <p className="text-xs opacity-55 mt-0.5">Sign out of your account on this device</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="rounded-xl px-4 py-2 text-xs font-semibold pb-press-text transition-all"
                    style={{ border: "1px solid rgba(238,37,50,0.3)" }}
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "legal" && (
            <div className="pb-panel">
              <h2 className="pb-panel-h">Legal</h2>
              <p className="text-sm opacity-65 mb-5">Terms, privacy, and compliance information</p>
              <div className="space-y-3">
                {[
                  { label: "Terms of Service", desc: "Last updated May 1, 2026" },
                  { label: "Privacy Policy", desc: "How we handle your data" },
                  { label: "Data Processing Agreement", desc: "For business accounts" },
                  { label: "Cookie Policy", desc: "How we use cookies and tracking" },
                  { label: "Acceptable Use Policy", desc: "Content guidelines and restrictions" },
                ].map((item) => (
                  <div key={item.label} className="pb-row cursor-pointer hover:bg-black/[0.04] transition-colors">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs opacity-55 mt-0.5">{item.desc}</p>
                    </div>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="opacity-40"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save button */}
          {(activeTab === "profile" || activeTab === "posting" || activeTab === "notifications") && (
            <div className="mt-6 flex items-center gap-3">
              <button onClick={handleSave} className="pb-btn-primary text-sm py-2 px-4">
                Save Changes
              </button>
              {saved && (
                <span className="text-sm font-medium flex items-center gap-1" style={{ color: "#1f9d4d" }}>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                  Saved
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
