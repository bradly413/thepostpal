const ACTIVE_LOCATION_KEY = "posterboy-active-location";
const LOCATION_EVENT = "dashboard-location-updated";

// localStorage throws in Safari private mode and when quota is exceeded — an
// unguarded access there would break location resolution and blank the
// dashboard. Every read/write is wrapped; the in-memory fallback keeps the
// active location working for the session even when storage is unavailable.
let memoryLocationId: string | null = null;

export function getStoredActiveLocationId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACTIVE_LOCATION_KEY);
  } catch {
    return memoryLocationId;
  }
}

export function setStoredActiveLocationId(locationId: string): void {
  if (typeof window === "undefined") return;
  // No-op when the value is unchanged. Several hooks re-resolve and re-store the
  // same location on mount/re-render; without this guard each redundant store
  // dispatches LOCATION_EVENT, which listeners answer by re-fetching, which
  // re-renders and re-stores — a feedback cascade (~136 /api/locations calls on
  // a single dashboard load). Skipping the no-change write converges it at once.
  if (getStoredActiveLocationId() === locationId) return;
  memoryLocationId = locationId;
  try {
    window.localStorage.setItem(ACTIVE_LOCATION_KEY, locationId);
  } catch {
    /* storage unavailable — memory fallback already holds it */
  }
  window.dispatchEvent(new Event(LOCATION_EVENT));
}

export function clearStoredActiveLocationId(): void {
  if (typeof window === "undefined") return;
  memoryLocationId = null;
  try {
    window.localStorage.removeItem(ACTIVE_LOCATION_KEY);
  } catch {
    /* storage unavailable — nothing to clear */
  }
  window.dispatchEvent(new Event(LOCATION_EVENT));
}

export function onStoredActiveLocationChange(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(LOCATION_EVENT, listener);
  return () => window.removeEventListener(LOCATION_EVENT, listener);
}
