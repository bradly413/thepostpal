// ─────────────────────────────────────────────────────────────
//  Brand DNA — ingestion limits + input sanitization (pure)
//
//  Bounds and validation for the upload path (POST /api/brand-dna/analyze).
//  Kept pure + separate from the route so the limits and parsing are unit-tested
//  without an HTTP/multipart harness. The route is a thin shell over these + the
//  deterministic engine (profile.ts / image-decode.ts).
// ─────────────────────────────────────────────────────────────

export const INGEST_LIMITS = {
  /** Max images analyzed per request (sampling depth — see design doc). */
  maxImages: 12,
  /** Max bytes per uploaded image (reject larger before decoding). */
  maxImageBytes: 10 * 1024 * 1024,
  /** Max captions analyzed per request. */
  maxCaptions: 40,
  /** Per-caption character cap. */
  maxCaptionLength: 2000,
} as const;

/**
 * Normalize a captions payload into a bounded, clean string[].
 * Accepts a JSON-stringified array, a newline-delimited string, or an array.
 * Trims, drops empties, truncates over-long captions, and caps the count.
 */
export function sanitizeCaptions(raw: unknown): string[] {
  let arr: unknown = raw;
  if (typeof raw === "string") {
    const s = raw.trim();
    if (s.startsWith("[")) {
      try {
        arr = JSON.parse(s);
      } catch {
        arr = s.split("\n");
      }
    } else {
      arr = s.split("\n");
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => s.slice(0, INGEST_LIMITS.maxCaptionLength))
    .slice(0, INGEST_LIMITS.maxCaptions);
}

/** Whether a MIME type is one we can decode for palette extraction. */
export function isAnalyzableImageType(type: string | undefined | null): boolean {
  if (!type) return false;
  return /^image\/(png|jpe?g|webp|gif|avif)$/i.test(type.trim());
}
