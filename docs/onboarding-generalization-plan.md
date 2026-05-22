# Onboarding generalization plan

**Status:** plan only — no UI/generator code changes yet
**Author/session:** 2026-05-22 (Claude + Brad)
**Owner:** Brad

---

## Why

Posterboy onboarding was built for one persona (Angie, a realtor). The brand book engine assumes the user is a real estate agent at every layer — option lists, system prompt, voice templates, content pillars, photography direction, even the hardcoded `identity.title = "Realtor"`. To open the product to any professional business, we have to generalize the engine without throwing away the schema or the existing brand-book artifacts.

**Goal:** the same onboarding flow produces a brand-quality book for a realtor, a pizzeria owner, a personal trainer, a boutique owner, a wedding photographer, or a roofer — and the AI it powers actually sounds like that person.

---

## Approach (decisions locked this session)

1. **Vertical-aware presets, hybrid.** First question: pick your industry from a fixed taxonomy (~12 buckets + Other). The pills for target-client and content-focus adapt per industry. Free text and custom add are always available.
2. **Voice samples required.** New step asks for 1–3 short writing samples (a post they wrote, a customer email, a quote that sounds like them). This is the highest-leverage input for the AI.
3. **Profession title is free text.** Users type their own ("Realtor", "Pastry Chef", "Personal Trainer"). The industry seeds a default, but they override.
4. **Voice synthesized by Claude at book generation.** The current `buildVoice()` lookup table goes away. The generator calls `/api/ai` with the user's samples + answers + industry context and gets back the `voice` section. Palette / font / photography defaults stay deterministic.

This session's scope: **plan + schema additions + industry taxonomy.** No `lib/onboarding-agent.ts` changes, no `src/app/onboarding/page.tsx` changes.

---

## Phased plan

| # | Phase | What changes | Risk | Session target |
|---|---|---|---|---|
| **1** | Schema additions | `OnboardingAnswers` + `AgentIdentity` gain `industry`, `profession`, `mission?`, `voiceSamples`, `antiVoice?`, `visualRefs?`. Non-breaking additions. | Low | This session (sketched below) |
| **2** | Industry taxonomy | Define `IndustryId` union + `INDUSTRIES: IndustryDef[]` data. ~12 verticals with default profession titles, client archetypes, content focus options, post template skeletons, photography defaults, content pillars, sample voice line. | Low (pure data) | This session (sketched below) |
| **3** | Generator rewrite | `generateBrandBook()` uses vertical preset as base. New helper `synthesizeVoice()` calls Claude with samples + answers + industry. `identity.title = profession`. `glance.story` derived from mission + industry + personality. `pillars[].description` partially AI-generated. Palette/font/photography stay deterministic but vertical-aware. | **Highest** — touches book quality | Next session |
| **4** | System prompt rewrite | Strip realtor framing from `ONBOARDING_SYSTEM_PROMPT`. Base prompt + vertical-specific addendum keyed by `industry`. | Medium | Next session |
| **5** | Wizard UI | New step 1: industry picker. New voice samples step (~step 3). New optional anti-voice step. Per-industry pills for target client + content focus. Replace realtor sample copy. Update chat assistant copy per industry. | Medium | Session after that |

Each phase ships independently and the product still works between them (UI keeps current behavior until Phase 5; new schema fields default to current realtor values for legacy users).

---

## Schema additions (Phase 1 sketch — NOT yet applied)

These go into `src/lib/brand-book-schema.ts` and `src/lib/industries.ts` (new file).

