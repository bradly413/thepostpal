import "server-only";

import sharp from "sharp";

/** Stay below Vercel's function-response limit after headers and framing. */
export const PHOTO_DOWNLOAD_MAX_BYTES = 3_800_000;

export function photoDownloadFilename(
  name: string | null | undefined,
  id: string,
): string {
  const withoutExtension = (name || "").replace(/\.[A-Za-z0-9]{1,8}$/i, "");
  const basename = withoutExtension
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, 80);
  return `${basename || `posterboy-${id.slice(0, 12)}`}.png`;
}

async function renderPng(
  input: Buffer,
  options?: { palette?: boolean; width?: number },
): Promise<Buffer> {
  let pipeline = sharp(input, {
    failOn: "error",
    limitInputPixels: 40_000_000,
  }).rotate();

  if (options?.width) {
    pipeline = pipeline.resize({
      width: options.width,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  return pipeline
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      ...(options?.palette
        ? { palette: true, quality: 100, colours: 256, dither: 0.8, effort: 10 }
        : {}),
    })
    .toBuffer();
}

/**
 * Convert a stored Library image to a downloadable PNG. Most images retain
 * their original pixels; unusually large outputs use a high-quality palette,
 * then a bounded resize only when necessary to keep the response deliverable.
 */
export async function convertPhotoToDownloadPng(input: Buffer): Promise<Buffer> {
  let output = await renderPng(input);
  if (output.length <= PHOTO_DOWNLOAD_MAX_BYTES) return output;

  output = await renderPng(input, { palette: true });
  if (output.length <= PHOTO_DOWNLOAD_MAX_BYTES) return output;

  const metadata = await sharp(input, {
    failOn: "error",
    limitInputPixels: 40_000_000,
  }).metadata();
  let width = Math.min(metadata.width || 2048, 2048);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    output = await renderPng(input, { palette: true, width });
    if (output.length <= PHOTO_DOWNLOAD_MAX_BYTES) return output;
    width = Math.max(640, Math.floor(width * 0.8));
  }

  throw new Error("PNG output is too large");
}
