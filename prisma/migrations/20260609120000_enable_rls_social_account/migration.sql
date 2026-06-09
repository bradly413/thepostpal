ALTER TABLE "SocialAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SocialAccount" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS social_account_select ON "SocialAccount";
DROP POLICY IF EXISTS social_account_insert ON "SocialAccount";
DROP POLICY IF EXISTS social_account_update ON "SocialAccount";
DROP POLICY IF EXISTS social_account_delete ON "SocialAccount";

CREATE POLICY social_account_select
  ON "SocialAccount"
  FOR SELECT
  USING (
    public.tenant_matches_organization("organizationId")
    AND public.tenant_matches_location("locationId")
  );

CREATE POLICY social_account_insert
  ON "SocialAccount"
  FOR INSERT
  WITH CHECK (
    public.tenant_matches_organization("organizationId")
    AND public.tenant_matches_location("locationId")
  );

CREATE POLICY social_account_update
  ON "SocialAccount"
  FOR UPDATE
  USING (
    public.tenant_matches_organization("organizationId")
    AND public.tenant_matches_location("locationId")
  )
  WITH CHECK (
    public.tenant_matches_organization("organizationId")
    AND public.tenant_matches_location("locationId")
  );

CREATE POLICY social_account_delete
  ON "SocialAccount"
  FOR DELETE
  USING (
    public.tenant_matches_organization("organizationId")
    AND public.tenant_matches_location("locationId")
  );
