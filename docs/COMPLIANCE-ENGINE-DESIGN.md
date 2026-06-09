# Compliance & Brand Guardrail Engine — Design Proposal

**Status:** DRAFT for review. Nothing in this proposal is applied — no migration is run,
no live code path is changed. The accompanying prototype (`src/lib/compliance/guardrails.ts`)
is a standalone module, not yet wired into the AI routes.

---

## 1. Vision — a universal capability, not an enterprise niche

Posterboy already enforces per-tenant brand voice via `weSay` / `weDontSay`
(`brand-book-schema.ts` → persisted as `bannedPhrases` / `preferredPhrases`). This
proposal generalizes that into a **universal guardrail engine** that keeps **every
business on-brand and out of trouble** — the same machinery, dialed to each industry:

| Industry | Guardrail it gets | Enforcement |
|----------|-------------------|-------------|
| **Real estate** | Fair Housing steering language ("safe neighborhood", "perfect for families", "exclusive area") | `warn` |
| **Beauty / cosmetics** | FTC claim substantiation ("clinically proven", "anti-aging cure") | `warn` |
| **Hospitality / restaurants / salons** | brand voice + light health/allergen nudges | `suggest` |
| **Medical / pharma** | FDA off-label, fair balance, "cure / guaranteed / 100% safe" | `block` + mandatory approval |

> **Positioning:** *"Posterboy keeps every business on-brand and out of trouble —
> whether that's Fair Housing for a realtor, FTC for a salon, or FDA for a pharma rep."*

The regulated verticals are the **premium showcase** (highest willingness-to-pay,
`block`-tier), but the engine ships to the whole network. We **widen** the funnel, not
narrow it.

> ⚠️ **Liability framing (decision required):** market this as **"compliance guardrails +
> enforced review,"** never **"guaranteed compliance."** We *block risky language and route
> to human approval*; we do not *guarantee regulatory outcomes*. Enterprises in regulated
> space expect human-in-the-loop (pharma MLR review) — it's a feature, not a gap. Our
> existing **Command-tier approval pipeline already is an MLR workflow.**

---

## 2. Data model — Parent-Child Vertical Seed Registry

There are currently **no `Industry`/`Vertical` Prisma models** — the taxonomy is a TS seed
registry (`src/lib/verticals.ts`) and guardrails live in the per-tenant brand book. This
proposal introduces a **DB-backed registry** so legal/ops can update blacklists without a
code deploy, and it's auditable.

```prisma
model VerticalSeed {
  id        String  @id @default(cuid())
  slug      String  @unique
  name      String
  parentId  String?
  parent    VerticalSeed?  @relation("Hierarchy", fields: [parentId], references: [id])
  children  VerticalSeed[] @relation("Hierarchy")

  bannedPhrases    String[]   // weDontSay — parent = non-negotiable, inherited by children
  preferredPhrases String[]   // weSay — child execution vocabulary
  enforcementLevel String     @default("suggest")   // "block" | "warn" | "suggest"
  regulatoryBody   String?    // "FDA" | "FTC" | "HUD/Fair Housing" | null
  complianceNotes  String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([parentId])
}
```

**Resolution rule:** a tenant's effective guardrails =
- `preferredPhrases` from their **leaf** vertical, plus
- the **union of `bannedPhrases` walking the entire parent chain**, plus
- the **strictest `enforcementLevel`** encountered along the chain.

So a `Medical Sales` child automatically inherits `Universal Healthcare`'s blacklist and
`block` level; a `Residential Real Estate` child inherits `Real Estate`'s Fair Housing list
at `warn`.

Example hierarchy:
```
Real Estate (warn, HUD/Fair Housing)
├── Residential Sales
└── Commercial
Healthcare (block, FDA)
├── Pharma Sales        (weSay: "clinical trials", "indicated for")
└── Hospital Recruiting (weSay: "shift-differential", "BSN", "RN")  ← inherits FDA blacklist, but HR-flavored
Beauty (warn, FTC)
├── Cosmetics / Skincare
└── Salon / Services
Hospitality (suggest)
├── Restaurants
└── Hotels
```

---

## 3. Runtime enforcement — the actual engine 🦷

Seeding the hierarchy is the easy half. The **engine** is enforcement at generation time.
Hook point: `src/lib/ai-brand-context.ts` (already feeds `/api/ai` + `/api/ai/captions`).

Flow per generation:
1. **Resolve** the tenant's guardrails from their vertical (`resolveGuardrails`).
2. **Inject** them into the system prompt (`guardrailsPromptBlock`) — `NEVER use` for
   `block`, `Avoid` for `warn`/`suggest`.
3. **Post-validate** the model output (`checkViolations`).
4. **Decide** (`enforcementDecision`):
   - `block` → regenerate (up to N times) within compliance; surface to MLR approval.
   - `warn` → return the content **plus** a compliance flag the UI shows.
   - `suggest` → return content; soft on-brand note.

Prototype of steps 1–4: `src/lib/compliance/guardrails.ts` (pure, testable, **not yet
wired**). Wiring it into `ai-brand-context.ts` + the AI routes is **phase 2**, after review.

---

## 4. Migration & rollout plan

1. **Phase 0 (this doc):** design + draft migration + enforcement prototype — review only.
2. **Phase 1:** apply the additive `VerticalSeed` migration (nullable everywhere; zero impact
   on existing tenants). Seed the universal taxonomy (the whole network: real estate,
   hospitality, beauty, medical, restaurants…). Backfill: map each tenant's existing industry
   to a `VerticalSeed.slug`.
2. **Phase 2:** wire `guardrails.ts` into `ai-brand-context.ts` + `/api/ai` + `/api/ai/captions`;
   default `enforcementLevel: "suggest"` so existing tenants see only gentle nudges (no
   behavior shock).
3. **Phase 3:** UI — compliance flags in the composer, `block`-tier → approval routing
   (reuse Command-tier pipeline = MLR), an admin editor for legal to maintain blacklists.
4. **Phase 4:** per-vertical packaging/pricing — `block`-tier (regulated) as a premium add-on.

---

## 5. Decisions for Brad

1. Confirm **"guardrails + review," not "guaranteed compliance"** (liability).
2. First verticals to seed (suggest: Real Estate/Fair Housing, Healthcare/FDA → Pharma Sales +
   Hospital Recruiting, Beauty/FTC for Athena, Hospitality).
3. Is the DB-backed registry the right call vs. keeping it in TS (`verticals.ts`)? (Recommend
   DB: legal can edit without a deploy + audit trail.)
4. Default enforcement for **non-regulated** tenants — `suggest` (recommended) vs `warn`.
