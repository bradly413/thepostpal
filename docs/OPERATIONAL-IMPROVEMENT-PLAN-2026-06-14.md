# Operational Improvement Plan (2026-06-14)

**Goal:** raise *operational* maturity (testing, CI, consistency, observability, commercial wiring) to match the already-strong architecture/security. Based on a full read of the codebase during the 2026-06-12 remediation + security sweep.

**Context / assumptions:** small team (effectively solo + agents), production-live on Vercel, Neon Postgres + Prisma + app-managed RLS. Sequenced so each tier makes the next safer. Effort: S ≈ <½ day · M ≈ ½–2 days · L ≈ 3+ days.

> The architecture scored ~8/10 for its stage; operations ~4–5/10. Every item below is "harden/systematize what's already designed well" — none are rewrites.

---

## Tier 0 — Make CI a real gate (do first; everything else leans on it)

Today CI doesn't block: the Vercel Preview build has been red on an env-scope misconfig and merges still proceed. Nothing automatically runs the 92 tests / tsc / lint on a PR.

- **0.1 Fix Preview env parity (S).** Add `AUTH_SECRET`, `DATABASE_URL`, `GEMINI_API_KEY` (+ any other Production-only build vars) to the Vercel **Preview** scope. *DoD:* PR preview deploys build green. *(Brad — agents can't set Vercel env.)*
- **0.2 Add a CI workflow (M).** `.github/workflows/ci.yml` running on every PR: `npx tsc --noEmit`, `npm run lint`, `npm test`, `prisma generate && next build`. *DoD:* a broken PR shows a red check.
- **0.3 Branch protection on `main` (S).** Require the CI check + the existing cloud review to pass before merge; no direct pushes to `main`. *DoD:* `main` can't receive an unverified merge.
- **0.4 Lint as an error gate, incrementally (S).** Freeze the current count as a ceiling (fail CI if it *increases*); ratchet down over time. *DoD:* new lint debt can't land.

**Why first:** the security sweep found an inconsistently-applied pattern (an uncapped paid route). CI is what stops that class of regression without relying on a human catching it.

---

## Tier 1 — Test the routes, not just the libs (the biggest gap)

92 tests today, but they're almost all pure-function unit tests of `lib/` helpers. The *routes* — where auth, tenancy, spend, and money live — are largely untested.

- **1.1 Route-handler test harness (M).** Stand up a pattern for testing App Router handlers with a mocked `requireAuthContext` + a transactional test DB (or mocked `withTenantDb`). One worked example others copy.
- **1.2 Tenancy proof tests (M, highest value).** A test that calls a `[id]` route as tenant A for tenant B's resource and asserts 403/not-found. This *proves* the RLS isolation the whole product rests on, and guards against a future regression silently opening it.
- **1.3 Spend-guard tests (S).** Assert every paid-AI route returns 401 unauthenticated and 429 past its cap (mirrors the P2/P5 fixes). Ties to Tier 2.2.
- **1.4 Critical-path coverage (M).** Approval state machine (partly covered), Stripe webhook signature handling, signup→provisioning.
- **1.5 E2E smoke for the funnel (L, later).** Playwright over onboarding → generate → dashboard, run nightly + pre-deploy. Pairs with `scripts/smoke-prod.sh`.

*DoD:* a coverage floor reported in CI; the tenancy + spend tests exist and pass.

---

## Tier 2 — Make correctness structural, not per-route discipline

The `refresh-voice` gap (an uncapped paid route nearly identical to a hardened one) shows security is applied route-by-route. Encode the policy so new routes inherit it.

- **2.1 Shared route wrapper (M).** A `defineRoute({ auth, rateLimit, schema }, handler)` (or composable `withAuth`/`withRateLimit`/`withTenantDb`) that bakes in auth, rate-limit, body validation, and uniform error mapping. New routes get it for free; forgetting becomes the exception, not the default.
- **2.2 Policy test/lint (S).** A test that enumerates `src/app/api/**/route.ts` and asserts each AI/spend route imports the cap helper (or uses the wrapper). Catches the next `refresh-voice` automatically.
- **2.3 Named rate-limit tiers (S).** Replace scattered magic numbers (`6,60_000`, `20,60_000`, `25,ONE_DAY_MS`) with named policies (`LIMITS.paidAiDaily`, `LIMITS.authBurst`) in one module.
- **2.4 Upstash in prod (S, recurring).** Rate limits currently fail *open* without Upstash (per-instance in-memory). Configure `UPSTASH_REDIS_REST_URL` so every cap actually binds. *(Brad — prod env.)*

---

## Tier 3 — Heal the data-fetching layer

34 `react-hooks/set-state-in-effect` warnings are one repeated fetch-in-effect anti-pattern — the same class that produced the ~136-request dashboard storm.

- **3.1 Adopt a query library (L).** TanStack Query (or SWR) for client data fetching — caching, dedup, invalidation for free; deletes the hand-rolled `cachedGet` + the effect cascades. Migrate page-by-page **with browser verification** against a running app.
- **3.2 Retire the warnings as you migrate (S each).** Each migrated page drops its `set-state-in-effect` warnings; track the count down to zero.

*Note:* this is the one tier that genuinely needs a running app to verify — do it where the dev server is real (canonical repo), not blind.

---

## Tier 4 — Wire the commercial model

- **4.1 Decide billing posture (S, product decision).** Today paid tiers self-provision at signup with no checkout (`tenant-provisioning.ts:33`). Decide: gate paid provisioning behind Stripe checkout, or keep self-serve trials and reconcile later.
- **4.2 Implement the gate (M).** If gating: signup provisions `solo`/trial only; `house_account`/Command activates on a verified `checkout.session.completed` webhook. The Stripe webhook + `stripe-billing` scaffolding already exist.

---

## Tier 5 — Observability & ops

- **5.1 Schedule the prod smoke (S).** `scripts/smoke-prod.sh` exists — run it on a cron + post-deploy; alert on failure.
- **5.2 Sentry release + alerting (S).** Sentry is wired (`SENTRY_DSN`). Add release/version tagging and an error-rate alert so regressions page someone.
- **5.3 Spend observability (M).** The P2 guest-lead log is a start; emit structured events for paid-AI calls (tenant, route, tokens) so cost is attributable and alertable — the whole point of the P2/P5 caps.

---

## Tier 6 — Hygiene (ongoing, low effort)

- **6.1 Kill doc/reality drift (S).** CLAUDE.md described a localStorage migration that was already done; the guardrails module self-labeled "not wired" when it was. Add a lightweight "update the doc in the same PR" norm; the agent-friendly handoff docs are an asset — keep them true.
- **6.2 `<img>` → `next/image` (M, deferred from P7).** 24 warnings; needs layout verification per-image. Do alongside Tier 3.
- **6.3 Resolve the dual-repo setup (S).** `~/Code/thepostpal-readable-v2` vs canonical `~/Desktop/ventures/thepostpal` caused real confusion (and a broken Preview-vs-Production env story). Pick one source of truth or document the relationship precisely.

---

## Recommended sequence

1. **Tier 0** (CI gate) — unblocks safe iteration on everything else. ~1–2 days.
2. **Tier 1.2 + 1.3 + 2.2** (tenancy proof, spend guards, policy test) — lock the highest-stakes invariants. ~2–3 days.
3. **Tier 2.1 + 2.3 + 2.4** (route wrapper, named limits, Upstash) — make correctness structural.
4. **Tier 4** (billing) — when monetization goes live.
5. **Tier 3** (query-library migration) — the big one; do continuously, browser-verified.
6. **Tiers 5–6** — fold in as you go.

**Single highest-leverage move:** Tier 0 + Tier 1.2/1.3 together — a CI gate plus tests that *prove* tenant isolation and spend caps. That converts "the architecture is good if no one breaks it" into "CI won't let anyone break it."
