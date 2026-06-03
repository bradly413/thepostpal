# Posterboy Social — Status Overview

**As of:** 2026-06-02 · **Repo:** `~/Desktop/ventures/thepostpal/` (canonical; the `~/Code/thepostpal-readable-v2/` path is a **symlink** to it — same repo)
**Synthesized from:** `CODEX-HANDOFF.md`, `CLAUDE-UPDATE-2026-05-18.md` (Cursor), `CLAUDE-UPDATE-2026-06-02.md`, `BUSINESS-PLAN-2026-06.md`, and live git state.

---

## TL;DR

Posterboy Social is an AI social-content SaaS pivoting from a one-realtor tool to a multi-vertical, multi-tenant product. **Production (`main`) is still the late-May "generalization" state.** The big commercial + infrastructure sprint — Solo/Command pricing, multi-tenant Postgres **RLS**, live dashboard APIs, Stripe billing, Meta→DB, S3 uploads, and a brand-book DB wire-up — all lives on **`pricing/solo-command-june-2026`** and is **not merged to `main` yet**. The branch is green (`tsc`/`build` clean) and pushed. The two things standing between this and a beta launch are **(1) merge to `main`** and **(2) production env/config** (Stripe keys, Leonardo key, Upstash aliases) — which only Brad can set.

---

## 1. Product & commercial

- **What it is:** brand books from a structured onboarding wizard → on-brand drafts the user approves and schedules. "Calm room" editorial aesthetic, anti-creator-hustle. 12-vertical industry taxonomy (`src/lib/industries.ts`); no longer realtor-locked.
- **Pricing (source of truth `src/lib/pricing.ts` + `BUSINESS-PLAN-2026-06.md`):**
  - **Solo** — $99/mo ($79 annual): single-user tenant, 3 social profiles, calm workspace.
  - **Command** — $249/mo base + $39/mo per extra location: multi-location rollups, approval pipelines, agency asset library. (Maps to `PlanTier.house_account`.)
- **Plan-gating axis:** single-location (`solo|shop|press|studio`) vs multi-location (`house_account|brc_custom`).
- **Beta target:** 30-day closed beta (July 2026) — 15 Solo + 5 Command tenants.

## 2. Stack

Next.js 16.2.6 (App Router), React 19, TS, Tailwind v4, GSAP+Lenis. Auth = JWT via `jose` in `src/proxy.ts`. **Multi-tenant Postgres with Row-Level Security** via `withTenantDb()` + `requireAuthContext()` + `resolveAccess()`. AI: Anthropic (voice synthesis, chat), Gemini (images), Leonardo (HD edits). Prisma + Postgres.

## 3. Where things stand (branch & deploy)

| | State |
|---|---|
| **Production** | `posterboysocial.com` (Vercel `angie-social-portal`) tracks **`main` @ `368c6b0`** — the May-23 generalization sprint. **None** of the pricing/RLS/Stripe/S3 work is live yet. |
| **Active branch** | `pricing/solo-command-june-2026` @ `b8bf254`, **pushed to origin**, **19 commits ahead of `main`**, not merged. |
| **Green?** | Yes — `tsc --noEmit` 0, `npm run build` 0, all 5 migrations applied locally. |
| **Manual PR** | https://github.com/bradly413/thepostpal/compare/main...pricing/solo-command-june-2026 |

## 4. Shipped on the branch (committed)

- **Multi-tenant RLS dashboard wiring** — posts, calendar, photos, drafts off localStorage onto RLS-scoped APIs; `/api/me`, plan provider, adaptive UI gating; reports/analytics/bento read live data. *(Smoke-tested in-browser: live data + tenant isolation 403s.)*
- **Scheduled posts** — `templateId`/`pillar` columns + mappers; calendar/dispatch live. *(Verified CRUD round-trip + IDOR.)*
- **Plan-aware signup** — selected tier flows into provisioning; Solo 3-profile cap (402 gate).
- **Stripe billing (code-complete)** — checkout, webhook, portal, `Subscription` persistence, Command per-location quantity sync. Webhook now exempt from auth middleware (`492452e`) so Stripe can actually reach it.
- **Meta → DB** — `SocialConnection` per location; OAuth callback persists tokens.
- **S3 uploads** — env-gated durable storage with local-disk fallback (`src/lib/storage.ts`), so uploads survive Vercel deploys when configured.
- **Tooling/docs** — `npm run db:studio`; marketing calendar grid lines; handoff docs.

