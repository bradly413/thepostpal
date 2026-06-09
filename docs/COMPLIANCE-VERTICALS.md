# Posterboy Social — Compliance & Guardrail Taxonomy Rationale

> Source: research-backed taxonomy (Gemini), integrated + reviewed. The machine-readable
> registry lives in `scripts/seed-verticals.ts`; this doc is the regulatory rationale.

## Legal disclaimer & system positioning

*Posterboy Social provides AI-driven compliance **guardrails** and linguistic assistance to
help users adhere to general industry best practices. It does **NOT** provide legal advice.
Our "block," "warn," and "suggest" enforcement levels are algorithmic safeguards, **not a
guarantee** of legal, regulatory, or medical compliance. Users in highly regulated
industries (Pharma, Med-Spa, Lending, Real Estate, Finance) are responsible for their own
compliance and should subject all AI-generated content to their internal Legal/Medical/
Regulatory (LMR/MLR) review before publication.*

---

## 1. Real Estate & Housing
**Regulatory basis:** HUD (Fair Housing Act / FHA), CFPB (Truth in Lending Act / TILA, RESPA).
**Strategy:** prevent demographic steering and trigger-term violations.
- **FHA (Residential):** block/warn language expressing a preference based on race, color,
  religion, sex, handicap, familial status, or national origin — including proxies like
  "walking distance" (mobility) or "exclusive" (exclusion).
- **TILA (Mortgage — `block`):** blocks "trigger terms" (specific rate, "free money") that
  would legally require multi-page financial disclosures unfit for a social caption.

## 2. Healthcare, Pharma & Medical Sales
**Regulatory basis:** FDA (FD&C Act, OPDP), FTC Act §5, HIPAA, EEOC, DSHEA.
**Strategy:** enforce "Fair Balance," prevent off-label promotion, block promissory medical claims.
- **Pharma / Medical Device (`block`):** FDA requires Fair Balance (benefits balanced with
  risks / ISI). Blocks absolute claims ("cure," "100% safe") and unauthorized comparatives.
- **Hospital Recruiting (`warn`):** cross-references EEOC to prevent ageist/ableist hiring
  language while elevating nursing-recruitment vocabulary ("Magnet status," "shift-differential").
- **Dietary Supplements (`block`):** DSHEA — supplements may not claim to diagnose, treat,
  cure, or prevent any disease.

## 3. Beauty, Aesthetics & Personal Care
**Regulatory basis:** FTC Act (truth in advertising), FDA (cosmetics vs. drugs).
**Strategy:** substantiate claims; separate cosmetic from medical procedures.
- **Cosmetics / Skincare (`warn`):** FDA distinguishes cosmetics (cleanse/beautify) from
  drugs (affect structure/function); warns against drug-like claims ("cures acne").
- **Med-Spa (`block`):** injectables/lasers are medical (Class II/III devices); "risk-free"
  / "pain-free" claims on medical procedures are blocked to mitigate malpractice-marketing liability.

## 4. Financial & Wealth Services
**Regulatory basis:** FINRA (Rule 2210), SEC.
**Strategy:** eliminate promissory language.
- FINRA 2210 requires fair, balanced, non-misleading communications. Blocks guaranteed
  returns, minimized risk, or performance predictions ("can't lose").

## 5. Universal SMB (Hospitality, Fitness, Retail, Services)
**Regulatory basis:** FTC (truth in advertising); FDA Food Code (hospitality).
**Strategy:** elevate brand voice while preventing basic deceptive marketing.
- `suggest` tier nudges away from unsubstantiated objective claims ("voted #1 in the world")
  and high-liability phrasing — notably replacing "allergen-free" with "allergy-friendly"
  in restaurants to reduce severe food-allergy liability.

---

## Integration notes
- Four standalone real-estate banned words from the source (`white`, `black`, `asian`,
  `hispanic`) were dropped: our word-boundary matcher would false-flag innocent listings
  ("white cabinets," "black granite"). Multi-word steering phrases and clearly-problematic
  terms are retained. Context-aware detection of those is a future enhancement.
- `enforcementLevel` is inherited as the **strictest** value along the parent chain; a tenant
  also inherits the **union** of all `bannedPhrases` from its ancestors.
