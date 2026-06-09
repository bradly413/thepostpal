/**
 * Authoritative seed for the compliance & brand guardrail registry (VerticalSeed).
 *
 * Source data: research-backed taxonomy (Gemini) — see docs/COMPLIANCE-VERTICALS.md
 * for the regulatory rationale (HUD/FHA, TILA, FDA/OPDP, DSHEA, FTC, FINRA 2210,
 * EEOC, Food Code) and the legal-positioning disclaimer.
 *
 * AUTHORITATIVE: upserts the taxonomy below, then deletes any VerticalSeed row whose
 * slug is NOT in this set — so re-running fully replaces the registry. Safe because
 * Organization.verticalSlug is a plain string (no FK); a dangling slug just resolves
 * to no guardrails. Parents first, then children link via slug -> id.
 *
 * Integrator note: a few real-estate banned terms from the source ("white","black",
 * "asian","hispanic") were dropped — as standalone words our word-boundary matcher
 * would false-flag innocent listings ("white cabinets","black granite"). Multi-word
 * steering phrases + clearly-problematic terms are kept. Nuanced/context-aware
 * detection of those is a future enhancement.
 *
 * Standalone admin seed (raw PrismaClient, NOT withTenantDb).
 * Run: npm run seed:verticals  (exports DATABASE_URL from .env.local for LOCAL).
 */
import { PrismaClient } from "@prisma/client";

type EnforcementLevel = "block" | "warn" | "suggest";

interface SeedNode {
  slug: string;
  name: string;
  parentSlug?: string;
  bannedPhrases?: string[];
  preferredPhrases?: string[];
  enforcementLevel?: EnforcementLevel;
  regulatoryBody?: string;
  complianceNotes?: string;
}

const PARENTS: SeedNode[] = [
  {
    slug: "real-estate-parent",
    name: "Real Estate & Housing",
    enforcementLevel: "warn",
    regulatoryBody: "HUD (Fair Housing Act)",
    bannedPhrases: [
      "exclusive neighborhood", "safe neighborhood", "ideal for families", "perfect for singles",
      "empty nesters", "walking distance", "active lifestyle", "traditional neighborhood",
      "christian", "jewish", "catholic", "mosque", "church",
      "no kids", "adults only", "bachelor pad", "physically fit",
    ],
    preferredPhrases: [
      "convenient access to", "spacious", "quiet street", "great location", "welcome",
      "equal housing opportunity", "accessible",
    ],
    complianceNotes:
      "HUD prohibits demographic steering or language implying a preference for/against protected classes (race, religion, familial status, disability).",
  },
  {
    slug: "healthcare-parent",
    name: "Healthcare & Pharma",
    enforcementLevel: "block",
    regulatoryBody: "FDA / FTC / HIPAA",
    bannedPhrases: [
      "cure", "guaranteed outcome", "100% safe", "miracle", "risk-free", "completely safe",
      "no side effects", "better than", "proven to cure", "instant healing",
    ],
    preferredPhrases: [
      "may help", "supports", "clinically studied", "ask your doctor", "treatment options",
      "patient care", "consult a healthcare professional",
    ],
    complianceNotes:
      "Base FDA/FTC block list. Prohibits absolute claims, guarantees, and unauthorized comparative-superiority claims.",
  },
  {
    slug: "beauty-parent",
    name: "Beauty & Personal Care",
    enforcementLevel: "warn",
    regulatoryBody: "FTC / FDA",
    bannedPhrases: ["permanent", "miracle anti-aging", "cures acne", "heals", "medical grade"],
    preferredPhrases: [
      "improves the appearance of", "visibly reduces", "dermatologist-tested", "formulation", "prestige",
    ],
    complianceNotes:
      "Cosmetics cannot make drug-like claims (altering the body's structure/function); claims must be substantiated.",
  },
  {
    slug: "finance-parent",
    name: "Financial & Wealth Services",
    enforcementLevel: "block",
    regulatoryBody: "FINRA / SEC",
    bannedPhrases: [
      "guaranteed returns", "risk-free investment", "can't lose", "get rich quick",
      "sure thing", "promise to double", "no risk",
    ],
    preferredPhrases: [
      "wealth management", "financial planning", "historical performance", "investment strategies",
      "portfolio diversification",
    ],
    complianceNotes:
      "FINRA Rule 2210 prohibits promissory language, guarantees, or downplaying the inherent risks of investing.",
  },
  {
    slug: "smb-parent",
    name: "General SMB & Local Business",
    enforcementLevel: "suggest",
    regulatoryBody: "FTC (Truth in Advertising)",
    bannedPhrases: ["best in the world", "voted #1 anywhere", "guaranteed cheapest"],
    preferredPhrases: [
      "local favorite", "community trusted", "premium quality", "satisfaction guarantee (see terms)",
    ],
    complianceNotes: "General FTC guidance against deceptive advertising and unsubstantiated objective claims.",
  },
];

