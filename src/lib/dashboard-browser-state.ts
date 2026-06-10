const ACTIVE_LOCATION_KEY = "posterboy-active-location";
const LOCATION_EVENT = "dashboard-location-updated";

export function getStoredActiveLocationId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_LOCATION_KEY);
}

export function setStoredActiveLocationId(locationId: string): void {
  if (typeof window === "undefined") return;
  // No-op when the value is unchanged. Several hooks re-resolve and re-store the
  // same location on mount/re-render; without this guard each redundant store
  // dispatches LOCATION_EVENT, which listeners answer by re-fetching, which
  // re-renders and re-stores — a feedback cascade (~136 /api/locations calls on
  // a single dashboard load). Skipping the no-change write converges it at once.
  if (window.localStorage.getItem(ACTIVE_LOCATION_KEY) === locationId) return;
  window.localStorage.setItem(ACTIVE_LOCATION_KEY, locationId);
  window.dispatchEvent(new Event(LOCATION_EVENT));
}

export function clearStoredActiveLocationId(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACTIVE_LOCATION_KEY);
  window.dispatchEvent(new Event(LOCATION_EVENT));
}

export function onStoredActiveLocationChange(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(LOCATION_EVENT, listener);
  return () => window.removeEventListener(LOCATION_EVENT, listener);
}
