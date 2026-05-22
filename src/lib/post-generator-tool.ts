export interface PostSuggestion {
  copy: string;
  day: string;
  time: string;
}

export interface WeeklyPlan {
  posts: PostSuggestion[];
  summary: string;
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const TEMPLATES: Record<string, (whatsNew: string, offer: string) => PostSuggestion[]> = {
  bakery: (whatsNew, offer) => [
    { day: "Tuesday", time: "10:00", copy: whatsNew || "Fresh batch out by ten. First come, reasonably served." },
    { day: "Wednesday", time: "14:00", copy: offer || "Something from the case. Photographed without ceremony." },
    { day: "Thursday", time: "08:00", copy: "Weekend hours, posted early so nobody has to ask." },
    { day: "Friday", time: "12:00", copy: "A note about what is left. Two sentences. That is enough." },
    { day: "Saturday", time: "09:00", copy: "Open. The usual. Possibly a dog in frame." },
  ],
  restaurant: (whatsNew, offer) => [
    { day: "Tuesday", time: "11:00", copy: whatsNew || "Tonight's special, written down before the dinner rush." },
    { day: "Wednesday", time: "16:00", copy: "The patio situation, updated honestly." },
    { day: "Thursday", time: "10:00", copy: offer || "A quiet mention of the thing people keep ordering." },
    { day: "Friday", time: "17:00", copy: "Weekend reservations. Link where it belongs." },
    { day: "Saturday", time: "12:00", copy: "A photo of food. No adjectives we would regret." },
  ],
  realtor: (whatsNew, offer) => [
    { day: "Tuesday", time: "09:00", copy: whatsNew || "New listing. Good light. Open house details inside." },
    { day: "Wednesday", time: "12:00", copy: "Market note in plain English. No panic required." },
    { day: "Thursday", time: "15:00", copy: offer || "Just sold. Keys handed over. On to the next." },
    { day: "Friday", time: "10:00", copy: "Neighborhood spot worth knowing about. Not sponsored." },
    { day: "Saturday", time: "08:00", copy: "Open house reminder. Coffee optional, questions welcome." },
  ],
  default: (whatsNew, offer) => [
    { day: "Tuesday", time: "10:00", copy: whatsNew || "What is new this week, said plainly." },
    { day: "Wednesday", time: "14:00", copy: "Something useful. No performance required." },
    { day: "Thursday", time: "09:00", copy: offer || "An offer or update, if you have one." },
    { day: "Friday", time: "12:00", copy: "Hours, availability, or a human detail." },
    { day: "Saturday", time: "10:00", copy: "Weekend note. Short. Honest." },
  ],
};

const TONE_ADJUSTMENTS: Record<string, string> = {
  calm: "Keep it steady.",
  dry: "Understate everything.",
  warm: "Friendly, not eager.",
  professional: "Competent, not corporate.",
};

export function generateWeeklyPosts(input: {
  businessType: string;
  whatsNew: string;
  offerOrEvent: string;
  tone: string;
}): WeeklyPlan {
  const key = Object.keys(TEMPLATES).find((k) =>
    input.businessType.toLowerCase().includes(k),
  ) ?? "default";

  const generator = TEMPLATES[key] ?? TEMPLATES.default;
  const posts = generator(input.whatsNew.trim(), input.offerOrEvent.trim());
  const toneNote = TONE_ADJUSTMENTS[input.tone.toLowerCase()] ?? TONE_ADJUSTMENTS.calm;

  return {
    posts,
    summary: `Five drafts for the week ahead. ${toneNote} posterboy can draft the rest.`,
  };
}
