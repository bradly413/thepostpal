/** Studio chat thread message model. */

export type StudioPostFormat = "single" | "carousel";

export type StudioChatAspect = "1:1" | "4:5" | "9:16" | "16:9";

export type StudioChatUserMessage = {
  id: string;
  role: "user";
  text: string;
  at: number;
};

export type StudioChatAssistantMessage = {
  id: string;
  role: "assistant";
  text: string;
  status: "working" | "done" | "error";
  imageUrl?: string | null;
  aspect?: StudioChatAspect | string;
  format: StudioPostFormat;
  carouselCount?: number;
  at: number;
};

export type StudioChatMessage = StudioChatUserMessage | StudioChatAssistantMessage;

export const STUDIO_CHAT_WELCOME =
  "Describe a post, paste a site link, or pick a recent prompt. I’ll make a social-ready image.";

export function newChatId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function makeUserMessage(text: string): StudioChatUserMessage {
  return { id: newChatId(), role: "user", text: text.trim(), at: Date.now() };
}

export function makeWorkingAssistant(opts: {
  format: StudioPostFormat;
  carouselCount?: number;
  aspect?: string;
}): StudioChatAssistantMessage {
  return {
    id: newChatId(),
    role: "assistant",
    text: "Creating Images",
    status: "working",
    format: opts.format,
    carouselCount: opts.format === "carousel" ? opts.carouselCount : undefined,
    aspect: opts.aspect,
    at: Date.now(),
  };
}

/** Enrich intent when the user picked Carousel format (still one hero in v1). */
export function enrichIntentWithFormat(
  intent: string,
  format: StudioPostFormat,
  carouselCount: number,
): string {
  const base = intent.trim();
  if (!base) return base;
  if (format !== "carousel") return base;
  const n = Math.min(5, Math.max(2, Math.round(carouselCount) || 3));
  if (/\bcarousel\b/i.test(base) && /\bslide\s*1\b/i.test(base)) return base;
  const note = `Prepare slide 1 of ${n} for a carousel — strong hero that can lead a ${n}-slide set.`;
  const combined = `${base}\n\n${note}`;
  return combined.length > 980 ? combined.slice(0, 980) : combined;
}

/** Map aspect override → preferred platform preview index in PLATFORMS order. */
export function platformIdxForAspect(
  aspect: string,
  platforms: readonly { id: string; genAspect: string }[],
): number {
  const want = aspect.trim();
  if (want === "1:1") {
    const ig = platforms.findIndex((p) => p.id === "instagram");
    return ig >= 0 ? ig : 0;
  }
  if (want === "9:16") {
    const tt = platforms.findIndex((p) => p.id === "tiktok");
    return tt >= 0 ? tt : 0;
  }
  if (want === "16:9") {
    const li = platforms.findIndex((p) => p.id === "linkedin");
    if (li >= 0) return li;
    const x = platforms.findIndex((p) => p.id === "x");
    return x >= 0 ? x : 0;
  }
  if (want === "4:5") {
    const ig = platforms.findIndex((p) => p.id === "instagram");
    return ig >= 0 ? ig : 0;
  }
  const byAspect = platforms.findIndex((p) => p.genAspect === want);
  return byAspect >= 0 ? byAspect : 0;
}

export const STUDIO_ASPECT_OPTIONS: StudioChatAspect[] = ["1:1", "4:5", "9:16", "16:9"];
