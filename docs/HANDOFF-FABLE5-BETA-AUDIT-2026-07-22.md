# Handoff — Claude Fable 5 (closed beta audit)

**Date:** 2026-07-22  
**Repo:** `~/Code/thepostpal-readable-v2` (symlink `~/Desktop/ventures/thepostpal`)  
**Branch:** `main` @ `3143d77` (pushed; prod deploy building)  
**Prod:** https://www.posterboysocial.com  
**Local:** `npm run dev` → http://127.0.0.1:8240  

---

## Mission

Run a **full closed-beta audit** of:

1. **Marketing site** (`/` and key marketing surfaces)  
2. **Onboarding** (Voice Architect at `/onboarding`)  
3. **Dashboard** (home, Studio, Schedule, Library, Settings)

Return a prioritized report: **blocker / should-fix / ok-for-beta**, with concrete URLs/files and what a first-time beta tester would hit.

---

## What just shipped (context)

| Commit | What |
|--------|------|
| `567bfa5` | Voice Architect is canonical `/onboarding` (not Brand Architect / classic) |
| `4903601` | Homepage copy polish, sidebar `posterboy™` wordmark, Studio uses shared shell |
| `3143d77` | Home Audience/Top Performing → Meta insights; onboarding → `/dashboard`; schedule blocked without Meta; LI/TT Soon; billing “free beta”; rewritten `docs/BETA-TESTER-INSTRUCTIONS.md` |

**Invite link:**  
`https://www.posterboysocial.com/sign-in?mode=signup&next=%2Fonboarding&plan=solo`

**Ops still on Brad:** add each tester as Meta app Tester (Dev mode OAuth).

**Smoke (earlier today):** `./scripts/smoke-prod.sh` → 12/12 PASS.

---

## Product truth (do not contradict)

- **Auth:** DB-backed JWT; signup free (no Stripe required)  
- **Onboarding:** Voice Architect (`VoiceArchitect.tsx`) at `/onboarding`; classic at `/onboarding/classic` escape only  
- **Post-onboarding:** must land `/dashboard` (home), **not** Studio  
- **Publish:** FB/IG only via cron (`approved` queue); video publish blocked in closed beta  
- **Home metrics:** live Meta insights when connected; empty states otherwise — **no** salad/113 mocks  
- **Design:** warm-light dashboard; serif logo-only  

Canonical maps: `docs/ARCHITECTURE.md`, `CLAUDE.md`, `docs/BETA-TESTER-INSTRUCTIONS.md`

---

## Audit scope

### A. Marketing
- `/` first viewport: brand strength, headline, CTAs, mobile  
- Signup CTAs must go to `/sign-in?mode=signup&next=%2Fonboarding` (not `/onboarding/classic`)  
- Pricing / Solo fork accuracy vs free beta  
- FAQ/legal vs product claims (trial, publish, platforms)  
- Broken links, console errors, layout overflow  

### B. Onboarding
- Fresh signup → Voice Architect (not classic wizard)  
- Guest vs authenticated generate path  
- Completes → `/dashboard`  
- Mobile usability; error states  

### C. Dashboard
- Home: no fake audience/top-performing; initials avatar; empty Meta states honest  
- Nav: sidebar logo → home; Create/Schedule/Library hard-nav works  
- Studio: generates; no nested broken sidebar  
- Schedule: blocks without Meta; image schedule OK; video error clear  
- Settings: Meta connect visible; LI/TT Soon; billing free-beta copy  
- Drafts / Library empty states  

Prefer **prod** once deploy Ready; else local `127.0.0.1:8240` with `demo`/`demo123` for shell-only (demo is not a full Prisma tenant — prefer a real signup if testing data).

Also run: `.claude/skills/launch-check/scripts/launch-check.sh` if possible.

---

## Deliverable format

```markdown
# Beta audit — Fable 5 — 2026-07-22

## Verdict
One paragraph: ready to invite? yes/no + why.

## Blockers
- [ ] ...

## Should fix before/soon after invites
- [ ] ...

## OK for closed beta
- ...

## Smoke / launch-check
Pass/fail notes

## Suggested next commits
Ordered list
```

Write the report to `docs/BETA-AUDIT-FABLE5-2026-07-22.md` when done.

---

## Do not

- Force-push, amend shared history, or change prod env  
- Reintroduce `/onboarding/classic` as default signup next  
- Reintroduce hardcoded home engagement mocks  
- Commit secrets  
