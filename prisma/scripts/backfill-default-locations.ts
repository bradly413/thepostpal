import { PrismaClient, LocationRole } from "@prisma/client";

const prisma = new PrismaClient();

interface Summary {
  organizationsScanned: number;
  defaultLocationsCreated: number;
  membershipsCreated: number;
  socialConnectionsBackfilled: number;
  scheduledPostsBackfilled: number;
  photoAssetsBackfilled: number;
  calendarEventsBackfilled: number;
  knowledgeEntriesBackfilled: number;
}

function mapUserRoleToLocationRole(role: string | null | undefined): LocationRole {
  const normalized = (role ?? "").toLowerCase();
  if (normalized.includes("admin") || normalized.includes("owner")) return "LOCATION_ADMIN";
  if (normalized.includes("viewer") || normalized.includes("read")) return "LOCATION_VIEWER";
  return "LOCATION_EDITOR";
}

async function run() {
  const args = new Set(process.argv.slice(2));
  const dryRun = !args.has("--apply");

  const summary: Summary = {
    organizationsScanned: 0,
    defaultLocationsCreated: 0,
    membershipsCreated: 0,
    socialConnectionsBackfilled: 0,
    scheduledPostsBackfilled: 0,
    photoAssetsBackfilled: 0,
    calendarEventsBackfilled: 0,
    knowledgeEntriesBackfilled: 0,
  };

  const organizations = await prisma.organization.findMany({
    select: {
      id: true,
      users: { select: { id: true, role: true } },
      locations: { select: { id: true, slug: true } },
    },
  });

  summary.organizationsScanned = organizations.length;

  for (const org of organizations) {
    let defaultLocation = org.locations.find((l) => l.slug === "default");

    if (!defaultLocation && !dryRun) {
      defaultLocation = await prisma.location.create({
        data: {
          organizationId: org.id,
          name: "Default",
          slug: "default",
          status: "ACTIVE",
          timeZone: "America/Chicago",
        },
        select: { id: true, slug: true },
      });
      summary.defaultLocationsCreated += 1;

      await prisma.approvalRule.upsert({
        where: { locationId: defaultLocation.id },
        create: {
          locationId: defaultLocation.id,
          requiresApproval: false,
          reviewerUserIds: [],
          minApprovers: 1,
        },
        update: {},
      });
    }

    if (!defaultLocation && dryRun) {
      summary.defaultLocationsCreated += 1;
      summary.membershipsCreated += org.users.length;
    }

    if (defaultLocation) {
      for (const user of org.users) {
        const existing = await prisma.locationMembership.findUnique({
          where: {
            locationId_userId: {
              locationId: defaultLocation.id,
              userId: user.id,
            },
          },
        });

        if (!existing) {
          summary.membershipsCreated += 1;
          if (!dryRun) {
            await prisma.locationMembership.create({
              data: {
                locationId: defaultLocation.id,
                userId: user.id,
                role: mapUserRoleToLocationRole(user.role),
              },
            });
          }
        }
      }
    }

    const locationId = defaultLocation?.id ?? "__dry_run_location__";

    const [socialConnectionsBackfilled, scheduledPostsBackfilled, photoAssetsBackfilled, calendarEventsBackfilled, knowledgeEntriesBackfilled] = await Promise.all([
      prisma.socialConnection.count({ where: { organizationId: org.id, locationId: null } }),
      prisma.scheduledPost.count({ where: { organizationId: org.id, locationId: null } }),
      prisma.photoAsset.count({ where: { organizationId: org.id, locationId: null } }),
      prisma.calendarEvent.count({ where: { organizationId: org.id, locationId: null } }),
      prisma.knowledgeBaseEntry.count({ where: { organizationId: org.id, locationId: null } }),
    ]);

    summary.socialConnectionsBackfilled += socialConnectionsBackfilled;
    summary.scheduledPostsBackfilled += scheduledPostsBackfilled;
    summary.photoAssetsBackfilled += photoAssetsBackfilled;
    summary.calendarEventsBackfilled += calendarEventsBackfilled;
    summary.knowledgeEntriesBackfilled += knowledgeEntriesBackfilled;

    if (!dryRun && defaultLocation) {
      await Promise.all([
        prisma.socialConnection.updateMany({
          where: { organizationId: org.id, locationId: null },
          data: { locationId },
        }),
        prisma.scheduledPost.updateMany({
          where: { organizationId: org.id, locationId: null },
          data: { locationId },
        }),
        prisma.photoAsset.updateMany({
          where: { organizationId: org.id, locationId: null },
          data: { locationId },
        }),
        prisma.calendarEvent.updateMany({
          where: { organizationId: org.id, locationId: null },
          data: { locationId },
        }),
        prisma.knowledgeBaseEntry.updateMany({
          where: { organizationId: org.id, locationId: null },
          data: { locationId },
        }),
      ]);
    }
  }

  console.log("backfill-default-locations summary");
  console.table(summary);
  console.log(dryRun ? "mode: DRY_RUN" : "mode: APPLY");
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
