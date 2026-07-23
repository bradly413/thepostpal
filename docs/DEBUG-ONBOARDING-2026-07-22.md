# Debug Report — Voice Architect onboarding + AI quality — 2026-07-22

Full live walk on prod (guest → all steps → build → dashboard) with network/console capture,
plus a code trace of the entire AI pipeline. Test persona: "Dusty Jacket Books", independent
bookstore with a coffee bar, St. Louis — chosen to probe the known realtor-flavor drift.

## Reproduction (what the flow actually does)

- **Steps walked:** name → what-kind → where (has "Use my current location") → personality
  picker → never-sound-like (optional, skippable) → connect socials (optional) →
  "Building your voice" → dashboard. Progress bar, Back links, and draft honesty notes all work.
- **The build**: `POST /api/brand-book/generate` succeeded; authenticated completion landed
  `/dashboard` as spec'd. Honest status copy throughout.

## Findings (bugs & behavior)

1. **Enter doesn't advance steps.** Typing + Return does nothing; only the arrow button
   advances. In a type-one-answer wizard, Enter-to-continue is the universal expectation —
   every keyboard user hits it first and thinks the form is broken.
   *Fix:* submit-on-Enter in `FloatingField`/step form.

2. **Re-running onboarding silently overwrites an existing workspace brand book.** With an
   authenticated session, completing the wizard fired `PUT /api/brand-book` with the new voice —
   no "you already have a brand voice; replace it?" gate. A curious tester who revisits
   `/onboarding` nukes their setup. (This happened live: the demo-org brand book now contains
   the Dusty Jacket Books test voice — see Cleanup.)
   *Fix:* if a brand book exists, confirm before persisting (or write to a draft slot).

3. **"Which sounds more like you?" captions are string templates presented as "Real captions."**
   Zero network calls fire; `voice-sample-preview.ts` `captionFor()` slot-fills
   `${business} … ${niche} … ${place}` — producing mechanical copy like "your neighborhood
   independent bookstore with a coffee bar. Stop by anytime." and "in St. Louis, Missouri"
   (a human writes "St. Louis"). This is the user's *first impression of the product's
   intelligence*, and it reads as mail-merge. Niche ranking is regex (`NICHE_RANK`) — decent,
   but "bookstore" only matches via the generic `store` / `coffee` patterns.

4. **Two cards say "BEST FIT" simultaneously** (`recommendCount = 2` in
   `buildPersonalizedCaptions`). "Best" twice reads like a bug even though it's intentional.
   *Fix:* one "Best fit" + one "Also great", or a single badge.

