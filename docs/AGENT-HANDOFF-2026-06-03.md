# Agent handoff — Posterboy Social (2026-06-03 EOD)

**For:** Cursor / Codex / Gemini / any agent picking up cold.
**Repo:** `~/Desktop/ventures/thepostpal/` (NOT `~/Code/thepostpal-readable-v2/`).
**This doc supersedes** the "localStorage / Prisma not yet wired" claims in `CLAUDE.md` and older handoffs. As of today the app runs on a live multi-tenant Postgres backend in production.

---

## 🔴 The one-line reality check
**Posterboy Social is LIVE in production on a real Postgres + RLS backend.** The dashboard is no longer localStorage-backed. Treat `CLAUDE.md`'s "Prisma not active / all state in localStorage" as **stale**.

- Live: **https://www.posterboysocial.com** (Vercel project `angie-social-portal`, team `bradly413s-projects`)
- DB: **Neon Postgres** (`posterboy-prod`, AWS us-east-1), Prisma, app-managed RLS
- Branch shipped: `pricing/solo-command-june-2026` → merged to `main` (main auto-deploys prod)
- Verified: 9/9 production API smoke checks green (`./scripts/smoke-prod.sh`)

## What shipped today (the big arc)
1. **Multi-tenant RLS backend wired to the dashboard.** Codex's Sprint 1 (Postgres, `withTenantDb()` setting `app.current_tenant_id` per transaction, location-scoped routes) is now live and the UI consumes it.
2. **Plan-tier adaptive UI** (Solo vs Command) — see Architecture below.
3. **Demo login is DB-backed** — `demo/demo123` provisions a real tenant + default location.
4. **Stripe billing, S3 uploads, plan-aware signup, Studio overhaul, "Brand Architect" onboarding** (built across many commits before/with this work).
5. **Provisioned Neon prod DB, applied migrations + RLS, deployed to production.**

---

## Architecture you must know

### Auth + tenancy
- Session = httpOnly `session` cookie (JWT via `jose`, `src/lib/auth.ts`). Same-origin `fetch` carries it automatically.
- `requireAuthContext()` (`src/lib/api-auth.ts`) → `{userId, tenantId, role, isSuperadmin}`.
- `withTenantDb(auth, fn)` (`src/lib/db.ts`) wraps every query in a transaction that `set_config('app.current_tenant_id', ...)` → **RLS enforces tenant isolation at the DB layer** (25 tables, 100 policies in prod).
- API routes follow: `requireAuthContext → withTenantDb → resolveAccess(userId, locationId, tx) → 403 gate`. Mirror this for any new tenant-scoped route.

### Plan-tier gating (Solo vs Command)
- `src/lib/plan-features.ts` — **single source of truth.** Gate is **single-location** (`solo|shop|press|studio`) vs **multi-location** (`house_account|brc_custom`). Commercial "Command" tier = `house_account`. There is **no literal `command` enum** — don't add one.
- `GET /api/me` returns the live `Organization.plan` (never the stale JWT).
- `src/components/dashboard/PlanProvider.tsx` (`usePlan()`/`usePlanFeatures()`), mounted in `src/app/dashboard/layout.tsx`. Fails closed to streamlined.
- `src/lib/use-active-location.ts` resolves the active location even when the switcher UI is hidden (Solo). `LocationSwitcher` self-hides at ≤1 location AND when `!features.multiLocation`.
- Solo surface: no location switcher, no approval pipeline, composer = "Schedule/Publish". Command: switcher, roll-ups, approval routing.

### New/relevant API surface
`GET /api/me` · `GET/POST /api/locations` · `GET/POST /api/posts`, `GET/PUT/DELETE /api/posts/[id]` (+ approve/reject/etc.) · `GET/POST /api/photos`, `DELETE /api/photos/[id]` · `GET/POST /api/calendar`, `PUT/DELETE /api/calendar/[id]` · `POST /api/webhooks/stripe` (auth-exempt).

### Client data layer
`src/lib/dashboard-api.ts` (typed client, throws `DashboardApiError`, `formatDashboardApiMessage`/`isDashboardAccessError`), `src/lib/dashboard-browser-state.ts` (active-location persistence), `src/components/dashboard/StateViews.tsx` (Skeleton/Empty/Error/NoLocation). **Extend these — don't fork.**

