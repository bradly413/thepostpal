// ─────────────────────────────────────────────────────────────
//  Voice synthesis — Phase 3
//
//  Given a few writing samples + the user's industry/profession/
//  personality/anti-voice, ask Claude to extract a structured voice
//  profile that matches the user's actual rhythm (not generic
//  marketing voice). Returns a SynthesizedVoice on success; throws
//  on any failure so the caller can fall back to deterministic voice.
//
//  Server-side only — calls Anthropic API with ANTHROPIC_API_KEY.
//  Do not import from client components.
// ─────────────────────────────────────────────────────────────

import Anthropic from "@anthropic-ai/sdk";
import type { BrandVoice } from "@/lib/brand-book-schema";
import { getIndustry, DEFAULT_INDUSTRY } from "@/lib/industries";

// ── Shape returned by Claude (subset of full BrandVoice) ──────

export interface SynthesizedVoice {
  hero: string;
  weSay: string[];
  weDontSay: string[];
  always: string;
  sometimes: string;
  never: string;
  italicRule: string;
  traits: { name: string; description: string }[];
}

// ── System prompt — kept long-static for future prompt caching ─

const VOICE_SYNTHESIS_SYSTEM = `You are a brand voice analyst. Given onboarding answers (industry, profession, location, audience) and optional writing samples, extract a voice profile that matches THIS business — not a generic template and never a different industry.

## Your job
Produce a voice profile grounded in the user's declared industry and profession. Every line in hero, weSay, weDontSay, and traits must sound like it belongs to that vertical.

## Industry guardrails (strict)
- The "Industry" and "Vertical context" fields in the user message are authoritative. Treat them as law.
- NEVER use terminology from outside the user's declared industry. Do not use real-estate terms (listing, brokerage, comps, open house, closing, buyer/seller journey, "dream home", MLS) unless Industry is explicitly real estate.
- Do not use restaurant terms for a salon, or fitness jargon for a law firm. Match the vertical context vocabulary.
- If Industry is food / restaurant / hospitality: reference dishes, guests, service, kitchen, reservations, ingredients — never "brokerage" or "transaction" in the real-estate sense.
- weDontSay must include at least one line that would be wrong for this industry (e.g. for a restaurant, forbid brokerage/listing language).
- Identity fields: "Profession" and "Company" map to the UI — never invent a brokerage label unless Industry is real estate.

## Rules that matter
- Match the user's actual rhythm, vocabulary, and energy from samples when provided.
- If they write in lowercase, your weSay examples are lowercase. If they use em-dashes, you use em-dashes.
- Pull specific words from samples when available; otherwise derive from personality + industry + mission.
- Use anti-voice to inform weDontSay.
- Voice traits must be specific — never generic ("professional", "trustworthy") unless earned by the brief.
- If no samples are provided, derive voice from personality traits + industry + mission only — still fully industry-native.

## Output format
Return ONLY a single JSON object. No markdown code fences. No prose before or after. Match this exact shape:

{
  "hero": "<one sentence describing how this brand sounds, specific to them>",
  "weSay": ["<3 to 5 plausible posts in their voice>"],
  "weDontSay": ["<3 to 5 lines that would feel off-brand>"],
  "always": "<one sentence — voice rules they always follow>",
  "sometimes": "<one sentence — selective moves they make>",
  "never": "<one sentence — what they avoid>",
  "italicRule": "<one sentence about emphasis use, can be simple>",
  "traits": [
    {"name": "<1–4 word name, specific not generic>", "description": "<one sentence>"},
    {"name": "...", "description": "..."},
    {"name": "...", "description": "..."}
  ]
}

Exactly 3 entries in traits. Arrays use double quotes. Do not include trailing commas. Do not wrap in markdown code fences.`;

// ── Input + caller-facing API ─────────────────────────────────

export interface VoiceSynthesisInput {
  /** Free-text industry label or IndustryId from src/lib/industries.ts. */
  industry?: string;
  profession?: string;
  company?: string;
  mission?: string;
  personalityTraits: string[];
  tonePreference: string;
  targetClient: string;
  voiceSamples: string[];
  antiVoice?: string[];
}

