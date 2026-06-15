# Smart Onboarding — "Brand DNA" Engine (design, 2026-06-14)

**Goal:** make onboarding analyze the user's *actual* social history — captions **and images** and **what performed** — collect maximum signal with minimum typing, and build a voice + visual model precise enough that generated posts read and look like the user made them. Then keep getting more "them" with every edit.

**Where we are today:** `/api/onboarding/analyze-history` is a real-but-dormant scaffold that pulls captions and runs a text-only Claude extraction (`zeroShotExtractionSchema`: tone / pillars / weSay / weDontSay). No image analysis. No performance weighting. No continuous learning tie-in. The behavioral-question wizard (`BrandArchitect`) + `generateBrandVoiceStructured` + a deterministic fallback are the live path.

**The reframe:** stop treating onboarding as a *form* and treat it as **corpus ingestion → a living Brand DNA profile**. The form becomes a confirmation/gap-fill step, not the source of truth.

---

## 1. Ingest every signal, not just captions

Four signal layers, richest-first. Each is additive — the system degrades gracefully when a layer is missing.

| Layer | Source | What it yields |
|-------|--------|----------------|
| **Verbal** | post captions (have scaffold) | tone, signature phrases (weSay), anti-patterns (weDontSay), pillars, emoji/hashtag/CTA habits, sentence rhythm |
| **Visual** | post images / video thumbnails *(new — their ask)* | real palette, subjects, composition, lighting/mood, text-overlay style, aesthetic consistency |
| **Performance** | per-post engagement metrics | which voice/visual choices their *audience* actually rewards |
| **Conversational** | their replies to comments/DMs | how they talk 1:1 (often warmer/looser than captions) |

The differentiator hides in layers 3–4: most tools learn what you *posted*; this learns what *worked* and how you actually *talk*.

---

## 2. Image analysis (the explicit ask) — vision + deterministic, not vision-alone

For each of the top-N images (sampled by recency × engagement, not all 50 — cost):

1. **Deterministic color extraction** (server-side, no model): pull the actual dominant palette (k-means / median-cut) from the real pixels. This seeds the brand palette from *reality* instead of a curated guess — and never hallucinates a hex.
2. **Vision semantics** (Claude/Gemini vision over the image): structured output —
   - subjects (`product` / `people` / `place` / `food` / `text-graphic`)
   - composition (`flat-lay` / `portrait` / `candid` / `product-hero`)
   - lighting & mood (`warm natural` / `moody` / `bright clean`)
   - text-on-image style (font feel, placement, density)
   - an aesthetic-consistency score across the set
3. **Aggregate → a Visual Identity Profile**: palette, recurring subjects, shooting style, "do/don't" visual rules.

Why this matters most: it **closes the loop with the Studio**. The Visual Identity Profile becomes a constraint on `generate-image` (Gemini/Leonardo), so the AI-generated posts *look like the user's real feed* — not generic stock. That single feature ("your generated images match your aesthetic") is rare and hard to copy.

> Implementation note: extend the existing `zeroShotExtractionSchema` with a `visual` block, or add a parallel `visualIdentitySchema`. Store on `BrandVoiceProfile` / `BrandKit` (both already exist in Prisma). Use `gemini-image.ts`'s provider plumbing for the vision calls.

---

## 3. The "exact voice" model — a living profile, not a one-shot

"Exact voice" is asymptotic; design for *continuously approaching it*, with three parts:

1. **Structured Brand DNA** (the brand book) — the stable, human-editable profile. Already exists.
2. **Exemplar bank** (new, high-leverage) — store the user's *best real captions* verbatim. At generation time, retrieve the few most similar to the new post's intent/platform and inject them as in-context few-shot examples. Few real exemplars beat any amount of abstract "tone" description. The `KnowledgeBaseEntry` / `MediaAsset` tables can hold these.
3. **Continuous learning loop** — wire onboarding into the *existing* `ai-voice-learning` / `ai-voice-memory` / `caption-feedback` infra: every approve / edit / reject updates the profile and the exemplar weights. Onboarding seeds it; daily use sharpens it.

Plus a **voice-fidelity gate**: after generating, score the output against the user's style fingerprint (their characteristic sentence length, emoji rate, vocabulary, reading level — cheap to compute deterministically); regenerate if it drifts. Layer this *with* the existing compliance guardrails (which already post-validate output). Result: a measurable "sounds like you" score, not a vibe.

---

## 4. Maximum signal, minimum friction

