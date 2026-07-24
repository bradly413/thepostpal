export type StudioImageQuality = "draft" | "standard" | "pro";
export type GptImageOutputQuality = "low" | "medium" | "high";

export function normalizeStudioImageQuality(value: unknown): StudioImageQuality {
  if (value === "draft" || value === "pro") return value;
  return "standard";
}

export function gptOutputQualityForStudio(
  quality: StudioImageQuality,
): GptImageOutputQuality {
  if (quality === "draft") return "low";
  if (quality === "pro") return "high";
  return "medium";
}

export function studioImageQualityLabel(quality: StudioImageQuality): string {
  if (quality === "draft") return "Draft";
  if (quality === "pro") return "High";
  return "Standard";
}
