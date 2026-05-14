export interface ScheduledPost {
  id: string;
  templateId: string;
  templateName: string;
  platform: "facebook" | "instagram" | "both";
  date: string;
  time: string;
  caption: string;
  status: "scheduled" | "published" | "failed" | "draft";
  pillar: string;
}

const STORAGE_KEY = "postpal-scheduled-posts";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function getScheduledPosts(): ScheduledPost[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function addScheduledPost(post: Omit<ScheduledPost, "id">): ScheduledPost {
  const posts = getScheduledPosts();
  const newPost = { ...post, id: generateId() };
  posts.push(newPost);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  window.dispatchEvent(new Event("schedule-updated"));
  return newPost;
}

export function updateScheduledPost(id: string, updates: Partial<ScheduledPost>): void {
  const posts = getScheduledPosts();
  const idx = posts.findIndex((p) => p.id === id);
  if (idx !== -1) {
    posts[idx] = { ...posts[idx], ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
    window.dispatchEvent(new Event("schedule-updated"));
  }
}

export function deleteScheduledPost(id: string): void {
  const posts = getScheduledPosts().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  window.dispatchEvent(new Event("schedule-updated"));
}

export function getPostsForDate(date: string): ScheduledPost[] {
  return getScheduledPosts().filter((p) => p.date === date);
}
