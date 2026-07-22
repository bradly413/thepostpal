# Prompt: Gemini go-live audit — Posterboy Social (today)

**How to use:** Open [Gemini](https://gemini.google.com) (prefer a model with browsing / Deep Research). Upload or paste `docs/BETA-AUDIT-FABLE5-2026-07-22.md` and `docs/BETA-TESTER-INSTRUCTIONS.md` if you have them. Paste **everything below the line**.

---

You are a ruthless go-live auditor for a SaaS product. Your job is to decide if **Posterboy Social** is safe to email closed-beta invites **today**. Prefer **live production evidence**. Do not invent features. Mark anything you could not verify as **UNVERIFIED** with the exact check needed.

## Live URLs (browse these)

| Surface | URL |
|---------|-----|
| Marketing home | https://www.posterboysocial.com/ |
| Pricing | https://www.posterboysocial.com/pricing |
| Sample vertical | https://www.posterboysocial.com/for/realtors |
| Signup (invite) | https://www.posterboysocial.com/sign-in?mode=signup&next=%2Fonboarding&plan=solo |
| Sign-in | https://www.posterboysocial.com/sign-in |
| Onboarding (auth may redirect) | https://www.posterboysocial.com/onboarding |
| Privacy / Terms | https://www.posterboysocial.com/privacy · https://www.posterboysocial.com/terms |

## Product snapshot

- Social content tool: create (Studio) → caption → schedule → publish to **Facebook & Instagram**
- Stack: Next.js on Vercel, Neon Postgres, Meta Graph publish via cron (~every 5 min)
- Closed beta: **free, no card**; Solo plan
- Latest relevant ships: Voice Architect onboarding; home Meta insights (no fake engagement); schedule blocked without Meta; Studio prompt bar centers then glides down on generate (`82cd419`)

## Intended behavior (regressions = fail)

1. Marketing CTAs → `/sign-in?mode=signup&next=%2Fonboarding` (optional `&plan=solo`) — **never** `/onboarding/classic`
2. Post-onboarding → **`/dashboard` home**, not Studio
3. Home Audience / Top Performing = Meta insights or honest empty — **no** stock salad / fake 113 / 216 likes
4. Publish = FB/IG **images** only; video = clear closed-beta block
5. Schedule without Meta = **error**, not false success
6. LinkedIn / TikTok / X / YouTube = **Soon** (not live publish)
7. Billing copy = free beta; paid optional
8. Real accounts are **DB-backed** (not localStorage-only)

## Audit steps (do in order)

### 1) Marketing
- Open `/`. Note headline, brand presence, primary/secondary CTAs.
- Inspect every “Start / Sign up / Trial” link href. List any that point to classic onboarding or wrong next.
- Check `/pricing` and one `/for/*` page for claim accuracy (trial, platforms, publish).
- Skim FAQ if present: free trial / card language vs closed beta.
- Flag mobile-risk layout if visible; note broken images/links.

### 2) Auth + onboarding
- Open the invite signup URL. Describe the create-account UI.
- If you can proceed without a real account, note what onboarding looks like (Voice Architect vs old wizard). If login wall: mark onboarding completion path **UNVERIFIED**.
- Confirm docs/claims say landing is `/dashboard`.

### 3) Dashboard (if accessible; else UNVERIFIED)
- Home: any fake metrics/images?
- Nav: Dashboard / Create / Schedule / Library
- Settings: Meta connect present; other platforms Soon; billing free-beta language
- Studio: empty-state composer position (should feel centered before generate)

### 4) Publish path (reason about the system)
- Describe E2E: create/schedule → queue status `approved` → cron → Meta
- Call out **ops blocker**: Facebook app in Development mode requires each tester as **App Tester** or OAuth fails
- Failure modes: no Meta, token expired, video attempt

### 5) Cross-check attachments
- If audit/tester docs were uploaded, list disagreements with what you see live.

## Output format (strict)

```markdown
# Posterboy go-live audit (Gemini) — YYYY-MM-DD

## Verdict
READY | READY WITH CONDITIONS | NOT READY
<one paragraph>

## Blockers (before any invite email)
- [ ] ...

## Fix within 24h
- [ ] ...

## Acceptable for closed beta
- ...

## Evidence log
| URL | What I observed |
|-----|-----------------|
| ... | ... |

## UNVERIFIED
| Item | How Brad should verify |
|------|------------------------|
| ... | ... |

## Brad ops checklist (send invites)
1. Add Meta App Testers for each email
2. ...
3. Send invite link: https://www.posterboysocial.com/sign-in?mode=signup&next=%2Fonboarding&plan=solo

## Invite email (paste-ready)
Subject + 6–10 line body.
```

## Rules

- Be concise and harsh on trust breakers (fake data, wrong funnel, false schedule success).
- No generic SaaS filler.
- If browsing fails for a URL, say so and continue with what you can.
---
