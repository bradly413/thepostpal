# Remediation Plan — Full Repo Audit (2026-06-12)

**Owner:** engineering · **Status:** proposed · **Scope:** code remediation only (this doc is a plan, no code changes)

> Repo note: paths below are verified against `~/Code/thepostpal-readable-v2`. Per `CLAUDE.md`, the canonical deploy repo is `~/Desktop/ventures/thepostpal`. Confirm each path mirrors canonical before landing a change there, and land fixes in the canonical repo (it auto-deploys prod from `main`).

## How to read this

Work is sequenced into phases by blast radius, not by finding severity alone:

- **P0 — Security & cost containment** (ship first; unauthenticated key exposure + spend)
- **P1 — Compliance enforcement** (needs a product decision first)
- **P2 — Funnel / lead capture** (revenue-shaped; capture email before paid generate)
- **P3 — Quality & correctness** (silent fallbacks, storm regression, marketing chrome)
- **P4 — Cleanup** (dead routes, lint, cosmetic)

Effort: **S** ≈ <½ day · **M** ≈ ½–1.5 days · **L** ≈ 2+ days. Each item lists files, risk, ordering deps, and verification.

---

## Verification corrections from the audit (read before estimating)

While grounding the findings, three claims needed adjustment — the plan items below already reflect these:

1. **Guardrails "not yet wired" is stale.** `src/lib/compliance/guardrails.ts:4-12` self-labels `PROTOTYPE (review only)` and says "NOT yet wired into the live AI routes." That comment is now **out of date**: `src/app/api/ai/captions/route.ts` and `src/app/api/studio/elevate/route.ts` both import and enforce `checkViolations` / `resolveTenantGuardrails`. So compliance is *partially* live. The real gap is `src/app/api/ai/route.ts` (the chat route) which does **not** enforce it. The stale module comment is itself a finding (fix in P1).
2. **`/api/onboarding` already has a rate limiter.** `src/app/api/onboarding/route.ts:7` calls `rateLimit(..., 30, 60_000)` per-IP. The route is still **unauthenticated, zero-caller, and a 50-message Claude proxy on the API key** (`messages.length > 50` guard at line 30) — so the P0 fix stands, but it's "delete an unused proxy," not "add the missing rate limit."
3. **`/api/issues` is referenced by the client.** `src/lib/dashboard-api.ts:218-219` builds the `/api/issues` URL, so the "dead from client" claim did **not** hold up. The P4 item is downgraded to "confirm reachability, then decide" rather than "remove."

---

## P0 — Security & cost containment

### P0.1 — Delete the unauthenticated Claude proxy `/api/onboarding`
- **What:** Remove the route and the dead chat-agent code it is the sole consumer of.
- **Concrete change:**
  - Delete `src/app/api/onboarding/route.ts` (keep the sibling `src/app/api/onboarding/analyze-history/` — it is live, called from `BrandArchitect.tsx:525`).
  - In `src/lib/onboarding-agent.ts`, delete `ONBOARDING_SYSTEM_PROMPT` (line ~112) and `buildIndustryOnboardingPrompt` (line ~178). **Do not delete the file** — `generateBrandBook` in the same module is still imported by `src/app/api/brand-book/generate/route.ts:8` and `src/app/onboarding/classic/page.tsx:7` (the latter is itself slated for deletion in P4.1 — sequence P4.1 first if you want to also drop the classic import).
- **Files:** `src/app/api/onboarding/route.ts` (delete), `src/lib/onboarding-agent.ts` (edit).
- **Effort:** S
- **Risk:** Low. Confirmed zero client callers (`grep -rn "api/onboarding\"" src` matches only `analyze-history`). Risk is only if an external/manual caller exists — acceptable to drop given it is an unauthenticated key proxy.
- **Deps/ordering:** None hard. If keeping `onboarding/classic` for now, leave `generateBrandBook` untouched (we only remove the two prompt exports).
- **Verify:** `npx tsc --noEmit` (catches dangling imports), `npx next build`, grep confirms no remaining import of `ONBOARDING_SYSTEM_PROMPT` / `buildIndustryOnboardingPrompt`.
- **Alternative if it must stay:** auth-gate with `requireAuthContext()` (`src/lib/api-auth.ts`) + the same shared rate limiter, and lower the 50-message ceiling. Default recommendation: **delete**.

