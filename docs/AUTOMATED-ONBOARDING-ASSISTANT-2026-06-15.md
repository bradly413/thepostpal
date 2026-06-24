# Automated Onboarding Assistant + Voice Calibration (design, 2026-06-15)

**Goal:** make onboarding feel like an assistant *doing the work for you* — minimal typing, the AI proposes, the user reacts (taps). Capstone: the assistant writes captions in the user's voice and the user approves/rejects each, which sharpens the voice.

**Guiding principle: react, don't type.** Every place we currently ask the user to *produce* (type a description, write their voice), flip it so the AI *proposes* and the user *judges* (tap ✓/✗, pick one of three, swipe). Judging is ~10× faster than producing and yields better data.

---

## 1. The funnel, re-sequenced to minimize typing

| Step | Today | Automated |
|------|-------|-----------|
| Voice | type samples / answer questions | **Upload posts or connect → AI extracts it** (built: Brand DNA engine) |
| Review | n/a | **Tap to confirm** the extracted tone/pillars/we-say (built: review step 14) |
| Identity | type business details | keep the *tap* behavioral questions (dress code / greeting / best review) — already low-typing |
| Voice lock-in | n/a | **Calibration loop** ← this design |

Net: the only typing left is the few fields history can't supply (name, location). Everything about *voice* becomes upload → confirm → calibrate.

---

## 2. The assistant: guided + automatic, not a free chat

The old chat agent was deleted (it was an unauthenticated proxy). The replacement isn't a chatbot — it's a **narrated, mostly-automatic flow**: a friendly assistant persona that (a) explains each step in one line, (b) does the analysis itself, (c) presents results for a tap. It *feels* like a conversation but the user almost never types. Optional: a single free-text "anything else we should know?" escape hatch, never required.

(If a true conversational assistant is wanted later, it must be the authed, rate-limited, guardrailed `/api/ai` chat route — never a raw proxy.)

---

## 3. The capstone: voice calibration loop ("does this sound like you?")

After the voice is extracted, the assistant **generates a handful of sample captions in the user's voice** and shows them as cards. The user taps **👍 sounds like me** / **👎 not me** on each. No typing.

What each tap does:
- **👍** → the caption joins the **exemplar bank** (`BrandVoiceProfile.preferredPhrases`) — real, user-blessed examples that get injected as few-shot into every future generation. A few blessed exemplars beat any abstract tone description.
- **👎** → recorded as an anti-signal (what to avoid), and we can immediately regenerate a replacement.

This is the literal "generate captions in their voice, user decides if accurate" — and because each judgment updates the stored Brand DNA + feeds the existing `voiceLearning`/voice-memory infra, the voice gets sharper every round and keeps improving in daily use.

**Measured, not vibes:** each generated sample is scored by the fidelity gate (`/api/brand-dna/fidelity`) against the user's fingerprint, so we can surface only high-fidelity samples and quantify "how close are we?".

### Loop shape
```
extract voice ─▶ generate K samples (in voice) ─▶ user taps ✓/✗
                          ▲                                │
                          └──── regenerate from ✓ exemplars ◀──┘  (until enough ✓)
```
Two or three quick rounds and the voice is locked — entirely by tapping.

---

## 4. What's already built vs. new

**Built (this session):** Brand DNA engine (voice fingerprint, palette, vision), upload ingestion, AI enrichment, persistence (`BrandVoiceProfile`/`BrandKit` + rich JSON), the fidelity gate, the onboarding upload step, the review step. Plus pre-existing: `caption-feedback` edit-learning, `voiceLearningBlock`, `ai-voice-memory`.

**New for calibration:**
1. `POST /api/brand-dna/calibrate` — generate K voice-showcase captions in the user's voice (paid, capped), each fidelity-scored.
2. `POST /api/brand-dna/calibrate/feedback` — record ✓/✗; append ✓ captions to the exemplar bank (`preferredPhrases`).
3. Calibration UI — tap cards; regenerate on demand.

---

## 5. Build plan
1. **Calibration backend** — the two endpoints above (generate-in-voice + approve/reject → exemplar bank). *Reuses Brand DNA persistence + the caption-gen approach.*
2. **Calibration UI** — tap cards, embedded in the Brand DNA surface / onboarding.
3. **Wire into the funnel** — after the review step, run calibration; feed blessed exemplars into the brand-book generate so the first real posts already sound right.
4. **(later) Conversational assistant** — only on the authed/guardrailed chat route.

**Minimal-typing scorecard:** upload (0 typing) → confirm (taps) → behavioral Qs (taps) → calibration (taps). Typing reduced to name + location.
