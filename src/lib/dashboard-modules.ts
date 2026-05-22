import { PRODUCT } from "@/lib/posterboy-copy";

export type BentoNavId = "dispatch" | "issues" | "drafts" | "library" | "voice";

export interface BentoNavItem {
  id: BentoNavId;
  label: string;
  href: string;
  countKey?: "dispatch" | "issues" | "drafts";
}

export const BENTO_NAV: BentoNavItem[] = [
  { id: "dispatch", label: PRODUCT.dispatch, href: "/dashboard/dispatch", countKey: "dispatch" },
  { id: "issues", label: PRODUCT.issues, href: "/dashboard/issues", countKey: "issues" },
  { id: "drafts", label: PRODUCT.drafts, href: "/dashboard/drafts", countKey: "drafts" },
  { id: "library", label: "Library", href: "/dashboard/editor" },
  { id: "voice", label: "Voice", href: "/dashboard/brand-intake" },
];

export type AiModuleId = "studio" | "image" | "video" | "assistant";

export interface AiModuleConfig {
  id: AiModuleId;
  tag: string;
  title: string;
  description: string;
  href: string;
  variant: "feature" | "default" | "dark";
  placeholder: string;
}

export const AI_MODULES: AiModuleConfig[] = [
  {
    id: "studio",
    tag: "AI · Studio",
    title: "Posterboy\nAI studio",
    description: "Image, video, copy — one canvas, your voice.",
    href: "/dashboard/studio",
    variant: "feature",
    placeholder: "Try: 'remove background, add wordmark'",
  },
];

/** Placeholder carousel slides when no brand photos exist yet */
export const BENTO_CAROUSEL_FALLBACKS = [
  "linear-gradient(135deg, #5b8aa0 0%, #a8c0d0 100%)",
  "linear-gradient(135deg, #c08654 0%, #e8c4a0 100%)",
  "linear-gradient(135deg, #6e8f5b 0%, #a8c992 100%)",
  "linear-gradient(135deg, #28282a 0%, #4a4a4e 100%)",
];
