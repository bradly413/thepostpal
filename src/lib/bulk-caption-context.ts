import { toneHintsForIds } from "@/lib/bulk-caption-tones";

const MAX_CONTEXT = 500;

export interface BulkCaptionContextInput {
  batchDirection: string;
  selectedToneIds: string[];
  photoNote?: string;
  batchIndex?: number;
  batchTotal?: number;
  priorCaptions?: string[];
}

/** Merge batch direction, tone chips, per-photo notes, and batch position for the caption API. */
export function buildBulkCaptionContext(input: BulkCaptionContextInput): string {
  const parts: string[] = [];

  const tones = toneHintsForIds(input.selectedToneIds);
  if (tones.length) {
    parts.push(`Tone: ${tones.join(" ")}`);
  }

  const direction = input.batchDirection.trim();
  if (direction) {
    parts.push(`Batch direction: ${direction}`);
  }

  const note = input.photoNote?.trim();
  if (note) {
    parts.push(`Notes for this photo: ${note}`);
  }

  if (
    input.batchIndex !== undefined &&
    input.batchTotal !== undefined &&
    input.batchTotal > 1
  ) {
    parts.push(
      `This is post ${input.batchIndex + 1} of ${input.batchTotal} in a batch — vary the opening from other posts.`,
    );
  }

  const prior = input.priorCaptions?.filter(Boolean).slice(-3) ?? [];
  if (prior.length) {
    parts.push(
      `Captions already used in this batch (do not echo):\n${prior.map((c) => `- ${c.slice(0, 120)}`).join("\n")}`,
    );
  }

  return parts.join("\n\n").slice(0, MAX_CONTEXT);
}

export interface CaptionVariantShape {
  angle: string;
  caption: string;
  hashtags: string[];
}

export function formatCaptionVariant(v: CaptionVariantShape): string {
  const tags = v.hashtags.length ? "\n\n" + v.hashtags.join(" ") : "";
  return v.caption + tags;
}

const INLINE_CAPTION_MAX_BYTES = 12 * 1024 * 1024;
const INLINE_CAPTION_MAX_EDGE = 1024;
const IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|heic|heif|avif|bmp)$/i;

function looksLikeImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  // iPhone / drag-drop often leave type empty — fall back to extension.
  return IMAGE_EXT_RE.test(file.name);
}

/**
 * Compact JPEG data URL for vision APIs.
 * Prefer S3 https URLs when available — only use this as a fallback so we
 * do not blow the Vercel request body limit with multi‑MB phone photos.
 */
export async function fileToInlineImage(file: File): Promise<string | null> {
  if (!looksLikeImageFile(file) || file.size <= 0 || file.size > INLINE_CAPTION_MAX_BYTES) {
    return null;
  }

  // HEIC often cannot decode in-browser — leave null and let the server use imageUrl.
  if (/heic|heif/i.test(file.type) || /\.heic$/i.test(file.name) || /\.heif$/i.test(file.name)) {
    return null;
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, INLINE_CAPTION_MAX_EDGE / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      } catch {
        resolve(null);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      // Fallback: raw FileReader (may be large — caller should prefer https URL).
      const reader = new FileReader();
      reader.onload = () => {
        resolve(typeof reader.result === "string" ? reader.result : null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };
    img.src = objectUrl;
  });
}

export function isUsableCaptionImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  if (url.startsWith("/uploads/")) return true;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
