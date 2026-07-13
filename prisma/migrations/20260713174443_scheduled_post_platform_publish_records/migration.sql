-- Per-platform publish records: a "both" post that failed on Instagram after
-- Facebook went live records facebook here, so a retry skips it (no dup post).
ALTER TABLE "ScheduledPost"
  ADD COLUMN IF NOT EXISTS "publishedPlatforms" "SocialPlatform"[] NOT NULL DEFAULT ARRAY[]::"SocialPlatform"[],
  ADD COLUMN IF NOT EXISTS "publishResults" JSONB;
