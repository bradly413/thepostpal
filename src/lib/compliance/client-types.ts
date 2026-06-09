/** Client-safe compliance types (mirrors API / caption picker contracts). */

export type EnforcementLevel = "block" | "warn" | "suggest";

export interface VerticalOption {
  slug: string;
  name: string;
  parentSlug: string | null;
  enforcementLevel: EnforcementLevel;
  regulatoryBody: string | null;
  guardrailSummary: string;
}

export interface TenantVerticalState {
  verticalSlug: string | null;
  vertical: VerticalOption | null;
  activeGuardrails: string[];
}

export interface CaptionComplianceBlock {
  blocked: true;
  level: "block";
  flaggedPhrases: string[];
  message: string;
  regulatoryBody?: string;
}

export interface CaptionComplianceFlag {
  variantIndex: number;
  phrases: string[];
}

export interface CaptionComplianceWarn {
  blocked?: false;
  level: "warn" | "suggest";
  flags: CaptionComplianceFlag[];
  regulatoryBody?: string;
}

export type CaptionCompliance = CaptionComplianceBlock | CaptionComplianceWarn;

export function isComplianceBlock(
  c: CaptionCompliance | undefined | null,
): c is CaptionComplianceBlock {
  return Boolean(c && c.blocked === true);
}
