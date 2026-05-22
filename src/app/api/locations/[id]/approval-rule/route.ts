import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLocationAccess } from "@/lib/location-api";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    await requireLocationAccess(id, { minimumRole: "LOCATION_EDITOR" });
    const rule = await db.approvalRule.findUnique({ where: { locationId: id } });
    return NextResponse.json({ rule });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    await requireLocationAccess(id, { minimumRole: "LOCATION_ADMIN" });
    const body = await request.json();

    const reviewerUserIds = Array.isArray(body.reviewerUserIds)
      ? body.reviewerUserIds.filter((v: unknown): v is string => typeof v === "string")
      : [];

    const rule = await db.approvalRule.upsert({
      where: { locationId: id },
      create: {
        locationId: id,
        requiresApproval: !!body.requiresApproval,
        reviewerUserIds,
        minApprovers:
          Number.isInteger(body.minApprovers) && body.minApprovers > 0 ? body.minApprovers : 1,
        autoApproveAfterMs:
          Number.isInteger(body.autoApproveAfterMs) && body.autoApproveAfterMs > 0
            ? body.autoApproveAfterMs
            : null,
      },
      update: {
        requiresApproval: !!body.requiresApproval,
        reviewerUserIds,
        minApprovers:
          Number.isInteger(body.minApprovers) && body.minApprovers > 0 ? body.minApprovers : 1,
        autoApproveAfterMs:
          Number.isInteger(body.autoApproveAfterMs) && body.autoApproveAfterMs > 0
            ? body.autoApproveAfterMs
            : null,
      },
    });

    return NextResponse.json({ rule });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
