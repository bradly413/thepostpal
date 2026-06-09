export type StrategicIntentId =
  | "launch"
  | "event"
  | "educate"
  | "recruit"
  | "seasonal"
  | "story";

export interface StrategicIntent {
  id: StrategicIntentId;
  label: string;
  description: string;
  detailPlaceholder: string;
}

export const STRATEGIC_INTENTS: StrategicIntent[] = [
  {
    id: "launch",
    label: "Launch a Product",
    description: "Announce something new with clear value and a soft call to action.",
    detailPlaceholder: "Product name, launch date, key benefit…",
  },
  {
    id: "event",
    label: "Promote an Event",
    description: "Drive RSVPs or foot traffic with date, place, and why it matters.",
    detailPlaceholder: "Event name, date, location, offer…",
  },
  {
    id: "educate",
    label: "Educate the Market",
    description: "Share a tip, myth-bust, or how-to that builds trust.",
    detailPlaceholder: "Topic, audience pain point, takeaway…",
  },
  {
    id: "recruit",
    label: "Recruit Talent",
    description: "Open roles, culture, and who should apply.",
    detailPlaceholder: "Role title, perks, how to apply…",
  },
  {
    id: "seasonal",
    label: "Seasonal / Holiday",
    description: "Tie your offer to the moment without sounding generic.",
    detailPlaceholder: "Holiday or season, promo, deadline…",
  },
  {
    id: "story",
    label: "Customer Story",
    description: "Spotlight a win, review, or behind-the-scenes moment.",
    detailPlaceholder: "Customer, outcome, quote or detail…",
  },
];

export function buildStructuredBrief(
  intentId: StrategicIntentId | null,
  detail: string,
): string {
  if (!intentId) return "";
  const intent = STRATEGIC_INTENTS.find((i) => i.id === intentId);
  if (!intent) return "";
  const trimmed = detail.trim();
  return trimmed
    ? `Intent: ${intent.label}. ${trimmed}`
    : `Intent: ${intent.label}.`;
}
