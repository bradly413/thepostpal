-- AlterEnum
ALTER TYPE "DraftStatus" ADD VALUE 'failed';

-- CreateEnum
CREATE TYPE "ScheduledPostMediaType" AS ENUM ('image', 'video');

-- AlterTable
ALTER TABLE "ScheduledPost" ADD COLUMN     "mediaUrl" TEXT,
ADD COLUMN     "mediaType" "ScheduledPostMediaType",
ADD COLUMN     "errorLog" TEXT;
