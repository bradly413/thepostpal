# Voice Engine — posts are the ground truth

Brad's directive (2026-07-22): nothing related to Angie, realtors, or "brand book."
The system uses AI to recreate or create the user's social media posts **exactly as they
want** — learned from how they actually post, not from persona presets.

## The principle

Every layer that fabricates voice (personality presets sent as "voice samples," hardcoded
`other-general` industry, canned targetClient/contentFocus, realtor-era seeds) is noise that
competes with the only real signal: **the user's actual captions and their edits.** The
machinery that honors real signal already exists and stays central:

- `ai-voice-memory.ts` — few-shot from the tenant's committed posts (anti-slop gated) ✓
- `ai-voice-learning.ts` — edit-diff learning (shorten, drop emoji/hashtags/hype) ✓
- `analyze-history` — Meta history → voice (captions + cadence + media mix) ✓

## Architecture (target state)

```
INGEST                        REPRESENT                 GENERATE
─────────                     ─────────                 ────────
Meta history (analyze)   ┐    VoiceProfile (AI-         every caption call:
Pasted captions (new)    ├──▶ extracted, structured, ──▶ 1. exemplars (their real posts)
Posts made in app        │    user-editable)             2. VoiceProfile block
Edits to AI drafts       ┘    + importedExemplars        3. edit-learning block
                              (stored in Organization    4. hard bans (never-say, guardrails)
                              .brandEngine JSON — no
                              migration needed)
```

**VoiceProfile** (Zod, extracted by AI from ≥3 real captions):
register/formality, sentence length habits, emoji policy (which/where/never), hashtag policy
(count/case/placement), capitalization quirks, punctuation habits (!, —, ...), CTA style,
signature phrases (verbatim), words/phrases they never use, topics they post about, how they
talk about price/offers. Shown to the user as one editable card ("This is how you sound").

**Generation contract:** exemplars FIRST and dominant ("write the next post by this author"),
profile as constraints, learning as pre-applied edits, never-say as hard bans. No industry
seeds, no preset phrases, no fabricated behavioral answers anywhere in the prompt.

## Phases

### Phase 1 — the engine core (this session)
1. `src/lib/voice-engine/profile.ts` — VoiceProfile schema + prompt-block renderer.
2. `src/lib/voice-engine/extract.ts` — captions[] → VoiceProfile via generateObject.
3. `POST /api/voice/extract` — auth'd + guest-tolerant, rate-limited; body {captions[]};
   returns profile. Powers onboarding paste-flow and Settings re-extraction.
4. `importedExemplars` in `Organization.brandEngine` JSON: pasted/history captions stored
   (max 12, trimmed, anti-slop gated) so **day-one tenants get few-shot grounding before
   they've ever posted through the app** — today voice-memory is empty until first publish.
5. `ai-brand-context.ts` re-centered: if a VoiceProfile exists → profile block replaces the
   brand-book prose block; voice-memory merges importedExemplars with committed posts.

### Phase 2 — onboarding rework (next)
- Step order: name → what you do/where → **"Show us how you post"** (connect Meta OR paste
  3–10 recent captions OR "I don't post yet") → AI extracts profile → single review card
  ("Sounds like you?" with inline edits) → never-sound-like → done → /dashboard.
- Personality presets become UI *starting points only* for the no-posts path — never sent to
  the model as the user's samples. Kill fake dressCode/greeting/compliment synthesis.
- The picker captions become live-generated (template fallback), from the real inputs.
- Overwrite gate: existing profile → confirm before replace (see DEBUG-ONBOARDING findings).

### Phase 3 — purge (after Phase 2 verified)
- Retire `onboarding-agent.ts` book fabrication from the main path; delete realtor industry
  seeds from `industries.ts`; remove `brokerage` fields from prompts; UI copy "Brand book" →
  "Voice"; keep the DB column (`brandVoiceJson`) as dumb storage during transition.
- Note: Vercel project id `angie-social-portal` is infra-only (invisible to users); renaming
  is a separate ops task, not code.

## Quality bar for "exactly as they want"
- A generated caption placed next to 5 of the user's real captions should be indistinguishable
  in register, length, emoji/hashtag habits, and phrasing.
- Regression harness: 3 fixture voices (terse tradesman / emoji-heavy boutique / dry bookstore)
  → snapshot prompts + eyeball generations on change.
- Every user edit keeps tightening the loop (already shipped via voice-learning).
