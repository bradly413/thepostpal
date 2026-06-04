"use client";

// Client helpers for the tenant Brand Engine DNA (Organization.brandEngine).
// Feeds the AI generate pipelines (captions + images).

export interface BrandEngineInput {
  niche?: string;
  pivotAnswer?: string;
  primaryTone?: string;
  paletteVibe?: number;
  contrastVibe?: string | number;
  typographyPairing?: string;
  dressCode?: string;
  greeting?: string;
  compliment?: string;
  industryId?: string;
}

export async function saveBrandEngine(input: BrandEngineInput): Promise<unknown> {
  const res = await fetch("/api/brand-engine", {
    method: "PUT",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error || `Could not save brand engine (${res.status})`);
  }
  return ((await res.json()) as { brandEngine?: unknown }).brandEngine ?? null;
}

export async function fetchBrandEngine(): Promise<unknown> {
  const res = await fetch("/api/brand-engine", { credentials: "same-origin" });
  if (!res.ok) return null;
  return ((await res.json()) as { brandEngine?: unknown }).brandEngine ?? null;
}
