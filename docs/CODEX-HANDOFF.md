# Codex handoff — Posterboy Social

> **Studio / GPT Image 2 (2026-07-23):** see **[HANDOFF-STUDIO-GPT-IMAGE-2026-07-23.md](./HANDOFF-STUDIO-GPT-IMAGE-2026-07-23.md)** for the shipped RevitaLash timeout work, current provider budgets, and verification evidence. The rest of this file is an older session (May 2026) and is largely stale.

**Generated:** end of Claude session 2026-05-23
**For:** OpenAI Codex (or any agent picking up this work cold)
**Repo:** `~/Desktop/ventures/thepostpal/` (NOT `~/Code/thepostpal-readable-v2/` — that path is stale across CLAUDE.md and old docs)

Read this top-to-bottom before touching code. It supersedes `CLAUDE.md` and `AGENTS.md` where they conflict.

**Commercial source of truth (June 2026):** [BUSINESS-PLAN-ALIGNMENT-2026-06.md](./BUSINESS-PLAN-ALIGNMENT-2026-06.md) — Solo ($99) and Command ($249 + $39/location); pricing UI in `src/lib/pricing.ts`.

---

## 1. What this is

**Posterboy Social** — an AI-driven social-content SaaS for small business owners. Generates brand books from a structured onboarding wizard, then drafts on-brand posts the user can approve and schedule. Built originally for one realtor (Angie Nichols, Coldwell Banker, West County St. Louis) and now generalizing to any small business: real estate, restaurants, fitness, beauty, professional services, creative agencies, retail, coaching, home services, healthcare, hospitality, other.

