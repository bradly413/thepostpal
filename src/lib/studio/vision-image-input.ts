import "server-only";

import { readFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { isInlineReferenceImage } from "@/lib/reference-image";
import { readCappedBuffer, safeFetch } from "@/lib/safe-fetch";

const MAX_BYTES = 12 * 1024 * 1024;

/** Local public assets safe to load as vision/reference inputs (no path traversal). */
const LOCAL_PUBLIC_REF_PREFIXES = [
  "/uploads/",
  "/marketing/",
  "/hero/",
  "/hero-ring/",
  "/images/",
] as const;

async function readLocalPublicBytes(trimmed: string): Promise<Buffer | null> {
  if (!trimmed.startsWith("/") || trimmed.includes("..") || trimmed.includes("\0")) {
    return null;
  }
  if (!LOCAL_PUBLIC_REF_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) {
    return null;
  }
  const relative = trimmed.replace(/^\/+/, "");
  const publicRoot = path.join(process.cwd(), "public");
  const filePath = path.resolve(publicRoot, relative);
  if (filePath !== publicRoot && !filePath.startsWith(publicRoot + path.sep)) {
    return null;
  }
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
    if (trimmed.startsWith("/")) {
      const local = await readLocalPublicBytes(trimmed);
      if (!local) return null;
      input = local;
    } else if (isInlineReferenceImage(trimmed)) {
      const match = trimmed.match(/^data:(.+?);base64,([A-Za-z0-9+/=\s]+)$/);
      if (!match) return null;
      input = Buffer.from(match[2].replace(/\s/g, ""), "base64");
    } else if (/^https:\/\//i.test(trimmed)) {
      // Public listing / CDN URLs (MLS, Zillow, etc.) — SSRF-safe fetch, not host allowlist.
      const res = await safeFetch(
        trimmed,
        {
          headers: {
            "User-Agent": "PosterboySocial/1.0 (+https://www.posterboysocial.com)",
            Accept: "image/*,*/*;q=0.8",
          },
        },
        { timeoutMs: 12_000, maxBytes: MAX_BYTES },
      );
      if (!res.ok) return null;
      const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
      if (
        contentType.length > 0 &&
        !contentType.startsWith("image/") &&
        !contentType.includes("octet-stream")
      ) {
        return null;
      }
      input = await readCappedBuffer(res, MAX_BYTES);
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
