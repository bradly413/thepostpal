-- Durable, user-scoped Studio conversation history.
CREATE TABLE "StudioMessage" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "status" TEXT,
  "mediaUrl" TEXT,
  "mediaUrls" JSONB,
  "mediaType" TEXT,
  "aspect" TEXT,
  "format" TEXT,
  "carouselCount" INTEGER,
  "sentAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "StudioMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudioMessage_locationId_userId_clientId_key"
  ON "StudioMessage"("locationId", "userId", "clientId");
CREATE INDEX "StudioMessage_organizationId_locationId_sentAt_idx"
  ON "StudioMessage"("organizationId", "locationId", "sentAt");
CREATE INDEX "StudioMessage_userId_locationId_sentAt_idx"
  ON "StudioMessage"("userId", "locationId", "sentAt");

ALTER TABLE "StudioMessage"
  ADD CONSTRAINT "StudioMessage_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudioMessage"
  ADD CONSTRAINT "StudioMessage_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "Location"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudioMessage"
  ADD CONSTRAINT "StudioMessage_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudioMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudioMessage" FORCE ROW LEVEL SECURITY;

CREATE POLICY studio_message_select
  ON "StudioMessage"
  FOR SELECT
  USING (
    public.tenant_matches_organization("organizationId")
    AND public.tenant_matches_location("locationId")
    AND public.tenant_matches_user("userId")
    AND (public.current_is_superadmin() OR "userId" = public.current_user_id())
  );

CREATE POLICY studio_message_insert
  ON "StudioMessage"
  FOR INSERT
  WITH CHECK (
    public.tenant_matches_organization("organizationId")
    AND public.tenant_matches_location("locationId")
    AND public.tenant_matches_user("userId")
    AND (public.current_is_superadmin() OR "userId" = public.current_user_id())
  );

CREATE POLICY studio_message_update
  ON "StudioMessage"
  FOR UPDATE
  USING (
    public.tenant_matches_organization("organizationId")
    AND public.tenant_matches_location("locationId")
    AND public.tenant_matches_user("userId")
    AND (public.current_is_superadmin() OR "userId" = public.current_user_id())
  )
  WITH CHECK (
    public.tenant_matches_organization("organizationId")
    AND public.tenant_matches_location("locationId")
    AND public.tenant_matches_user("userId")
    AND (public.current_is_superadmin() OR "userId" = public.current_user_id())
  );

CREATE POLICY studio_message_delete
  ON "StudioMessage"
  FOR DELETE
  USING (
    public.tenant_matches_organization("organizationId")
    AND public.tenant_matches_location("locationId")
    AND public.tenant_matches_user("userId")
    AND (public.current_is_superadmin() OR "userId" = public.current_user_id())
  );
