import { uploadDashboardImage } from "@/lib/dashboard-upload";

/**
 * Resolve an image reference to a durable, publicly-fetchable URL.
 *
 * Remote/http URLs pass through unchanged. `data:` URLs (e.g. AI-generated
 * images held in memory) are uploaded to S3 via the presigned flow so the
 * resulting URL is durable and reachable by Meta's servers — local-disk
 * uploads are ephemeral on Vercel and unreachable by external fetchers.
 */
export async function resolvePublicImageUrl(imageUrl: string): Promise<string> {
  if (!imageUrl.startsWith("data:")) {
    return imageUrl;
  }

  const res = await fetch(imageUrl);
  const blob = await res.blob();
  const ext = blob.type.includes("png") ? "png" : "jpg";
  const type = blob.type || (ext === "png" ? "image/png" : "image/jpeg");
  const file = new File([blob], `publish.${ext}`, { type });

  return uploadDashboardImage(file);
}