## 5. In-flight / uncommitted

- **Brand book → DB wire-up** (Cursor pass, *uncommitted* on the branch): persists the full brand book to `Location.brandVoiceJson` via `GET/PUT /api/brand-book`; onboarding, sign-in routing, and `/dashboard/brand` read from the API (localStorage becomes a cache). Compiles clean. Files: `src/app/api/brand-book/route.ts`, `src/lib/brand-book-{db,client,document}.ts`, `src/lib/use-brand-book.ts` + 8 modified. See `CLAUDE-UPDATE-2026-05-18.md`.
- **Landing-page mobile pass** (June 2) — hero, Built-For, Problem/carousel rebuilt for phone width; see `CLAUDE-UPDATE-2026-06-02.md`. Remaining: pricing/footer mobile rhythm + final QA sweep.

## 6. Open blockers / dependencies (mostly Brad-only)

- **Merge `pricing/solo-command-june-2026` → `main`** — the gate for everything above going to production.
- **Production env (harness-blocked for agents — Brad must set in Vercel):**
  - Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, 4 price IDs, `NEXT_PUBLIC_APP_URL` (see `stripe-billing-setup.md`) — billing is inert until set, and untested against real Stripe.
  - S3: bucket + keys (see `uploads-storage.md`) — uploads fall back to ephemeral local disk until set.
  - 🔴 `LEONARDO_API_KEY` missing → Studio HD upscale / remove-bg 500.
  - 🟡 Upstash aliases (`UPSTASH_REDIS_REST_*`) → auth signups use ephemeral `/tmp` fallback.
- **`/api/ai` still hardcodes the Angie Nichols brand book** — should read the tenant's brand book per active location (now that it's DB-backed).
- **Still on localStorage:** `organization-store`, onboarding-complete flag, issues/app-settings.

## 7. Multi-agent workflow & doc map

Brad runs a **Claude / Codex / Cursor** triple-agent workflow on the same working tree (note the symlink — parallel sessions edit the same files; reconcile before committing). Handoff docs:

- `CODEX-HANDOFF.md` — deepest architecture/ops reference (read first when cold).
- `CLAUDE-UPDATE-2026-05-18.md` — brand-book DB wire-up (Cursor) + sprint state.
- `CLAUDE-UPDATE-2026-06-02.md` — landing-page mobile pass.
- `CURSOR-HANDOFF.md` — Stripe/billing handoff for Cursor.
- `BUSINESS-PLAN-2026-06.md` / `-ALIGNMENT-` — commercial source of truth.
- `stripe-billing-setup.md`, `uploads-storage.md`, `env-audit.md`, `vercel-production.md` — config/ops.

## 8. Recommended next path

1. **Commit** the brand-book wire-up on the branch (Brad's call).
2. **Final mobile QA** on `/` (pricing + footer), then **merge → `main`** to ship the sprint.
3. **Set production env** (Stripe, S3, Leonardo, Upstash) and run the Stripe checkout→webhook→`Subscription` round-trip once in test mode.
4. **Point `/api/ai` at the tenant brand book.**
5. Stand up the July closed beta (15 Solo / 5 Command).

## Conventions (carry-over)

Direct commits to branch; **push only on explicit OK**. Co-author trailer required. No emojis in UI. Don't `git commit --amend --reset-author` (a trap hint). `npx tsc --noEmit && npm run build` before calling work done. Shared-infra/prod-env changes need Brad's explicit authorization.
