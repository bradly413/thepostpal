import { getStoredActiveLocationId } from "@/lib/dashboard-browser-state";
import { resolvePublicImageUrl } from "@/lib/upload-public-image";

export interface MetaPublishPayload {
  platform: "facebook" | "instagram" | "both";
  caption: string;
  imageUrl?: string;
  videoUrl?: string;
  mediaType?: "image" | "video";
  locationId: string;
  scheduledTime?: number;
}

export async function buildMetaPublishPayload(options: {
  platform: "facebook" | "instagram" | "both";
  caption: string;
  imageUrl?: string;
  videoUrl?: string;
  mediaType?: "image" | "video";
  scheduledTime?: number;
}): Promise<MetaPublishPayload> {
  const locationId = getStoredActiveLocationId();
  if (!locationId) {
    throw new Error("Choose a location before publishing.");
  }

  const mediaType =
    options.mediaType ||
    (options.videoUrl ? "video" : "image");
  const rawUrl = options.videoUrl || options.imageUrl;
  if (!rawUrl) {
    throw new Error("Add an image or video before publishing.");
  }

  const publicUrl = await resolvePublicImageUrl(rawUrl);

  return {
    platform: options.platform,
    caption: options.caption,
    ...(mediaType === "video"
      ? { videoUrl: publicUrl, mediaType: "video" as const }
      : { imageUrl: publicUrl, mediaType: "image" as const }),
    locationId,
    scheduledTime: options.scheduledTime,
  };
}