---

## ⚠️ Critical gotchas (learned the hard way)

1. **`prisma generate` MUST run in the build.** `package.json` build is `prisma generate && next build` + `postinstall: prisma generate`. The first prod deploy FAILED because Vercel reused a **stale cached Prisma client** missing `CalendarEvent.type`. **Do not remove the generate step** or any schema column added after the last client gen will break the build.
2. **Local `tsc`/`build` passing ≠ Vercel passing** if the Prisma client is stale. After any `schema.prisma` change, run `npx prisma generate` (or `migrate dev`) before trusting a local build.
3. **Agent-initiated prod env mutations are harness-blocked.** `vercel env add/ls` for production gets denied for AI agents. Brad must set prod env vars himself. Drafting the commands is fine.
4. **`gh` CLI is authed as `brn4040-prog`** (NOT a collaborator on `bradly413/thepostpal`) → `gh pr create` fails. `git push` works (SSH as bradly413). Open PRs in the browser or have Brad fix gh auth.
5. **GitHub "Merge pull request" makes a merge commit** → after a PR merge, `main` is not a fast-forward of the feature branch. To push follow-up fixes: merge `origin/main` into your work (or new PR), don't force.
6. **Production deploy is a high-severity action** — the safety layer requires explicit human authorization; agents can't push to `main` on vague instructions. Brad triggers deploys.

## Env vars (prod status)
- ✅ Set: `DATABASE_URL` (Neon pooled, `pgbouncer=true`), plus the pre-existing `ANTHROPIC_API_KEY`, `AUTH_SECRET`, `GEMINI_API_KEY`, `META_*`, `VIMEO_*`, `KV_*`.
- ❌ Missing (features degrade gracefully — app still runs): `UPSTASH_REDIS_REST_URL/_TOKEN` (durable signups), `S3_*`/`AWS_*` (durable uploads), `STRIPE_*` (billing), `LEONARDO_API_KEY` (Studio HD), `NEXT_PUBLIC_APP_URL`.
- Full reference: `docs/PROD-ENV-CHECKLIST.md`. DB setup: `docs/PROD-DB-SETUP.md`.

## Scripts
- `./scripts/smoke-prod.sh [url]` — end-to-end prod health check (auth → /api/me → CRUD → RLS 403).
- `./scripts/deploy-prod-db.sh "<direct-db-url>"` — safe `prisma migrate deploy` + RLS verify (guards against local/localhost).

## Workflow
- Direct commits; feature branches merged to `main`; **`main` auto-deploys** `angie-social-portal`. Push only when green. End commits with `Co-Authored-By:`. Don't run `git commit --amend --reset-author` (Brad's local/global emails differ; the hint is a trap).
- Watch deploys: `npx vercel ls angie-social-portal --scope bradly413s-projects` (this read is allowed; `env ls` is not).

## What's next — `docs/PLAN-2026-06-04.md`
P0 real-UI validation (Solo surface, fresh signup + RLS isolation, Command surface via plan flip) → P1 Upstash + S3 + `NEXT_PUBLIC_APP_URL` (make beta durable) → P2 rotate Neon password (it was pasted in chat), delete orphan `thepostpal-readable-v2` project, Leonardo key → Stripe only if beta charges → beta invites.

## Open threads / tech debt
- Secondary dashboard pages (dispatch/analytics/reports/facebook/instagram/editor) partly still on localStorage stores — migrate + delete dead `*-store.ts`.
- `CLAUDE.md` — rewritten 2026-06-03 to match production; still read this handoff for gotchas and env status.
- Uploads need S3 in prod (local-disk fallback is ephemeral on Vercel).
- `/api/ai` should eventually use per-location brand book from `GET /api/brand-book`, not only `angie-nichols` hardcode.

## Related docs
| Doc | Purpose |
|-----|---------|
| `docs/PLAN-2026-06-04.md` | Tomorrow's P0–P3 checklist |
| `docs/PROD-ENV-CHECKLIST.md` | Vercel env matrix |
| `docs/PROD-DB-SETUP.md` | Neon + migrate + RLS |
| `docs/AGENT-FLEET-PLAN.md` | Monitor/maintain/support agent fleet |
| `CLAUDE.md` | Repo map (synced with this handoff) |
