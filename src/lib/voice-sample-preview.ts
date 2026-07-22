import {
  VOICE_PERSONALITIES,
  type VoicePersonalityId,
} from "@/lib/voice-profile";

export type CaptionContext = {
  businessName: string;
  whatYouDo: string;
  where: string;
};

export type PersonalizedCaption = {
  personalityId: VoicePersonalityId;
  label: string;
  hint: string;
  caption: string;
  recommended: boolean;
};

const HINTS: Record<VoicePersonalityId, string> = {
  warm: "Welcoming, human",
  professional: "Clear, composed",
  playful: "Light, fun energy",
  straight: "Direct, no fluff",
  neighborly: "Local, familiar",
  bold: "Confident push",
  calm: "Soft, unhurried",
  elevated: "Refined, intentional",
};

/** Niche → ordered personality preference (best first). */
const NICHE_RANK: Array<{ match: RegExp; order: VoicePersonalityId[] }> = [
  {
    match: /\b(med\s*spa|spa|skin|beauty|aesthetic|wellness|salon|lash|nail|massage|facial)\b/i,
    order: ["warm", "elevated", "calm", "professional", "neighborly", "playful", "straight", "bold"],
  },
  {
    match: /\b(real\s*estate|realtor|broker|homes?|property|listing)\b/i,
    order: ["professional", "warm", "elevated", "neighborly", "bold", "straight", "calm", "playful"],
  },
  {
    match: /\b(coffee|cafe|café|bakery|restaurant|bar|food|pizza|taco|brew)\b/i,
    order: ["neighborly", "playful", "warm", "bold", "straight", "calm", "professional", "elevated"],
  },
  {
    match: /\b(contractor|plumber|hvac|roof|electric|landscap|auto|garage|repair|construction)\b/i,
    order: ["straight", "bold", "neighborly", "professional", "warm", "playful", "calm", "elevated"],
  },
  {
    match: /\b(gym|fitness|train|crossfit|yoga|pilates)\b/i,
    order: ["bold", "straight", "playful", "calm", "warm", "professional", "neighborly", "elevated"],
  },
  {
    match: /\b(law|attorney|cpa|account|insurance|financ|consult|agency|b2b|creative)\b/i,
    order: ["professional", "elevated", "straight", "warm", "bold", "calm", "neighborly", "playful"],
  },
  {
    match: /\b(boutique|retail|shop|store|fashion)\b/i,
    order: ["elevated", "playful", "warm", "bold", "neighborly", "professional", "calm", "straight"],
  },
];

const DEFAULT_ORDER: VoicePersonalityId[] = [
  "warm",
  "straight",
  "neighborly",
  "professional",
  "playful",
  "bold",
  "calm",
  "elevated",
];

function normalizeContext(input: CaptionContext) {
  return {
    business: input.businessName.trim() || "Your business",
    niche: input.whatYouDo.trim() || "local business",
    place: input.where.trim() || "town",
  };
}

export function rankVoicePersonalities(whatYouDo: string): VoicePersonalityId[] {
  const niche = whatYouDo.trim();
  const hit = NICHE_RANK.find((row) => row.match.test(niche));
  const preferred = hit?.order ?? DEFAULT_ORDER;
  const seen = new Set<VoicePersonalityId>();
  const out: VoicePersonalityId[] = [];
  for (const id of preferred) {
    if (VOICE_PERSONALITIES.some((p) => p.id === id) && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  for (const p of VOICE_PERSONALITIES) {
    if (!seen.has(p.id)) out.push(p.id);
  }
  return out;
}

function captionFor(
  id: VoicePersonalityId,
  business: string,
  niche: string,
  place: string,
): string {
  switch (id) {
    case "warm":
      return `${business} — your ${niche} in ${place}. Come in whenever you're ready. We've got you.`;
    case "professional":
      return `${business}. ${niche} in ${place}. Here's what to expect — clear steps, no surprises.`;
    case "playful":
      return `${business} in ${place}. Plot twist: your ${niche} just got more fun this week.`;
    case "straight":
      return `${business}. ${niche} in ${place}. Here's what matters this week — no fluff, just the next step.`;
    case "neighborly":
      return `Locals in ${place} know ${business} — your neighborhood ${niche}. Stop by anytime.`;
    case "bold":
      return `${business}. The ${niche} move in ${place}. If you've been thinking about it, this is your sign.`;
    case "calm":
      return `${business} in ${place}. A quieter ${niche} — no rush, just room to breathe.`;
    case "elevated":
      return `${business}. ${niche} in ${place}, done with intention — less noise, more craft.`;
    default:
      return `${business} — ${niche} in ${place}.`;
  }
}

/**
 * Personalized caption for every personality, ordered by niche fit.
 * Top N are marked recommended.
 */
export function buildPersonalizedCaptions(
  input: CaptionContext,
  recommendCount = 2,
): PersonalizedCaption[] {
  const { business, niche, place } = normalizeContext(input);
  const ranked = rankVoicePersonalities(input.whatYouDo);
  const recommend = new Set(ranked.slice(0, recommendCount));

  return ranked.map((id) => {
    const base = VOICE_PERSONALITIES.find((p) => p.id === id)!;
    return {
      personalityId: id,
      label: base.label,
      hint: HINTS[id],
      caption: captionFor(id, business, niche, place),
      recommended: recommend.has(id),
    };
  });
}

/** Legacy A/B helper shape — top two ranked directions. */
export type TonePickId = VoicePersonalityId;

export type CaptionSample = {
  id: TonePickId;
  label: string;
  hint: string;
  caption: string;
  personalityId: VoicePersonalityId;
};

export function buildCaptionSamples(input: CaptionContext): CaptionSample[] {
  return buildPersonalizedCaptions(input, 2)
    .slice(0, 2)
    .map((row) => ({
      id: row.personalityId,
      label: row.label,
      hint: row.hint,
      caption: row.caption,
      personalityId: row.personalityId,
    }));
}
