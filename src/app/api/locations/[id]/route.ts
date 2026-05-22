import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireLocationAccess } from "@/lib/location-api";
import { syncLocationBilling } from "@/lib/location-billing";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const { auth } = await requireLocationAccess(id);
    const location = await db.location.findFirst({
      where: { id, organizationId: auth.organizationId },
      include: { approvalRule: true },
    });
    if (!location) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ location });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    await requireLocationAccess(id, { minimumRole: "LOCATION_ADMIN" });
    const body = await request.json();

    const updated = await db.location.update({
      where: { id },
      data: {
        name: typeof body.name === "string" ? body.name : undefined,
        brandPrimaryColor: typeof body.brandPrimaryColor === "string" ? body.brandPrimaryColor : undefined,
        brandAccentColor: typeof body.brandAccentColor === "string" ? body.brandAccentColor : undefined,
        brandFontStack: typeof body.brandFontStack === "string" ? body.brandFontStack : undefined,
        brandVoiceJson: body.brandVoiceJson ?? undefined,
        city: typeof body.city === "string" ? body.city : undefined,
        state: typeof body.state === "string" ? body.state : undefined,
        country: typeof body.country === "string" ? body.country : undefined,
        timeZone: typeof body.timeZone === "string" ? body.timeZone : undefined,
      },
    });

    return NextResponse.json({ location: updated });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const { auth } = await requireLocationAccess(id, { minimumRole: "LOCATION_ADMIN" });
    const archived = await db.location.update({
      where: { id },
      data: { status: "ARCHIVED", archivedAt: new Date() },
    });

    const billingSync = await syncLocationBilling(auth.organizationId);

    return NextResponse.json({ location: archived, billingSync });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
