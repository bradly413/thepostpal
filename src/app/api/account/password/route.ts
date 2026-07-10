import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/api-auth";
import { rateLimit, buildRateLimitKey, RateLimitUnavailableError } from "@/lib/rate-limit";
import {
  isAuthStoreUnavailableError,
  updateStoredUserPassword,
} from "@/lib/auth-store";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuthContext();

    // Throttle current-password verification so a hijacked/idle session can't
    // brute-force the account's existing password via this endpoint.
    try {
      if (!(await rateLimit(buildRateLimitKey("account-password", req.headers, auth), 5, 60_000))) {
        return NextResponse.json(
          { error: "Too many attempts. Wait a moment and try again." },
          { status: 429 },
        );
      }
    } catch (error) {
      if (error instanceof RateLimitUnavailableError) {
        return NextResponse.json({ error: "Rate limit unavailable" }, { status: 503 });
      }
      throw error;
    }

    const body = (await req.json()) as {
      currentPassword?: string;
      newPassword?: string;
    };

    const currentPassword = body.currentPassword ?? "";
    const newPassword = body.newPassword ?? "";

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current and new password are required." },
        { status: 400 },
      );
    }

    const result = await updateStoredUserPassword(
      auth.userId,
      currentPassword,
      newPassword,
    );

    if (!result.ok) {
      if (result.reason === "not_found") {
        return NextResponse.json(
          { error: "Password change is not available for this account type." },
          { status: 400 },
        );
      }
      if (result.reason === "invalid_current") {
        return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
      }
      return NextResponse.json(
        { error: "New password must be at least 8 characters with a letter and a number." },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isAuthStoreUnavailableError(error)) {
      return NextResponse.json({ error: "Authentication storage unavailable" }, { status: 503 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
