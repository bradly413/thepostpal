import type { Platform } from "@/components/SocialMockup";

export function detectPlatform(text: string): Platform | null {
  const lower = text.toLowerCase();
  if (/\binstagram\b|\binsta\b|\big post\b|\big caption\b|\breels?\b|\big story\b/.test(lower)) return "instagram";
  if (/\bfacebook\b|\bfb post\b|\bfb caption\b/.test(lower)) return "facebook";
  if (/\blinkedin\b/.test(lower)) return "linkedin";
  if (/\btwitter\b|\btweet\b/.test(lower)) return "twitter";
  return null;
}

export function extractCaption(text: string): string | null {
  // Match text between straight quotes
  const quoted = text.match(/"([^"]{20,})"/);
  if (quoted) return quoted[1];

  // Match text after a --- separator (common AI response format)
  const sepParts = text.split("---");
  if (sepParts.length >= 2) {
    const body = sepParts[1].trim();
    const firstBlock = body.split("\n\n")[0].trim().replace(/\n/g, " ");
    if (firstBlock.length >= 20) return firstBlock.slice(0, 300);
  }

  // Match after "caption:" or "post:" labels
  const captionBlock = text.match(/(?:caption|post|tweet|copy)[:\s]*\n+(.+?)(?:\n\n|\n#|$)/i);
  if (captionBlock) return captionBlock[1].trim();

  // Fall back to the longest substantial line that isn't meta-commentary
  const lines = text.split("\n").filter(
    (l) => l.trim().length > 30 && !l.startsWith("#") && !l.startsWith("---")
  );
  if (lines.length >= 1) {
    const best = lines.find((l) => !l.match(/^(Here|This|Character|Let|I |Note)/i));
    if (best) return best.trim().slice(0, 300);
  }

  return null;
}

export function extractHashtags(text: string): string | null {
  const tags = text.match(/#\w+/g);
  if (tags && tags.length >= 2) return tags.slice(0, 8).join(" ");
  return null;
}

export function stripHashtagsFromCaption(caption: string): string {
  return caption
    .replace(/\*{0,2}Hashtags:?\*{0,2}\s*/gi, "")
    .replace(/(#\w+\s*){2,}/g, "")
    .trim();
}
