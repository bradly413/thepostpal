import { NextRequest, NextResponse } from "next/server";
import { withTenantDb } from "@/lib/db";
import { requireAuthContext } from "@/lib/api-auth";
import {
  disconnectMetaBundle,
  loadMetaBundlePublic,
} from "@/lib/meta-social-db";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthContext();
    const locationId = request.nextUrl.searchParams.get("locationId");
    if (!locationId) {
      return NextResponse.json({ error: "locationId is required" }, { status: 400 });
    }

    return await withTenantDb(auth, async (tx) => {
      try {
        const connection = await loadMetaBundlePublic(auth, tx, locationId);
        return NextResponse.json({ connection });
      } catch (error) {
        if (error instanceof Error && error.message === "FORBIDDEN") {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        throw error;
      }
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuthContext();
    const locationId = request.nextUrl.searchParams.get("locationId");
    if (!locationId) {
      return NextResponse.json({ error: "locationId is required" }, { status: 400 });
    }

    return await withTenantDb(auth, async (tx) => {
      try {
        await disconnectMetaBundle(auth, tx, locationId);
        return NextResponse.json({ success: true });
      } catch (error) {
        if (error instanceof Error && error.message === "FORBIDDEN") {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        throw error;
      }
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
