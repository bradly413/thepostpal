export interface Chapter {
  id: string;
  label: string;
}

export const CHAPTERS: Chapter[] = [
  { id: "intro", label: "INTRO" },
  { id: "product", label: "PRODUCT" },
  { id: "workflow", label: "WORKFLOW" },
  { id: "industries", label: "INDUSTRIES" },
  { id: "drafts", label: "DRAFTS" },
  { id: "pricing", label: "PRICING" },
  { id: "contact", label: "CONTACT" },
];

/** Total scroll spine height in viewport units */
export const SPINE_VH = CHAPTERS.length * 100;

export const TONE_OPTIONS = [
  { id: "calm", label: "Calm", line: "Your week is drafted." },
  { id: "dry", label: "Dry", line: "Social media for people who'd rather not." },
  { id: "warm", label: "Warm", line: "Approve at your leisure." },
  { id: "direct", label: "Direct", line: "Post less. Sell more." },
] as const;

export const INDUSTRY_LINES = [
  { title: "Bakery", line: "Sourdough's back. Loaves cool by ten." },
  { title: "Broker", line: "Open Saturday. Good light in the kitchen." },
  { title: "Restaurant", line: "Tonight's special, written before the rush." },
  { title: "Salon", line: "New availability Thursday." },
  { title: "Local service", line: "Look alive online without hiring anyone." },
];

export const WORKFLOW_STEPS = [
  "Week drafted",
  "Brand voice applied",
  "Drafts queued",
  "You review",
  "Press to approve",
  "Dispatch schedules",
  "Posts go out",
  "You go back to work",
];

export const DRAFT_SNIPPETS = [
  "Sourdough's back. Limit two per household.",
  "Saturday class. Two spots left.",
  "The dog is in the window display.",
  "Weekend hours, posted early.",
  "A note about the new oven. Two sentences.",
  "Market note in plain English.",
  "Open house reminder. Coffee optional.",
  "Fresh batch by ten.",
  "Seasonal menu, no adjectives we'll regret.",
  "Hours updated. That's the whole post.",
  "Just sold. Keys handed over.",
  "Neighborhood spot worth knowing.",
];

export function chapterIndex(progress: number): number {
  const idx = Math.floor(progress * CHAPTERS.length);
  return Math.min(CHAPTERS.length - 1, Math.max(0, idx));
}

export function chapterOpacity(progress: number, index: number): number {
  const slice = 1 / CHAPTERS.length;
  const start = index * slice;
  const end = (index + 1) * slice;
  const mid = (start + end) / 2;
  const fade = slice * 0.35;
  if (progress < start - fade || progress > end + fade) return 0;
  if (progress < start + fade) return (progress - (start - fade)) / (fade * 2);
  if (progress > end - fade) return 1 - (progress - (end - fade)) / (fade * 2);
  return 1;
}
