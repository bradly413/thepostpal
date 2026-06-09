-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "verticalSlug" TEXT;

-- CreateTable
CREATE TABLE "VerticalSeed" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "bannedPhrases" TEXT[],
    "preferredPhrases" TEXT[],
    "enforcementLevel" TEXT NOT NULL DEFAULT 'suggest',
    "regulatoryBody" TEXT,
    "complianceNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerticalSeed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VerticalSeed_slug_key" ON "VerticalSeed"("slug");

-- CreateIndex
CREATE INDEX "VerticalSeed_parentId_idx" ON "VerticalSeed"("parentId");

-- AddForeignKey
ALTER TABLE "VerticalSeed" ADD CONSTRAINT "VerticalSeed_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "VerticalSeed"("id") ON DELETE SET NULL ON UPDATE CASCADE;
