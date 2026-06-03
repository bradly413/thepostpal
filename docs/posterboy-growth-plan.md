# posterboy Growth Plan

## Brand positioning

posterboy is a social media tool for people who would rather not. Core promise: **"The week is drafted. Approve it and go back to work."**

We do not compete on creator features, engagement gamification, or hustle language. We compete on calm, editorial workflow and higher ARPU through premium service tiers.

## Canonical voice rules

1. Witty, never zany.
2. Short sentences. Long thoughts.
3. Speak human, not "creator."
4. It is okay to be a little tired.

## Pricing architecture

### Public-facing tiers (low friction)

| Tier | Price | Role |
|------|-------|------|
| Solo | $24/mo | One business, twenty drafts/week, three platforms |
| Shop | $48/mo | Up to three businesses, unlimited drafts, Issues |
| Press | $120/mo | Agencies, unlimited brands, white-glove onboarding |

These tiers anchor the product in approachable self-serve pricing — similar entry points to Buffer, but with posterboy voice and approval-first workflow.

### Premium expansion tiers (higher ARPU)

| Tier | Price | Role |
|------|-------|------|
| Studio | from $399/mo | App drafts + human editorial pass |
| House Account | from $1,500/mo | Multi-location brand governance |
| BRC Custom | Quoted | Full brand system before posting starts |

**Why not "Enterprise"?** Generic SaaS language attracts the wrong buyer and wrong expectations. Studio, House Account, and BRC Custom describe what you actually get.

## Path to Buffer-like revenue

Buffer-scale revenue without Buffer-scale free users:

- **Higher ARPU** via Shop → Press → Studio → House Account upgrades
- **Service margin** on Studio and BRC Custom (Bradly Robert Creative)
- **Multi-location contracts** via House Account (franchises, brokerages, restaurant groups)
- **Activation focus**: customer approves ≥3 posts in first 7 days

## Main product objects

| Object | UI name | Purpose |
|--------|---------|---------|
| Draft | Drafts | Post awaiting review |
| Post | — | Published content |
| Issue | Issues | Weekly post bundle |
| DispatchItem | Dispatch | Scheduled slot |
| Approval | Press | Review action |
| Organization | Organization | Multi-location parent |
| Location | Location switcher | Per-site brand and drafts |
| BrandVoiceProfile | Brand intake | Tone, banned phrases, audience |

Implemented in `prisma/schema.prisma` (planned DB) and localStorage stores in `src/lib/*-store.ts` (current runtime).

## Core user flows

1. **Brand intake** → Organization + Location + Brand Voice Profile
2. **Weekly drafting** → Drafts in `needs_review`
3. **Review** → Press (approve) or Editor (revise)
4. **Dispatch** → Schedule approved drafts
5. **Issues** → Weekly bundle review
6. **House Account** → Organization dashboard, location switcher, corporate approval (minimal UI in `/dashboard/organization`)

## Activation metric

**Primary:** Customer approves at least 3 posts in the first 7 days.

Track via `Approval` records / draft status transitions to `approved` or `published`.

## Multi-location strategy

- Organization has many Locations
- Each Location has Brand Kit + Brand Voice Profile
- Campaigns distribute shared copy to selected locations as localized draft copies
- House Account tier unlocks organization dashboard and corporate approval

## Future roadmap

- [ ] Wire Prisma + PostgreSQL (replace localStorage)
- [ ] Stripe billing for Solo / Command (see `docs/stripe-billing-setup.md`)
- [ ] Studio workflow (human editorial queue)
- [ ] Meta publish from approved drafts
- [ ] Activation tracking dashboard
- [ ] Cloud media storage for production publish

## Language guardrails

Never use: crush it, go viral, hustle, streak, level up, content creator, influencer, growth hack, gamify.

Always prefer: Drafts, The Editor, Dispatch, Issues, Press.

Product name is always lowercase: **posterboy**.