5. **Connect step offers LinkedIn and TikTok as authorizable** ("Authorize LinkedIn for company
   or personal") when only Meta is shipped — clicking produces "Couldn't finish connecting"
   (graceful, but a designed dead end). Settings already has the honest pattern ("· Soon").
   Only YouTube is labeled "Coming soon" here.
   *Fix:* Soon-badge LinkedIn/TikTok on this step to match Settings.

6. **Known from beta audit, still open:** input reveal is GSAP-gated with no failsafe
   (background-tab = unanswerable question) and the page has no `h1`.

## Root cause — why the AI voice comes out generic/samey

The model call is real (`generateObject`, `claude-sonnet-4-6`, Zod schema, good structure,
anti-realtor guardrail) — but **Voice Architect feeds it almost no real signal**.
`buildVoiceOnboardingAnswers` (`voice-profile.ts:173`) sends:

| Field the model receives | What it actually is |
|---|---|
| `industry` / `industries` | **Hardcoded `"other-general"` for everyone** — the user's real niche string never selects an industry seed, so the industry-context/seed blocks in the prompt are always the generic ones |
| `targetClient` | Hardcoded: "Local customers who want a business that sounds human" |
| `contentFocus` | Hardcoded: `["offers", "updates", "behind-the-scenes"]` |
| `voiceSamples` | The **personality preset's canned lines** (e.g. "Plot twist: your week just got better.") — presented to the model as if they were the user's writing |
| `dressCode`/`greeting`/`compliment` | Synthesized from preset indices — fake behavioral answers |
| `mission` | Template: "Business — profession in location." |
| Real user signal | **Only**: business name, the free-text niche, city, one tone word, and the never-sound-like list |

Result: every "AI-generated" voice is a light remix of a canned persona. The realtor drift
persists because the strongest differentiator (industry seed selection) is bypassed by the
`other-general` hardcode — the guardrail line fights the symptom.

The one genuinely rich path — `analyze-history` (up to 50 real captions + hashtags + cadence +
media mix → zero-shot voice) — only fires when the user connects Meta *during onboarding*,
which beta testers mostly can't (Dev-mode OAuth) or won't.

## How to make the AI smarter (ordered by impact/effort)

1. **Infer the industry instead of hardcoding `other-general`.** Cheapest big win: map the
   free-text niche onto the existing industry catalog (the regexes in `NICHE_RANK` prove the
   pattern; better, add one tiny classify call or keyword table over `getIndustry` ids). This
   unlocks the industry seeds/prompt addenda that already exist in the codebase — instantly
   different voices per vertical, and `saveBrandEngine` (`VoiceArchitect.tsx:388`) stops writing
   `other-general` too.

2. **Make the personality picker live-generated — it's already positioned as the proof moment.**
   One rate-limited endpoint (same pattern as `/api/tools/what-to-post`, small model) that takes
   {name, niche, city} and returns 4–6 personality-tagged captions; fall back to the current
   templates on timeout so the step never blocks. The captions become genuinely specific
   ("Used-book smell and a decent flat white — Dusty Jacket opens at 9."), which sells the
   product *inside* onboarding. Fix "St. Louis, Missouri" → city-only formatting in the
   fallback templates regardless.

3. **Ask one high-signal question instead of synthesizing three fake ones.** Replace the
   preset-derived dressCode/greeting/compliment with a single real prompt: "Type a sentence
   you'd actually post" (or "paste your last caption"). One authentic line of the owner's
   writing is worth more than every canned field combined — feed it as the true `voiceSamples`.

4. **Stop sending preset lines as `voiceSamples`.** If (3) is empty, send "(none)" — the model
   currently anchors on stock phrases and echoes them back to everyone.

5. **Personalize `targetClient` and `contentFocus`.** Derive from niche (bookstore → "readers,
   regulars, gift shoppers"; contentFocus → "new arrivals, events, staff picks") via the same
   industry mapping as (1), or one extra field in the structured generation.

6. **Let the model see the never-sound-like list as hard bans** — it already flows in as
   `antiVoice` (good); also thread it into Studio caption generation (`ai-brand-context`) so the
   promise "we learn what you never say" holds after onboarding.

7. **Post-signup, run `analyze-history` on first Meta connect** (Settings flow), not only
   during onboarding — then offer "Update your voice from your real posts?" That gives every
   user the rich zero-shot path eventually.

8. **Model pin:** `claude-sonnet-4-6` appears in 3 call sites — consider the current alias
   (`claude-sonnet-5`) in one shared constant.

## Cleanup required (from this debug session)

- **demo-org's brand book now contains the test voice** ("Dusty Jacket Books"), overwritten via
  finding #2 during the authenticated walk. Restore options: re-run onboarding with Angie/TRC
  answers, restore from the `angie-nichols.ts` seed, or edit at `/dashboard/brand`. Not
  tester-visible (demo-org is internal), but the demo workspace's captions will lean bookstore
  until fixed.

## Prevention

- E2E test: wizard walk with Enter-only keyboard input.
- Unit test: `buildVoiceOnboardingAnswers` maps a known niche → non-generic industry id.
- Guard: `PUT /api/brand-book` refuses silent overwrite when a book exists unless
  `?replace=true` (or the UI confirms).
- Prompt regression: snapshot the generate prompt for 3 personas (bookstore / med spa /
  realtor) and diff on changes — the three should be visibly different documents.