- **Live:** [posterboysocial.com](https://www.posterboysocial.com) (also aliased thepostpal.com)
- **GitHub:** `bradly413/thepostpal`, branch `main` (direct pushes, no PRs)
- **Vercel project:** `angie-social-portal` (not `thepostpal-readable-v2` — that's an orphan; same repo, no production domain)
- **Owner:** Brad Nichols (`brn4040@gmail.com`)
- **Beta target:** ~2 days out from session start; still has open blockers (see §10)

## 2. Stack

- **Next.js 16.2.6** (App Router, Turbopack), React 19, TypeScript, Tailwind v4, GSAP 3.15 + ScrollTrigger + `@gsap/react`
- **Auth:** JWT via `jose`; auth file is `src/proxy.ts` (was `src/middleware.ts` — Next 16 deprecation; the `middleware` convention now returns a build warning, hence the rename)
- **State:** localStorage primarily. Prisma schema exists in `prisma/schema.prisma` with migrations, but is **not yet wired** to dashboard UI. The dashboard UI uses `src/lib/*-store.ts` modules backed by `localStorage`.
- **AI:** `@anthropic-ai/sdk` ^0.96 (Anthropic Claude), Google Gemini via raw HTTP, Leonardo.ai via raw HTTP
- **Marketing scroll:** Lenis + `connectLenisScrollTrigger` (in `src/lib/marketing-scroll-engine.ts`). **Do not use GSAP `pin: true`** with Lenis — caused pin-spacer glitches. Use sticky + scrub instead (see `DashboardZoomSection.tsx`, `CarouselSection.tsx`).

## 3. Local dev

```bash
cd ~/Desktop/ventures/thepostpal
npm run dev   # http://127.0.0.1:8240 (webpack mode is more stable than Turbopack on this Next 16 version)
```

- Demo login: `/sign-in` with `demo` / `demo123` (creds in `.env.local`)
- `npm run build` before deploy to catch type errors
- `npm run db:studio` opens Prisma Studio (5555) if you need to peek at the unused schema

**A reliable launch convention is also in `~/.claude/launch.json` and `.claude/launch.json`** for the `preview_start` MCP. Both reference port 8240.

## 4. Deployment

- Push to `main` → Vercel auto-deploys `angie-social-portal`. Build ~45–60s.
- `npx vercel ls angie-social-portal --scope bradly413s-projects` to see recent deploys
- `npx vercel env ls production` to inspect prod env vars (CLI auth is per-machine via `npx vercel login`; the API token in `~/Library/Application Support/com.vercel.cli/auth.json` expires periodically)
- **Agent-initiated production env mutations get harness-blocked.** Adding/deleting prod env vars must be authorized by Brad explicitly — broad delegations like "do whatever you can without me" do NOT cover shared-infra changes.

## 5. Critical environment variables (status as of last audit)

| Variable | Set? | Used by |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | `/api/ai`, voice-synthesis, brand-book/generate, brand-book/refresh-voice |
| `AUTH_SECRET` | ✅ | JWT signing in `src/lib/auth.ts` + `src/proxy.ts` |
| `GEMINI_API_KEY` | ✅ | `/api/generate-image`, `/api/enhance-prompt` |
| `LEONARDO_API_KEY` | **🔴 MISSING** | `/api/leonardo/{status,edit,upload}` — Studio HD upscale + remove-bg return 500 |
| `PORTAL_USERNAME` / `PORTAL_PASSWORD` | ✅ | demo login (`demo`/`demo123`) |
| `META_APP_SECRET`, `META_APP_ID`, `META_PAGE_ACCESS_TOKEN`, `META_REDIRECT_URI` | ✅ | Meta OAuth |
| `VIMEO_ACCESS_TOKEN` | ✅ | video library |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | ✅ | Vercel KV (Upstash backend) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | **❌ MISSING** | `src/lib/auth-store.ts` reads these — falls back to `/tmp` file storage when absent. Real signups work but credentials live in ephemeral storage on a single Vercel instance. |
| `STRIPE_SECRET_KEY` | ⚪ N/A | `src/lib/location-billing.ts` short-circuits when missing |

**Two known fixes pending Brad's explicit OK:**

1. Add Upstash aliases on Vercel mirroring the KV values (1 min via UI), OR refactor `src/lib/auth-store.ts` to read either name (`process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL`).
2. Set `LEONARDO_API_KEY` (Brad provides the key; one `vercel env add` + redeploy).

Also: there's an **orphan** `ANTHROPIC_API_KEY` set on the `thepostpal-readable-v2` Vercel project that should be deleted (no production domain attached to that project).

See `docs/env-audit.md` for full details.

## 6. Architecture you must understand

### 6a. The brand book — schema + generation

`src/lib/brand-book-schema.ts` defines `BrandBook` (identity / glance / mark / palette / typography / voice / applications / photography / pillars / colophon) and `OnboardingAnswers` (the wizard's collected data).

**Recent schema additions (non-breaking):**
- `AgentIdentity` gains: `industry?: IndustryId`, `profession?: string`, `mission?: string`, `company?: string` (alias for legacy `brokerage`)
- `OnboardingAnswers` gains: `industry?: string`, `profession?: string`, `mission?: string`, `voiceSamples?: string[]`, `antiVoice?: string[]`, `visualRefs?: string[]`

### 6b. The industry taxonomy

`src/lib/industries.ts` is **the new center of gravity** for vertical-aware behavior. Defines:

- `IndustryId` type union (12 verticals + `"other-general"`)
- `IndustryDef` interface (full vertical metadata)
- `INDUSTRIES: IndustryDef[]`
- `INDUSTRY_BY_ID: Record<IndustryId, IndustryDef>`
- `getIndustry(id)` helper, `DEFAULT_INDUSTRY = OTHER_GENERAL`

Each `IndustryDef` carries: `id`, `label`, `shortLabel`, `description`, `defaultProfessionTitle`, `clientArchetypes[]` (target-client pill set), `contentFocus[]` (content-focus pill set), `postTemplateSkeletons[]` (3 starter templates with `[PLACEHOLDERS]`), `defaultPillars[]` (content pillars), `photography` (`{description, principles[]}`), `voiceExampleLine` (typography sample text), `promptAddendum` (1–2 sentence vertical-grounding for the in-wizard chat).

**Anywhere you'd hardcode realtor-specific behavior, use the IndustryDef instead.** The 12 verticals are real-estate, food-restaurant, fitness-wellness, beauty-personal-care, professional-services, creative-agency, retail-ecommerce, coaching-education, home-services, healthcare-practitioners, hospitality-events, other-general.

### 6c. The brand-book generator

`src/lib/onboarding-agent.ts::generateBrandBook(userId, answers, options?)` is the deterministic-with-AI-overlay brand book builder. Signature:

```ts
export interface GenerateBrandBookOptions {
  voice?: BrandVoice; // pre-synthesized voice from voice-synthesis.ts
}
export function generateBrandBook(
  userId: string,
  answers: OnboardingAnswers,
  options: GenerateBrandBookOptions = {},
): BrandBook
```

Behavior:
1. `resolveIndustry(answers)` — narrows `answers.industry` to an `IndustryDef` if it matches a known `IndustryId`; otherwise returns `null` and the legacy realtor-derived helpers (`buildPostTemplates`, `buildPillars`, `buildPhotography`) take over.
2. `resolveTitle(answers, industry)` — sources `identity.title` from `answers.profession ?? industry.defaultProfessionTitle ?? "Owner"`. **No more hardcoded `"Realtor"`.**
3. Voice: uses `options.voice` if provided; else falls back to the legacy 4-archetype lookup table in `buildVoice(answers)`.
4. Industry-aware sections (`postTemplates`, `pillars`, `photography`) seed from `IndustryDef` when industry is typed; legacy helpers otherwise.
5. Typography scale samples use `IndustryDef.voiceExampleLine` for the display sample.

Also: `buildOnboardingSystemPrompt(industry?)` composes the in-wizard chat system prompt — base prompt + per-vertical `promptAddendum`. The base export `ONBOARDING_SYSTEM_PROMPT` was rewritten to be vertical-agnostic (Phase 4); it talks about "small business owners" instead of realtors.

### 6d. Voice synthesis (Claude)

`src/lib/voice-synthesis.ts` is **server-side only**. Calls Claude (`claude-sonnet-4-6`, ~12–17s typical) with a structured-output system prompt that requires JSON. Manual JSON Schema isn't used because SDK 0.96's `output_config.format` was rejected — we use JSON-in-prompt + `JSON.parse` + a manual type guard.

Exports:
- `SynthesizedVoice` interface (mirrors `BrandVoice` minus `taglines`)
- `synthesizeVoice(input: VoiceSynthesisInput): Promise<SynthesizedVoice>` — throws on any failure
- `toBrandVoice(synth)` — adapter to full `BrandVoice` shape (sets `taglines: []`)

Callers should `try/catch` and fall back to deterministic `buildVoice()`.

### 6e. The API surface (new routes)

- **`POST /api/brand-book/generate`** — orchestrator. Body: `{ userId, answers: OnboardingAnswers }`. If `voiceSamples.length > 0 || mission`, attempts Claude synth; on any failure, silently falls back to deterministic generation. Returns `{ brandBook, voice: "synthesized" | "fallback" }`. Rate-limited 6/min/IP.

- **`POST /api/brand-book/refresh-voice`** — lightweight refresh. Body: voice-relevant subset of `OnboardingAnswers` + new `voiceSamples`. Runs Claude synthesis, returns ONLY `{ voice: BrandVoice, source: "synthesized", sampleCount }` so the client patches `brandBook.voice` without regenerating palette/typography/templates/pillars. **No silent fallback** — refresh is explicit; failures return 502 with the error message.

- **`POST /api/meta/voice-samples`** — Graph API proxy. Body: `{ source: "instagram" | "facebook", accountId, pageToken, limit? }`. Calls `getInstagramMedia` or `getFacebookPagePosts` from `src/lib/meta.ts`. Returns `{ source, count, samples: string[], posts: RecentPost[] }`. Page tokens stay in client `localStorage` via `meta-store`; this route just passes them through one server hop. Rate-limited 10/min/IP. Limit capped at 50.

### 6f. The wizard (8 steps)

`src/app/onboarding/page.tsx` — currently ~1500 lines, biggest file in the codebase. `TOTAL_STEPS = 8`. `VOICE_SAMPLE_MIN_CHARS = 40`.

| Step | What it collects |
|---|---|
| 0 | Name (required), Business, IndustryPicker (12 verticals + "Other → free text"), Mission (optional textarea), Location |
| 1 | Target client pills — sourced from `IndustryDef.clientArchetypes` when industry is a known IndustryId; otherwise generic `TARGET_OPTIONS` |
| 2 | Content focus pills — same pattern with `IndustryDef.contentFocus` |
| 3 | Platforms |
| 4 | Primary color |
| 5 | Font pairing |
| 6 | Personality traits (Aaker dimensions, 3–5 recommended) |
| 7 | **Voice samples** — 3 textareas (1 required at ≥40 chars), live char counter, "ready" check, anti-voice textarea (optional, one per line) |

`canContinue` switch in `OnboardingPage` gates each step. Industry change wipes step 1+2 pill selections to avoid stale-ID leak.

On approve:
1. `localStorage.setItem("postpal-brand-book", JSON.stringify(brandBook))`
2. `localStorage.setItem("postpal-onboarding-answers", JSON.stringify(answers))` — **NEW**, required for the future "Refresh voice from Instagram" flow
3. `syncBrandBookToOrganization(brandBook)` (from `src/lib/onboarding-brand-sync.ts`)
4. `router.push("/dashboard")`

`handleBuildComplete` POSTs to `/api/brand-book/generate` and falls back to local `generateBrandBook` if the call fails (offline demo / no API key).

### 6g. Meta integration

`src/lib/meta.ts` had OAuth + page + IG account + publish helpers. **New today:**

- `RecentPost` interface `{ text, createdAt }`
- `getInstagramMedia(igAccountId, pageToken, limit=25): Promise<RecentPost[]>` — filtered to non-empty captions
- `getFacebookPagePosts(pageId, pageToken, limit=25): Promise<RecentPost[]>` — same

OAuth scopes already include `instagram_basic`, `pages_read_engagement` — sufficient for the new reads.

**Important UX note about Meta:** Personal IG accounts have no Graph API access. This feature only works for users with IG Business / Creator accounts connected to a Facebook page. Surface that limitation in any future UI.

### 6h. Marketing site

`/` is the marketing homepage rendered by `src/components/marketing/MarketingSite.tsx`. Sections in order:

1. `Navigation` (scroll-direction-aware hide/reveal — hides on scroll-down past 280px, reveals on scroll-up)
2. `Hero` (`sections/Hero.tsx`) — "Post like you ✈ like it." with paper-plane brand mark
3. `DashboardZoomSection` (`sections/DashboardZoomSection.tsx`) — **Direction C "Living Workspace"** since `efa2528`. Editorial two-column: copy left (kicker, headline, lede, 3-stat ribbon), modest-scale dashboard mockup + 3 floating annotation cards right. **No more giant iPad-zoom**. Don't use GSAP `pin: true` here; uses staggered entrance animation on enter.
4. `SchedulingCalendar` (ASCII reveal)
5. `BuiltForStrip` — links to `/for/[slug]` vertical landing pages (14 of them: realtors, restaurants, salons, +11 more)
6. `CarouselSection` (`sections/CarouselSection.tsx`) — sticky-pinned horizontal scroll with glass cards. **Currently uses SVG placeholders** from `src/lib/marketing-images.ts → CAROUSEL_IMAGES`. Real photos pending.
7. `ScrollWordReveal` (Manifesto)
8. `Solution` (horizontal flow)
9. `WordScroll`
10. `HolographicFeature`
11. `FounderCard`
12. `Pricing`
13. `Footer`
14. `ChatbotWidget` — **mock only** per the brief; not wired to AI

Pricing copy lives in `src/lib/pricing.ts` (`getPublicTiers()`); homepage Pricing and `/pricing` route share it.

## 7. Today's session summary (chronological commits)

| SHA | Title | Notes |
|---|---|---|
| `ba1e928` | (pre-session) vercel-safe tmp fallback for auth store | The previous deploy state |
| `49b2300` | feat: prep beta — marketing site, dashboard, onboarding wizard | Mass commit of 229 files (114 file changes) — first time the local work hit production |
| `e7fa8fd` | feat(marketing): hero polish — drop iPad frame, add entrance anim, scroll-aware nav | First hero refactor pass |
| `8ad50d4` | fix(api): enhance-prompt — use gemini-2.5-flash (was 404 on retired 2.0-flash) | P1 from morning smoke test |
| `efa2528` | feat(marketing): hero direction — living workspace, not iPad zoom | Direction C; what's live now |
| `64a58cc` | feat(onboarding): minimal de-realtor-ization for beta | Day-2 surgical fix: generic placeholders, industry free-text field, generic chat copy, neutral typography sample |
| `2815b58` | chore(proxy): migrate middleware.ts → proxy.ts (Next.js 16 deprecation) | Removed the build warning |
| `3f87eb6` | feat(onboarding): Phase 1+2 — schema additions + 12-vertical industry taxonomy | Foundation; non-breaking |
| `f4674e1` | feat(onboarding): Phase 3 — generator rewrite + Claude voice synthesis | Engine no longer realtor-locked |
| `94fe7e8` | fix(voice-synthesis): drop output_config (SDK 0.96 didn't accept it) | Smoke test caught silent fallback |
| `aeaf71c` | feat(onboarding): Phase 5 — wizard UI for industry picker + voice samples | Front-end caught up to the engine |
| `687966b` | feat(onboarding): Phase 4 — strip realtor framing from system prompt | In-wizard chat now industry-agnostic + per-vertical addendum helper |
| `368c6b0` | feat(meta): post-history → voice-samples pipeline (backend) | Routes ready; UI surface deferred |

## 8. Verified-live signals from production smoke tests

1. **End-to-end voice synthesis verified working on prod.** A bakery test payload (`industry: food-restaurant`, voice samples in user's actual rhythm, anti-voice `"artisanal small-batch crafted with love"`) returns:
   - `voice: "synthesized"` (not fallback)
   - 17.7s Claude call time (real, not silent failure)
   - Synthesized hero in the user's voice: *"A bakery that talks like the person who actually made your bread — short, honest, a little poetic when the moment earns it."*
   - `weSay` lines pulled from the user's sample rhythm
   - `weDontSay` correctly mirrors and expands the anti-voice input
2. **Industry-aware identity** — `title: "Owner / Chef"` (food-restaurant default), `industry: "food-restaurant"`, `mission` echoed through.
3. **All API routes return expected statuses** (see `docs/api-smoke-results.md`). 3 known P1s are all the same root cause: `LEONARDO_API_KEY` missing.

## 9. Docs in the repo to read

- `docs/onboarding-generalization-plan.md` — the full 5-phase plan
- `docs/env-audit.md` — env var status with action items
- `docs/api-smoke-results.md` — every API route, status, and notes
- `docs/prisma-wireup-estimate.md` — sized estimate to swap localStorage for Prisma
- `docs/BETA-TESTER-INSTRUCTIONS.md` — what beta testers should expect
- `docs/CLAUDE-UPDATE-2026-05-22.md` — handoff from the prior session
- `docs/CLAUDE-SESSION-HANDOFF.md` — even earlier handoff
- `docs/CLAUDE-SESSION-HANDOFF-LIVE.md` — generated by `scripts/generate-claude-catchup.sh` (gitignored; regenerated each run)

## 10. Open issues / pending work

### Beta-blocking (need attention)

- 🔴 **Mobile overflow on `/` and `/sign-in`** — hero headline and form inputs bleed past the 390px viewport. Caught in headless Chrome QA but never fixed. Pre-existing from earlier marketing work this session, not from any onboarding phase. CSS fix in MarketingSite hero + sign-in page form container. Estimated ~1 hr if you can iterate visually.

- 🔴 **`LEONARDO_API_KEY` not set on prod** — Studio HD upscale + remove-bg routes 500. Brad provides key; one `vercel env add LEONARDO_API_KEY production` + redeploy.

- 🟡 **Upstash env aliases** — auth signups currently use `/tmp` fallback. Two options: (a) add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` on Vercel mirroring `KV_REST_API_URL`/`_TOKEN` values; or (b) refactor `src/lib/auth-store.ts` to read either name. Option (a) is faster (~1 min). Brad needs to authorize the production env mutation explicitly.

### In-flight when Claude session ended

- **Marketing CarouselSection real images.** Brad pointed at the carousel via `<launch-selected-element>` and said "add images to the carousel". The 10 carousel cards currently use ~1.5KB SVG placeholders. `src/lib/marketing-images.ts → CAROUSEL_IMAGES` array references them by basename. Options:
  - AI-generate via the existing Gemini route (`/api/generate-image`) — most on-brand
  - Pull from Unsplash API — fast and free
  - Use real photos Brad uploads — best quality
  - **Recommendation:** generate the 10 cards via Gemini with brand-aligned prompts (editorial, calm, anti-creator-hustle, warm cream/ink palette per the design system), save as JPGs in `public/images/` with same basenames, update extensions in `marketing-images.ts`. Each card represents the "social-as-a-second-job" pain — the imagery should suggest overwhelm, calendar mess, phone clutter, etc.

### Post-beta polish

- 🟢 `/api/upload` returns generic 500 on missing file — should be 400
- 🟢 `/api/onboarding` is misleadingly named (it's actually a chat endpoint, accepts Anthropic-shaped `messages` array; the route should probably be `/api/onboarding-chat`)
- 🟢 `/api/ai` system prompt is hardcoded to Angie Nichols brand regardless of who's logged in. Should read the user's actual `postpal-brand-book` localStorage and inject dynamically.
- 🟢 Knowledge base still serves realtor articles by default — see `src/lib/knowledge-store.ts`. Generalization belongs in a "Phase 6" pass.
- 🟢 The "Refresh voice from Instagram" UI surface — backend is wired (`368c6b0`), but no button yet. Natural homes: `/dashboard/settings` under the existing Meta Connect block, or `/dashboard/brand` next to the displayed voice. Probably ~30 min once a location is picked.
- 🟢 Update CLAUDE.md (stale — still says repo location is `~/Code/thepostpal-readable-v2/`, no mention of Phase 1–5, no mention of new API routes, no mention of `industries.ts`).
- 🟢 Prisma wire-up (drafts vertical first; see `docs/prisma-wireup-estimate.md`)

## 11. How Brad works (style + preferences)

- **"Push when green"** — when `tsc --noEmit` is clean and `npm run build` exits 0, commit + push to `main`. Vercel auto-deploys. Brad smoke-tests in the wild rather than reviewing every PR.
- **No PRs** — direct commits to `main`.
- **Don't run `git commit --amend --reset-author`** based on git's standard trailing hint (he has different user.email between local and global; the hint fires every commit but rewriting pushed history is destructive). Just commit and push normally.
- **Co-authored-by** tags on commits are fine; Brad doesn't ask for them removed.
- **Delegation language is broad** — "whatever you think", "whichever you can do without me", "start love". Take it as authorization to make sensible calls and proceed, but **shared-infra changes (Vercel env, deletes, etc.) require explicit authorization** — the harness blocks them otherwise (correctly).
- **Pace** — Brad moves fast, says single words ("ready", "back", "preview", "go", "start", "update"). Don't over-confirm.
- **Doesn't love long verification ceremonies before edits** — read what you need, then go.
- **Likes concrete options when there's a decision** — present 2–4 paths with trade-offs and let him pick. Don't make him invent the option space.
- **Editorial / calm / anti-creator-hustle brand voice.** Don't use emojis in UI (he's specific about this). Lowercase OK, em-dashes welcome. Warm gold (`#D4A853`), paper cream, dark ink — that's the palette.
- **He's tracking beta launch ~2 days out from when this session started.** Bias toward shipping. Polish post-beta.

## 12. Pitfalls to avoid (learned the hard way this session)

1. **Don't trust the Vercel API token in `~/Library/Application Support/com.vercel.cli/auth.json`** — it expires. Fall back to CLI commands which re-auth via npx.
2. **Don't use `output_config.format` with `@anthropic-ai/sdk` ^0.96** — the field is rejected at request time. Use JSON-in-prompt + manual `JSON.parse` + a type guard. (This was the bug in `94fe7e8` fix.)
3. **Don't add `cache_control` to small system prompts expecting it to kick in.** Cache minimum is ~2048 tokens on Sonnet 4.6. It's harmless to add but won't fire.
4. **Don't trust git hints** like `git commit --amend --reset-author` that appear in commit output. They're informational.
5. **Don't use GSAP `pin: true` on Lenis-managed pages.** Use sticky + scrub patterns instead (see `DashboardZoomSection`, `CarouselSection`).
6. **Don't lowball `max_tokens`** — for non-streaming, use ~1500 (voice synthesis) or higher. For streaming, can go much higher.
7. **Don't assume the orphan `thepostpal-readable-v2` Vercel project is dead** — it still exists, still has an `ANTHROPIC_API_KEY` set on it, but has no production domain. Delete the env var (and the project, if you want).
8. **Don't bash with a long leading `sleep`** — the harness blocks it. Use `until <check>; do sleep 2; done` or `run_in_background: true`.
9. **Don't name a bash variable `status`** — it's read-only in zsh. Use `state`, `code`, etc.

## 13. File paths quick reference

```
src/
  app/
    api/
      ai/route.ts                              # Claude chat
      auth/route.ts                            # demo login
      brand-book/generate/route.ts             # NEW — orchestrator
      brand-book/refresh-voice/route.ts        # NEW — refresh only
      enhance-prompt/route.ts                  # Gemini prompt enhance (fixed in 8ad50d4)
      generate-image/route.ts                  # Gemini image gen
      leonardo/{edit,status,upload}/route.ts   # blocked on LEONARDO_API_KEY
      meta/{callback,insights,publish}/route.ts
      meta/voice-samples/route.ts              # NEW — Graph API proxy
      ...
    onboarding/page.tsx                        # 8-step wizard (~1500 lines)
    sign-in/                                   # has mobile overflow
    dashboard/                                 # bento grid + sub-pages
    (marketing)/page.tsx                       # marketing homepage
    for/[slug]/page.tsx                        # 14 vertical landing pages
  components/
    marketing/
      MarketingSite.tsx
      Navigation.tsx                           # scroll-direction-aware
      sections/
        Hero.tsx
        DashboardZoomSection.tsx               # Direction C
        CarouselSection.tsx                    # placeholder SVGs
        ...
  lib/
    industries.ts                              # NEW — 12-vertical taxonomy
    voice-synthesis.ts                         # NEW — Claude voice synth
    onboarding-agent.ts                        # generateBrandBook + system prompts
    brand-book-schema.ts                       # types
    meta.ts                                    # Graph API client + voice-sample fetch
    meta-store.ts                              # Meta OAuth localStorage
    auth-store.ts                              # auth persistence (Upstash or /tmp)
    marketing-images.ts                        # CAROUSEL_IMAGES (placeholders)
    onboarding-brand-sync.ts                   # syncBrandBookToOrganization
    organization-store.ts                      # Org + Location + Membership localStorage
    drafts-store.ts                            # drafts localStorage
    rate-limit.ts                              # IP-based rate limiting
    ...
  proxy.ts                                     # auth — was middleware.ts
prisma/
  schema.prisma                                # exists, not wired
docs/                                          # see §9
public/images/                                 # SVG placeholders + dashboard PNG
```

## 14. The one-paragraph version

Posterboy Social is generalizing from a one-realtor product to a multi-vertical small-business SaaS. The big shift this session: the brand-book engine no longer hardcodes "Realtor" anywhere. There's a 12-industry taxonomy in `src/lib/industries.ts`, a Claude voice-synthesis pipeline in `src/lib/voice-synthesis.ts` + `/api/brand-book/generate` that produces voice profiles grounded in user-provided writing samples, an 8-step wizard in `src/app/onboarding/page.tsx` that collects industry + mission + voice samples + anti-voice, and a Meta post-history backend (`/api/meta/voice-samples` + `/api/brand-book/refresh-voice`) ready to harvest the user's real Instagram captions and refresh voice automatically (UI not wired yet). Everything is verified working on production via end-to-end smoke test against a bakery test payload. Three known blockers for beta: mobile overflow on `/` and `/sign-in`, `LEONARDO_API_KEY` missing on prod (Studio HD broken), and Upstash env aliases needed for durable signups. Brad was mid-asking for real carousel images when this handoff was written.
