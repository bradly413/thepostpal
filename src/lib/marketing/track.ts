"use client";

/**
 * Provider-neutral marketing analytics.
 *
 * No provider is hardcoded. Events flow to whichever of these exists at
 * runtime, in order: Plausible → gtag → dataLayer. When none is configured
 * the call is a silent no-op (console.debug in development only).
 *
 * INTEGRATION POINT: to go live, add the provider snippet via env config —
 * e.g. NEXT_PUBLIC_GA_MEASUREMENT_ID or a Plausible script tag in the root
 * layout. Do not hardcode analytics IDs in source.
 *
 * PRIVACY: only the whitelisted keys below are ever sent. Free-form user
 * input (business names, prompts, captions, emails) must never be passed.
 */

const ALLOWED_KEYS = [
  "category",
  "cta",
  "location",
  "plan",
  "billing",
  "section",
  "tab",
  "question",
  "fallback",
  "step",
] as const;

type AllowedKey = (typeof ALLOWED_KEYS)[number];

export type TrackProps = Partial<Record<AllowedKey, string | boolean | number>>;

interface PlausibleFn {
  (event: string, options?: { props?: Record<string, string | boolean | number> }): void;
}
interface GtagFn {
  (command: "event", eventName: string, params?: Record<string, unknown>): void;
}

declare global {
  interface Window {
    plausible?: PlausibleFn;
    gtag?: GtagFn;
    dataLayer?: Record<string, unknown>[];
  }
}

export function track(event: string, props: TrackProps = {}): void {
  if (typeof window === "undefined") return;

  const clean: Record<string, string | boolean | number> = {};
  for (const key of ALLOWED_KEYS) {
    const value = props[key];
    if (value !== undefined) clean[key] = value;
  }

  try {
    if (typeof window.plausible === "function") {
      window.plausible(event, { props: clean });
    } else if (typeof window.gtag === "function") {
      window.gtag("event", event, clean);
    } else if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event, ...clean });
    } else if (process.env.NODE_ENV === "development") {
      console.debug("[track]", event, clean);
    }
  } catch {
    // Analytics must never break the page.
  }
}
