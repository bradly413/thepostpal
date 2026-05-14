const STORAGE_KEY = "meta-connection";

export interface MetaConnection {
  connected: boolean;
  pageName: string;
  pageId: string;
  pageToken: string;
  igAccountId: string | null;
  connectedAt: string;
}

export function getMetaConnection(): MetaConnection | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveMetaConnection(data: MetaConnection) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearMetaConnection() {
  localStorage.removeItem(STORAGE_KEY);
}