function buildUserPayload(input: VoiceSynthesisInput): string {
  const industryDef = getIndustry(input.industry) ?? DEFAULT_INDUSTRY;
  const industryLine =
    input.industry && industryDef.id !== input.industry
      ? `${industryDef.label} (user described as: "${input.industry}")`
      : industryDef.label;

  const samples =
    input.voiceSamples.length === 0
      ? "(No samples provided — base voice on personality traits + industry + mission.)"
      : input.voiceSamples
          .map((s, i) => `Sample ${i + 1}:\n"""${s.trim()}"""`)
          .join("\n\n");

  const antiVoice =
    input.antiVoice && input.antiVoice.length > 0
      ? input.antiVoice.map((s, i) => `${i + 1}. "${s.trim()}"`).join("\n")
      : "(not provided)";

  return `Industry (authoritative): ${industryLine}
Industry ID: ${industryDef.id}
Profession (from UI): ${input.profession || industryDef.defaultProfessionTitle}
Company / business name: ${input.company || "(not specified)"}
Mission: ${input.mission || "(not specified)"}
Personality traits: ${input.personalityTraits.join(", ") || "(none selected)"}
Tone preference: ${input.tonePreference}
Target client / guest / audience: ${input.targetClient}
Signature line for this vertical: ${industryDef.voiceExampleLine}

Vertical context (follow exactly): ${industryDef.promptAddendum}

FORBIDDEN unless Industry is real estate: brokerage, listing, listings, comps, open house, closing, closings, buyer journey, seller journey, dream home, MLS, CMA, "transaction" (in a property sense).

Voice samples (real writing by this person):
${samples}

Anti-voice (what they don't want to sound like):
${antiVoice}

Return the structured voice profile.`;
}

// ── Type guard — defensive validation of Claude's response ─────

function isSynthesizedVoice(v: unknown): v is SynthesizedVoice {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.hero === "string" &&
    Array.isArray(o.weSay) &&
    o.weSay.every((x) => typeof x === "string") &&
    Array.isArray(o.weDontSay) &&
    o.weDontSay.every((x) => typeof x === "string") &&
    typeof o.always === "string" &&
    typeof o.sometimes === "string" &&
    typeof o.never === "string" &&
    typeof o.italicRule === "string" &&
    Array.isArray(o.traits) &&
    o.traits.every(
      (t) =>
        typeof t === "object" &&
        t !== null &&
        typeof (t as { name?: unknown }).name === "string" &&
        typeof (t as { description?: unknown }).description === "string",
    )
  );
}

/**
 * Call Claude to synthesize a brand voice profile. Throws on any failure
 * (missing API key, API error, invalid JSON response). Callers should
 * catch and fall back to the deterministic `buildVoice()` in onboarding-agent.ts.
 */
export async function synthesizeVoice(
  input: VoiceSynthesisInput,
): Promise<SynthesizedVoice> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const client = new Anthropic({ apiKey });

  // claude-sonnet-4-6 is the current Sonnet — fast + cheap enough for a
  // 2–4s wait during onboarding, smart enough to match real voice samples.
  // System prompt gets cache_control as future-proofing (won't fire below
  // ~2k tokens but adds zero cost and starts caching if the prompt grows).
  // No output_config — relying on JSON-in-prompt + manual validation so we
  // don't depend on SDK-version-specific structured-output API support.
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: [
      {
        type: "text",
        text: VOICE_SYNTHESIS_SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: buildUserPayload(input) }],
  });

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Voice synthesis returned no text content");
  }

  // Strip markdown code fences if the model added them despite instructions.
  const cleaned = block.text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      `Voice synthesis returned invalid JSON: ${
        err instanceof Error ? err.message : "unknown parse error"
      }`,
    );
  }

  if (!isSynthesizedVoice(parsed)) {
    throw new Error("Voice synthesis returned JSON that doesn't match schema");
  }

  return parsed;
}

// ── Adapter: SynthesizedVoice → BrandVoice (full schema) ──────

/**
 * Map the AI-synthesized voice onto the BrandBook's full BrandVoice shape.
 * The deterministic fallback `buildVoice()` in onboarding-agent.ts produces
 * the same shape — these are interchangeable downstream.
 */
export function toBrandVoice(synth: SynthesizedVoice): BrandVoice {
  return {
    hero: synth.hero,
    weSay: synth.weSay,
    weDontSay: synth.weDontSay,
    always: synth.always,
    sometimes: synth.sometimes,
    never: synth.never,
    italicRule: synth.italicRule,
    traits: synth.traits,
    // Taglines aren't synthesized in v1 — generator can derive from
    // hero or leave empty. Keeping the field present so downstream
    // code that reads voice.taglines doesn't NPE.
    taglines: [],
  };
}
