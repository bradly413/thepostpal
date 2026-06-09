DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'DraftStatus'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumtypid = to_regtype('"DraftStatus"')
      AND enumlabel = 'failed'
  ) THEN
    ALTER TYPE "DraftStatus" ADD VALUE 'failed';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'ScheduledPostMediaType'
  ) THEN
    CREATE TYPE "ScheduledPostMediaType" AS ENUM ('image', 'video');
  END IF;
END $$;

ALTER TABLE "ScheduledPost"
  ADD COLUMN IF NOT EXISTS "mediaUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "mediaType" "ScheduledPostMediaType",
  ADD COLUMN IF NOT EXISTS "errorLog" TEXT;
