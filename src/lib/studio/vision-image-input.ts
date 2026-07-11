import "server-only";

import { readFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { isInlineReferenceImage } from "@/lib/reference-image";

const MAX_BYTES = 12 * 1024 * 1024;

function isSafeHttpsUrl(url: string): boolean {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

async function readLocalUploadBytes(trimmed: string): Promise<Buffer | null> {
  if (!trimmed.startsWith("/uploads/")) return null;
  const relative = trimmed.replace(/^\/+/, "");
  const filePath = path.join(process.cwd(), "public", relative);
  if (!filePath.startsWith(path.join(process.cwd(), "public", "uploads"))) return null;
  try {
    const buf = await readFile(filePath);
    return buf.length > 0 && buf.length <= MAX_BYTES ? buf : null;
  } catch {
    return null;
  }
}

/** Normalize an inline data URL or https URL to a JPEG base64 string for vision APIs. */
export async function loadVisionJpegBase64(source: string): Promise<string | null> {
  const trimmed: string = source.trim();
  if (!trimmed) return null;

  try {
    let input: Buffer;
    if (trimmed.startsWith("/uploads/")) {
      const local = await readLocalUploadBytes(trimmed);
      if (!local) return null;
      input = local;
    } else if (isInlineReferenceImage(trimmed)) {
      const match = trimmed.match(/^data:(.+?);base64,([A-Za-z0-9+/=\s]+)$/);
      if (!match) return null;
      input = Buffer.from(match[2].replace(/\s/g, ""), "base64");
    } else if (isSafeHttpsUrl(trimmed)) {
      const res = await fetch(trimmed);
      if (!res.ok) return null;
      input = Buffer.from(await res.arrayBuffer());
    } else {
      return null;
    }

    if (input.length > MAX_BYTES) return null;

    const jpeg = await sharp(input)
      .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
    return jpeg.toString("base64");
  } catch {
    return null;
  }
}

/** Inline Gemini part from a data URL, hosted https image, or local /uploads path. */
export async function referenceImageToGeminiInline(
  source: string,
): Promise<{ mimeType: string; data: string } | null> {
  const trimmed = source.trim();
  if (!trimmed) return null;

  if (isInlineReferenceImage(trimmed)) {
    const match = trimmed.match(/^data:(.+?);base64,([A-Za-z0-9+/=\s]+)$/);
    if (!match) return null;
    return { mimeType: match[1], data: match[2].replace(/\s/g, "") };
  }

  const jpegB64 = await loadVisionJpegBase64(trimmed);
  if (!jpegB64) return null;
  return { mimeType: "image/jpeg", data: jpegB64 };
}
