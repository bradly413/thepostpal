# posterboy — browser knowledge sync (Claude.ai / ChatGPT)

Use this when **Codex or Cursor aren’t available** — paste into [claude.ai](https://claude.ai) or ChatGPT.

Browser models **cannot read your repo**. You must paste attachments or text blocks below the prompt.

---

## Step 0 — What to attach or paste first

Attach or paste **as much as you have** (more = better report):

### Minimum (5 min)
- This entire prompt
- `CLAUDE.md` from `thepostpal-readable-v2`
- `docs/posterboy-growth-plan.md`
- `src/lib/posterboy-copy.ts`
- `src/lib/pricing.ts`

### Recommended (15 min)
Everything above, plus:
- `docs/CLAUDE-SESSION-HANDOFF.md`
- `docs/launch-critical-workstreams.md`
- `prisma/schema.prisma`
- `docs/stripe-billing-setup.md` (from `Desktop/ventures/thepostpal/docs/` if billing work)
- `docs/claude-sync-v2.md` or `docs/master-brief-alignment.md` (Codex status)
- `docs/BUFFER-MARKETING-COMPARISON.md`

### If comparing two codebases
Say explicitly which is canonical, and paste from **both** if needed:
- `~/Code/thepostpal-readable-v2/` — marketing site, GSAP homepage, auth-store signup
- `~/Desktop/ventures/thepostpal/` — Stripe billing, Prisma auth, multi-location (Codex)

---

## Prompt (copy from here)

```
You are a product + engineering advisor for **posterboy** (Posterboy Social, posterboysocial.com).

Brad Nichols is the builder. The product is a calm, approval-first social media tool for local businesses and realtors — not a creator hustle app. Parent brand: Bradly Robert Creative.

## Important constraint

You do NOT have filesystem access unless I paste files below. Do not invent repo details. Label every claim:
- [PASTED] — from text I provided
- [INFERRED] — reasonable guess, say why
- [UNKNOWN] — ask me to paste a specific file

## Your job (no code yet)

Read everything I paste after this message. Then produce the report below.

---

### A. Product summary
- Positioning in one paragraph (voice, customer, promise)
- Core workflow: Draft → Press → Dispatch → Issues (or correct from pasted docs)
- Pricing tiers mentioned in pasted files — note ANY conflicts (e.g. Solo/Shop/Press vs Good/Better/Best vs STARTER/PRO/TEAM)
- What is sold today vs roadmap vs vapor

### B. Two-repo reality (if applicable)
If I pasted from both `thepostpal-readable-v2` and `thepostpal`:
- Table: feature | v2 repo | Codex/thepostpal repo | which should be canonical
- Biggest merge/port risks

### C. Technical stack (from pasted docs only)
- Next.js / React / Tailwind / GSAP versions if stated
- Auth: how signup works, where users live (localStorage, Redis, Prisma)
- Billing: Stripe yes/no, webhooks, plan gating
- External APIs: Anthropic, Gemini, Leonardo, Meta, Vimeo, Upstash
- Deployment: Vercel, domain, env vars listed in docs

### D. Routes & surfaces
Marketing (`/`, `/pricing`), auth (`/sign-in`), dashboard sections, key APIs — only if present in pasted material.

### E. Brand rules
- Colors, fonts, logo files (posterboy-app-icon.png vs wrong assets)
- Voice: witty not zany, no emojis in UI, lowercase posterboy
- Trademark direction (Posterboy Social vs posterboy shorthand)

### F. Current priorities (May 2026)
From pasted docs, infer Brad’s likely priorities:
1. Paid signups on posterboysocial.com
2. Onboarding waiting clients
3. Marketing homepage polish
4. Dashboard IA
5. Multi-location + corporate approval (launch-blocking per Codex brief?)

Rank them and say what blocks revenue today.

### G. Gaps & conflicts
Bullet list of contradictions between pasted files, e.g.:
- CLAUDE.md says `/` is login but handoff says marketing homepage
- Stripe docs exist but v2 has no stripe in code
- Prisma schema exists but “not active”
- Homepage pricing ≠ /pricing page

For each: recommended source of truth + one sentence fix.

### H. Go-to-market checklist (non-engineering)
What Brad must do manually before first paying client:
- [ ] Domain → correct Vercel project
- [ ] Stripe products + Payment Links or Checkout
- [ ] Production env vars (AUTH_SECRET, UPSTASH, STRIPE_*)
- [ ] Legal: terms, privacy (if missing)
- [ ] Client onboarding script (signup → pay → brand intake → first drafts)

### I. Recommended next 7 days
Three tracks with day-by-day outline (pick ONE as primary if I don’t specify):
- **Track 1: Revenue** — Stripe + signup + 2 pilot clients
- **Track 2: Product** — port Codex billing into v2 OR deploy thepostpal
- **Track 3: Marketing** — homepage conversion, align pricing copy

End with: “Brad, confirm (1) canonical repo, (2) primary track, (3) tier names for Stripe.”

---

## Rules
- No code generation in this pass unless I ask.
- No generic Buffer/Hootsuite advice unless tied to pasted posterboy positioning.
- Prefer `posterboy-copy.ts` and `posterboy-growth-plan.md` over your training data for voice and tiers.
- If pasted content is insufficient, list exactly which 3 files to paste next.

---

## Context I am pasting below

[PASTE CLAUDE.md, growth plan, pricing.ts, copy.ts, handoff doc, stripe-billing-setup, etc. here — or attach as files]

My current question after your report: _______________________
```

---

## Short variant (ChatGPT with file limit)

```
I'm building posterboy (posterboysocial.com) — approval-first social tool for local businesses/realtors.

I pasted project docs below. In ≤40 bullets:
1) product + voice
2) stack + auth + billing status
3) all pricing tier names found (flag conflicts)
4) v2 vs Codex repo differences (if both pasted)
5) top 5 blockers to first paying customer
6) recommended 7-day plan

Tag each bullet [PASTED] or [INFERRED]. No code. End with 3 questions for me.

--- PASTED FILES FOLLOW ---
```

---

## Follow-up prompts (after the report)

**Pick canonical repo:**
```
Assume thepostpal-readable-v2 is canonical for marketing + thepostpal for billing until merged. Give me a port checklist: which files/modules to copy from thepostpal into v2 for Stripe-only MVP. No code — file paths and order of operations only.
```

**Client onboarding:**
```
Write a concierge onboarding runbook for 2 pilot clients: email templates, signup link, Stripe Payment Link flow, 30-min call agenda, what I deliver in week 1. Tiers: Solo and Shop. Tone from posterboy-copy.ts.
```

**Sales one-pager:**
```
From pasted growth plan + pricing, draft a 1-page PDF outline (markdown) I can give waiting clients. No hype. Approval-first. Include what's beta vs production-ready based on pasted docs.
```

**Merge decision:**
```
Compare pasted v2 vs thepostpal summaries. Recommend: deploy A, deploy B, or merge. Decision matrix: time to first payment, marketing quality, billing readiness, maintenance burden. 1 clear recommendation.
```

---

## Tips for browser Claude / ChatGPT

| Tip | Why |
|-----|-----|
| Paste **pricing.ts + copy.ts** every time | Stops wrong tier names |
| Say **today’s date** and **canonical repo** | Reduces drift |
| Paste **stripe-billing-setup.md** when discussing payments | Codex truth ≠ v2 code |
| Don’t paste `.env.local` | Secrets; say “keys exist locally” instead |
| One thread per track | Billing thread vs marketing thread stays cleaner |
| After report, paste **one** follow-up | Avoids generic sprawling plans |

---

## Related files in repo

- `docs/POSTERBOY-KNOWLEDGE-PROMPT.md` — same report, for **Cursor / Codex with repo access**
- `docs/CLAUDE-SESSION-HANDOFF.md` — paste into browser as context
- `~/Desktop/ventures/thepostpal/docs/` — Codex engineering docs (paste manually)
