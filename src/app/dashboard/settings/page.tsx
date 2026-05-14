"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getMetaConnection, saveMetaConnection, clearMetaConnection, type MetaConnection } from "@/lib/meta-store";

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("profile");
  const [saved, setSaved] = useState(false);
  const [meta, setMeta] = useState<MetaConnection | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);

  const [profile, setProfile] = useState({
    name: "Angie Nichols",
    title: "Realtor",
    email: "angie@example.com",
    phone: "(314) 555-0123",
    company: "Angie Nichols Real Estate",
    website: "angienichols.com",
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
    setMeta(getMetaConnection());
    const connected = searchParams.get("meta_connected");
    const error = searchParams.get("meta_error");
    if (connected) {
      try {
        const data = JSON.parse(connected);
        saveMetaConnection(data);
        setMeta(data);
        setActiveTab("account");
      } catch {}
      router.replace("/dashboard/settings");
    }
    if (error) {
      setMetaError(error);
      setActiveTab("account");
      router.replace("/dashboard/settings");
    }
  }, [searchParams, router]);

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
    window.location.href = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirect}&scope=${scopes}&response_type=code&state=settings`;
  }

  function handleDisconnectMeta() {
    if (!window.confirm("Disconnect Meta account?")) return;
    clearMetaConnection();
    setMeta(null);
  }

  function handleLogout() {
    document.cookie = "session=; path=/; max-age=0";
    router.push("/");
  }

  const tabs = [
    { id: "profile", label: "Profile" },
    { id: "posting", label: "Posting" },
    { id: "notifications", label: "Notifications" },
    { id: "account", label: "Account" },
  ];

  return (
    <div className="px-4 py-6 md:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text font-heading">Settings</h1>
        <p className="text-sm text-text-secondary mt-1">Manage your account and preferences</p>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Tab nav */}
        <div className="lg:w-48 shrink-0">
          <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible" style={{ scrollbarWidth: "none" }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 rounded-xl px-3 py-2 text-sm font-medium text-left transition-all ${
                  activeTab === tab.id
                    ? "bg-elevated text-text shadow-sm"
                    : "text-text-secondary hover:bg-elevated/50 hover:text-text"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-2xl">
          {activeTab === "profile" && (
            <div className="rounded-2xl bg-surface border border-border p-6">
              <h2 className="text-base font-bold text-text mb-5">Profile Information</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-accent-cyan/20 text-xl font-bold text-accent">
                    AN
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text">{profile.name}</p>
                    <p className="text-xs text-text-secondary">{profile.title}</p>
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
                      <label className="block text-xs font-medium text-text mb-1.5">{field.label}</label>
                      <input
                        type={field.type}
                        name={field.key}
                        autoComplete={field.autocomplete}
                        value={profile[field.key as keyof typeof profile]}
                        onChange={(e) => setProfile({ ...profile, [field.key]: e.target.value })}
                        className="w-full rounded-xl border border-border bg-elevated px-3 py-2.5 text-sm text-text focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "posting" && (
            <div className="rounded-2xl bg-surface border border-border p-6">
              <h2 className="text-base font-bold text-text mb-5">Posting Preferences</h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-text mb-1.5">Default Platform</label>
                  <div className="flex gap-2">
                    {["facebook", "instagram", "both"].map((p) => (
                      <button
                        key={p}
                        onClick={() => setPosting({ ...posting, defaultPlatform: p })}
                        className={`flex-1 rounded-xl py-2.5 text-xs font-semibold capitalize transition-all ${
                          posting.defaultPlatform === p
                            ? "bg-gradient-to-r from-accent to-accent-cyan text-white"
                            : "bg-elevated border border-border text-text-secondary hover:text-text"
                        }`}
                      >
                        {p === "both" ? "Both" : p}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text mb-1.5">Default Post Time</label>
                  <input
                    type="time"
                    value={posting.defaultTime}
                    onChange={(e) => setPosting({ ...posting, defaultTime: e.target.value })}
                    className="rounded-xl border border-border bg-elevated px-3 py-2.5 text-sm text-text focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>
                {[
                  { key: "autoHashtags", label: "Auto-generate hashtags", desc: "Add relevant hashtags when creating captions" },
                  { key: "watermark", label: "Include brand watermark", desc: "Show your logo on downloaded images" },
                ].map((toggle) => (
                  <div key={toggle.key} className="flex items-center justify-between rounded-xl bg-elevated/50 p-4">
                    <div>
                      <p className="text-sm font-medium text-text">{toggle.label}</p>
                      <p className="text-xs text-text-secondary mt-0.5">{toggle.desc}</p>
                    </div>
                    <button
                      role="switch"
                      aria-checked={!!posting[toggle.key as keyof typeof posting]}
                      onClick={() => setPosting({ ...posting, [toggle.key]: !posting[toggle.key as keyof typeof posting] })}
                      className={`relative h-6 w-11 rounded-full transition-colors ${
                        posting[toggle.key as keyof typeof posting] ? "bg-accent" : "bg-border"
                      }`}
                    >
                      <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                        posting[toggle.key as keyof typeof posting] ? "translate-x-5" : "translate-x-0.5"
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="rounded-2xl bg-surface border border-border p-6">
              <h2 className="text-base font-bold text-text mb-5">Notification Preferences</h2>
              <div className="space-y-3">
                {[
                  { key: "emailScheduled", label: "Scheduled post reminders", desc: "Get notified before a scheduled post goes live" },
                  { key: "emailPublished", label: "Post published confirmation", desc: "Get notified when a post is successfully published" },
                  { key: "emailWeekly", label: "Weekly performance digest", desc: "Receive a weekly summary of your content performance" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between rounded-xl bg-elevated/50 p-4">
                    <div>
                      <p className="text-sm font-medium text-text">{item.label}</p>
                      <p className="text-xs text-text-secondary mt-0.5">{item.desc}</p>
                    </div>
                    <button
                      role="switch"
                      aria-checked={!!notifications[item.key as keyof typeof notifications]}
                      onClick={() => setNotifications({ ...notifications, [item.key]: !notifications[item.key as keyof typeof notifications] })}
                      className={`relative h-6 w-11 rounded-full transition-colors ${
                        notifications[item.key as keyof typeof notifications] ? "bg-accent" : "bg-border"
                      }`}
                    >
                      <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                        notifications[item.key as keyof typeof notifications] ? "translate-x-5" : "translate-x-0.5"
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "account" && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-surface border border-border p-6">
                <h2 className="text-base font-bold text-text mb-3">Account</h2>
                <p className="text-sm text-text-secondary mb-4">Manage your account access and security</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-xl bg-elevated/50 p-4">
                    <div>
                      <p className="text-sm font-medium text-text">Change Password</p>
                      <p className="text-xs text-text-secondary mt-0.5">Update your account password</p>
                    </div>
                    <span className="rounded-lg bg-elevated px-2.5 py-1 text-[10px] font-medium text-text-secondary/50">Coming soon</span>
                  </div>
                  <div className="rounded-xl bg-elevated/50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-text">Connected Accounts</p>
                        <p className="text-xs text-text-secondary mt-0.5">Facebook and Instagram connections</p>
                      </div>
                    </div>
                    {metaError && (
                      <div className="rounded-lg bg-danger/10 border border-danger/20 px-3 py-2">
                        <p className="text-xs text-danger">{metaError}</p>
                      </div>
                    )}
                    {meta?.connected ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 rounded-lg bg-surface p-3 border border-border">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15">
                            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#3b82f6" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" /></svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-text truncate">{meta.pageName}</p>
                            <p className="text-[10px] text-success">Connected</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-lg bg-surface p-3 border border-border">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-500/15">
                            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#ec4899" strokeWidth={1.5}><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-text">Instagram</p>
                            <p className="text-[10px] text-text-secondary">{meta.igAccountId ? "Business account linked" : "No business account found"}</p>
                          </div>
                        </div>
                        <button
                          onClick={handleDisconnectMeta}
                          className="w-full rounded-lg border border-border py-2 text-xs font-medium text-text-secondary hover:text-danger hover:border-danger/30 transition-all"
                        >
                          Disconnect
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleConnectMeta}
                        className="w-full flex items-center justify-center gap-2 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 py-2.5 text-xs font-medium text-white hover:bg-accent/30 hover:border-accent/40 transition-all"
                      >
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" /></svg>
                        Connect with Facebook
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="rounded-2xl bg-surface border border-danger/20 p-6">
                <h2 className="text-base font-bold text-danger mb-3">Danger Zone</h2>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text">Sign Out</p>
                    <p className="text-xs text-text-secondary mt-0.5">Sign out of your account on this device</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="rounded-xl border border-danger/30 px-4 py-2 text-xs font-semibold text-danger hover:bg-danger/10 transition-all"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Save button */}
          {activeTab !== "account" && (
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={handleSave}
                className="rounded-full bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-2 text-xs font-medium text-white hover:bg-accent/30 hover:border-accent/40 transition-all"
              >
                Save Changes
              </button>
              {saved && (
                <span className="text-sm text-success font-medium flex items-center gap-1">
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
