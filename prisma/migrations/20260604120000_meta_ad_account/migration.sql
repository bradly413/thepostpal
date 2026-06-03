-- Meta Ads: tenant-scoped ad account registry + incremental ads OAuth platform + RLS

ALTER TYPE "SocialPlatform" ADD VALUE IF NOT EXISTS 'meta_ads';

CREATE TABLE "MetaAdAccount" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT,
    "adAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaAdAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MetaAdAccount_organizationId_adAccountId_key" ON "MetaAdAccount"("organizationId", "adAccountId");
CREATE INDEX "MetaAdAccount_organizationId_idx" ON "MetaAdAccount"("organizationId");
CREATE INDEX "MetaAdAccount_locationId_idx" ON "MetaAdAccount"("locationId");

ALTER TABLE "MetaAdAccount" ADD CONSTRAINT "MetaAdAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MetaAdAccount" ADD CONSTRAINT "MetaAdAccount_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MetaAdAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MetaAdAccount" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS meta_ad_account_select ON "MetaAdAccount";
DROP POLICY IF EXISTS meta_ad_account_insert ON "MetaAdAccount";
DROP POLICY IF EXISTS meta_ad_account_update ON "MetaAdAccount";
DROP POLICY IF EXISTS meta_ad_account_delete ON "MetaAdAccount";

CREATE POLICY meta_ad_account_select ON "MetaAdAccount" FOR SELECT
  USING (public.tenant_matches_organization("organizationId"));

CREATE POLICY meta_ad_account_insert ON "MetaAdAccount" FOR INSERT
  WITH CHECK (
    public.tenant_matches_organization("organizationId")
    AND ("locationId" IS NULL OR public.tenant_matches_location("locationId"))
  );

CREATE POLICY meta_ad_account_update ON "MetaAdAccount" FOR UPDATE
  USING (public.tenant_matches_organization("organizationId"))
  WITH CHECK (
    public.tenant_matches_organization("organizationId")
    AND ("locationId" IS NULL OR public.tenant_matches_location("locationId"))
  );

CREATE POLICY meta_ad_account_delete ON "MetaAdAccount" FOR DELETE
  USING (public.tenant_matches_organization("organizationId"));
