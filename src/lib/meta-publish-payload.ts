import { getMetaConnection } from "./meta-store";
import { getActiveLocation } from "./organization-store";
import { resolvePublicImageUrl } from "./upload-public-image";

export interface MetaPublishPayload {
  platform: "facebook" | "instagram" | "both";
  pageId: string;
  pageToken: string;
  igAccountId?: string | null;
  caption: string;
  imageUrl: string;
  locationId: string;
  scheduledTime?: number;
}

export async function buildMetaPublishPayload(options: {
  platform: "facebook" | "instagram" | "both";
  caption: string;
  imageUrl: string;
  scheduledTime?: number;
}): Promise<MetaPublishPayload> {
  const meta = getMetaConnection();
  if (!meta?.connected || !meta.pageId || !meta.pageToken) {
    throw new Error("Connect Facebook and Instagram in Settings first.");
  }

  const loc = getActiveLocation();
  if (!loc?.id) {
    throw new Error("Select a location in Channels before publishing.");
  }

  const publicImageUrl = await resolvePublicImageUrl(options.imageUrl);

  return {
    platform: options.platform,
    pageId: meta.pageId,
    pageToken: meta.pageToken,
    igAccountId: meta.igAccountId,
    caption: options.caption,
    imageUrl: publicImageUrl,
    locationId: loc.id,
    scheduledTime: options.scheduledTime,
  };
}
