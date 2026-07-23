# Creator Studio Audit — Flow, Models, and the Path to "Any Prompt"

**Date:** 2026-07-23 · **Scope:** `/dashboard/studio` end-to-end (intake → image/video → caption → publish)
**Question asked:** what is the flow today, what models run it, and what's missing for the Studio to handle *any* creator prompt (listing post, brand-site pull, carousel, influencer launch…).

---

## 1. The current flow (verified from code, not docs)

```
user types brief / pastes URL / uploads photo / picks intent chip
        │
        ▼
CLIENT ROUTER  resolveStudioImageRoute()  (studio-image-routing.ts — pure regex)
        │
        ├─ blocked_listing_no_photo   "listing" + no photo → hard stop, ask for photo
        ├─ listing_passthrough        listing + photo → edit-only, property locked
        ├─ reprompt_edit              editing the canvas image → /api/studio/reprompt
        │                             (Claude Sonnet 4.6 WITH VISION sees the image,
        │                              rewrites an edit prompt, subject-locked)
        ├─ compose_generate           vague/outcome phrasing → /api/studio/compose
        │                             (Claude Sonnet 4.6 rewrite → imagePrompt JSON)
        └─ direct_generate            concrete visual brief → straight to Gemini
        │
        ▼
/api/generate-image  →  Gemini Interactions API ("Nano Banana")
   standard = gemini-3.1-flash-image · pro = gemini-3-pro-image (plan-gated, 2K)
   + optional single reference image (upload or site og:image)
   + scene-intent enrichment, vivid suffixes, listing/reference preambles
   + darkness quality-gate → one auto-retry with exposure fix
        │
        ▼
platform previews (IG/FB/X/TikTok/LinkedIn crops, client-side cover-crop)
        │
        ▼
caption: /api/ai (Claude Sonnet 4.6 + tenant brand context + VoiceProfile;
         Gemini 2.5 Flash fallback) — prompt-text only, does NOT see the image
        │
        ▼
publish (/api/meta/publish) or schedule (status "approved" → cron)
```

