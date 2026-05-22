# posterboy — knowledge sync prompt (Codex / Claude Code)

Paste the block below into **Codex** or **Claude Code** at the start of a session.  
Goal: force the agent to read the repo + docs and report what it actually knows — not guess from training data.

Current repo split:

- `thepostpal` = deployable app/runtime repo, current billing/auth/integrations implementation, likely source of truth for anything tied to `posterboysocial.com`
- `thepostpal-readable-v2` = docs/planning/knowledge repo, source of truth for higher-level product docs when they exist there and not in `thepostpal`

Agents should read both when available and explicitly note which facts came from which repo.

---

## Prompt (copy from here)

```
You are working on posterboy (Posterboy Social) for Brad Nichols.

Assume there may be two local repos:

- app/runtime repo: `thepostpal`
- docs/knowledge repo: `thepostpal-readable-v2`

Do not assume they are in sync. Report the split if you find one.

## Your job in this message ONLY

Do NOT write code yet. First, build a knowledge baseline by reading the repository and docs, then answer in structured form.

### Step 1 — Read these sources (in order)

First determine which repos exist locally:

- `thepostpal`
- `thepostpal-readable-v2`

If both exist:

- treat `thepostpal` as the primary code/runtime repo
- treat `thepostpal-readable-v2/docs/` as canonical for strategy/docs files that are missing in `thepostpal`
- read both doc folders and note any divergence

If only one exists, continue with that repo and say what is missing.

Read these sources in this order, resolving across both repos if needed:

1. `CLAUDE.md`
2. `AGENTS.md`
3. `docs/CLAUDE-SESSION-HANDOFF.md` (if present)
4. `docs/posterboy-growth-plan.md`
5. `docs/brand-implementation-notes.md`
6. `docs/BUFFER-MARKETING-COMPARISON.md` (if present)
7. `src/lib/posterboy-copy.ts`
8. `src/lib/pricing.ts`
9. `prisma/schema.prisma`
10. Skim: `src/middleware.ts`, `src/app/(marketing)/page.tsx`, `src/app/sign-in/page.tsx`, `src/components/DashboardShell.tsx`

If exact paths do not exist, find the closest real equivalents and say so explicitly.
Examples:

- `src/proxy.ts` instead of `src/middleware.ts`
- `src/app/page.tsx` instead of `src/app/(marketing)/page.tsx`
- `src/app/login/page.tsx` instead of `src/app/sign-in/page.tsx`
- `src/lib/posterboy-brand.ts` instead of `src/lib/posterboy-copy.ts`

Also search the repo for: `stripe`, `Subscription`, `auth-store`, `MarketingSite`, `localStorage`.

### Step 2 — Output this report

## A. Product (what posterboy IS)

- One-paragraph positioning (voice + target customer)
- Core promise / tagline (cite `posterboy-copy.ts` if found)
- Primary user workflow (Draft → Press → Dispatch → etc.)
- Pricing tiers that exist in code (note any conflicts between homepage vs `/pricing`)
- What is live vs planned (billing, Prisma, Meta publish, multi-location)

## B. Technical stack (what the repo RUNS ON)

- Framework versions (Next.js, React, Tailwind, GSAP)
- Auth: how login/signup works, where users are stored
- Data persistence: what uses localStorage vs Redis vs Prisma
- External APIs integrated (Anthropic, Gemini, Leonardo, Meta, Vimeo, Upstash)
- Deployment: Vercel project, domain, env vars required

## C. Routes map

Table of important routes:
- Public marketing (`/`, `/pricing`, `/for/...`)
- Auth (`/sign-in`, `/onboarding`)
- Dashboard (main sections)
- API routes that matter for product

## D. Brand & design rules

- Colors, fonts, logo/icon files (correct vs wrong assets)
- UI voice rules (what to say / not say)
- Owner preferences (no emojis, editorial tone, etc.)

## E. Current work in progress

- Marketing homepage state (sections, animations, known bugs)
- Dashboard UI direction (if documented)
- Subscription/billing status (Stripe? payment links? gaps)
- Anything marked TODO in docs or code comments

## F. Conflicts & unknowns

List contradictions you found, e.g.:
- CLAUDE.md says X but code does Y
- Two pricing models on different pages
- thepostpal vs thepostpal-readable-v2 disagree
- Features in schema but not wired
- Missing env vars for production

For each unknown: say what file you'd check next or what question to ask Brad.

## G. Training-data vs repo truth

Explicitly separate:
- **From thepostpal repo** (cite file paths)
- **From thepostpal-readable-v2 repo** (cite file paths)
- **Assumed from general knowledge** (label as unverified)
- **Not found in repo** (gaps)

## H. Recommended next task

Given Brad's likely goals (paid signups on posterboysocial.com + onboarding waiting clients), propose ONE highest-leverage next step with rationale — but do not implement until he confirms.

---

### Rules while reporting

- Cite file paths for factual claims.
- If you cannot read a file, say so — do not invent.
- Do not commit, deploy, or refactor in this pass.
- Minimize scope; accuracy over completeness.

When the report is done, ask Brad: "Which track — marketing, dashboard, billing, or client onboarding — should we execute first?"
```

---

## Shorter variant (quick sync)

Use when you already have context loaded and just want a sanity check:

```
Read CLAUDE.md, docs/posterboy-growth-plan.md, src/lib/posterboy-copy.ts, src/lib/pricing.ts, prisma/schema.prisma, and src/lib/auth-store.ts.

In ≤30 bullets, summarize: (1) what posterboy is, (2) stack + auth + data storage, (3) pricing tiers in code, (4) what's missing for paid signups on posterboysocial.com, (5) top 3 repo/doc conflicts.

Label each bullet [repo] or [assumed]. No code changes yet.
```

---

## Follow-up prompt (after knowledge sync)

Paste after the report looks right:

```
Good. Now treat your section F (conflicts) and G (gaps) as the source of truth for this session.

Priority: [fill in one — e.g. "Stripe checkout + signup flow" or "onboard 2 waiting clients" or "dashboard IA refactor"]

Before coding:
1. Confirm the exact files you will touch
2. List env vars / Vercel / Stripe setup Brad must do manually
3. Estimate scope in hours

Then implement. Match existing patterns. Don't commit unless I ask.
```
