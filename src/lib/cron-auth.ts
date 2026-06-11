import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

function cronSecretRequired(): boolean {
  return process.env.NODE_ENV === "production" || Boolean(process.env.DATABASE_URL?.trim());
}

function timingSafeBearerMatch(actualHeader: string | null, expectedSecret: string): boolean {
  if (!actualHeader?.startsWith("Bearer ")) return false;
  const actualSecret = actualHeader.slice("Bearer ".length);
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
