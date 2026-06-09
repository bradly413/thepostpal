import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import { deleteTenantOrganization } from "@/lib/account-delete";
import { clearAuthSessionCookies } from "@/lib/session-cookies";

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuthContext();
    const body = (await req.json()) as { confirm?: string };
    const confirm = (body.confirm ?? "").trim().toUpperCase();

    if (confirm !== "DELETE") {
      return NextResponse.json(
        { error: 'Type DELETE to confirm account removal.' },
        { status: 400 },
      );
    }

    await withTenantDb(auth, async (tx) => {
      await deleteTenantOrganization(auth, tx);
    });

    const response = NextResponse.json({ success: true });
    clearAuthSessionCookies(response);
    return response;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "FORBIDDEN" || error.message === "FORBIDDEN_ROLE") {
        return NextResponse.json(
          { error: "Only workspace owners or admins can delete this account." },
          { status: 403 },
        );
      }
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
