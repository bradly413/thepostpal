"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { PlanTier } from "@prisma/client";
import {
  planFeatures,
  STREAMLINED_FEATURES,
  type PlanFeatures,
} from "@/lib/plan-features";

function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "PB";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function roleLabel(role: string | null): string {
  if (role === "admin") return "Owner";
  if (!role) return "Member";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

interface PlanContextValue {
  plan: PlanTier | null;
  features: PlanFeatures;
  locationCount: number;
  role: string | null;
  roleLabel: string;
  isSuperadmin: boolean;
  businessType: string | null;
  workspaceName: string;
  workspaceInitials: string;
  loading: boolean;
  planLoadError: boolean;
}

const PlanContext = createContext<PlanContextValue>({
  plan: null,
  features: STREAMLINED_FEATURES,
  locationCount: 0,
  role: null,
  roleLabel: "Member",
  isSuperadmin: false,
  businessType: null,
  workspaceName: "Your workspace",
  workspaceInitials: "PB",
  loading: true,
  planLoadError: false,
});

interface MeResponse {
  plan: PlanTier;
  role: string;
  organizationId: string;
  isSuperadmin: boolean;
  locationCount: number;
  metaAdsEnabled?: boolean;
  businessType?: string | null;
  organization?: { name?: string | null; businessType?: string | null };
  addons?: { proImages?: boolean };
}

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PlanContextValue>({
    plan: null,
    features: STREAMLINED_FEATURES,
    locationCount: 0,
    role: null,
    roleLabel: "Member",
    isSuperadmin: false,
    businessType: null,
    workspaceName: "Your workspace",
    workspaceInitials: "PB",
    loading: true,
    planLoadError: false,
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
        const workspaceName = data.organization?.name?.trim() || "Your workspace";
        setState({
          plan: data.plan,
          features: {
            ...features,
            metaAds: features.metaAds && data.metaAdsEnabled === true,
            // Pro images can also be a purchased add-on (solo users) — the
            // entitlement is plan OR add-on, mirrored server-side.
            proImageModel: features.proImageModel || data.addons?.proImages === true,
          },
          locationCount: data.locationCount,
          role: data.role,
          roleLabel: roleLabel(data.role),
          isSuperadmin: data.isSuperadmin,
          businessType: data.organization?.businessType ?? data.businessType ?? null,
          workspaceName,
          workspaceInitials: deriveInitials(workspaceName),
          loading: false,
          planLoadError: false,
        });
      } catch {
        if (cancelled) return;
        // Fail closed to the streamlined surface — never flash enterprise UI
        // to a tenant that may not be entitled to it.
        setState((prev) => ({ ...prev, loading: false, planLoadError: true }));
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
