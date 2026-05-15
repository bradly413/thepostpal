const STORAGE_KEY = "beta-feedback";

export interface FeedbackItem {
  id: string;
  type: "bug" | "feature" | "other";
  message: string;
  page: string;
  timestamp: number;
  userAgent: string;
}

export function getFeedback(): FeedbackItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveFeedback(item: Omit<FeedbackItem, "id" | "timestamp" | "userAgent">) {
  const items = getFeedback();
  items.unshift({
    ...item,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 200)));
}

export function removeFeedback(id: string) {
  const items = getFeedback().filter((f) => f.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function clearAllFeedback() {
  localStorage.removeItem(STORAGE_KEY);
}