```ts
// src/lib/industries.ts (NEW)

export type IndustryId =
  | "real-estate"
  | "food-restaurant"
  | "fitness-wellness"
  | "beauty-personal-care"
  | "professional-services"
  | "creative-agency"
  | "retail-ecommerce"
  | "coaching-education"
  | "home-services"
  | "healthcare-practitioners"
  | "hospitality-events"
  | "other-general";

export interface ClientArchetype {
  id: string;
  label: string;
}

export interface ContentFocusOption {
  id: string;
  label: string;
  icon?: string; // emoji or icon ref — keep optional, no emoji in UI per brand
}

export interface PostTemplateSkeleton {
  name: string;
  surface: "light" | "dark";
  kicker: string;
  headlinePattern: string; // includes [PLACEHOLDERS]
  accentWord: string;
  footerLeftPattern?: string;
  footerRightPattern?: string;
  stampPattern?: string;
}

export interface IndustryDef {
  id: IndustryId;
  label: string;                       // "Real Estate"
  shortLabel: string;                  // "Real Estate"
  description: string;                 // shown under the chip in the picker
  defaultProfessionTitle: string;      // seeds the free-text profession field
  clientArchetypes: ClientArchetype[]; // ~6-8 pills for "ideal client"
  contentFocus: ContentFocusOption[];  // ~6-10 pills for "what do you post about"
  postTemplateSkeletons: PostTemplateSkeleton[]; // 2-3 starter templates
  defaultPillars: Array<{
    name: string;
    description: string;
    frequency: "daily" | "weekly" | "biweekly" | "monthly";
  }>;
  photography: {
    description: string;
    principles: { name: string; description: string }[];
  };
  voiceExampleLine: string;            // replaces "Every property tells a story" sample
  promptAddendum: string;              // appended to the onboarding system prompt
}

export const INDUSTRIES: IndustryDef[];
export const INDUSTRY_BY_ID: Record<IndustryId, IndustryDef>;
```

```ts
// src/lib/brand-book-schema.ts (additions)

import type { IndustryId } from "@/lib/industries";

export interface OnboardingAnswers {
  // ── existing ──────────────────────────────
  name: string;
  brokerage?: string;          // RENAME PLAN: keep as alias; new code uses `company`
  location: string;
  markets: string[];
  targetClient: string;
  personalityTraits: string[];
  experience?: string;
  phone?: string;
  email?: string;
  website?: string;
  social?: string;
  logo?: string;
  headshot?: string;
  brandColors?: string[];
  fontPairing?: string;
  tonePreference: "warm" | "professional" | "playful" | "authoritative";
  contentFocus: string[];

  // ── NEW (required) ────────────────────────
  industry: IndustryId;
  profession: string;           // free text — "Realtor", "Pastry Chef", etc.
  voiceSamples: string[];       // 1-3 short writing samples; min length ~40 chars each

  // ── NEW (optional but encouraged) ─────────
  mission?: string;             // 1-2 sentences in their words on the "why"
  antiVoice?: string[];         // ≤3 examples of what they DON'T want to sound like
  visualRefs?: string[];        // ≤3 URLs or @handles they admire visually
}

export interface AgentIdentity {
  name: string;
  title: string;                // KEEP — legacy. New code sets this = profession.
  brokerage?: string;           // KEEP — legacy alias for company
  company?: string;             // NEW — preferred over brokerage going forward
  location: string;
  markets: string[];
  phone?: string;
  email?: string;
  website?: string;
  social?: string;
  target: string;
  experience?: string;
  headshot?: string;

  // ── NEW ───────────────────────────────────
  industry: IndustryId;
  profession: string;
  mission?: string;
}
```

**Migration story.** All new fields are optional or have synthesizable defaults. Existing brand books pre-migration have `industry: "real-estate"`, `profession: identity.title || "Realtor"`, `company = brokerage`. We can backfill on first read.

---

## Industry taxonomy (Phase 2 — 12 verticals)

Each gets the full `IndustryDef`. Sketching 2 in full + the rest as briefs; remainder fleshed out next session.

### 1. real-estate (default for legacy users)
- **Profession default:** Realtor
- **Client archetypes:** First-time buyers · Luxury · Investors · Downsizers · Relocation · Families · New construction · Commercial
- **Content focus:** Listings · Market updates · Sold announcements · Neighborhood spotlights · Buyer/seller tips · Open houses · Client testimonials · Community events
- **Pillars:** New Listings (weekly) · Just Sold (biweekly) · Market Clarity (weekly) · Buyer/Seller Tips (weekly) · Neighborhood Life (biweekly)
- **Photography:** Editorial property + relaxed agent portrait (existing "warm" preset)
- **Voice line:** "Every home tells a story. We help you find yours."

