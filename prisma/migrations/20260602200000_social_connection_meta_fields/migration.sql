-- AlterTable
ALTER TABLE "SocialConnection" ADD COLUMN "externalAccountId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SocialConnection_locationId_platform_key" ON "SocialConnection"("locationId", "platform");

-- CreateIndex
CREATE INDEX "SocialConnection_externalAccountId_idx" ON "SocialConnection"("externalAccountId");