Side paths:
- **Paste a URL** → `/api/studio/preview-url` (SSRF-safe) → OpenGraph title/description/og:image → og:image becomes the reference image + site context appended to the intent. This is how "pull from revitalash.com" works today.
- **Upload a photo** → `/api/studio/elevate` (Claude Sonnet 4.6 vision) → caption + hashtags + alt text from the actual photo. (Ironically the *uploaded*-photo path has vision captioning; the *generated*-image path doesn't.)
- **Video** → `/api/generate-video` → **Veo 3.1 Fast** (8s, 16:9/9:16, rides Pro entitlement, polled, saved to S3). The old Kling blocker is obsolete.
- **Prompt memory** — last 20 prompts per location in localStorage; strategic intent chips (launch/event/educate/recruit/seasonal/story).

## 2. Model inventory (who does what)

| Model | Where | Purpose |
|---|---|---|
| `gemini-3.1-flash-image` (Nano Banana 2) | generate-image | Standard-tier image gen/edit, Interactions API |
| `gemini-3-pro-image` (Nano Banana Pro) | generate-image | Pro-tier (plan-gated), defaults 2K, up to 4K |
| `veo-3.1-fast-generate-preview` | generate-video | 8-second social clips, image- or text-to-video |
| `claude-sonnet-4-6` | studio/compose | Outcome → imagePrompt rewrite (NO tenant brand context) |
| `claude-sonnet-4-6` (vision) | studio/reprompt | Sees canvas image, writes subject-locked edit prompt (WITH brand context) |
| `claude-sonnet-4-6` (vision) | studio/elevate | Uploaded photo → caption/hashtags/alt (WITH brand context + compliance guardrails) |
| `claude-sonnet-4-6` | /api/ai | Captions + chat (brand context + VoiceProfile + voice memory) |
| `gemini-2.5-flash` | /api/ai | Fallback when Claude fails |
| `claude-sonnet-4-6` | voice-engine/extract | Caption forensics → VoiceProfile |
| `claude-sonnet-4-6` | /api/ai/captions | Bulk caption generation |
| `claude-sonnet-4-6` (vision) | /api/ai/captions-from-image | **Vision captions from an image URL — exists, Studio doesn't call it** |
| `claude-sonnet-4-6` (streaming + tools) | /api/ai/calendar-assistant | **Agentic calendar assistant (creates/deletes posts via tool calls) — the agent pattern already exists in this codebase** |
| `claude-sonnet-4-6` | /api/posts/generate | Per-tenant caption engine |
| `gemini-2.5-flash` | /api/enhance-prompt | Legacy prompt enhancement |
| `gemini-3.1-flash-image` (legacy generateContent) | /api/images/generate | Older duplicate image-gen path |
| Leonardo (universal-upscaler / nobg / lcm-inpainting) | /api/leonardo/* | Upscale, background removal, inpaint post-processing |
| — orphaned — | `studio/art-director.ts` | `expandImageBrief()` has ZERO callers. Its intelligence (vertical aesthetics, geography, brand visual direction, 40–90-word expansion) is dead code |
| — dead — | `src/lib/kling.ts` (`kling-v2-master`) | Not wired to any route; superseded by Veo |
| — unused — | `claude-haiku-4-5` (model registry) | Registered in `src/lib/ai/model.ts`, never requested — every text call pays Sonnet price even for cheap classification |

Full call-site inventory (18 Claude sites, 4 Gemini, Veo, Leonardo, dead Kling): verified 2026-07-23 across `src/`. No OpenAI/Replicate/fal/Imagen anywhere.

## 3. Scorecard against the target prompts

| Prompt | Today | Verdict |
|---|---|---|
| "make me a facebook post for my new listing" | Regex catches "listing" → demands the property photo → edit-only passthrough that locks the real facade. Platform inferred from wording. | **Strong.** Best-handled case in the Studio; the real-property honesty rule is a genuine differentiator |
| "create an instagram image for our eyelash serum, pull info/images from revitalash.com" | URL → og:image + meta description only. One reference image, whatever the homepage og tag happens to be (often a logo banner, not the serum). No page reading, no product-shot selection, no multi-image | **Half-works.** Brand mood transfers; actual product fidelity is luck |
| "create a carousel for instagram for my restaurant" | Format picker exists (2–5 slides) but generates **slide 1 only** ("still one hero in v1"). No multi-slide narrative, no consistent set, no carousel publish | **Fake.** The UI promises what the engine doesn't do |
| "post for an influencer new product launch" | "Launch" intent chip + compose handles it generically. No partnership framing, no @-mention awareness, no launch-sequence thinking | **Generic.** Works, doesn't impress |

## 4. Gap list — ranked by distance from "most intelligent creator assistant"

1. **The router is regex, not intelligence.** `needsComposeRewrite()` + scene-intent is ~15 regexes with 300+ lines of tests fighting phrasing variance ("mak an ig post"). Any prompt outside the patterns silently takes the wrong lane — the exact failure mode "ready for any prompt" forbids. One cheap Claude classification call (intent, platform, format, subject, needs: photo? site? clarification?) replaces the whole matrix and generalizes.
2. **Carousel is a placeholder.** Highest-visibility broken promise. Real version: Claude plans N slides (hook → story → CTA) → N sequential Gemini generations, each fed the previous slide as reference for visual consistency → carousel publish via Meta's carousel container API.
3. **First generation is brand-blind.** `buildTenantImageBrandContext()` exists and works — but only reprompt/elevate use it. Compose and direct generation never see brand colors, vertical aesthetics, or geography. The orphaned art-director already solved this; it was just never wired in. Result: post #1 looks generic, and the user pays an edit round-trip to get their look.
4. **Single reference image.** Gemini Interactions accepts multiple reference images (up to 14 on generateContent). Unused. This is the unlock for: brand kit (logo + palette board + best past posts as standing references), site pulls that include the product page image AND the brand hero, and carousel consistency.
5. **Site pull reads 2 meta tags.** No body text, no product page discovery, no image gallery selection, no "pick the actual serum bottle" step. A fetch-and-read tool (Claude reads capped page text, picks the right images from `<img>`/gallery, extracts claims like "clinically proven — 6 weeks") turns "pull from revitalash.com" from vibes into substance.
6. **Captions can't see the generated image — and the fix already exists.** Studio's `generateCaption` posts the *prompt text* to `/api/ai`, but `/api/ai/captions-from-image` (Claude vision from an image URL) is already built and in use elsewhere (calendar composer). Studio just needs to call it.
7. **No conversational memory in the "chat".** The thread UI looks like a conversation but each message is a fresh single-shot route; the model never asks a clarifying question (e.g. "which listing? got a photo?") and can't reference "the second one" or "like last week's post but for Friday."
8. **No text-on-image path.** The prompt stack hard-bans words in images — right default for photos, wrong for the huge share of real asks that are promos/flyers/announcements ("$5 off Friday"). Nano Banana Pro is specifically strong at typography; this should be an intent-gated capability, not a blanket ban.
9. **Model versions trail.** Image: `gemini-3-pro-image` vs current `gemini-3-pro-image-preview` line is fine, but text brains run `claude-sonnet-4-6` everywhere — Sonnet 5 (`claude-sonnet-5`) is the current tier for the same latency class. Cheap upgrade across compose/reprompt/elevate/ai.
10. **Search grounding unused.** Gemini's `google_search` tool (and/or a WebSearch step in compose) would let "post about the eclipse this weekend" or "national espresso day" resolve real dates/facts instead of hallucinating.
11. **Cost/latency hygiene.** Every text call — including trivial classification — runs Sonnet; `claude-haiku-4-5` sits registered and unused. The Director's cheap routing turn is a natural Haiku job. And three redundant paths want deleting: `/api/images/generate` (legacy Gemini generateContent duplicate), `/api/enhance-prompt` (Gemini text enhancer superseded by compose), `src/lib/kling.ts` (dead — Veo replaced it).

## 5. Recommended architecture — one brain, tools, same pipeline

Keep the generation pipeline (it's good). Replace the regex front door with a single **Studio Director** call — Claude Sonnet 5 with structured output — that runs per message:

```
{ intent: create|edit|carousel|video|question,
  platform, format, slides?, aspect,
  subject, needs_property_photo?, urls: [...],
  wants_text_on_image?, missing_info?: "question to ask user",
  image_brief: <art-directed prompt, brand-aware> }
```

- **Precedent in-repo:** `/api/ai/calendar-assistant` already runs Claude with `streamText` + tool calls (creates/deletes posts). The Studio Director is the same pattern pointed at generation — this is an extension, not a new architecture.
- **Inputs:** user message + thread history + tenant brand context + VoiceProfile + vertical aesthetic + geography (everything the orphaned art director already assembles).
- **Tools it can request:** `fetch_site(url)` (deep read: capped text + candidate images), `use_brand_kit()` (standing reference images), `ask_user(question)` (one clarifying question max — then proceed with best guess).
- **Outputs feed the existing routes** — listing gate stays as a hard server-side rule (never invent property), quality gate stays, entitlements stay.
- Carousel = Director plans slides → loop generations with previous-slide reference → carousel scheduler.
- Captions switch to the elevate pattern (vision on the final image) everywhere.

Phasing that matches effort to payoff:
- **Phase A (days):** wire brand context + art-director into compose/direct; captions get vision; model bump to Sonnet 5; delete dead art-director OR promote it — one prompt-expansion layer, not two.
- **Phase B (week):** Director replaces regex router; deep site pull; clarifying questions; text-on-image intent.
- **Phase C:** real carousels (generation loop + Meta carousel publish); brand kit standing references; search grounding.

## 6. What's already excellent (don't break)

- The **honesty architecture**: listing prompts refuse to invent property photos; scheduled posts refuse Meta-native status. Keep these as non-negotiable server-side gates no matter how agentic the front-end brain gets.
- Subject-lock on reprompt (cupcake never becomes a croissant).
- The darkness quality gate + auto-retry — extend the pattern (more checks: watermark text sneaking in, wrong aspect) rather than replace it.
- SSRF-safe URL fetching (`safe-fetch.ts`) — reuse it for the deep site reader.
- Entitlement layering (pro image / video behind plan gates) — the Director must inherit these, not bypass them.
