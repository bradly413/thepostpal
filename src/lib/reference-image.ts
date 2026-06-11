const INLINE_REFERENCE_IMAGE_RE = /^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+$/i;

export function isInlineReferenceImage(value: unknown): value is string {
  return typeof value === "string" && INLINE_REFERENCE_IMAGE_RE.test(value.trim());
}
