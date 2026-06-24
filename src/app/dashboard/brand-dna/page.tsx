import BrandDnaPreview from "@/components/brand-dna/BrandDnaPreview";

// Standalone surface for the Brand DNA engine. Reachable at /dashboard/brand-dna.
// The same <BrandDnaPreview/> component is what the onboarding Brand Architect
// will embed once the flow is wired.
export default function BrandDnaPage() {
  return <BrandDnaPreview />;
}
