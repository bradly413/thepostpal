# Posterboy Social — Business Plan Alignment (June 2026)

**Status:** Active commercial source of truth  
**Supersedes:** Multi-tier Good/Better/Best pricing on marketing surfaces (retired June 2026)  
**Companion:** [BUSINESS-PLAN-2026-06.md](./BUSINESS-PLAN-2026-06.md) (full plan narrative)  
**Engineering:** [CODEX-HANDOFF.md](./CODEX-HANDOFF.md), [MULTI_TENANT_RLS_IMPLEMENTATION.md](./MULTI_TENANT_RLS_IMPLEMENTATION.md), [posterboy-location-engineering-brief.md](./posterboy-location-engineering-brief.md)

---

## Executive alignment

Posterboy Social is a **two-tier premium** B2B SMM platform on a **single multi-tenant PostgreSQL + RLS** stack:

| Commercial tier | Price | Primary buyer | `Organization.plan` (Prisma) |
|-----------------|-------|---------------|------------------------------|
| **Solo** | $99/mo ($79/mo annual) | Luxury agents, solo med-spa, boutique consultants | `solo` |
| **Command** | $249/mo base + $39/mo per additional location | Brokerages, franchise groups, incubators | `house_account` (commercial name: **Command**) |

**BRC Custom** remains a separate services line (not a self-serve SaaS tier).

There is **no** `command` value in `PlanTier` today. UI and docs use the name **Command**; the database uses `house_account` until a rename migration is justified.

---

## Product ↔ engineering map

| Business plan capability | Solo | Command | Code gate |
|--------------------------|------|---------|-----------|
| Isolated tenant sandbox | ✓ | ✓ | RLS + `withTenantDb` |
| 3 social profiles | ✓ | ✓ | Enforce at connect (TODO) |
| Calm Room workspace | ✓ | ✓ | Dashboard (API wire-up in progress) |
| Visual Grid Planner | ✓ | ✓ | Editor / templates |
| Multi-location rollups | — | ✓ | `planFeatures` → `locationRollup` |
| Team approval pipeline | — | ✓ | `approvalPipeline` + `/api/posts/*` |
| Agency-wide asset library | — | ✓ | Org-scoped photos API |
| Enterprise SSO | — | ✓ (contract) | **Not beta** — sales only |

Gating lives in `src/lib/plan-features.ts` via `SINGLE_LOCATION_PLANS` vs multi-location plans.

Client bootstrap: `GET /api/me` returns live `plan` + `locationCount` (never stale JWT plan alone).

---

## Pricing surfaces (code)

| Surface | Source |
|---------|--------|
| Homepage pricing section | `src/components/marketing/sections/Pricing.tsx` → `getPublicTiers()` |
| `/pricing` page | `src/app/(marketing)/pricing/page.tsx` |
| Signup plan query | `?plan=solo` or `?plan=command` → `src/lib/plan-storage.ts` |
| Legacy URLs | `good` / `better` / `best` → normalized to `solo`; `house-account` / `teams` → `command` |

---

## July 2026 closed beta (Phase 1)

**Target cohort:** 15 Solo + 5 Command tenants.

| Gate | Owner | Done when |
|------|-------|-----------|
| Marketing `/` mobile QA complete | Eng | Pricing + footer pass (see CLAUDE-UPDATE-2026-06-02) |
| Dashboard reads RLS APIs | Eng | Sprint 2 frontend |
| Stripe products: Solo + Command base + location meter | Brad + Eng | Checkout assigns `Organization.plan` |
| RLS isolation tests in CI | Eng | Two-tenant deny cross-read |
| Durable auth (Upstash aliases) | Brad | Signups survive redeploy |
| Beta runbook | Ops | `docs/BETA-TESTER-INSTRUCTIONS.md` updated for two tiers |

**Do not sell in beta:** Enterprise SSO, cross-location publish-once (v2), unlimited seats unless built.

---

## Revenue model (plan targets)

| Stage | Solo | Command | Indicative MRR (plan) |
|-------|------|---------|------------------------|
| Month 1 (beta) | 15 × $99 | 5 × ($249 + ~2 add'l × $39) | ~$3,315 |
| Month 6 | 100 × $99 | 40 × base + locations | ~$27,660 |
| Month 12 | 400 × $99 | 120 × base + locations | ~$106,920 |

MRR requires **live Stripe** and plan assignment — not landing page alone.

---

## Risks ↔ engineering response

| Risk | Mitigation |
|------|------------|
| Meta API dependency | Degraded-mode copy; token health in settings |
| Feature dilution (consumer creep) | `plan-features.ts` + product review; no inbox/feed |
| Multitenancy failure | Mandatory `withTenantDb` on tenant routes; automated RLS tests |
| CCPA/GDPR | ToS/Privacy describe transaction-scoped isolation |

---

## Legal & IP

- **Entity:** Bradly Robert Creative LLC  
- **Trademark:** File **Posterboy Social** (Classes 042 + 035); see prior trademark prep package  
- **AI-assisted development:** Orchestration and UI are proprietary; AI tools do not change ownership

---

## Drift policy

If marketing copy, sales one-pagers, or agent handoffs conflict with this file:

1. Update **this file** and `src/lib/pricing.ts` in the same change.  
2. Do not silently promise Command features on Solo plans.  
3. Do not reintroduce Good/Better/Best on public pricing without explicit business approval.

---

## Related docs to keep in sync

- `docs/POSTERBOY-MASTER-BRIEF.md` — product voice and audience  
- `docs/launch-critical-workstreams.md` — engineering priorities  
- `docs/posterboy-location-engineering-brief.md` — location + approval (Command)  
- `docs/BETA-TESTER-INSTRUCTIONS.md` — beta cohort instructions  

---

*Last updated: June 2026*
