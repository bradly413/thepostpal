/** Shared upload MIME helpers (client + server safe — no Node imports). */

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  bmp: "image/bmp",
  heic: "image/heic",
  heif: "image/heif",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  m4v: "video/mp4",
};

const IMAGE_EXT_PATTERN =
  /\.(jpe?g|png|gif|webp|avif|bmp|heic|heif)$/i;
const VIDEO_EXT_PATTERN = /\.(mp4|mov|webm|m4v)$/i;

function normalizeMime(mimeType: string): string {
  const normalized = mimeType.trim().toLowerCase();
  if (normalized === "image/jpg") return "image/jpeg";
  return normalized;
}

export function inferMediaContentType(
  filename: string,
  mimeType?: string | null,
): string | null {
  const normalized = normalizeMime(mimeType || "");
  if (normalized.startsWith("image/") || normalized.startsWith("video/")) {
    return normalized;
  }

  if (normalized && normalized !== "application/octet-stream") {
    return null;
  }

  const ext = filename.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  return EXT_TO_MIME[ext] ?? null;
}

export function isImageContentType(contentType: string): boolean {
  return contentType.trim().toLowerCase().startsWith("image/");
}

export function isVideoContentType(contentType: string): boolean {
  return contentType.trim().toLowerCase().startsWith("video/");
}

export function isAllowedUploadContentType(contentType: string): boolean {
  return isImageContentType(contentType) || isVideoContentType(contentType);
}

export function isUploadableMediaFile(file: Pick<File, "name" | "type">): boolean {
  return inferMediaContentType(file.name, file.type) !== null;
}

export function isUploadableMediaFilename(
  filename: string,
  mimeType?: string | null,
): boolean {
  if (inferMediaContentType(filename, mimeType)) return true;
  return IMAGE_EXT_PATTERN.test(filename) || VIDEO_EXT_PATTERN.test(filename);
}

/** File input `accept` list — explicit MIME + extensions for Safari/screenshots. */
export const UPLOAD_ACCEPT_MEDIA =
  "image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif,image/avif,image/bmp,video/mp4,video/quicktime,video/webm,.jpg,.jpeg,.png,.gif,.webp,.heic,.heif,.mp4,.mov,.webm";
