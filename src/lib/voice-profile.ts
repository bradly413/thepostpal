/**
 * Slim voice-profile helpers for Origin-style onboarding.
 * Maps personality picks → OnboardingAnswers the brand-book generator already accepts.
 * No fonts / palettes collected in the UI.
 */

import type { OnboardingAnswers } from "@/lib/brand-book-schema";
import type { TonePreference } from "@/lib/onboarding-choices";
import { DRESS_CODE_OPTIONS, GREETING_OPTIONS, COMPLIMENT_OPTIONS } from "@/lib/onboarding-choices";
import type { ZeroShotHistoryResult } from "@/lib/zero-shot-extraction";

export type VoicePersonalityId =
  | "warm"
  | "professional"
  | "playful"
  | "straight"
  | "neighborly"
  | "bold"
  | "calm"
  | "elevated";

export interface VoicePersonality {
  id: VoicePersonalityId;
  label: string;
  tone: TonePreference;
  /** Short caption sample shown in the picker. */
  example: string;
  /** Seed phrases for how they sound. */
  weSay: string[];
  /** Soft defaults for anti-voice if user skips the never step. */
  weDontSay: string[];
  /** Maps to legacy greeting/compliment slots so the generator stays happy. */
  greetingIndex: number;
  complimentIndex: number;
  dressIndex: number;
}

export const VOICE_PERSONALITIES: VoicePersonality[] = [
  {
    id: "warm",
    label: "Warm",
    tone: "warm",
    example: "We've got you — come in whenever you're ready.",
    weSay: [
      "We've got you — come in whenever you're ready.",
      "Glad you're here. Tell us what you need.",
      "No rush. Take a seat and we'll take care of the rest.",
    ],
    weDontSay: ["Limited time only!!!", "Smash that follow", "Act now or miss out"],
    greetingIndex: 1,
    complimentIndex: 3,
    dressIndex: 1,
  },
  {
    id: "professional",
    label: "Professional",
    tone: "professional",
    example: "Here's what to expect — clear steps, no surprises.",
    weSay: [
      "Here's what to expect — clear steps, no surprises.",
      "Ready when you are. Book a time that works.",
      "A straightforward next step, so you know exactly what's ahead.",
    ],
    weDontSay: ["Hey bestie", "OMG you guys", "Slay"],
    greetingIndex: 0,
    complimentIndex: 1,
    dressIndex: 0,
  },
  {
    id: "playful",
    label: "Playful",
    tone: "playful",
    example: "This one's fun — you're going to like this.",
    weSay: [
      "This one's fun — you're going to like this.",
      "Zero boring energy today. Just saying.",
      "Plot twist: your week just got better.",
    ],
    weDontSay: ["As per my last email", "Synergy", "Leverage our solution"],
    greetingIndex: 1,
    complimentIndex: 2,
    dressIndex: 2,
  },
  {
    id: "straight",
    label: "Straight-talking",
    tone: "authoritative",
    example: "Here's the deal. No fluff — just what matters.",
    weSay: [
      "Here's the deal. No fluff — just what matters.",
      "Three things you need to know. That's it.",
      "Skip the hype. Here's what actually helps.",
    ],
    weDontSay: ["Just circling back!", "Thoughts?", "Going forward…"],
    greetingIndex: 3,
    complimentIndex: 1,
    dressIndex: 0,
  },
  {
    id: "neighborly",
    label: "Neighborly",
    tone: "warm",
    example: "Locals know — stop by anytime, we'll wave you in.",
    weSay: [
      "Locals know — stop by anytime, we'll wave you in.",
      "See you around town this weekend.",
      "Your neighborhood spot. Come say hi.",
    ],
    weDontSay: ["Disrupt the industry", "Scale at all costs", "Game-changing"],
    greetingIndex: 2,
    complimentIndex: 3,
    dressIndex: 3,
  },
  {
    id: "bold",
    label: "Bold",
    tone: "authoritative",
    example: "This is the one. Don't wait on it.",
    weSay: [
      "This is the one. Don't wait on it.",
      "Make the move — we'll handle the rest.",
      "If you've been thinking about it, this is your sign.",
    ],
    weDontSay: ["Maybe later", "No pressure either way", "Whenever you feel like it"],
    greetingIndex: 3,
    complimentIndex: 1,
    dressIndex: 0,
  },
  {
    id: "calm",
    label: "Calm",
    tone: "warm",
    example: "Slow down. There's room for you here.",
    weSay: [
      "Slow down. There's room for you here.",
      "Quiet confidence. No rush, no noise.",
      "A softer pace — we'll meet you there.",
    ],
    weDontSay: ["Hurry!!!", "FOMO", "Last chance forever"],
    greetingIndex: 1,
    complimentIndex: 3,
    dressIndex: 1,
  },
  {
    id: "elevated",
    label: "Elevated",
    tone: "professional",
    example: "Refined, considered — made for people who notice.",
    weSay: [
      "Refined, considered — made for people who notice.",
      "Less noise. More intention.",
      "A quieter kind of excellence.",
    ],
    weDontSay: ["Cheap deals", "Yasss queen", "Fire emoji spam"],
    greetingIndex: 0,
    complimentIndex: 1,
    dressIndex: 0,
  },
];