const CHILDREN: SeedNode[] = [
  // Real Estate & Housing
  {
    slug: "real-estate-residential",
    name: "Residential Real Estate",
    parentSlug: "real-estate-parent",
    enforcementLevel: "warn",
    regulatoryBody: "HUD / Local MLS",
    bannedPhrases: ["guaranteed approval", "no credit check"],
    preferredPhrases: ["move-in ready", "open floor plan", "natural light", "schedule a tour", "just listed"],
    complianceNotes: "Focuses on property features, avoiding all buyer-demographic profiling.",
  },
  {
    slug: "real-estate-mortgage",
    name: "Mortgage & Lending",
    parentSlug: "real-estate-parent",
    enforcementLevel: "block",
    regulatoryBody: "CFPB (TILA/RESPA)",
    bannedPhrases: ["guaranteed lowest rate", "free money", "no fees", "fixed rate for life", "instant approval"],
    preferredPhrases: ["competitive rates", "pre-qualification available", "explore your options", "NMLS #"],
    complianceNotes:
      "Truth in Lending Act: trigger terms (specific rates) require heavy disclosures. Blocked to prevent trigger-term violations in captions.",
  },

  // Healthcare & Pharma
  {
    slug: "pharma-sales",
    name: "Pharmaceutical Sales",
    parentSlug: "healthcare-parent",
    enforcementLevel: "block",
    regulatoryBody: "FDA (OPDP)",
    bannedPhrases: ["off-label", "safe for everyone", "eliminates"],
    preferredPhrases: [
      "efficacy", "clinical trials", "FDA-approved", "mechanism of action", "ISI", "Important Safety Information",
    ],
    complianceNotes:
      "High-risk. Must maintain Fair Balance (risks presented with benefits); blocked from off-label claims.",
  },
  {
    slug: "hospital-recruiting",
    name: "Hospital & Healthcare Recruiting",
    parentSlug: "healthcare-parent",
    enforcementLevel: "warn",
    regulatoryBody: "EEOC",
    bannedPhrases: ["young and energetic", "recent graduates only", "digital native", "perfect health"],
    preferredPhrases: [
      "shift-differential", "BSN", "RN", "Magnet status", "sign-on bonus", "EOE",
      "equal opportunity employer", "join our care team",
    ],
    complianceNotes:
      "Avoids age/disability discrimination in hiring while leaning into premium nursing-recruitment vocabulary.",
  },
  {
    slug: "supplements-wellness",
    name: "Dietary Supplements & Wellness",
    parentSlug: "healthcare-parent",
    enforcementLevel: "block",
    regulatoryBody: "FDA / FTC",
    bannedPhrases: ["treats", "prevents", "cures disease", "reverses", "diagnoses"],
    preferredPhrases: ["supports", "promotes", "maintains", "dietary supplement", "overall wellness"],
    complianceNotes: "DSHEA: supplements cannot claim to diagnose, treat, cure, or prevent any disease.",
  },

  // Beauty & Personal Care
  {
    slug: "beauty-med-spa",
    name: "Med-Spa & Aesthetic Clinics",
    parentSlug: "beauty-parent",
    enforcementLevel: "block",
    regulatoryBody: "FDA / State Medical Boards",
    bannedPhrases: ["pain-free", "permanent results", "risk-free injections", "cheap botox"],
    preferredPhrases: ["board-certified", "consultation", "FDA-cleared", "aesthetic treatments", "rejuvenation"],
    complianceNotes:
      "Injectables (Botox, fillers) are medical procedures; strict blocking of pain-free/risk-free claims.",
  },

  // SMB
  {
    slug: "smb-hospitality",
    name: "Restaurants & Hospitality",
    parentSlug: "smb-parent",
    enforcementLevel: "suggest",
    regulatoryBody: "FDA (Food Code) / Local Health",
    bannedPhrases: ["100% allergen-free", "zero calories", "cures hangovers"],
    preferredPhrases: ["allergy-friendly", "gluten-friendly", "scratch-made", "chef-curated", "locally sourced"],
    complianceNotes:
      "Mitigates food-allergy liability — 'allergy-friendly' is far safer than 'allergen-free'.",
  },
];

async function upsertNode(db: PrismaClient, node: SeedNode, parentId: string | null): Promise<string> {
  const data = {
    name: node.name,
    parentId,
    bannedPhrases: node.bannedPhrases ?? [],
    preferredPhrases: node.preferredPhrases ?? [],
    enforcementLevel: node.enforcementLevel ?? "suggest",
    regulatoryBody: node.regulatoryBody ?? null,
    complianceNotes: node.complianceNotes ?? null,
  };
  const row = await db.verticalSeed.upsert({
    where: { slug: node.slug },
    create: { slug: node.slug, ...data },
    update: data,
  });
  return row.id;
}

async function main() {
  const db = new PrismaClient();
  try {
    const slugToId = new Map<string, string>();

    for (const parent of PARENTS) {
      slugToId.set(parent.slug, await upsertNode(db, parent, null));
    }
    for (const child of CHILDREN) {
      const parentId = child.parentSlug ? slugToId.get(child.parentSlug) ?? null : null;
      if (child.parentSlug && !parentId) {
        throw new Error(`Missing parent "${child.parentSlug}" for child "${child.slug}"`);
      }
      slugToId.set(child.slug, await upsertNode(db, child, parentId));
    }

    // Authoritative: drop any row not in the current taxonomy (replaces old draft slugs).
    const validSlugs = [...PARENTS, ...CHILDREN].map((n) => n.slug);
    const removed = await db.verticalSeed.deleteMany({ where: { slug: { notIn: validSlugs } } });

    const total = await db.verticalSeed.count();
    console.log(
      `Seeded ${PARENTS.length} parents + ${CHILDREN.length} children; removed ${removed.count} stale. VerticalSeed row count: ${total}`,
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
