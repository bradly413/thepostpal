export interface BrandEngineDna {
  niche: string;
  primaryTone: string;
  contrastVibe: string;
}

function readStringValue(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    const parts = value
      .map((entry) => readStringValue(entry))
      .filter((entry): entry is string => Boolean(entry));
    return parts.length > 0 ? parts.join(", ") : null;
  }
  return null;
}

/** Strict DNA used for caption generation (all fields required). */
export function readBrandEngineDna(raw: unknown): BrandEngineDna | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const niche = readStringValue(record.niche);
  const primaryTone = readStringValue(
    record.primaryTone ?? record.pivotAnswer ?? record.tone ?? record.brandTone,
  );
  const contrastRaw =
    record.contrastVibe ?? record.paletteVibe ?? record.visualContrast ?? record.contrast;
  const contrastVibe =
    typeof contrastRaw === "number" ? `${contrastRaw}/100` : readStringValue(contrastRaw);

  if (!niche || !primaryTone || !contrastVibe) {
    return null;
  }

  return { niche, primaryTone, contrastVibe };
}

/** Lenient DNA for image prompts (partial brandEngine still augments). */
export function readBrandEngineImageContext(raw: unknown): Partial<BrandEngineDna> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const niche = readStringValue(record.niche);
  const primaryTone = readStringValue(
    record.primaryTone ?? record.pivotAnswer ?? record.tone ?? record.brandTone,
  );
  const contrastRaw =
    record.contrastVibe ?? record.paletteVibe ?? record.visualContrast ?? record.contrast;
  const contrastVibe =
    typeof contrastRaw === "number" ? `${contrastRaw}/100` : readStringValue(contrastRaw);

  if (!niche && !primaryTone && !contrastVibe) {
    return null;
  }

  return {
    ...(niche ? { niche } : {}),
    ...(primaryTone ? { primaryTone } : {}),
    ...(contrastVibe ? { contrastVibe } : {}),
  };
}
