-- Add 'publishing' to DraftStatus: the cron's atomic claim state between
-- approved (queued) and published/failed. Safe inside a transaction on PG 12+
-- because the new value is not used in the same transaction.
ALTER TYPE "DraftStatus" ADD VALUE IF NOT EXISTS 'publishing';