### 2. food-restaurant
- **Profession default:** Owner / Chef
- **Client archetypes:** Date-night couples · Families · Brunch crowd · Office lunches · Foodies / regulars · Tourists · Event bookers · Delivery / takeout
- **Content focus:** New menu items · Daily specials · Behind the kitchen · Team / staff · Customer photos · Sourcing / suppliers · Events & private dining · Hours / location updates
- **Pillars:** New Menu (weekly) · Behind the Counter (weekly) · Specials (daily/weekly) · People (biweekly) · Local Sourcing (monthly)
- **Photography:** Overhead food shots, warm window light, hands in frame, lived-in kitchen texture; team portraits in apron not headshot
- **Voice line:** "Made this morning. Best eaten today."

### 3. fitness-wellness
- **Profession default:** Trainer / Coach
- **Client archetypes:** Beginners · Returning to fitness · Athletes · Postpartum · 40+ longevity · Weight loss · Strength · Pre-event
- **Content focus:** Workout demos · Form tips · Client transformations · Programming snippets · Recovery / nutrition · Mindset · Class schedules · Studio updates
- **Pillars:** Workouts (weekly) · Form Cues (weekly) · Wins (biweekly) · Mindset (weekly) · Programming Theory (monthly)
- **Photography:** High-contrast action, sweat texture, equipment close-ups, athlete dignity (no goofy stock smiles), portrait mid-rep
- **Voice line:** "Show up. The rest is just reps."

### 4. beauty-personal-care
- **Profession default:** Stylist / Owner
- **Client archetypes:** Bridal · Color clients · Editorial / shoots · Maintenance regulars · First-time clients · Special-occasion · Men's grooming · Teen / kids
- **Content focus:** Before & after · Client work · Color formulas · Behind the chair · Education / how-to · Hair care / product · Events & promos · Booking info
- **Pillars:** Transformations (weekly) · Process (weekly) · Education (biweekly) · Personality (biweekly)
- **Photography:** Salon natural light, close detail crops, motion blur in the work, mirror angles
- **Voice line:** "Hair you'll keep showing off."

### 5. professional-services (legal / financial / consulting / insurance / accounting)
- **Profession default:** Advisor / Consultant
- **Client archetypes:** Small business owners · Families / individuals · High-net-worth · Startups · Estates · Solopreneurs · Industry-specific niche · Corporate
- **Content focus:** Educational explainers · Common mistakes · Industry updates · Case studies · Q&A · Quick tips · Team / culture · Process transparency
- **Pillars:** Explainers (weekly) · Mistakes / FAQs (biweekly) · Insights (weekly) · Behind the firm (monthly)
- **Photography:** Considered office detail, hands at work, calm portrait against texture not seamless backdrop
- **Voice line:** "Plain English. Real answers."

### 6. creative-agency (designers, photographers, videographers, marketing)
- **Profession default:** Designer / Photographer
- **Client archetypes:** Small brands · Personal brands · Local businesses · Startups · Restaurants · Other agencies · Editorial · Weddings / events
- **Content focus:** Case studies · Work in progress · Final deliverables · Process / tools · Client wins · Industry takes · Reels of the work · Behind-the-scenes
- **Pillars:** Case Studies (biweekly) · WIP (weekly) · Process (weekly) · Hot Takes (monthly)
- **Photography:** Strong art direction, gallery-quality stills of own work, candid studio detail
- **Voice line:** "Less polish. More taste."

### 7. retail-ecommerce
- **Profession default:** Founder / Owner
- **Client archetypes:** Gift-givers · Collectors · Daily wearers · New customers · Repeat buyers · Locals · Wholesale · Influencer / press
- **Content focus:** New products · Restocks · Customer photos · Founder story · Materials / making · Behind the brand · Sales / launches · Lookbook
- **Pillars:** New Drops (weekly) · Customer Love (weekly) · Making Of (biweekly) · Founder POV (monthly)
- **Photography:** Lifestyle in use over flat-lay, product detail crops, hands holding, contextual environment
- **Voice line:** "Made the way we wish more things still were."

