-- ============================================================================
-- DRAFT MIGRATION — NOT APPLIED. Review only.
-- ============================================================================
-- This file intentionally lives in docs/drafts/ (NOT prisma/migrations/) so it
-- is never picked up by `prisma migrate deploy`. When approved, the model goes
-- into prisma/schema.prisma and we generate the real migration with
-- `prisma migrate dev --name vertical_seed_registry`.
--
-- It is fully ADDITIVE: a brand-new table with a nullable self-relation. Zero
-- impact on any existing table, row, or tenant. Safe to apply at any time.
-- ============================================================================

CREATE TABLE "VerticalSeed" (
    "id"               TEXT NOT NULL,
    "slug"             TEXT NOT NULL,
    "name"             TEXT NOT NULL,
    "parentId"         TEXT,                                  -- self-relation (NULL = top-level parent)
    "bannedPhrases"    TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],   -- weDontSay (inherited up the chain)
    "preferredPhrases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],   -- weSay (leaf vocabulary)
    "enforcementLevel" TEXT NOT NULL DEFAULT 'suggest',       -- 'block' | 'warn' | 'suggest'
    "regulatoryBody"   TEXT,                                  -- 'FDA' | 'FTC' | 'HUD/Fair Housing' | NULL
    "complianceNotes"  TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerticalSeed_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VerticalSeed_slug_key" ON "VerticalSeed"("slug");
CREATE INDEX "VerticalSeed_parentId_idx" ON "VerticalSeed"("parentId");

ALTER TABLE "VerticalSeed"
    ADD CONSTRAINT "VerticalSeed_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "VerticalSeed"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Optional later: ALTER TABLE "Organization" ADD COLUMN "verticalSlug" TEXT;
-- (links a tenant to its leaf VerticalSeed for guardrail resolution)

-- ----------------------------------------------------------------------------
-- Illustrative seed (NOT part of the migration — shows the parent-child shape):
-- ----------------------------------------------------------------------------
-- INSERT INTO "VerticalSeed" (id, slug, name, "enforcementLevel", "regulatoryBody", "bannedPhrases") VALUES
--   ('seed_health', 'healthcare', 'Universal Healthcare', 'block', 'FDA',
--     ARRAY['cure','guaranteed','100% safe','no side effects','off-label']);
-- INSERT INTO "VerticalSeed" (id, slug, name, "parentId", "enforcementLevel", "preferredPhrases") VALUES
--   ('seed_pharma', 'pharma-sales', 'Pharma Sales', 'seed_health', 'block',
--     ARRAY['clinical trials','indicated for','consult prescribing information']),
--   ('seed_recruit', 'hospital-recruiting', 'Hospital Recruiting', 'seed_health', 'warn',
--     ARRAY['shift-differential','BSN','RN','sign-on bonus']);
-- INSERT INTO "VerticalSeed" (id, slug, name, "enforcementLevel", "regulatoryBody", "bannedPhrases") VALUES
--   ('seed_re', 'real-estate', 'Real Estate', 'warn', 'HUD/Fair Housing',
--     ARRAY['safe neighborhood','perfect for families','exclusive area','no kids','ideal for']);
