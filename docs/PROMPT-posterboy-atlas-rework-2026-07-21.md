# Fable prompt — Posterboy Social premium product-led rework (codebase-true)

> Paste everything inside the fenced block below into Fable. It is written against the ACTUAL
> Posterboy codebase and business state, not the public marketing surface. The differences from a
> "read the live site and guess" prompt are deliberate — see the reality notes after the block.

---

```
Recommended model and effort: Claude Fable 5 with xhigh effort.

You are working directly on the Posterboy Social website and its connected product codebase.

Public site: https://www.posterboysocial.com
Repository: this checkout (Next.js 16.2.6 App Router, React 19, TypeScript, Tailwind v4, GSAP 3.15,
Neon Postgres + Prisma with app-managed row-level security). The marketing site lives in the same
repo under the (marketing) route group; the product dashboard lives under /dashboard.
Strategic reference only: https://www.atlasbranding.com

This is an implementation task, not a strategy presentation. Inspect the real code and product
behavior, make the changes, verify them, and continue until the site is complete and verified.

THE OUTCOME

Turn Posterboy Social into a premium, product-led SaaS website that attracts the right
local-business customers, demonstrates the actual product honestly, moves visitors into a useful
first experience, and is ready to convert them into paid Solo and Command customers WHEN the paid
rail is live. Borrow Atlas's strategic architecture — strong category positioning, clear pathways,
persistent conversion, proof presented early, deep pages for high-intent search, a clean primary/
secondary/tertiary CTA hierarchy, every page leading somewhere useful. Do NOT copy Atlas's visual
identity, copy, layouts, code, animations, client logos, awards, press, or scarcity language. Atlas
is a high-touch agency; Posterboy is a software product. Adapt the principles to Posterboy's real
model.

READ THIS FIRST — THE ACTUAL STATE OF THE BUSINESS (do not contradict it)

Posterboy is PRE-REVENUE. As of now: zero paying customers, no live Stripe billing rail in
production, and only a handful of internal/demo organizations. The product is real and working, but
the business has NOT converted a paid subscription yet. This governs everything:

- Do not fabricate traction. No customer counts, no logos, no testimonials, no ratings, no revenue
  or engagement numbers, no "trusted by," no awards, no press. If it isn't real, it does not go on
  the site. Build trust the honest way: real product demonstrations, real interface views,
  before/after of the actual generate-to-schedule flow, and a genuine founder story.
- The job is to make the site TRUE and conversion-ready for the first real customers — not to make
  it look like a company that already has hundreds. A pre-launch product can look premium and
  credible without pretending.
- Pricing and plans may be presented, but every price, limit, trial rule, and entitlement must be
  verified against the code and the plan config — not invented, and not lifted from the public site
  if the code disagrees. Where the paid rail is not live, wire the correct configuration point and
  clearly report it as owner input still required. Do NOT stand up or change live billing.

WHEN YOU HAVE ENOUGH INFORMATION TO ACT, ACT

Inspect before you build: the (marketing) route group and its section components, the /dashboard
product surfaces, src/lib/plan-features.ts (the single source of truth for Solo vs Command),
GET /api/me (returns the live Organization.plan), the publish pipeline (src/lib/cron-publish.ts,
/api/cron/publish, /api/meta/*), the Studio image flow (/dashboard/studio, /api/generate-image),
the auth/tenancy layer (src/lib/auth.ts, withTenantDb, resolveAccess), the signup flow, the Privacy
Policy and Terms, analytics wiring, environment usage, sitemap/robots, and existing redirects. Use
the repository and real product behavior as the source of truth. Use the live site and the Atlas
reference only to understand presentation and the type of funnel being built.

Do not stop after producing a plan. Do not ask permission for ordinary, reversible changes that
follow from this request. Pause only for something only the owner can provide: a production
credential, authorization to deploy or to touch billing, a real social profile URL that cannot be
found, verified proof/testimonials, legal approval, or an irreversible production action. When a
missing input does not block the larger task, create the correct configuration point, finish the
rest, and list the remaining input in the final report.

HARD CONSTRAINTS FROM THE CODEBASE (violating any of these breaks production)

1. Publish-status convention — do not change it and do not let marketing copy misrepresent it:
   - approved = the internal cron publish queue (/api/cron/publish, every 5 min)
   - publishing = cron's in-flight claim (server-only; stale claims sweep to failed)
   - scheduled = legacy Meta-native scheduling only; the cron never dispatches it; never write it
     for new posts
   - failed = surfaced on drafts/calendar with errorLog + Retry; publishedPlatforms[] records
     partial success so retries never double-post
   Any schema change here requires the prod migration applied BEFORE the migration-dependent code
   reaches main, because main auto-deploys. If you cannot apply a prod migration, do not merge the
   dependent code — report it.

2. Plan model — Solo vs Command. Command is the Prisma house_account role; there is no "command"
   enum. plan-features.ts is the single source of truth; /api/me returns the live plan;
   usePlan()/PlanProvider drive gating. There is a known entitlement gap: a ?plan=command query
   param currently grants house_account WITHOUT payment. This is a bug to fix, not a feature to
   surface. Do not build marketing flows that depend on it, and flag it if you touch that path.

3. Design system — WARM-LIGHT is canonical. Brand red #ee2532 (deep #c81e2a), success green
   #1f9d4d, frosted-glass cards, sans body type. The serif (Instrument Serif) is LOGO-ONLY — never
   on page or section titles. No emojis in UI. The OLD dark/gold system (#D4A853, bg #0c0c0e) is
   retired — do not reintroduce it. Do not import Atlas's design language.

4. The marketing site is currently a FORK of The Restaurant Creatives' "Codex" page shell with
   duplicated CSS and token drift (a leaked --accent: #E1062C and --ink drift fighting the correct
   #ee2532 / warm-light tokens). De-forking is the first structural task: extract a real Posterboy
   token layer, kill the leaked foreign red, and remove orphaned TRC section components. Do not add
   more overrides on top of the fork — replace it.

5. Deploy safety — main auto-deploys to Vercel project angie-social-portal, but the auto-deploy
   webhook has been unreliable; the reliable path is a manual `vercel deploy --prod --scope
   bradly413s-projects`. Agents cannot set production env vars or run prod migrations — the owner
   does that. Do not deploy to production, change DNS, or alter production data without explicit
   authorization. Verify with ./scripts/smoke-prod.sh and the launch-check skill; never announce
   something as live without running them.

6. Shared working tree — Cursor and Claude share this checkout. Check the current branch, commit
   early, and do not leave uncommitted WIP that another tool could stash or clobber. If there is an
   uncommitted calendar/composer batch present, commit it before large edits.

CORE BRAND

Posterboy is social media for people who would rather be running their business. Preserve and
deepen the real point of view: "You run the place. We'll run the feed." "Built by Bradly for his
mom." A calm product for busy owners; posts written in the business's own voice; a rough note
becoming a finished, scheduled post; a useful weekly calendar instead of another dashboard. It
should feel calm, premium, dry, human, product-led, and more useful than "AI-powered."

Avoid generic SaaS language: supercharge, unlock growth, revolutionary AI, effortless engagement,
seamlessly scale, all-in-one, leverage cutting-edge, transform your strategy, dominate, 10x,
autopilot, game-changing. Do not make "AI" the value proposition — AI is the implementation detail.
The customer wants something worth saying, a post that sounds like them, an image that fits, a
calendar that is already moving, fewer blank screens, and confidence the business doesn't look
abandoned online.

PRODUCT TRUTH MATRIX (build this before writing a single marketing claim)

For every capability the site might claim, classify it as: shipped-and-verified, shipped-but-beta,
plan-gated, configured-but-not-production-ready, or not-built. Verify against the code, not the
current marketing page. Known ground truth to respect:

- Facebook and Instagram publishing via Meta: real. Do not claim TikTok, LinkedIn, X, Pinterest,
  YouTube, or Google Business Profile unless the code actually implements them.
- Caption generation (Claude), brand-voice context, Gemini image generation, Leonardo upscale/
  remove-bg, the calendar, the internal cron publish queue, approvals, multi-location Command: real
  — but verify current limits and behavior rather than asserting them.
- Image-to-video (Kling): built and auth-verified but BLOCKED on a $0 provider balance. It is NOT a
  shipped feature. Do not advertise video generation until the balance is funded and it is verified.
- The paid billing rail is not live in production. Any trial/subscription claim must match reality:
  if there is no working no-card trial and no active Stripe products, do not present them as
  functioning — wire the config, disable the incomplete path, and report it.

Publicly claim only what the product can deliver today. Complete a claimed-but-incomplete feature
only if it is clearly in scope and safe; otherwise narrow, relabel, or remove the claim. Do not call
a feature verified because a UI component exists. Resolve contradictions between homepage, pricing,
feature pages, signup, plan entitlements, Privacy Policy, and Terms — including the current mismatch
where the legal pages describe a closed beta while the site markets ordinary paid plans. Do not let
the marketing site outrun the product.

CONVERSION ARCHITECTURE

Three clearly separated paths, with a consistent CTA hierarchy site-wide.

- Primary CTA: START FREE TRIAL — persistent in desktop nav and mobile menu, leading to one
  canonical signup route. Only present a no-card trial if the signup flow actually supports it;
  otherwise use the accurate primary action the flow does support and report the gap.
- Secondary CTAs: DRAFT MY WEEK (the free tool, IF it exists — verify before building a funnel on
  it), SEE HOW IT WORKS, WATCH THE PRODUCT WORK, VIEW EXAMPLES, EXPLORE COMMAND.
- Tertiary CTAs: SIGN IN, TALK TO US, EMAIL SUPPORT, TALK TO BRC.

Solo stays simple and product-led — never put a long qualification form in front of the Solo trial.
Command (Prisma house_account) may be self-serve or sales-assisted depending on what the code and
the not-yet-live billing rail actually support; use a short qualification flow only where setup,
contracts, or SSO genuinely require it. BRC Custom (the Bradly Robert Creative service layer) is a
separate, clearly labeled path — it is NOT a third software tier and must not compete with the Solo
trial on every page. Every page needs a real next step: no dead ends, no empty or "#" hrefs, no
unconfigured social icons, no plan selection that gets dropped through signup.

NAVIGATION AND ROUTES

Simplify to a product-led structure (Product, Solutions, Examples, Pricing, plus Sign In and Start
Free Trial). Audit existing URLs before renaming anything; where a route must change, add a
permanent redirect, update canonical + internal links + sitemap, and confirm the old URL is not left
a 404. Authenticated routes (sign-in, signup, onboarding, dashboard, settings, billing, internal
tools, preview URLs) must be excluded from indexing. Create only pages you can fill with substantial,
accurate content — no thin doorway or empty "coming soon" pages.

Retain an industry/solution page only when the product provides a real, useful workflow for it and
there is enough original content to justify the page. Do not claim a vertical focus just because an
industry name scrolls by in an animated list; audit search value, real product fit, and content
quality, then consolidate or redirect the rest.

HOME PAGE

Rebuild the home from clean, purpose-built section components (part of de-forking from the TRC
shell), in roughly this order: (1) hero — keep "You run the place. We'll run the feed.", primary
trial CTA, secondary free-tool/see-it-work CTA, a genuine product visual, honest platform reference;
(2) product proof — the real transformation: rough note → brand voice applied → caption drafted →
image generated or uploaded → lands on the calendar → approved → scheduled/published, using real
product behavior (if a live generator is embedded, rate-limit and protect the endpoint; if it cannot
be safely exposed, use a clearly labeled deterministic walkthrough — never call a scripted animation
a live engine); (3) Made with Posterboy — image-led examples, each labeled accurately as product
sample / internal demo / BRC example (never implied to be a paying customer's campaign); (4) the
honest comparison (DIY vs scheduler vs agency vs going quiet vs Posterboy), dry and confident, no
invented competitor prices; (5) how it works, using the real product sequence, no unverified
"set up in N minutes"; (6) feature system, pairing any branded name with a plain descriptor;
(7) a limited set of real solutions, each linking to a substantial page; (8) Command for multi-
location; (9) honest trust signals only; (10) pricing; (11) FAQ; (12) final CTA. Bring proof and the
product forward — do not open with a wall of feature claims.

PRODUCT, SOLUTIONS, PRICING, FREE TOOL, STORY, SIGNUP

Build substantial product pages only for shipped capabilities (Brand Voice, Posterboy Studio,
Calendar & Scheduling, Publishing, Approvals, Command). Make each solution page distinct through
real workflows, sample content, and product screenshots — not one template with the nouns swapped.
For Pricing, centralize every plan value (price, annual math, trial rule, profiles, users,
locations, limits, support) in one config source, verify it against the code, keep plan selection
intact through signup, and cleanly separate BRC Custom. Translate infrastructure language (e.g.
tenant isolation) into customer value while keeping any security claim accurate; do not use internal
terms as headline benefits. If a free "what to post this week" tool exists, make it a strong,
low-friction acquisition asset (rate-limited, protected endpoint, accessible states, leads into the
trial without gating the result behind an email) — but confirm it exists first. Build the Story page
around "Built by Bradly for his mom" and the real BRC relationship; do not invent a team. Audit the
full signup-to-first-result flow, collect only what is needed before value, preserve UTM/referral
attribution through signup, and let the user reach a useful first draft where the architecture
allows — without faking a Meta connection the product cannot make.

SEO, ANALYTICS, SECURITY, PRIVACY, ACCESSIBILITY, PERFORMANCE, MOTION

Build a focused topical structure around the product's real capabilities and buyer intent (social
media tool for local businesses; for restaurants / real estate / credit unions / trades / salons /
nonprofits where a real workflow exists; multi-location social management; approval workflow; brand-
voice generator; Facebook + Instagram scheduling; what to post this week). No keyword stuffing, no
city-spam, no near-duplicate industry pages. Every indexable page: one semantic H1, logical heading
order, unique title + meta description, canonical, Open Graph + social card, descriptive internal
links and alt text. Technical SEO: valid sitemap, robots, correct production origin, consistent
canonicals, custom 404, no accidental noindex, authenticated routes excluded. Structured data only
where accurate (Organization, WebSite, SoftwareApplication/Product/Offer matching real pricing,
BreadcrumbList, Article, FAQPage for visible FAQs) — never fake ratings, reviews, counts, or offers.

Analytics: use the existing provider if one is wired; otherwise a provider-neutral event layer
behind env config (no hardcoded IDs). Track meaningful marketing and activation events, preserve
UTM/referrer through signup, and NEVER send PII or generated content (names, emails, phones,
business names, prompts, captions, upload URLs, open-text) to analytics. Update the Privacy Policy to
describe what is actually collected; add consent handling only if the implemented tracking requires
it. Security: no secrets in client code; server-side validation; safe file-upload handling; OAuth
state and Meta callback validation; token storage as implemented; rate limiting; safe external
links; redacted logs. Do not claim SOC 2, HIPAA, "bank-grade," or any certification that is not
documented and real. Accessibility: target practical WCAG 2.2 AA — semantic landmarks, keyboard
nav, visible focus, labeled forms with accessible errors, alt text, contrast, reduced-motion
support, no hover-only or color-only meaning; do not claim perfect compliance. Performance: protect
Core Web Vitals — do not ship the product app bundle or GSAP to pages that don't need them; no
blocking intro animation. Motion: preserve and polish the existing cinematic GSAP language where it
adds hierarchy; no scroll hijacking, no constant motion, respect prefers-reduced-motion, clean up
contexts/ScrollTriggers, keep content available without JS, and never let animation hide content or
cause layout shift.

ENGINEERING AND EXECUTION

Work with the existing architecture unless it genuinely blocks completion. Read files before
editing, make targeted changes, reuse working components, centralize navigation/footer/social/
contact/plan config, keep content editable, keep TypeScript accurate, avoid unnecessary
dependencies and speculative abstractions, and do not refactor working systems for taste. Preserve
working auth, billing hooks, and the publish pipeline. If parallel subagents are available, split
into: (1) product-truth + conversion + pricing/entitlement audit; (2) information architecture +
content + SEO; (3) design/GSAP + accessibility + performance; (4) security + privacy + analytics +
legal consistency; plus a fresh-context final verifier. Keep one coherent design and editorial
system across all of it. Do not commit or push unless the existing workflow authorizes it, and do
not create backup branches unless asked.

PROGRESS AND VERIFICATION

Before reporting anything, check each claim against a real tool result, file change, command output,
or browser result. Do not call a form, integration, or flow complete because the interface exists;
if it wasn't tested, say so. Inspect package.json and run the project's real scripts — lint,
typecheck, tests, production build (prisma generate is required in the build), and a browser smoke
test across desktop, laptop, tablet, and mobile widths. Verify every public route loads with a
correct status and single H1, unique metadata, working nav/footer/CTA links, plan-preserving pricing
CTAs, correct annual math, the free tool (if present) with rate limits and error states, signup/
login, and — only in a safe internal/test context, never charging a real customer and never touching
prod billing — the connect/draft/schedule paths. Confirm no authenticated routes are indexed,
sitemap/robots are valid, structured data validates, and there are no console errors, hydration
warnings, broken images, empty hrefs, fake URLs, placeholder/lorem/"coming soon" copy, unsupported
feature or platform claims, unverified security or compliance language, fabricated proof, or
leftover TRC/Atlas shell language. Grep the repo for TODO, FIXME, placeholder, coming soon, lorem,
href="#", example.com, fake analytics IDs, console.log, hardcoded secrets, hardcoded prices, stale
plan names, unconfigured social URLs, "closed beta," and copied Atlas language — and review each hit
rather than deleting blindly. Run ./scripts/smoke-prod.sh and the launch-check skill before treating
anything as production-ready.

BOUNDARIES

Do not clone Atlas or copy its copy/code/layout/animations/logos/awards/scarcity. Do not turn
Posterboy into an agency-first site or put a qualification wall in front of the Solo trial. Do not
fabricate customers, testimonials, metrics, ratings, awards, press, integrations, pricing, plan
entitlements, security certifications, social profiles, a phone number, or an address. Do not present
Kling video, a live no-card trial, or an active paid rail as working until each is real and verified.
Do not exploit or surface the ?plan=command unpaid-entitlement gap. Do not claim generated images are
real customer photography or encourage deceptive generated content. Do not change live billing,
charge real customers, run prod migrations, set prod env, deploy to production, or alter prod data
without explicit authorization. Do not reintroduce the retired dark/gold design system or the TRC
Codex fork. Do not end with a plan for unfinished work, and do not ask "should I continue?" while
reversible in-scope work remains.

FINAL RESPONSE

Lead with the result — the first sentence states what was completed. Then report: the strategic
transformation (how the site now attracts, demonstrates, activates, and is set up to convert Solo
and Command, with BRC Custom separated); routes and pages completed/consolidated/redirected/removed;
the product-truth outcome (claims verified, rewritten, removed, or still beta/blocked, including
Kling video and the billing rail); homepage and proof; the free tool; pricing and plan config; signup
and activation; SEO; analytics; security and privacy (including the closed-beta/paid-plan legal
reconciliation); accessibility, performance, and GSAP; and verification (exact commands run and
whether each passed, routes and flows tested, smoke/launch-check results, any warnings or failures).
Close with owner input still required — real social URLs, production analytics ID, billing
authorization and the live paid rail, verified proof/testimonials, legal review, trademark status,
Kling funding, Meta production credentials, and production deployment authorization. Write it for
someone who did not watch the work, in complete sentences, leading with outcomes, no hidden
reasoning, no closing promise of more work. End only when the work is complete and verified, or when
a remaining blocker genuinely requires information or authorization only the owner can provide.
```

