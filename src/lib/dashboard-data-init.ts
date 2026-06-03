import { getOrganization, seedDemoOrganization } from "./organization-store";
import {
  getStoredBrandBook,
  hasBrandBook,
  syncBrandBookToOrganization,
} from "./onboarding-brand-sync";

/** Load org/drafts for dashboard without overwriting user onboarding. */
export async function ensureDashboardData(): Promise<void> {
  if (typeof window === "undefined") return;

  if (getOrganization()) return;

  if (hasBrandBook()) {
    syncBrandBookToOrganization(getStoredBrandBook());
    return;
  }

  try {
    const { fetchHasBrandBookFromApi } = await import("@/lib/brand-book-client");
    if (await fetchHasBrandBookFromApi()) {
      syncBrandBookToOrganization(getStoredBrandBook());
      return;
    }
  } catch {
    /* offline or unauthenticated */
  }

  seedDemoOrganization();
}