- **History does the heavy lifting** (zero typing) → wizard opens *pre-filled*; the user **edits/confirms** rather than answers from scratch. The review step (BrandArchitect step 14) already exists for exactly this.
- **Behavioral questions fill what history can't show** — aspiration ("who do you *want* to reach?"), not just what they've done. Keep the clever proxy questions (dress code → palette, greeting → voice, best review → positioning).
- **Optional deep inputs** for power users: upload 3 favorite posts, paste testimonials, or record a 30-sec voice memo (transcribe → voice sample). Each is bonus signal, never required.
- **Show your work**: render the extracted Brand DNA back to them ("here's what we learned from your last 40 posts — fix anything"). Transparency builds trust *and* collects corrections (more training signal).

---

## 5. What makes it one-of-a-kind

1. **Reality-grounded, not template-grounded.** Built from the user's real corpus (text + image + performance), not a niche template + 5 questions. Most competitors do the latter.
2. **Performance-weighted voice.** Learns what the *audience* rewards, not just what the user posted.
3. **Unified verbal + visual DNA, closed-loop with generation.** Captions *and* images match the real feed because the same profile constrains both.
4. **Gets more "them" over time.** The feedback loop already exists — onboarding just seeds it. Day 90 is dramatically more accurate than day 1, and competitors starting from a form never catch up.
5. **A measurable fidelity guarantee.** A "sounds/looks like you" score gating output, stacked on the compliance guardrails. Defensible, demonstrable, marketable.
6. **The Brand DNA is a user-owned artifact.** Visible, editable, exportable — trust + lock-in.

---

## 6. The honest blockers (critical path — read before building)

- **Platform API access is THE gatekeeper.** This is why the scaffold is dormant. Reading a user's historical posts/media requires:
  - **Instagram/Facebook:** Graph API with a Business/Creator account + permissions (`instagram_basic`, `pages_read_engagement`, etc.) that require **Meta App Review** (weeks, with a demo + privacy policy). Personal IG accounts can't be read at all.
  - **LinkedIn:** historical post read is heavily gated (partner-program territory).
  - **TikTok:** similar review gating.
  - **Mitigation / parallel path:** support **content upload / paste** and authorized data-export import so the engine delivers value *before* API approval, and so personal-account users aren't excluded. Build the engine against an upload path first; wire live APIs as approvals land.
- **Cost.** Vision over N images + structured text per onboarding is real spend. Sample top-N by engagement, batch, cache results on `BrandVoiceProfile`, and reuse the P2/P5 caps. Budget per-onboarding explicitly.
- **Privacy & consent.** Analyzing and storing a user's content + exemplars needs explicit consent (the consent step exists), a retention policy, and a delete path (account-delete already exists — extend it to the DNA/exemplars).
- **Quality discipline.** Use deterministic extraction where possible (palette, fingerprint metrics); reserve the model for semantics. Always keep the deterministic fallback so onboarding never hard-fails.
- **"Exact" is a promise to calibrate.** Market it as "learns and sharpens," not "perfect on day one" — the continuous loop is the truth and the moat.

---

## 7. Build order (grounded in what exists)

1. **Unblock ingestion (parallel):** (a) start Meta App Review now (long lead time); (b) build an **upload/paste** ingestion path so the engine works today. *L + process.*
2. **Finish the dormant text path:** make `analyze-history` actually run end-to-end against the upload path; surface the pre-filled review. *M.*
3. **Add the visual layer:** deterministic palette extraction + a `visualIdentitySchema` vision pass; store the Visual Identity Profile. *L.*
4. **Close the Studio loop:** feed the Visual Identity Profile into `generate-image` so output matches the real aesthetic. *M.*
5. **Exemplar bank + retrieval** at generation time. *M.*
6. **Wire the feedback loop** (`ai-voice-learning`/`memory`) so edits sharpen the profile. *M.*
7. **Voice-fidelity score** gate, stacked on compliance guardrails. *M.*
8. **Performance weighting** once analytics ingestion (`AnalyticsSnapshot`) is populated. *L.*

**Critical path = step 1.** Everything smart depends on getting the user's real content in. Start the API-access process immediately and ship the upload path so you're not blocked waiting on Meta.

---

## Decisions needed from product

1. **API-access appetite:** commit to Meta/LinkedIn App Review (weeks of process), or lead with upload/import? (Recommend: both — upload now, APIs in parallel.)
2. **Per-onboarding AI budget:** sets how many posts/images we analyze (sampling depth).
3. **Voice-fidelity strictness:** soft "score shown" vs hard "regenerate below threshold."
