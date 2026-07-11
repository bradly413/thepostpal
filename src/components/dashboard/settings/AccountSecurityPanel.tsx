"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { MetaConnectionPublic } from "@/lib/meta-connection-types";
import { clearStoredActiveLocationId } from "@/lib/dashboard-browser-state";
import { useFocusTrap } from "@/components/dashboard/use-focus-trap";

export default function AccountSecurityPanel({
  meta,
  metaError,
  locationName,
  onConnectMeta,
  onDisconnectMeta,
}: {
  meta: MetaConnectionPublic | null;
  metaError: string | null;
  locationName?: string | null;
  onConnectMeta: () => void;
  onDisconnectMeta: () => void;
}) {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const deleteDialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(showDeleteModal, deleteDialogRef, () => setShowDeleteModal(false));

  async function handleChangePassword() {
    setPasswordLoading(true);
    setPasswordMsg(null);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not update password");
      setPasswordMsg("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setShowPasswordForm(false);
    } catch (err) {
      setPasswordMsg(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: deleteConfirm }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not delete account");
      clearStoredActiveLocationId();
      window.location.href = "/sign-in";
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Could not delete account");
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleLogout() {
    setLogoutLoading(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } catch {
      /* still redirect — cookie clear is best-effort if network fails */
    }
    clearStoredActiveLocationId();
    window.location.href = "/sign-in";
  }

  return (
    <div className="space-y-4">
      <div className="pb-panel">
        <h2 className="pb-panel-h">Account</h2>
        <p className="text-sm opacity-65 mb-4">Manage your account access and security</p>
        <div className="space-y-3">
          <div className="pb-row" style={{ display: "block" }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Change Password</p>
                <p className="text-xs opacity-55 mt-0.5">Update your account password</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordForm((v) => !v)}
                className="pb-btn-primary text-xs py-2 px-4"
              >
                {showPasswordForm ? "Cancel" : "Change"}
              </button>
            </div>
            {showPasswordForm && (
              <div className="mt-4 space-y-3">
                <label htmlFor="account-current-password" className="sr-only">
                  Current password
                </label>
                <input
                  id="account-current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                  className="pb-field w-full"
                  autoComplete="current-password"
                  aria-describedby={passwordMsg ? "account-password-status" : undefined}
                />
                <label htmlFor="account-new-password" className="sr-only">
                  New password (8+ chars, letter and number)
                </label>
                <input
                  id="account-new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password (8+ chars, letter + number)"
                  className="pb-field w-full"
                  autoComplete="new-password"
                  aria-describedby={passwordMsg ? "account-password-status" : undefined}
                />
                <button
                  type="button"
                  disabled={passwordLoading || !currentPassword || !newPassword}
                  onClick={() => void handleChangePassword()}
                  className="pb-btn-primary text-xs py-2 px-4 disabled:opacity-50"
                >
                  {passwordLoading ? "Saving…" : "Save new password"}
                </button>
              </div>
            )}
            {passwordMsg && (
              <p id="account-password-status" className="text-xs mt-2 opacity-70" role="status">
                {passwordMsg}
              </p>
            )}
          </div>

          <div className="pb-row" style={{ display: "block" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Connected Accounts</p>
                <p className="text-xs opacity-55 mt-0.5">
                  {locationName
                    ? `Facebook and Instagram for ${locationName}`
                    : "Facebook and Instagram for the active brand"}
                </p>
              </div>
            </div>
            {metaError && (
              <div
                className="rounded-lg px-3 py-2 mt-3"
                style={{ background: "rgba(238,37,50,0.08)", border: "1px solid rgba(238,37,50,0.2)" }}
              >
                <p className="text-xs pb-press-text">{metaError}</p>
              </div>
            )}
            {meta?.connected ? (
              <div className="space-y-2 mt-3">
                <div className="flex items-center gap-3 rounded-lg bg-white p-3 border border-black/10">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{meta.pageName}</p>
                    <p className="text-[10px]" style={{ color: "#157a38" }}>Facebook connected</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-white p-3 border border-black/10">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">Instagram</p>
                    <p className="text-[10px] opacity-55">
                      {meta.igAccountId ? "Business account linked" : "No business account found"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onDisconnectMeta}
                  className="w-full rounded-lg border border-black/10 py-2 text-xs font-medium opacity-65 hover:opacity-100 hover:pb-press-text transition-all"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                <button
                  type="button"
                  onClick={onConnectMeta}
                  className="pb-btn-primary w-full flex items-center justify-center gap-2 text-xs py-2.5"
                >
                  Connect with Facebook
                </button>
                <p className="text-[11px] text-black/45 text-center">
                  Manage all brands on{" "}
                  <Link href="/dashboard/organization" className="text-[#ee2532] hover:underline">
                    Organization
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="pb-panel pb-panel-danger space-y-4">
        <h2 className="pb-panel-h pb-press-text">Danger zone</h2>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Sign Out</p>
            <p className="text-xs opacity-55 mt-0.5">Sign out on this device</p>
          </div>
          <button
            type="button"
            disabled={logoutLoading}
            onClick={() => void handleLogout()}
            className="rounded-xl px-4 py-2 text-xs font-semibold pb-press-text transition-all disabled:opacity-50"
            style={{ border: "1px solid rgba(238,37,50,0.3)" }}
          >
            {logoutLoading ? "Signing out…" : "Sign Out"}
          </button>
        </div>
        <div className="flex items-center justify-between gap-4 pt-2 border-t border-[rgba(238,37,50,0.15)]">
          <div>
            <p className="text-sm font-medium">Delete Account</p>
            <p className="text-xs opacity-55 mt-0.5">
              Permanently delete your workspace, posts, and connected data
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowDeleteModal(true);
              setDeleteConfirm("");
              setDeleteError(null);
            }}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-white transition-all"
            style={{ background: "#c81e2a" }}
          >
            Delete
          </button>
        </div>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            ref={deleteDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            className="w-full max-w-md rounded-2xl bg-white border border-black/10 p-6 shadow-2xl"
          >
            <h3 id="delete-account-title" className="text-lg font-bold text-black">
              Delete your account?
            </h3>
            <p className="text-sm text-black/65 mt-2 leading-relaxed">
              This permanently removes your organization, locations, brand books, scheduled posts,
              and Meta connections. This cannot be undone.
            </p>
            <label htmlFor="delete-account-confirm" className="text-xs font-semibold uppercase tracking-wider text-black/55 mt-4 mb-2 block">
              Type DELETE to confirm
            </label>
            <input
              id="delete-account-confirm"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className="pb-field w-full"
              autoComplete="off"
              aria-describedby={deleteError ? "delete-account-error" : undefined}
            />
            {deleteError && (
              <p id="delete-account-error" className="text-xs mt-2 pb-press-text" role="alert">
                {deleteError}
              </p>
            )}
            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 rounded-xl border border-black/10 py-2.5 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteLoading || deleteConfirm.trim().toUpperCase() !== "DELETE"}
                onClick={() => void handleDeleteAccount()}
                className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                style={{ background: "#c81e2a" }}
              >
                {deleteLoading ? "Deleting…" : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs opacity-55">
        See also{" "}
        <Link href="/privacy" className="underline">
          Privacy Policy
        </Link>{" "}
        and{" "}
        <Link href="/terms" className="underline">
          Terms of Service
        </Link>
        .
      </p>
    </div>
  );
}
