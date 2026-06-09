import { PrismaClient } from "@prisma/client";
import {
  encryptToken,
  isEncryptedToken,
} from "../src/lib/social/token-crypto";

async function main() {
  const db = new PrismaClient();

  try {
    const socialAccounts = await db.socialAccount.findMany({
      select: {
        id: true,
        accessToken: true,
      },
    });

    let migratedSocialAccounts = 0;
    let skippedSocialAccounts = 0;

    for (const row of socialAccounts) {
      if (isEncryptedToken(row.accessToken)) {
        skippedSocialAccounts += 1;
        continue;
      }

      await db.socialAccount.update({
        where: { id: row.id },
        data: {
          accessToken: encryptToken(row.accessToken),
        },
      });
      migratedSocialAccounts += 1;
    }

    const socialConnections = await db.socialConnection.findMany({
      select: {
        id: true,
        accessToken: true,
        refreshToken: true,
      },
    });

    let migratedConnectionAccessTokens = 0;
    let migratedConnectionRefreshTokens = 0;
    let skippedSocialConnections = 0;

    for (const row of socialConnections) {
      const nextAccessToken =
        row.accessToken && !isEncryptedToken(row.accessToken)
          ? encryptToken(row.accessToken)
          : row.accessToken;
      const nextRefreshToken =
        row.refreshToken && !isEncryptedToken(row.refreshToken)
          ? encryptToken(row.refreshToken)
          : row.refreshToken;

      if (nextAccessToken === row.accessToken && nextRefreshToken === row.refreshToken) {
        skippedSocialConnections += 1;
        continue;
      }

      await db.socialConnection.update({
        where: { id: row.id },
        data: {
          accessToken: nextAccessToken,
          refreshToken: nextRefreshToken,
        },
      });

      if (nextAccessToken !== row.accessToken) {
        migratedConnectionAccessTokens += 1;
      }
      if (nextRefreshToken !== row.refreshToken) {
        migratedConnectionRefreshTokens += 1;
      }
    }

    const result = {
      socialAccounts: {
        total: socialAccounts.length,
        migrated: migratedSocialAccounts,
        skipped: skippedSocialAccounts,
      },
      socialConnections: {
        total: socialConnections.length,
        migratedAccessTokens: migratedConnectionAccessTokens,
        migratedRefreshTokens: migratedConnectionRefreshTokens,
        skipped: skippedSocialConnections,
      },
    };
    console.log(JSON.stringify(result));
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
