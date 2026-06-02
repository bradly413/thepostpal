import { getOrganization, seedDemoOrganization } from "./organization-store";
import {
  getStoredBrandBook,
  hasBrandBook,
  syncBrandBookToOrganization,
} from "./onboarding-brand-sync";

/** Load org/drafts for dashboard without overwriting user onboarding. */
export function ensureDashboardData(): void {
  if (typeof window === "undefined") return;

  if (!getOrganization()) {
    if (hasBrandBook()) {
      syncBrandBookToOrganization(getStoredBrandBook());
    } else {
      seedDemoOrganization();
    }
  }

}