### 8. coaching-education (life / business / health coaches, tutors, course creators)
- **Profession default:** Coach
- **Client archetypes:** Career changers · Founders · Executives · New parents · Athletes · High achievers stuck · Burnout · Identity transition
- **Content focus:** Frameworks · Client wins · Common patterns / mistakes · Mindset · Q&A · Behind the coaching · Live offers · Free resources
- **Pillars:** Frameworks (weekly) · Patterns (weekly) · Wins (biweekly) · Offers (biweekly)
- **Photography:** Portrait warmth, hands on notebook detail, considered interior environment over studio
- **Voice line:** "What's actually getting in your way?"

### 9. home-services (contractors, electricians, landscapers, cleaners, painters, HVAC, plumbing)
- **Profession default:** Owner
- **Client archetypes:** Homeowners · Property managers · New construction · Renovators · Emergency calls · Repeat / maintenance · Commercial · Realtor referrals
- **Content focus:** Before & after · Project process · Tips & maintenance · Team on the job · Common problems · Estimates / pricing transparency · Reviews · Service area
- **Pillars:** Before & After (weekly) · How-it-works (weekly) · Crew on Site (biweekly) · Common Issues (biweekly)
- **Photography:** Honest work in progress, sweat & dust, finished detail, no stock-photo smiles, truck/equipment context
- **Voice line:** "Done right. Done once."

### 10. healthcare-practitioners (dentists, vets, chiro, therapists, holistic)
- **Profession default:** Practitioner
- **Client archetypes:** Families · New patients · Anxious patients · Athletes / active · Chronic conditions · Pediatric · Senior · Specific concern
- **Content focus:** Patient education · Myth busting · Team / staff · What to expect at appointment · Conditions explained · Recovery / aftercare · Office tour · Wins (with consent)
- **Pillars:** Education (weekly) · Myths (biweekly) · Team / Practice (biweekly) · Welcoming Detail (monthly)
- **Photography:** Soft natural light, hands in care detail, clean but not sterile, considered team portraits
- **Voice line:** "Care that explains itself."

### 11. hospitality-events (hotels, airbnb hosts, event planners, venues, wedding pros)
- **Profession default:** Host / Planner
- **Client archetypes:** Couples · Corporate events · Wedding parties · Vacationers · Family reunions · Local stay-cation · Solo travelers · Influencers / press
- **Content focus:** Spaces / property tour · Event recaps · Behind the planning · Vendor partners · Local guide · Booking availability · Couple / guest features · Seasonal moments
- **Pillars:** The Space (weekly) · Events (weekly) · Local Guide (biweekly) · Behind the Planning (monthly)
- **Photography:** Twilight property, detail-rich tablescapes, candid emotion at events, warm interior with lights on
- **Voice line:** "The day you'll keep telling stories about."

### 12. other-general (catch-all)
- **Profession default:** Owner
- **Client archetypes:** New customers · Repeat customers · Local · Online · B2B · B2C · Referrals · Press
- **Content focus:** What we do · Behind the scenes · Customer stories · Tips & education · Team · Products / services · Events · Updates
- **Pillars:** What We Do (weekly) · Behind the Scenes (weekly) · Customers (biweekly) · Tips (biweekly)
- **Photography:** Generic warm authentic small-business — natural light, candid, no stock energy
- **Voice line:** "Built for the way we actually work."

---

## Voice synthesis prompt (Phase 3 — design preview)

Called from `generateBrandBook()` after the wizard finishes. Uses the existing `/api/ai` route (Anthropic Claude) — which is now live in production as of today.

```ts
// src/lib/voice-synthesis.ts (NEW, to be written in Phase 3)

const VOICE_SYNTHESIS_SYSTEM = `You are a brand voice analyst. Given a small set of writing samples and a brief, extract the underlying voice and return a structured voice profile. Match the user's actual writing rhythm, vocabulary, and energy — do not impose generic marketing voice on top. Return ONLY valid JSON matching the schema.`;

