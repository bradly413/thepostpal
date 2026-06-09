/**
 * Idempotent seed for the compliance & brand guardrail registry (VerticalSeed).
 *
 * Universal — covers the whole network: regulated showcase verticals (real estate,
 * healthcare, beauty) plus generic SMB parents so no tenant is boxed out. Upserts by
 * slug, so re-running is safe. Parents are upserted first, then children link to their
 * parent via a slug -> id lookup.
 *
 * Standalone admin seed (not tenant-scoped): uses a raw PrismaClient, NOT withTenantDb.
 *
 * Run: npm run seed:verticals  (against LOCAL — exports DATABASE_URL from .env.local)
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

// Parents first (no parentSlug), then children (parentSlug set). Order matters so
// the slug -> id map is populated before children resolve their parentId.
const PARENTS: SeedNode[] = [
  {
    slug: "real-estate",
    name: "Real Estate",
    enforcementLevel: "warn",
    regulatoryBody: "HUD/Fair Housing",
    bannedPhrases: [
      "safe neighborhood",
      "perfect for families",
      "exclusive area",
      "ideal for families",
      "no kids",
      "great for couples",
      "close to churches",
    ],
  },
  {
    slug: "healthcare",
    name: "Healthcare",
    enforcementLevel: "block",
    regulatoryBody: "FDA",
    bannedPhrases: [
      "cure",
      "guaranteed",
      "100% safe",
      "no side effects",
      "off-label",
      "miracle",
    ],
  },
  {
    slug: "beauty",
    name: "Beauty",
    enforcementLevel: "warn",
    regulatoryBody: "FTC",
    bannedPhrases: [
      "clinically proven",
      "anti-aging cure",
      "eliminates wrinkles",
      "FDA approved",
    ],
  },
  {
    slug: "hospitality",
    name: "Hospitality",
    enforcementLevel: "suggest",
  },
  // Generic SMB parents — keep everyone at "suggest" so nobody is boxed out.
  {
    slug: "local-services",
    name: "Local Services",
    enforcementLevel: "suggest",
  },
  {
    slug: "fitness",
    name: "Fitness",
    enforcementLevel: "suggest",
  },
  {
    slug: "professional-services",
    name: "Professional Services",
    enforcementLevel: "suggest",
  },
];

const CHILDREN: SeedNode[] = [
  // Real Estate
  { slug: "real-estate-residential-sales", name: "Residential Sales", parentSlug: "real-estate" },
  { slug: "real-estate-commercial", name: "Commercial", parentSlug: "real-estate" },

  // Healthcare
  {
    slug: "healthcare-pharma-sales",
    name: "Pharma Sales",
    parentSlug: "healthcare",
    preferredPhrases: ["clinical trials", "indicated for", "consult prescribing information"],
  },
  {
    slug: "healthcare-hospital-recruiting",
    name: "Hospital Recruiting",
    parentSlug: "healthcare",
    enforcementLevel: "warn",
    preferredPhrases: ["shift-differential", "BSN", "RN", "sign-on bonus", "nurse residency"],
  },

  // Beauty
  { slug: "beauty-cosmetics-skincare", name: "Cosmetics / Skincare", parentSlug: "beauty" },
  { slug: "beauty-salon-services", name: "Salon / Services", parentSlug: "beauty" },

  // Hospitality
  { slug: "hospitality-restaurants", name: "Restaurants", parentSlug: "hospitality" },
  { slug: "hospitality-hotels", name: "Hotels", parentSlug: "hospitality" },
  { slug: "hospitality-salons", name: "Salons", parentSlug: "hospitality" },
];

async function upsertNode(
  db: PrismaClient,
  node: SeedNode,
  parentId: string | null,
): Promise<string> {
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
      const id = await upsertNode(db, parent, null);
      slugToId.set(parent.slug, id);
    }

    for (const child of CHILDREN) {
      const parentId = child.parentSlug ? slugToId.get(child.parentSlug) ?? null : null;
      if (child.parentSlug && !parentId) {
        throw new Error(`Missing parent "${child.parentSlug}" for child "${child.slug}"`);
      }
      const id = await upsertNode(db, child, parentId);
      slugToId.set(child.slug, id);
    }

    const total = await db.verticalSeed.count();
    console.log(
      `Seeded ${PARENTS.length} parents + ${CHILDREN.length} children. VerticalSeed row count: ${total}`,
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
