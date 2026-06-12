/**
 * Validate media URLs at WRITE time (H1, audit 2026-06-12).
 *
 * Stored values end up interpolated into CSS url('…') in the studio history
 * stack / ambient glow / gallery — characters that can break out of url('')
 * are rejected outright, and only web schemes (or app-relative /uploads paths
 * from the dev storage fallback) are accepted.
 */
export function isSafeMediaUrl(value: string): boolean {
  if (!value || value.length > 2048) return false;
  if (/['"()\\\s<>]/.test(value)) return false;
  if (value.startsWith("/")) return !value.startsWith("//"); // app-relative (dev uploads)
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
