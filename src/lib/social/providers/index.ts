import "server-only";

import { metaProvider } from "@/lib/social/providers/meta";
import { linkedinProvider } from "@/lib/social/providers/linkedin";
import { tiktokProvider } from "@/lib/social/providers/tiktok";
import type { SocialProvider } from "@/lib/social/providers/types";

export type ProviderKey = "meta" | "linkedin" | "tiktok";

export const providers: Record<ProviderKey, SocialProvider> = {
  meta: metaProvider,
  linkedin: linkedinProvider,
  tiktok: tiktokProvider,
};

/**
 * Maps a SocialAccount.provider string (stored as "facebook" | "instagram" for
 * Meta) to its registry key. Meta surfaces collapse to "meta"; "tiktok" maps to
 * its own key; everything else (e.g. "linkedin") passes through as LinkedIn.
 */
export function resolveProviderKey(stored: string): ProviderKey {
  if (stored === "facebook" || stored === "instagram") return "meta";
  if (stored === "tiktok") return "tiktok";
  return "linkedin";
}

export function getProvider(stored: string): SocialProvider {
  return providers[resolveProviderKey(stored)];
}

export type { SocialProvider } from "@/lib/social/providers/types";
export type {
  ExchangedAccount,
  PublishPayload,
} from "@/lib/social/providers/types";
