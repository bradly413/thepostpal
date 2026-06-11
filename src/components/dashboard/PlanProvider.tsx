"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { PlanTier } from "@prisma/client";
import {
  planFeatures,
  STREAMLINED_FEATURES,
  type PlanFeatures,
} from "@/lib/plan-features";

interface PlanContextValue {
  plan: PlanTier | null;
  features: PlanFeatures;
  locationCount: number;
  role: string | null;
  isSuperadmin: boolean;
  loading: boolean;
}

const PlanContext = createContext<PlanContextValue>({
  plan: null,
  features: STREAMLINED_FEATURES,
  locationCount: 0,
  role: null,
  isSuperadmin: false,
  loading: true,
});

interface MeResponse {
  plan: PlanTier;
  role: string;
  organizationId: string;
  isSuperadmin: boolean;
  locationCount: number;
  addons?: { proImages?: boolean };
}

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PlanContextValue>({
    plan: null,
    features: STREAMLINED_FEATURES,
    locationCount: 0,
    role: null,
    isSuperadmin: false,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/me", { credentials: "same-origin" });
        if (!res.ok) throw new Error(`me ${res.status}`);
        const data = (await res.json()) as MeResponse;
        if (cancelled) return;
        const features = planFeatures(data.plan);
        setState({
          plan: data.plan,
          features: {
            ...features,
            // Pro images can also be a purchased add-on (solo users) — the
            // entitlement is plan OR add-on, mirrored server-side.
            proImageModel: features.proImageModel || data.addons?.proImages === true,
          },
          locationCount: data.locationCount,
          role: data.role,
          isSuperadmin: data.isSuperadmin,
          loading: false,
        });
      } catch {
        if (cancelled) return;
        // Fail closed to the streamlined surface — never flash enterprise UI
        // to a tenant that may not be entitled to it.
        setState((prev) => ({ ...prev, loading: false }));
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return <PlanContext.Provider value={state}>{children}</PlanContext.Provider>;
}

export function usePlan(): PlanContextValue {
  return useContext(PlanContext);
}

export function usePlanFeatures(): PlanFeatures {
  return useContext(PlanContext).features;
}
