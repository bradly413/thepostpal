import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

const FORBIDDEN_MESSAGES = new Set([
  "FORBIDDEN",
  "INSUFFICIENT_ROLE",
  "APPROVER_REQUIRED",
]);

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof Error && error.message === "UNAUTHORIZED";
}

export function isForbiddenError(error: unknown): boolean {
  return error instanceof Error && FORBIDDEN_MESSAGES.has(error.message);
}

export function captureRouteError(
  scopeName: string,
  error: unknown,
  extra?: Record<string, unknown>,
): void {
  console.error(`[${scopeName}]`, error);

  Sentry.withScope((scope) => {
    scope.setTag("route_scope", scopeName);

    if (extra) {
      Object.entries(extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }

    Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
  });
}

export function handleRouteError(
  scopeName: string,
  error: unknown,
  options?: {
    forbiddenStatus?: number;
    extra?: Record<string, unknown>;
  },
) {
  if (isUnauthorizedError(error)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isForbiddenError(error)) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: options?.forbiddenStatus ?? 403 },
    );
  }

  captureRouteError(scopeName, error, options?.extra);
  return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
}
