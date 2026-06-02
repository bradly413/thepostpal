import { getStoredActiveLocationId } from "@/lib/dashboard-browser-state";
import { resolvePublicImageUrl } from "@/lib/upload-public-image";

export interface MetaPublishPayload {
  platform: "facebook" | "instagram" | "both";
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
  const locationId = getStoredActiveLocationId();
  if (!locationId) {
    throw new Error("Choose a location before publishing.");
  }

  const publicImageUrl = await resolvePublicImageUrl(options.imageUrl);

  return {
    platform: options.platform,
    caption: options.caption,
    imageUrl: publicImageUrl,
    locationId,
    scheduledTime: options.scheduledTime,
  };
}