function buildVoiceSynthesisPrompt(answers: OnboardingAnswers, industry: IndustryDef): string {
  return `Industry: ${industry.label}
Profession: ${answers.profession}
Mission: ${answers.mission || "(not provided)"}
Personality traits: ${answers.personalityTraits.join(", ")}
Tone preference: ${answers.tonePreference}
Target client: ${answers.targetClient}

Voice samples (real writing by this person):
${answers.voiceSamples.map((s, i) => `Sample ${i+1}:\n"""${s}"""`).join("\n\n")}

Anti-voice (what they DON'T want to sound like):
${answers.antiVoice?.join("\n") || "(not provided)"}

Return JSON:
{
  "hero": "One sentence describing how this brand sounds, specific to them.",
  "weSay": ["3-5 plausible posts that match their voice samples"],
  "weDontSay": ["3-5 lines that would feel off-brand"],
  "always": "Voice rules they always follow",
  "sometimes": "Selective moves they make",
  "never": "What they avoid",
  "italicRule": "Emphasis rule, can be simple",
  "traits": [
    { "name": "Trait name", "description": "1 sentence" },
    ...3 total
  ]
}`;
}
```

Cost estimate: ~600 input tokens + ~400 output tokens per onboarding = ~$0.005 with Sonnet, ~$0.001 with Haiku. Negligible.

Fallback: if Claude is unreachable or returns invalid JSON, fall back to the current `buildVoice()` lookup (which we'll keep, generalized lightly, as a safety net).

---

## What stays deterministic

These do **not** call Claude — keep current logic, just remove the realtor-specific hardcoding:

- `pickPalette()` — palette by tone preference. Already vertical-agnostic.
- `pickFonts()` — fonts by tone or explicit choice. Already vertical-agnostic.
- `buildPhotography()` — replace lookup with industry-default + tone modifier.
- `buildPostTemplates()` — replace lookup with industry-default templates.
- `buildPillars()` — start with industry defaults, refine description via Claude (optional, Phase 3 stretch).
- Typography `scale` sample text — replace hardcoded real estate prose with industry `voiceExampleLine` + generic sentences.

---

## Schema migration plan (existing users)

There are users today with brand books that have no `industry`, no `profession`, no `voiceSamples`. They'll fail validation against the new required fields.

**Strategy:**
1. Make `industry`, `profession`, `voiceSamples` optional in the TypeScript type — but treat absence as `industry: "real-estate"`, `profession: identity.title || "Realtor"`, `voiceSamples: []` in code.
2. Add a `_schemaVersion` field; v1 = legacy realtor-locked, v2 = generalized.
3. On any v1 brand book load, run a one-time backfill: set defaults, then save back as v2.
4. Voice samples can't be backfilled — flag the brand book with `needsVoiceRefresh: true` and prompt the user once on next dashboard load to add 1–2 samples to upgrade their voice quality.

---

## Open questions for next session

1. **Should the voice synthesis run on EVERY regenerate**, or be cached after the first generation unless samples change? (Cost is negligible; latency matters.)
2. **Anti-voice as URLs or only text?** URLs would require fetching + scraping — heavy. Text-only is simpler. Recommend text-only for v1.
3. **Visual refs — same question.** Recommend deferring to a later "brand polish" step; out of v1 onboarding scope.
4. **Industry-specific colors?** The current 4 tone palettes are reasonable across industries, but e.g. food often wants warmer reds/greens than the realtor palette. Worth a Phase 3 add or stretch.
5. **Mid-onboarding industry swap.** If user picks "real estate" then changes their mind to "food" at step 3, do we reset their pill selections? Recommend: yes, with a confirmation toast.

---

## Next-session checklist

- [ ] Apply Phase 1 schema additions to `src/lib/brand-book-schema.ts`.
- [ ] Create `src/lib/industries.ts` with the full taxonomy (12 verticals, full `IndustryDef` per).
- [ ] Audit how `brokerage` vs. `company` is referenced across the codebase before renaming.
- [ ] Sketch `src/lib/voice-synthesis.ts` skeleton (no API call yet).
- [ ] Confirm `/api/ai` is callable from server-side code paths (it's currently a route — book gen runs client-side; may need a small refactor or a dedicated `/api/voice-synthesis` route).

---

## Things explicitly out of scope this session

- No changes to `src/app/onboarding/page.tsx`.
- No changes to `src/lib/onboarding-agent.ts`.
- No new UI components.
- No edits to the demo seed (Riverside Bakery).
- No production deploy.