### P0.2 — Harden the paid generate path against anonymous spend (shared with P2)
This is the cost half of the brand-book generate problem; the lead-capture half is P2.1. They share one route and should ship together.
- **What:** Add a hard per-IP/day cap and the shared limiter to `/api/brand-book/generate` so guest-mode `generateObject` calls cannot be run in a loop on the API key.
- **Files:** `src/app/api/brand-book/generate/route.ts`, `src/lib/brand-book-voice-ai.ts`, `src/lib/rate-limit.ts`.
- **Effort:** M
- **Risk:** Medium — Upstash is listed **Missing in prod** (`CLAUDE.md` env section), so `rateLimit` may degrade. Decide fail-open vs fail-closed for the *paid* call (recommend fail-closed → 503 when limiter unavailable, matching `/api/onboarding`'s `RateLimitUnavailableError` handling).
- **Deps:** Provision Upstash in prod, or accept an in-memory per-instance fallback (weaker on serverless). Coordinate with P2.1.
- **Verify:** unit test the cap; manual: fire N+1 requests from one IP, assert 429 after the cap; confirm 503 path when limiter env is absent.

---

## P1 — Compliance enforcement

> **PRODUCT DECISION REQUIRED before coding.** Is the compliance guardrail layer intended to be live in production? The module still says "PROTOTYPE (review only)" (`src/lib/compliance/guardrails.ts:4`), yet two routes already enforce it. Either (a) compliance is live → finish the rollout and fix the comment, or (b) it is still prototype → the captions/elevate enforcement is premature and should be flagged. The audit assumes (a). See `docs/COMPLIANCE-ENGINE-DESIGN.md` (referenced from the module header) for the original rollout plan; reconcile this plan with it.

### P1.1 — Enforce guardrails in the chat route `/api/ai`
- **What:** Mirror the captions route's pattern so the chat completion route is subject to the same `block`/`warn`/`suggest` enforcement.
- **Concrete change (model on `src/app/api/ai/captions/route.ts:6-7,146,164`):**
  1. Import `resolveTenantGuardrails` from `@/lib/compliance/resolve` and `checkViolations` from `@/lib/compliance/guardrails`.
  2. Resolve guardrails inside the existing `withTenantDb(auth, …)` scope (`/api/ai/route.ts` already calls `requireAuthContext()` at line 107, so tenant context exists).
  3. Inject `guardrailsPromptBlock` into the system prompt, and post-validate output with `checkViolations` before returning — match the captions filter/annotate behavior.
- **Files:** `src/app/api/ai/route.ts`.
- **Effort:** M
- **Risk:** Medium — chat output is free-form; over-aggressive blocking could break the assistant UX. Start with `warn`/annotate parity with captions, not hard `block`, unless product says otherwise.
- **Deps:** P1 product decision. Reuse, don't fork, the captions implementation.
- **Verify:** unit test `checkViolations` against a known banned phrase; manual: prompt the chat to emit a guarded phrase, confirm it is filtered/annotated; `tsc` + build.

### P1.2 — Fix the stale prototype comment
- **What:** Update `src/lib/compliance/guardrails.ts:4-12` to reflect actual wiring (captions, elevate, and — after P1.1 — chat), and update/close out `docs/COMPLIANCE-ENGINE-DESIGN.md` rollout status.
- **Effort:** S · **Risk:** None (doc/comment). **Deps:** land after P1.1 so the comment is accurate.

---

## P2 — Funnel / lead capture

### P2.1 — Capture email / require sign-in before the paid generate call
- **What:** Onboarding currently captures **no email or account** anywhere, yet `/api/brand-book/generate` runs Claude `generateObject` in guest mode. Gate the paid call behind email capture (minimum) or sign-in.
- **Concrete change:**
  - Add an email-capture step (or sign-in requirement) in the Brand Architect flow before the generate request: `src/components/onboarding/BrandArchitect.tsx` (and `src/app/onboarding/architect/page.tsx`).
  - Server: require the captured email/identity in `src/app/api/brand-book/generate/route.ts`; reject anonymous generate, or attach the lead to a record so spend maps to a captured contact.
- **Files:** `src/components/onboarding/BrandArchitect.tsx`, `src/app/onboarding/architect/page.tsx`, `src/app/api/brand-book/generate/route.ts`, plus a lead/email persistence target (Prisma model or existing tenant signup path).
- **Effort:** M–L (depends on whether we reuse the existing `/api/auth/signup` flow or add a lightweight lead row).
- **Risk:** Medium — funnel friction. Validate with product whether **billing/account is intentionally post-signup** (today the value is delivered before any capture). This is the second product decision.
- **Deps:** Ships with P0.2 (same route hardening). Decide email-only vs full sign-in.
- **Verify:** manual funnel walk-through (no email → blocked; email → generate succeeds and lead is persisted); confirm the cap from P0.2 still applies per-IP as defense-in-depth.

> **PRODUCT DECISION:** email-capture-only (low friction, lead list) vs require-sign-in (higher friction, real account). Recommend **email capture before generate**, with sign-in deferred to save/publish — preserves the "see value first" funnel while ending anonymous spend.

---

## P3 — Quality & correctness

### P3.1 — Loosen the over-strict brand-book Zod schema + surface the fallback
- **What:** The strict `generateObject` schema forces a deterministic fallback the UI never surfaces.
- **Concrete change:**
  - `src/lib/brand-book-schema.ts:351-353`: `collateralPrompts` is `.array(...).length(3)` — change to `.min(1).max(4)`. Widen the tight char caps on the strict schema block (lines ~328-353: e.g. the `.max(280)` / `.max(320)` / `.max(80)` caps) so realistic model output validates.
  - Surface the fallback: have the generate path set/return `voice: "fallback"` when validation fails and the deterministic `buildVoice()` is used (see `src/lib/voice-synthesis.ts:160,225` which document this fallback), and **retry the model once** before falling back.
  - UI: surface the fallback state to the user. Note: `src/components/onboarding/BrandArchitect.tsx:527` checks `data.voice` only on the **analyze-history** response — the **generate** response path is the one that needs a `voice === "fallback"` check. Add the check where the generate result is consumed, not at line 527.
- **Files:** `src/lib/brand-book-schema.ts`, `src/lib/brand-book-voice-ai.ts`, `src/lib/voice-synthesis.ts`, `src/components/onboarding/BrandArchitect.tsx`.
- **Effort:** M
- **Risk:** Low–medium — loosening validation could let lower-quality output through; the single retry + surfaced fallback flag mitigates. Verify downstream consumers don't assume exactly 3 `collateralPrompts`.
- **Deps:** None hard; do after P2 so the generate path is otherwise settled.
- **Verify:** unit test the schema with representative model output (currently-rejected payloads now pass); force a validation failure and assert `voice:"fallback"` propagates to UI; `tsc` + build.

### P3.2 — Regression test for the location-event storm suppression
- **What:** Storm suppression currently rests on the untested no-op guard at `src/lib/dashboard-browser-state.ts:16` (`if (localStorage.getItem(KEY) === locationId) return;`). Lock it with a test.
- **Concrete change:** Add a test that calls `setStoredActiveLocationId(id)` repeatedly with an unchanged id and asserts `LOCATION_EVENT` dispatches **once** (and that listeners → fetches do not multiply). There is an existing harness to extend: `src/lib/__tests__/dashboard-api-cache.test.ts` (documents the ~136 `/api/locations` + ~71 `/api/issues` storm).
- **Files:** `src/lib/__tests__/dashboard-browser-state.test.ts` (new) or extend the existing cache test.
- **Effort:** S
- **Risk:** None (test-only). Protects a known prod incident from regressing.
- **Verify:** test asserts exactly one event dispatch / zero extra fetches on repeated unchanged stores; goes red if the guard is removed.

### P3.3 — Consolidate marketing chrome to one shared header
- **What:** Three inconsistent live headers + two dead ones; doubled title suffix; ~2.3s gated hero first paint.
- **Concrete changes:**
  1. **Headers:** consolidate to one shared component. Live: `src/components/marketing/Navigation.tsx`, the inline `/pricing` header, `src/components/marketing/MarketingSubpageChrome.tsx`, `src/components/onboarding/OnboardingHeader.tsx`. Dead: delete `src/components/MarketingNav.tsx` and `src/components/MarketingFooter.tsx` (confirm zero importers first).
  2. **Title suffix:** root template is `%s | ${SITE_NAME}` (`src/app/layout.tsx:58`). Remove hand-baked `| Posterboy` suffixes so they don't double: `src/app/(marketing)/tools/what-to-post/layout.tsx:11` and `src/app/(marketing)/for/[slug]/page.tsx:24`. Standardize casing (`SITE_NAME` vs literal "Posterboy").
  3. **Logo `href="#"`:** fix `src/components/marketing/Navigation.tsx:80` to point at `/`.
  4. **Hero first paint:** de-gate the CSS `opacity:0` hero that waits on GSAP (~2.3s). Render visible by default; let GSAP enhance from a visible baseline (respecting `prefers-reduced-motion`, per the globals convention).
- **Files:** as listed; delete `src/components/MarketingNav.tsx`, `src/components/MarketingFooter.tsx`.
- **Effort:** M (header consolidation is the bulk; the other three are S each).
- **Risk:** Medium — header is on every marketing page; visual regression surface is wide. Stage header consolidation separately from the title/logo/hero quick wins so they can ship independently.
- **Deps:** None. Recommend splitting into two PRs: (a) title + logo + hero de-gate (quick, low-risk), (b) header consolidation.
- **Verify:** Browser preview each marketing route (`/`, `/pricing`, `/for/[slug]`, `/tools/what-to-post`, onboarding) — one header, correct single-suffix `<title>`, logo → `/`, hero visible on first paint. Check title tags via `preview_eval(document.title)`. `grep` confirms deleted components have no importers.

### P3.4 — Add cache invalidation on post mutations (latent)
- **What:** `/api/posts` GET is currently uncached, but the POST handler (`src/app/api/posts/route.ts:60`) has no `invalidateCachedGet`. Latent bug the moment GET is cached.
- **Concrete change:** Add `invalidateCachedGet` for the posts key in the POST (and any PATCH/DELETE) handlers now, matching the pattern used by other cached resources, so it is correct ahead of any future caching.
- **Files:** `src/app/api/posts/route.ts`, `src/app/api/posts/[id]/route.ts`.
- **Effort:** S
- **Risk:** Low. Defensive only.
- **Verify:** `tsc` + build; if a cache test exists for another resource, mirror it.

---

## P4 — Cleanup

### P4.1 — Delete orphaned onboarding routes
- **What:** `src/app/onboarding/classic/page.tsx` and `src/app/onboarding/concept/page.tsx` are orphaned but URL-reachable (App Router exposes any `page.tsx`).
- **Change:** Delete both directories. `classic` imports `generateBrandBook` — removing it cleans up one consumer (coordinate with P0.1).
- **Files:** `src/app/onboarding/classic/`, `src/app/onboarding/concept/`.
- **Effort:** S · **Risk:** Low (confirm no internal links first: `grep -rn "onboarding/classic\|onboarding/concept" src`). **Verify:** routes 404; `tsc` + build.

### P4.2 — Fix onboarding progress bar on the skip path
- **What:** Progress bar never reaches 100% on the skip path.
- **Change:** Compute progress against the **reachable** step set for the active path rather than the full step list. In `src/components/onboarding/BrandArchitect.tsx` (progress calc).
- **Effort:** S · **Risk:** Low · **Verify:** manual — walk the skip path, bar hits 100%.

### P4.3 — Resolve `/api/issues` cached path
- **What:** Audit flagged the cached `/api/issues` path as dead-from-client. **Correction:** `src/lib/dashboard-api.ts:218-219` builds the `/api/issues` URL, so it is reachable. Action: confirm whether the **cached** branch specifically is exercised; if it is genuinely unused, either wire it into the Command roll-up or remove the dead branch — **do not remove the endpoint** without confirming the dashboard-api caller is also gone.
- **Files:** `src/app/api/issues/route.ts`, `src/lib/dashboard-api.ts`.
- **Effort:** S · **Risk:** Low–medium (don't break the dashboard-api consumer). **Verify:** trace the caller; dashboard loads without errors.

### P4.4 — ESLint cleanup
- **What:** 52 errors / 58 warnings pre-existing. 36 are `react-hooks/set-state-in-effect` on the same fragile fetch-in-effect pattern.
- **Change:**
  - Add `tmp-ascii-reveal/` to the ignores block in `eslint.config.*` (the dir exists at repo root; the config already has an `ignores` override block).
  - Triage the remaining errors; the 36 set-state-in-effect warnings point at one shared anti-pattern — treat as a single follow-up refactor (extract the fetch-in-effect into a proper data hook), not 36 individual fixes. Track separately; do not block other phases on it.
- **Files:** `eslint.config.*`, plus the shared fetch hook(s) for the larger refactor.
- **Effort:** S (ignore + triage) / L (the shared-pattern refactor).
- **Risk:** Low for the ignore; medium for the refactor (touches data fetching). **Verify:** `npx eslint .` error count drops; refactor verified via existing dashboard storm tests (P3.2).

---

## Suggested sequencing & PR grouping

| PR | Contents | Gate |
|----|----------|------|
| 1 | **P0.1** delete `/api/onboarding` + dead prompts | none — ship now |
| 2 | **P0.2 + P2.1** generate-route hardening + email capture | needs P2 product decision + Upstash decision |
| 3 | **P1.1 + P1.2** chat-route guardrails + comment fix | needs P1 product decision (is compliance live?) |
| 4 | **P3.1** schema loosen + surface fallback | after PR 2 |
| 5 | **P3.2 + P3.4** storm test + posts invalidation | independent |
| 6a | **P3.3** marketing title/logo/hero quick wins | independent |
| 6b | **P3.3** header consolidation | independent, higher visual risk |
| 7 | **P4.x** cleanup (orphan routes, progress bar, issues, eslint) | P4.1 coordinates with PR 1 |

## Decisions needed before coding (blocking)
1. **Is the compliance guardrail layer live in prod?** (P1) — determines whether we finish the rollout or roll it back. Module still self-labels PROTOTYPE despite two routes enforcing it.
2. **Is billing/account intentionally post-signup?** (P2) — onboarding delivers AI value with zero contact captured. Email-capture-before-generate vs require-sign-in.
3. **Upstash in prod?** (P0.2/P2.1) — limiter is the only spend control on the paid generate call; it's listed Missing in prod. Provision, or accept a weaker per-instance fallback and choose fail-open vs fail-closed.

## Global verification gates (run on every PR)
- `npx prisma generate && npx next build` (required; stale client breaks deploy)
- `npx tsc --noEmit`
- `npx eslint .` (don't increase the error count)
- relevant unit tests (`src/lib/__tests__/`)
- browser preview for any P3.3 marketing change
- `./scripts/smoke-prod.sh` before any prod deploy (Brad authorizes prod)
