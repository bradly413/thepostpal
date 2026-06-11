/**
 * Flip the Pro-images add-on for an organization (closed-beta admin tool —
 * Stripe will own this entitlement once billing lands).
 *
 * Usage:
 *   npm run addon:pro-images -- <org-id-or-exact-name> on
 *   npm run addon:pro-images -- <org-id-or-exact-name> off
 *
 * Writes Organization.brandEngine.addons.proImages (no migration needed).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [ident, state] = process.argv.slice(2);
  if (!ident || !["on", "off"].includes(state)) {
    console.error("Usage: set-pro-images-addon <org-id-or-exact-name> on|off");
    process.exit(1);
  }

  const org =
    (await prisma.organization.findUnique({ where: { id: ident } })) ??
    (await prisma.organization.findFirst({ where: { name: ident } }));
  if (!org) {
    console.error(`No organization found for "${ident}"`);
    process.exit(1);
  }

  const engine =
    org.brandEngine && typeof org.brandEngine === "object"
      ? (org.brandEngine as Record<string, unknown>)
      : {};
  const addons =
    engine.addons && typeof engine.addons === "object"
      ? (engine.addons as Record<string, unknown>)
      : {};

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      brandEngine: JSON.parse(
        JSON.stringify({ ...engine, addons: { ...addons, proImages: state === "on" } }),
      ),
    },
  });

  console.log(`Pro-images add-on ${state.toUpperCase()} for "${org.name}" (${org.id}, plan=${org.plan})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
