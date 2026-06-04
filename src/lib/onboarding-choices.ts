import type { CuratedPaletteId } from "@/lib/color-registry";

export type TonePreference = "warm" | "professional" | "playful" | "authoritative";

/** Exact copy for UI — keep in sync with OnboardingAnswers types. */
export const DRESS_CODE_OPTIONS = [
  "Sharp & Professional",
  "Smart Casual & Modern",
  "Jeans & a T-Shirt",
  "Boots & Flannel",
] as const;

export const GREETING_OPTIONS = [
  "Good morning. Right this way.",
  "Hey! So great to see you, come on in!",
  "Welcome back, how's the family?",
  "Let's get right to work.",
] as const;

export const COMPLIMENT_OPTIONS = [
  "They made this so easy and stress-free.",
  "The quality is absolutely unmatched.",
  "I had so much fun.",
  "I felt like they actually cared about me.",
] as const;

export type DressCodeChoice = (typeof DRESS_CODE_OPTIONS)[number];
export type GreetingChoice = (typeof GREETING_OPTIONS)[number];
export type ComplimentChoice = (typeof COMPLIMENT_OPTIONS)[number];

export const DRESS_CODE_TO_PALETTE: Record<DressCodeChoice, CuratedPaletteId> = {
  "Sharp & Professional": "sharp-professional",
  "Smart Casual & Modern": "smart-casual",
  "Jeans & a T-Shirt": "jeans-tshirt",
  "Boots & Flannel": "boots-flannel",
};

export const DRESS_CODE_TO_TONE: Record<DressCodeChoice, TonePreference> = {
  "Sharp & Professional": "professional",
  "Smart Casual & Modern": "warm",
  "Jeans & a T-Shirt": "playful",
  "Boots & Flannel": "warm",
};

export const DRESS_CODE_TO_FONT_PAIRING: Record<DressCodeChoice, string> = {
  "Sharp & Professional": "worksans-sourceserif",
  "Smart Casual & Modern": "playfair-opensans",
  "Jeans & a T-Shirt": "poppins-lora",
  "Boots & Flannel": "cormorant-lato",
};

export function resolvePaletteIdFromAnswers(
  answers: { dressCode?: DressCodeChoice },
  aiSuggested?: CuratedPaletteId | null,
): CuratedPaletteId {
  if (answers.dressCode && answers.dressCode in DRESS_CODE_TO_PALETTE) {
    return DRESS_CODE_TO_PALETTE[answers.dressCode as DressCodeChoice];
  }
  if (aiSuggested) return aiSuggested;
  return "smart-casual";
}
