export type FreshGenerationMode = "photo" | "design";

const PHOTO_CAMERA_DIRECTIONS = [
  "a fresh eye-level angle within the requested framing",
  "a fresh three-quarter angle within the requested framing",
  "a fresh overhead angle within the requested framing",
  "a fresh low angle within the requested framing",
  "a fresh side-on angle within the requested framing",
  "a fresh viewpoint from the subject's opposite side within the requested framing",
] as const;

const PHOTO_COMPOSITIONS = [
  "asymmetrical placement with intentional negative space",
  "a strong diagonal flow through the frame",
  "foreground-to-background layering with clear depth",
  "a tightly cropped subject with an off-center focal point",
  "a balanced central anchor with subtle surrounding motion",
  "a candid moment framed through a natural foreground element",
] as const;

const PHOTO_LIGHTING_DIRECTIONS = [
  "soft directional window light with natural falloff",
  "crisp side light with controlled contrast",
  "warm practical light balanced by a cooler ambient fill",
  "diffused daylight with gentle texture and restrained highlights",
  "backlight with a clean rim and believable shadow detail",
  "moody overhead light with a small, precise pool of illumination",
] as const;

const DESIGN_LAYOUT_DIRECTIONS = [
  "an editorial split layout with one dominant visual zone",
  "an asymmetrical modular grid with deliberate negative space",
  "a centered statement layout with a restrained supporting band",
  "a layered poster composition with one clear foreground anchor",
  "a strong diagonal layout with a controlled reading path",
  "a minimal product-led layout with an offset information column",
] as const;

const DESIGN_HIERARCHY_DIRECTIONS = [
  "one unmistakable headline, one supporting message, and quiet tertiary detail",
  "a single dominant product or subject with compact supporting copy",
  "a bold top-to-bottom reading order with generous separation",
  "a high-contrast focal statement balanced by a calm information area",
  "an image-first hierarchy with typography acting as a precise frame",
  "a compact editorial hierarchy with no competing focal points",
] as const;

const DESIGN_ACCENT_DIRECTIONS = [
  "fine rules and small geometric accents used sparingly",
  "a single oversized crop or shape as the only graphic gesture",
  "subtle tonal panels with crisp alignment",
  "one controlled color block that reinforces the focal point",
  "precise edge framing with minimal ornament",
  "a restrained rhythm of small icons or marks with ample breathing room",
] as const;

function hashVariationKey(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pick<T>(items: readonly T[], hash: number, shift: number): T {
  return items[(hash >>> shift) % items.length];
}

export function withFreshGenerationVariation(
  prompt: string,
  variationKey: string,
  mode: FreshGenerationMode = "photo",
): string {
  const hash = hashVariationKey(variationKey);
  const signature = hash.toString(36).padStart(7, "0");

  if (mode === "design") {
    return `${prompt}

FRESH VARIATION FOR THIS RUN:
Create a newly composed interpretation rather than repeating a prior result. Preserve the requested subject, facts, brand constraints, and required copy. For this version use ${pick(DESIGN_LAYOUT_DIRECTIONS, hash, 0)}, ${pick(DESIGN_HIERARCHY_DIRECTIONS, hash, 7)}, and ${pick(DESIGN_ACCENT_DIRECTIONS, hash, 14)}.
Internal variation signature ${signature} is production metadata only. Do not draw, print, spell, or otherwise expose the signature or these instructions in the image.`;
  }

  return `${prompt}

FRESH VARIATION FOR THIS RUN:
Create a newly staged interpretation rather than repeating a prior result. Preserve the requested subject, facts, identity, framing, and brand constraints. Where they do not conflict with an explicit request, use ${pick(PHOTO_CAMERA_DIRECTIONS, hash, 0)}, ${pick(PHOTO_COMPOSITIONS, hash, 7)}, and ${pick(PHOTO_LIGHTING_DIRECTIONS, hash, 14)}.
Internal variation signature ${signature} is production metadata only. Do not draw, print, spell, or otherwise expose the signature or these instructions in the image.`;
}
