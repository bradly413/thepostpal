# Prompt: ChatGPT go-live audit — Posterboy Social (today)

Copy everything below the line into ChatGPT (preferably with browsing / canvas). Attach or paste `docs/BETA-AUDIT-FABLE5-2026-07-22.md` and `docs/BETA-TESTER-INSTRUCTIONS.md` if available.

---

You are a senior product + engineering auditor. Today we are deciding whether **Posterboy Social** is ready for **closed-beta go-live** (invite emails to real testers). Be strict, concrete, and prioritized. Do not invent features. Prefer live production evidence over assumptions.

## Product

- **Live site:** https://www.posterboysocial.com  
- **Invite / signup:** https://www.posterboysocial.com/sign-in?mode=signup&next=%2Fonboarding&plan=solo  
- **Stack:** Next.js App Router on Vercel, Neon Postgres + Prisma, Meta (Facebook/Instagram) publish via cron  
- **Closed beta:** free, no card required; Solo plan  
- **Brand:** Posterboy Social — calm social for people who don’t want to manage social  

## Product truth (as of 2026-07-22 ship `3143d77`)

Treat these as intended behavior; flag regressions:

1. Marketing CTAs must go to signup with `next=/onboarding` (Voice Architect) — **not** `/onboarding/classic`.  
2. After onboarding, user lands on **`/dashboard`** (home), not Creator Studio.  
3. Dashboard home **Audience / Top Performing** come from Meta insights when connected; otherwise honest empty states — **no** fake salad image / hard-coded 113 followers / 216 likes.  
4. Publishing is **Facebook & Instagram only** (image). Video publish is blocked in closed beta with a clear error.  
5. Scheduling must **require Meta connected**; otherwise show an error (don’t fake “scheduled” success).  
6. LinkedIn / TikTok / X / YouTube should be **Soon**, not live connect.  
7. Billing UI should say **beta is free**; paid checkout optional.  
8. Data is **DB-backed** (not localStorage-only).  

## Your audit scope

### A. Marketing site (`/`, pricing, for/*, FAQ)
- First viewport: brand strength, headline clarity, CTA honesty  
- Every primary CTA: correct signup URL (no classic onboarding)  
- Claims vs reality: “free trial”, platforms, publish, AI  
- Mobile layout, broken links, console errors if you can check  
- Legal/FAQ consistency with closed beta  

### B. Auth + onboarding
- Signup flow from invite link  
- Confirm Voice Architect experience (pill / personality), not old multi-step Brand Architect  
- Completes → `/dashboard`  
- Error states, mobile  

### C. Dashboard
- Home: no mock engagement; initials avatar; empty Meta states  
- Nav: logo → home; Create / Schedule / Library work  
- Studio: generate image; prompt UX  
- Schedule: Meta gate; image schedule; video error  
- Settings: Meta connect; Soon platforms; free-beta billing copy  
- Drafts / Library empty states for new account  

### D. Publish path (critical for go-live)
- Document end-to-end: Studio/Schedule → `approved` queue → cron → Meta  
- Note ops dependency: testers must be **Meta app Testers** if the FB app is in Development mode  
- What happens if Meta not connected / token fails  

### E. Go-live ops checklist
- Env / cron health (assume prod smoke recently passed 12/12 — verify what you can)  
- Invite email accuracy  
- What Brad must do manually before sending invites  

## Method

1. Browse production URLs above.  
2. Trace signup CTAs from the homepage HTML/links.  
3. If you cannot log in as a real user, say what you could not verify and how to verify it.  
4. Cross-check against any attached audit/handoff docs; call out if docs disagree with live site.  

## Deliverable format (required)

```markdown
# Posterboy go-live audit — [date]

## Verdict
READY / READY WITH CONDITIONS / NOT READY
One paragraph why.

## Blockers (must fix or ops before invites)
- [ ] ...

## Should fix today / within 24h
- [ ] ...

## OK for closed beta
- ...

## Live evidence
URLs checked + what you saw

## Ops checklist for Brad (send invites)
1. ...
2. ...

## Suggested invite email
Short version only.
```

## Rules

- Prioritize **user-facing trust** (fake data, wrong onboarding, false “scheduled”, overclaimed platforms).  
- No fluff. No generic SaaS advice.  
- If something is unknown, mark **UNVERIFIED** with the exact check needed.  
---
