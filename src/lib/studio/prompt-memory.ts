/**
 * Recent Studio prompts per location — quick reuse + light compose recognition.
 */

import type { StudioPostFormat } from "@/lib/studio/studio-chat";

export type PromptMemoryEntry = {
  text: string;
  at: number;
  aspect?: string;
  format?: StudioPostFormat;
  carouselCount?: number;
};

const MAX_ENTRIES = 20;
const PREFIX = "pb-studio-prompts:";

function keyFor(locationId: string | null | undefined): string {
  return `${PREFIX}${locationId || "anon"}`;
}

function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function canUseStorage(): boolean {
  return typeof localStorage !== "undefined" && localStorage !== null;
}

export function loadPromptMemory(locationId: string | null | undefined): PromptMemoryEntry[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(keyFor(locationId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PromptMemoryEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e) => e && typeof e.text === "string" && e.text.trim())
      .map((e): PromptMemoryEntry => {
        const format: StudioPostFormat | undefined =
          e.format === "carousel" ? "carousel" : e.format === "single" ? "single" : undefined;
        return {
          text: normalizeText(e.text),
          at: typeof e.at === "number" ? e.at : Date.now(),
          aspect: typeof e.aspect === "string" ? e.aspect : undefined,
          format,
          carouselCount:
            typeof e.carouselCount === "number" ? e.carouselCount : undefined,
        };
      })
      .slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

export function savePromptMemory(
  locationId: string | null | undefined,
  entries: PromptMemoryEntry[],
): void {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(keyFor(locationId), JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // quota / private mode
  }
}

/** Prepend a prompt; dedupe by normalized text; cap at MAX_ENTRIES. */
export function pushPromptMemory(
  locationId: string | null | undefined,
  entry: Omit<PromptMemoryEntry, "at"> & { at?: number },
): PromptMemoryEntry[] {
  const text = normalizeText(entry.text);
  if (!text) return loadPromptMemory(locationId);
  const next: PromptMemoryEntry = {
    text,
    at: entry.at ?? Date.now(),
    aspect: entry.aspect,
    format: entry.format,
    carouselCount: entry.carouselCount,
  };
  const prev = loadPromptMemory(locationId).filter(
    (e) => normalizeText(e.text).toLowerCase() !== text.toLowerCase(),
  );
  const list = [next, ...prev].slice(0, MAX_ENTRIES);
  savePromptMemory(locationId, list);
  return list;
}

/** Short hint for compose so recurring brand language sticks. */
export function recentAsksHint(entries: PromptMemoryEntry[], limit = 3): string {
  const texts = entries
    .slice(0, limit)
    .map((e) => e.text)
    .filter(Boolean);
  if (!texts.length) return "";
  const joined = texts.map((t) => (t.length > 60 ? `${t.slice(0, 57)}…` : t)).join(" · ");
  const hint = `Recent asks: ${joined}`;
  return hint.length > 220 ? `${hint.slice(0, 217)}…` : hint;
}
