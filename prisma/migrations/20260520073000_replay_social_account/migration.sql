CREATE TABLE IF NOT EXISTS "SocialAccount" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SocialAccount_organizationId_idx" ON "SocialAccount"("organizationId");
CREATE INDEX IF NOT EXISTS "SocialAccount_locationId_provider_idx" ON "SocialAccount"("locationId", "provider");
CREATE UNIQUE INDEX IF NOT EXISTS "SocialAccount_locationId_provider_accountId_key" ON "SocialAccount"("locationId", "provider", "accountId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SocialAccount_organizationId_fkey'
  ) THEN
    ALTER TABLE "SocialAccount"
      ADD CONSTRAINT "SocialAccount_organizationId_fkey"
      FOREIGN KEY ("organizationId")
      REFERENCES "Organization"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SocialAccount_locationId_fkey'
  ) THEN
    ALTER TABLE "SocialAccount"
      ADD CONSTRAINT "SocialAccount_locationId_fkey"
      FOREIGN KEY ("locationId")
      REFERENCES "Location"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;
