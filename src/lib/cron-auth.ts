import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

function cronSecretRequired(): boolean {
  return process.env.NODE_ENV === "production" || Boolean(process.env.DATABASE_URL?.trim());
}

function timingSafeBearerMatch(actualHeader: string | null, expectedSecret: string): boolean {
  if (!actualHeader?.startsWith("Bearer ")) return false;
  // Trim BOTH sides: the expected secret is trimmed (in verifyCronSecret), so the
  // received token must be too — otherwise a trailing newline/space in the
  // CRON_SECRET env value (common when pasting) makes the lengths differ and the
  // cron 401s on every run, so nothing ever publishes.
  const actualSecret = actualHeader.slice("Bearer ".length).trim();
  const actual = Buffer.from(actualSecret);
  const expected = Buffer.from(expectedSecret);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function verifyCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return !cronSecretRequired();
  }
  return timingSafeBearerMatch(request.headers.get("authorization"), secret);
}
