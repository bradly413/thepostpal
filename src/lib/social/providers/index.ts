import "server-only";

import { metaProvider } from "@/lib/social/providers/meta";
import { linkedinProvider } from "@/lib/social/providers/linkedin";
import type { SocialProvider } from "@/lib/social/providers/types";

export type ProviderKey = "meta" | "linkedin";

export const providers: Record<ProviderKey, SocialProvider> = {
  meta: metaProvider,
  linkedin: linkedinProvider,
};

/**
 * Maps a SocialAccount.provider string (stored as "facebook" | "instagram" for
 * Meta) to its registry key. Anything that is not a Meta surface passes through
 * unchanged (e.g. "linkedin").
 */
export function resolveProviderKey(stored: string): ProviderKey {
  return stored === "facebook" || stored === "instagram" ? "meta" : "linkedin";
}

export function getProvider(stored: string): SocialProvider {
  return providers[resolveProviderKey(stored)];
}

export type { SocialProvider } from "@/lib/social/providers/types";
export type {
  ExchangedAccount,
  PublishPayload,
} from "@/lib/social/providers/types";