export function getVoicePersonality(id: string | null | undefined): VoicePersonality {
  return VOICE_PERSONALITIES.find((p) => p.id === id) ?? VOICE_PERSONALITIES[0];
}

export type VoiceOnboardingState = {
  businessName: string;
  whatYouDo: string;
  where: string;
  personalityId: VoicePersonalityId | null;
  neverSoundLike: string;
};

export function buildVoiceOnboardingAnswers(state: VoiceOnboardingState): OnboardingAnswers {
  const personality = getVoicePersonality(state.personalityId);
  const neverBits = state.neverSoundLike
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 5);

  const location = state.where.trim() || "Local area";
  const business = state.businessName.trim() || "My business";
  const profession = state.whatYouDo.trim() || "Local business";

  return {
    name: business,
    company: business,
    location,
    markets: [location],
    targetClient: "Local customers who want a business that sounds human",
    personalityTraits: [personality.label, ...personality.weSay.slice(0, 2)],
    tonePreference: personality.tone,
    contentFocus: ["offers", "updates", "behind-the-scenes"],
    profession,
    industry: "other-general",
    industries: ["other-general"],
    mission: `${business} — ${profession}${location ? ` in ${location}` : ""}.`,
    antiVoice: neverBits.length > 0 ? neverBits : personality.weDontSay,
    voiceSamples: personality.weSay,
    dressCode: DRESS_CODE_OPTIONS[personality.dressIndex],
    dressCodes: [DRESS_CODE_OPTIONS[personality.dressIndex]],
    greeting: GREETING_OPTIONS[personality.greetingIndex],
    greetings: [GREETING_OPTIONS[personality.greetingIndex]],
    compliment: COMPLIMENT_OPTIONS[personality.complimentIndex],
    compliments: [COMPLIMENT_OPTIONS[personality.complimentIndex]],
  };
}

/**
 * Fold optional social-history analysis into voice answers.
 * User personality + never-say stay primary; history enriches samples and anti-voice.
 */
export function mergeHistoryIntoVoiceAnswers(
  base: OnboardingAnswers,
  history: ZeroShotHistoryResult | null | undefined,
): OnboardingAnswers {
  if (!history) return base;

  const toneTraits = history.tone
    .split(/[.•|/]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const contentFocus = [
    ...new Set([...(base.contentFocus ?? []), ...history.pillars].filter(Boolean)),
  ].slice(0, 8);

  const voiceSamples = [
    ...new Set([
      ...(base.voiceSamples ?? []),
      ...history.weSay,
      ...history.hashtags.slice(0, 6),
    ]),
  ].slice(0, 16);

  const antiVoice = [
    ...new Set([...(base.antiVoice ?? []), ...history.weDontSay]),
  ].slice(0, 10);

  const visualRefs = [
    ...new Set([
      ...(base.visualRefs ?? []),
      ...history.visualStyle,
      history.mediaMix ? `Media mix: ${history.mediaMix}` : "",
      history.postingCadence ? `Cadence: ${history.postingCadence}` : "",
    ].filter(Boolean)),
  ].slice(0, 12);

  return {
    ...base,
    personalityTraits: [
      ...new Set([...(base.personalityTraits ?? []), ...toneTraits]),
    ].slice(0, 8),
    contentFocus,
    voiceSamples,
    antiVoice,
    visualRefs,
  };
}
