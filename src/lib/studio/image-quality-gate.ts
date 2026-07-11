import "server-only";

import sharp from "sharp";

/** Mean channel brightness (0–255). Below ~92 reads as gloomy on social feeds. */
const DARK_MEAN_THRESHOLD = 92;

export async function meanLuminanceFromBase64(imageBase64: string): Promise<number | null> {
  try {
    const buf = Buffer.from(imageBase64.replace(/\s/g, ""), "base64");
    const stats = await sharp(buf)
      .resize({ width: 320, height: 320, fit: "inside", withoutEnlargement: true })
      .stats();
    if (!stats.channels.length) return null;
    return stats.channels.reduce((sum, ch) => sum + ch.mean, 0) / stats.channels.length;
  } catch {
    return null;
  }
}

export async function isImageTooDark(imageBase64: string): Promise<boolean> {
  const mean = await meanLuminanceFromBase64(imageBase64);
  if (mean == null) return false;
  return mean < DARK_MEAN_THRESHOLD;
}
