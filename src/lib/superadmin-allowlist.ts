/** Superadmin allowlist — safe to import from client tests (no server-only deps). */

export function isSuperadminEmail(email?: string): boolean {
  if (!email) return false;
  const allowList = (process.env.POSTERBOY_SUPERADMIN_EMAILS || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return allowList.includes(email.trim().toLowerCase());
}

export function resolveSessionSuperadmin(session: {
  email?: string;
  isSuperadmin?: boolean;
}): boolean {
  return isSuperadminEmail(session.email) || !!session.isSuperadmin;
}
