import "server-only";

import { publishToFacebook, publishToInstagram } from "@/lib/meta";
import type { MetaConnectionSecrets } from "@/lib/meta-connection-types";

export interface MetaPublishRequest {
  platform: "facebook" | "instagram" | "both";
  caption?: string;
  imageUrl?: string;
  scheduledTime?: number;
}

export interface MetaPublishServiceResult {
  facebook?: unknown;
  instagram?: unknown;
  warnings: string[];
}

export function resolveMetaPublishCredentials(
  secrets: MetaConnectionSecrets | null,
): { pageId: string; pageToken: string; igAccountId: string | null } {
  if (!secrets?.pageId || !secrets.pageToken) {
    throw new Error("Not connected to Facebook. Connect in Settings, then try again.");
  }
  return {
    pageId: secrets.pageId,
    pageToken: secrets.pageToken,
    igAccountId: secrets.igAccountId ?? null,
  };
}

export async function executeMetaPublish(
  credentials: { pageId: string; pageToken: string; igAccountId: string | null },
  input: MetaPublishRequest,
): Promise<MetaPublishServiceResult> {
  const { platform, caption, imageUrl, scheduledTime } = input;

  if (imageUrl?.startsWith("data:")) {
    throw new Error("Upload the image first — Meta requires a public image URL.");
  }

  const wantsFacebook = platform === "facebook" || platform === "both";
  const wantsInstagram = platform === "instagram" || platform === "both";

  if (wantsInstagram && !imageUrl) {
    throw new Error("Instagram requires an image.");
  }

  const results: MetaPublishServiceResult = { warnings: [] };

  if (wantsFacebook) {
    results.facebook = await publishToFacebook(credentials.pageId, credentials.pageToken, {
      message: caption,
      imageUrl,
      scheduledTime,
    });
  }

  if (wantsInstagram) {
    if (!credentials.igAccountId) {
      if (platform === "instagram") {
        throw new Error("No Instagram business account linked to this page.");
      }
      results.warnings.push(
        "Facebook published, but no Instagram business account is linked to this page.",
      );
    } else {
      results.instagram = await publishToInstagram(
        credentials.igAccountId,
        credentials.pageToken,
        {
          caption,
          imageUrl: imageUrl!,
          scheduledTime,
        },
      );
    }
  }

  if (!results.facebook && !results.instagram) {
    throw new Error("Nothing was published — check platform selection and Meta connection.");
  }

  return results;
}