---

## Why this is codebase-true (the corrections vs a "read the live site" prompt)

- **Pre-revenue reality is the spine.** The site is $0 MRR, 0 paying customers, no live Stripe rail,
  ~4 internal orgs. The pasted prompt assumed an active paid business with converting trials; this
  one forbids fabricated traction and reframes the goal as making the site *true and ready* for the
  first real customer.
- **Real publish-status convention** (`approved`/`publishing`/`scheduled`/`failed`,
  `publishedPlatforms[]`, migration-before-`main`) is stated as a hard constraint so Fable can't
  break the cron pipeline.
- **Real plan model:** Command = Prisma `house_account` (no `command` enum), `plan-features.ts` is
  the source of truth, and the **`?plan=command` unpaid-entitlement gap is named as a bug to fix,
  not a feature to expose.**
- **Real design system:** warm-light, `#ee2532`/`#c81e2a`, Instrument Serif logo-only, no emojis,
  retired dark/gold — and the **marketing site is a TRC Codex fork with a leaked `#E1062C`**, so
  de-forking is step one (this folds in the marketing-rebuild plan).
- **Real integrations only:** FB/IG via Meta, Gemini + Leonardo — and **Kling video is BLOCKED on a
  $0 balance**, so it's explicitly off-limits to advertise. No TikTok/LinkedIn/etc.
- **Real deploy safety:** `main` auto-deploys but the webhook is flaky → manual `vercel deploy
  --prod`; agents can't set prod env or migrate prod; verify with `smoke-prod.sh` + `launch-check`;
  don't charge real customers (there's no rail anyway).
- **The closed-beta vs paid-pricing legal mismatch** is called out as something to reconcile.

A couple of things I did **not** assume, and told Fable to verify rather than invent: the free
"Draft My Week" tool (the pasted prompt leaned hard on it — I don't have it confirmed in the code),
and the exact live trial/billing state. Those are wired as verify-then-report, not asserted.

**One guardrail before you run it:** if the calendar/composer batch is still uncommitted on `main`,
commit it first — this prompt authorizes broad edits across the shared tree.

Saved to [docs/PROMPT-posterboy-atlas-rework-2026-07-21.md](Code/thepostpal-readable-v2/docs/PROMPT-posterboy-atlas-rework-2026-07-21.md).

