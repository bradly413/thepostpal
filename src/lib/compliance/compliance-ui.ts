/** User-facing compliance copy for composer + vertical panels. */

export function complianceFlagLabel(
  regulatoryBody: string | undefined,
  phrases: string[],
): string {
  const body = regulatoryBodyLabel(regulatoryBody);
  const sample = phrases[0];
  return sample
    ? `May raise a ${body} flag: '${sample}'`
    : `May raise a ${body} flag`;
}

export function regulatoryBodyLabel(regulatoryBody: string | undefined): string {
  if (regulatoryBody?.includes("Fair Housing") || regulatoryBody === "HUD/Fair Housing") {
    return "Fair Housing";
  }
  if (regulatoryBody === "FDA") return "FDA";
  if (regulatoryBody === "FTC") return "FTC";
  return "compliance";
}

export const COMPLIANCE_BLOCK_DEFAULT_MESSAGE =
  "This conflicts with your compliance guardrails — rephrase or send for review.";
