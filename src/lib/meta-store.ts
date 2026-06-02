/**
 * @deprecated Use `useMetaConnection()` and `/api/social-connections/meta` instead.
 * Tokens are stored on `SocialConnection` rows, not in localStorage.
 */
export type { MetaConnectionPublic as MetaConnection } from "@/lib/meta-connection-types";

export function getMetaConnection(): null {
  if (typeof window !== "undefined") {
    console.warn("getMetaConnection() is deprecated — use useMetaConnection() instead.");
  }
  return null;
}

export function saveMetaConnection(): void {
  console.warn("saveMetaConnection() is deprecated — Meta connections persist via OAuth callback.");
}

export function clearMetaConnection(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("meta-connection");
  }
}
