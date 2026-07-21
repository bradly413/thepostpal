import "server-only";

import { Prisma, type PlanTier } from "@prisma/client";
import { withProvisioningDb } from "@/lib/db";
import type { SessionUser } from "@/lib/auth-store";
import { resolveSessionSuperadmin } from "@/lib/superadmin-allowlist";
import {
  normalizePricingTierId,
  pricingTierToOrganizationPlan,
} from "@/lib/pricing";

function deriveWorkspaceLabel(accountName: string): string {
  return accountName.replace(/\s+workspace$/i, "").trim() || "Main location";
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "main";
}

function displayName(user: SessionUser): string {
  return [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email;
}

function mapUserRole(role: SessionUser["role"]): string {
  if (role === "owner") return "owner";
  if (role === "admin") return "admin";
  return "member";
}

function resolveProvisionPlan(
  selectedPlan: string | null | undefined,
  user: SessionUser,
): PlanTier {
  const tier = normalizePricingTierId(selectedPlan) ?? "solo";
  const plan = pricingTierToOrganizationPlan(tier) ?? "solo";
  // Paid tiers must never be granted by a query param alone. Until a real
  // billing/contract flow assigns Command, only allowlisted internal accounts
  // may self-provision `house_account`; everyone else lands on solo and the
  // Command interest is logged for sales follow-up.
  if (plan === "house_account" && !resolveSessionSuperadmin({ email: user.email })) {
    console.warn(
      `[provisioning] Command signup without billing — provisioned solo instead: ${user.email}`,
    );
    return "solo";
  }
  return plan;
}

export async function ensureTenantProvisioned(
  user: SessionUser,
  selectedPlan?: string | null,
): Promise<void> {
  const plan = resolveProvisionPlan(selectedPlan, user);

  await withProvisioningDb(
    { tenantId: user.accountId, userId: user.userId },
    async (tx) => {
    await tx.organization.upsert({
      where: { id: user.accountId },
      update: {
        name: user.accountName,
      },
      create: {
        id: user.accountId,
        name: user.accountName,
        businessType: "business",
        locationCount: 1,
        plan,
      },
    });

    await tx.user.upsert({
      where: { id: user.userId },
      update: {
        email: user.email,
        name: displayName(user),
        role: mapUserRole(user.role),
        organizationId: user.accountId,
      },
      create: {
        id: user.userId,
        email: user.email,
        name: displayName(user),
        role: mapUserRole(user.role),
        organizationId: user.accountId,
      },
    });

    const existingLocations = await tx.location.findMany({
      where: { organizationId: user.accountId, status: { not: "ARCHIVED" } },
      select: { id: true, slug: true },
      orderBy: { createdAt: "asc" },
    });

    let primaryLocationId = existingLocations[0]?.id;

    if (!primaryLocationId) {
      const baseName = deriveWorkspaceLabel(user.accountName);
      const baseSlug = slugify(baseName);
      let slug = baseSlug;
      let suffix = 2;
      while (
        await tx.location.findFirst({
          where: { organizationId: user.accountId, slug },
          select: { id: true },
        })
      ) {
        slug = `${baseSlug}-${suffix}`;
        suffix += 1;
      }

      const location = await tx.location.create({
        data: {
          organizationId: user.accountId,
          name: baseName,
          slug,
          status: "ACTIVE",
          timeZone: "America/Chicago",
          brandVoiceJson: Prisma.JsonNull,
        },
      });
      primaryLocationId = location.id;

      await tx.approvalRule.create({
        data: {
          locationId: location.id,
          requiresApproval: false,
          reviewerUserIds: [],
          minApprovers: 1,
        },
      });
    }

    if (primaryLocationId) {
      await tx.locationMembership.upsert({
        where: {
          locationId_userId: {
            locationId: primaryLocationId,
            userId: user.userId,
          },
        },
        update: {
          role: "LOCATION_ADMIN",
        },
        create: {
          locationId: primaryLocationId,
          userId: user.userId,
          role: "LOCATION_ADMIN",
        },
      });
    }

    const activeCount = await tx.location.count({
      where: { organizationId: user.accountId, status: { not: "ARCHIVED" } },
    });

    await tx.organization.update({
      where: { id: user.accountId },
      data: { locationCount: activeCount },
    });
    },
  );
}
