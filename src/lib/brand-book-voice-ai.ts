import "server-only";

import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  brandVoiceAiSchema,
  type BrandVoice,
  type BrandVoiceAiOutput,
  type OnboardingAnswers,
} from "@/lib/brand-book-schema";
import { CURATED_PALETTES } from "@/lib/color-registry";
import { getIndustry } from "@/lib/industries";
import {
  formatIndustrySeedForPrompt,
  getIndustrySeed,
} from "@/lib/industry-seeds";

const BASE_SYSTEM = `You are a brand voice analyst for posterboy onboarding. You output structured JSON only — no markdown, no commentary.

## Color rule (strict)
- You may NOT invent hex codes, RGB values, or custom color names.
- paletteId MUST be exactly one of: sharp-professional, smart-casual, jeans-tshirt, boots-flannel.
- Visual colors are applied from our curated registry on the server — your job is to pick the right paletteId.

## Behavioral signals (how to interpret plain-English answers)
- **Dress Code** → defines visual aesthetic. Use it to choose paletteId (match the vibe: sharp-professional for "Sharp & Professional", etc.). Fonts and colors come from the registry only.
- **Greeting** → defines how the business talks. Shape weSay like their greeting; shape weDontSay as what they would never say given that greeting style.
- **Compliment** → defines positioning. The hero MUST echo the theme of their best 5-star review — rewrite it as a confident one-liner, not generic marketing.

## Voice rules
- Ground copy in the declared industry. Never use terminology from outside that industry.
- If a vertical seed is provided, treat it as law.
- traits: short labels (2–5 words), specific — never generic "professional" or "trustworthy" alone.`;

function formatCuratedPaletteCatalog(): string {
  return Object.values(CURATED_PALETTES)
    .map(
      (p) =>
        `- ${p.id}: ${p.name} (Primary ${p.primary}, Foundation ${p.foundation}, Secondary ${p.secondary}, Accent ${p.accent})`,
    )
    .join("\n");
}

function formatBehavioralSignals(answers: OnboardingAnswers): string {
  if (!answers.dressCode && !answers.greeting && !answers.compliment) {
    return "";
  }
  return `## Owner's behavioral answers (authoritative)

**Dress Code** — "If your business had a dress code, what would it be?"
→ ${answers.dressCode ?? "(not provided)"}
Use for paletteId and overall visual vibe only.

**Greeting** — "A new customer walks through the door. How do you greet them?"
→ ${answers.greeting ?? "(not provided)"}
Use for weSay and weDontSay — match this energy and phrasing style.

**Compliment** — "What is the best 5-star review a customer could leave you?"
→ ${answers.compliment ?? "(not provided)"}
Use for hero — the positioning line must reflect this praise theme.`;
}

function buildBrandVoiceSystemPrompt(answers: OnboardingAnswers): string {
  const industryDef = getIndustry(answers.industry);
  const seed = getIndustrySeed(answers.industry);
  const parts = [BASE_SYSTEM, formatBehavioralSignals(answers)];

  parts.push(`## Curated palettes (pick one paletteId only)\n${formatCuratedPaletteCatalog()}`);

  if (seed) {
    parts.push(formatIndustrySeedForPrompt(seed));
  } else if (industryDef) {
    parts.push(
      `## Industry context\n${industryDef.label}: ${industryDef.promptAddendum}\nSignature line: ${industryDef.voiceExampleLine}`,
    );
  }

  parts.push(
    "## Guardrail\nNever use real-estate terms (brokerage, listing, MLS, comps, buyers, closings, open house) unless Industry is explicitly real-estate.",
  );

  return parts.join("\n\n");
}

function buildBrandVoiceUserPrompt(answers: OnboardingAnswers): string {
  const industryDef = getIndustry(answers.industry);
  const company = answers.company ?? answers.brokerage;
  const samples =
    answers.voiceSamples && answers.voiceSamples.length > 0
      ? answers.voiceSamples
          .map((s, i) => `Sample ${i + 1}: """${s.trim()}"""`)
          .join("\n")
      : "(none)";

  const anti =
    answers.antiVoice && answers.antiVoice.length > 0
      ? answers.antiVoice.map((a) => `- ${a}`).join("\n")
      : "(none)";

  return `Industry ID: ${answers.industry ?? "unknown"}
Industry label: ${industryDef?.label ?? "General business"}
Profession: ${answers.profession ?? industryDef?.defaultProfessionTitle ?? "Owner"}
Company / venue: ${company ?? "(not specified)"}
Location: ${answers.location}
Target audience: ${answers.targetClient}
Tone preference (derived from dress code): ${answers.tonePreference}

Dress code: ${answers.dressCode ?? "(not provided)"}
Greeting: ${answers.greeting ?? "(not provided)"}
Compliment: ${answers.compliment ?? "(not provided)"}

Voice samples:
${samples}

Anti-voice:
${anti}`;
}

export function brandVoiceAiToBrandVoice(ai: BrandVoiceAiOutput): BrandVoice {
  return {
    hero: ai.hero,
    weSay: ai.weSay,
    weDontSay: ai.weDontSay,
    always:
      "Sounds like how they greet people — plain words, no jargon.",
    sometimes: "A real detail from the work — not a marketing template.",
    never: "Wrong-industry words, fake hype, or a tone that clashes with their greeting.",
    italicRule: "Emphasize at most one word per caption.",
    traits: ai.traits.map((name) => ({
      name,
      description: `${name} — fits their dress code and how they welcome people.`,
    })),
    taglines: [],
  };
}

export async function generateBrandVoiceStructured(
  answers: OnboardingAnswers,
): Promise<BrandVoiceAiOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-6"),
    schema: brandVoiceAiSchema,
    system: buildBrandVoiceSystemPrompt(answers),
    prompt: buildBrandVoiceUserPrompt(answers),
    maxOutputTokens: 1500,
  });

  return object;
}
