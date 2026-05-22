import "server-only";

import path from "node:path";
import { promises as fs } from "node:fs";
import { templates as staticTemplates, type Template, type TemplateField } from "@/lib/templates";

type ImportedPack = {
  slug: string;
  name?: string;
  status?: string;
  metadata?: {
    zipInspection?: {
      hasCanva?: boolean;
    };
  };
};

type ImportedPackFile = {
  packs?: ImportedPack[];
};

type NormalizationEditableField = {
  id?: string;
  label?: string;
  type?: string;
  required?: boolean;
};

type NormalizationCandidateTemplate = {
  id?: string;
  name?: string;
  recommendedSlug?: string;
  recommendedPillar?: string;
  recommendedDimensions?: string;
  recommendedBackgroundType?: string;
  recommendedLayout?: string;
  contentGoal?: string;
  editableFields?: NormalizationEditableField[];
};

type NormalizationFile = {
  packSlug?: string;
  packName?: string;
  candidateTemplates?: NormalizationCandidateTemplate[];
};

type NormalizationQueueItem = {
  packSlug?: string;
  priority?: string;
  status?: string;
  lane?: string;
};

type NormalizationIndexFile = {
  queue?: NormalizationQueueItem[];
};

const TEMPLATE_PACKS_DIR = path.join(process.cwd(), "template-packs");
const ANGIE_PACKS_PATH = path.join(TEMPLATE_PACKS_DIR, "angie-nichols.json");
const NORMALIZATION_DIR = path.join(TEMPLATE_PACKS_DIR, "normalizations");
const NORMALIZATION_INDEX_PATH = path.join(NORMALIZATION_DIR, "index.json");

const PROMOTION_LIMIT = 5;
const SOCIAL_MOCK_PREVIEWS = [
  "/images/social-mocks/01.png",
  "/images/social-mocks/02.png",
  "/images/social-mocks/03.png",
  "/images/social-mocks/04.png",
  "/images/social-mocks/05.png",
  "/images/social-mocks/06.png",
  "/images/social-mocks/07.png",
  "/images/social-mocks/08.png",
  "/images/social-mocks/09.png",
  "/images/social-mocks/10.png",
];
const FALLBACK_PREVIEW = "/previews/market-clarity.png";

const PILLAR_ALIASES: Record<string, string> = {
  "offers and launches": "Promotions",
  "business promotion": "Promotions",
  "business education": "Educational",
  "buyer/seller tips": "Buyer / Seller Tips",
};

function mapBackground(value?: string): Template["bgType"] {
  const lowered = (value || "").toLowerCase();
  if (lowered === "navy") return "navy";
  if (lowered === "ivory") return "ivory";
  if (lowered === "photo-overlay") return "photo-overlay";
  if (lowered === "photo-fullbleed") return "photo-fullbleed";
  if (lowered === "split") return "split";
  return "photo-overlay";
}

function mapLayout(value?: string, bgType: Template["bgType"] = "photo-overlay"): Template["layout"] {
  const lowered = (value || "").toLowerCase();
  if (lowered === "centered") return "centered";
  if (lowered === "left-aligned") return "left-aligned";
  if (lowered === "bottom-text") return "bottom-text";
  if (lowered === "split-header") return "split-header";
  if (bgType === "split") return "split-header";
  if (bgType === "ivory") return "left-aligned";
  return "bottom-text";
}

function inferPillarFromSlug(slug: string): string {
  const lowered = slug.toLowerCase();
  if (lowered.includes("market")) return "Market Clarity";
  if (lowered.includes("luxury") || lowered.includes("property") || lowered.includes("real-estate")) {
    return "Neighborhood / Lifestyle";
  }
  if (lowered.includes("sale") || lowered.includes("promo") || lowered.includes("offer")) {
    return "Promotions";
  }
  if (lowered.includes("event")) return "Events";
  if (lowered.includes("education") || lowered.includes("tips")) return "Educational";
  return "Business Growth";
}

function normalizePillar(value?: string, slug?: string): string {
  const trimmed = (value || "").trim();
  if (!trimmed) return inferPillarFromSlug(slug || "");
  const mapped = PILLAR_ALIASES[trimmed.toLowerCase()];
  return mapped || trimmed;
}

function mapFieldType(id: string, label: string, rawType?: string): TemplateField["type"] {
  const token = `${id} ${label} ${rawType || ""}`.toLowerCase();
  if (token.includes("eyebrow")) return "eyebrow";
  if (token.includes("headline") || token.includes("title")) return "headline";
  if (token.includes("cta") || token.includes("call to action")) return "cta";
  if (token.includes("date")) return "date";
  if (token.includes("location")) return "location";
  if (token.includes("list") || token.includes("checklist") || token.includes("items") || token.includes("points")) {
    return "list";
  }
  return "body";
}

function toTemplateField(field: NormalizationEditableField): TemplateField {
  const id = (field.id || field.label || "field").toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const label = field.label || id.replace(/_/g, " ");
  const type = mapFieldType(id, label, field.type);
  const defaultValue =
    type === "list"
      ? "Point one\nPoint two\nPoint three"
      : type === "cta"
        ? "Learn more"
        : label;

  return {
    id,
    label,
    type,
    defaultValue,
  };
}

function parseDimensions(raw?: string): { width: number; height: number } {
  const match = (raw || "").match(/(\d+)\s*x\s*(\d+)/i);
  if (!match) return { width: 1080, height: 1080 };
  return {
    width: Number(match[1]) || 1080,
    height: Number(match[2]) || 1080,
  };
}

function previewForIndex(index: number): string {
  return SOCIAL_MOCK_PREVIEWS[index % SOCIAL_MOCK_PREVIEWS.length] || FALLBACK_PREVIEW;
}

function defaultImportedFields(slug: string): TemplateField[] {
  const pillar = inferPillarFromSlug(slug);
  if (pillar === "Market Clarity") {
    return [
      { id: "headline", label: "Headline", type: "headline", defaultValue: "Market update this week" },
      { id: "body", label: "Body", type: "body", defaultValue: "One clear takeaway your audience can use right now." },
      { id: "cta", label: "Call to Action", type: "cta", defaultValue: "Message us for details" },
    ];
  }
  return [
    { id: "eyebrow", label: "Category", type: "eyebrow", defaultValue: "FEATURED POST" },
    { id: "headline", label: "Headline", type: "headline", defaultValue: "Your week is drafted." },
    { id: "body", label: "Body", type: "body", defaultValue: "Approve at your leisure." },
  ];
}

function buildImportedPackTemplate(pack: ImportedPack, index: number): Template {
  const bgType = mapBackground(undefined);
  const slug = pack.slug || `pack-${index + 1}`;
  const hasCanva = Boolean(pack.metadata?.zipInspection?.hasCanva);
  return {
    id: `envato-pack-${slug}`,
    name: `${pack.name || slug.replace(/-/g, " ")} (Envato)`,
    pillar: inferPillarFromSlug(slug),
    description: hasCanva
      ? "Imported Envato pack with Canva-ready source files."
      : "Imported Envato pack staged for normalization.",
    width: 1080,
    height: slug.includes("story") ? 1920 : 1080,
    bgType,
    layout: mapLayout(undefined, bgType),
    hasPhotoSlot: true,
    preview: previewForIndex(index),
    source: "ENVATO_IMPORT",
    templatePackSlug: slug,
    fields: defaultImportedFields(slug),
  };
}

function buildPromotedTemplate(
  packSlug: string,
  packName: string,
  candidate: NormalizationCandidateTemplate,
  index: number
): Template | null {
  const recommendedSlug = (candidate.recommendedSlug || candidate.id || "").trim();
  if (!recommendedSlug) return null;

  const bgType = mapBackground(candidate.recommendedBackgroundType);
  const layout = mapLayout(candidate.recommendedLayout, bgType);
  const dimensions = parseDimensions(candidate.recommendedDimensions);
  const rawFields = Array.isArray(candidate.editableFields) ? candidate.editableFields : [];
  const fields = rawFields.length > 0 ? rawFields.map(toTemplateField) : defaultImportedFields(packSlug);
  const hasPhotoField = rawFields.some((field) => /photo|image/i.test(`${field.id || ""} ${field.label || ""}`));

  return {
    id: `envato-promoted-${recommendedSlug}`,
    name: `${candidate.name || recommendedSlug} (Envato)`,
    pillar: normalizePillar(candidate.recommendedPillar, packSlug),
    description: candidate.contentGoal || `App-ready template normalized from ${packName}.`,
    width: dimensions.width,
    height: dimensions.height,
    bgType,
    layout,
    hasPhotoSlot: hasPhotoField || bgType === "photo-overlay" || bgType === "photo-fullbleed" || bgType === "split",
    preview: previewForIndex(index),
    source: "ENVATO_IMPORT",
    templatePackSlug: packSlug,
    fields,
  };
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function loadImportedPackTemplates(): Promise<Template[]> {
  const payload = await readJsonFile<ImportedPackFile>(ANGIE_PACKS_PATH);
  const packs = Array.isArray(payload?.packs) ? payload.packs : [];
  return packs
    .filter((pack) => pack.slug && (pack.status || "").toUpperCase() === "READY")
    .map((pack, index) => buildImportedPackTemplate(pack, index));
}

async function loadPromotedNormalizationTemplates(startIndex: number): Promise<Template[]> {
  const indexPayload = await readJsonFile<NormalizationIndexFile>(NORMALIZATION_INDEX_PATH);
  const queue = Array.isArray(indexPayload?.queue) ? indexPayload.queue : [];
  const promotedQueue = queue
    .filter((item) => (item.priority || "").toUpperCase() === "NOW" && (item.lane || "").toLowerCase() === "template")
    .slice(0, PROMOTION_LIMIT);

  const promotedTemplates: Template[] = [];

  for (let queueIndex = 0; queueIndex < promotedQueue.length; queueIndex += 1) {
    const item = promotedQueue[queueIndex];
    const packSlug = item.packSlug || "";
    if (!packSlug) continue;
    const normalizationPath = path.join(NORMALIZATION_DIR, `${packSlug}.json`);
    const detail = await readJsonFile<NormalizationFile>(normalizationPath);
    const candidates = Array.isArray(detail?.candidateTemplates) ? detail.candidateTemplates : [];
    const packName = detail?.packName || packSlug;

    candidates.forEach((candidate, candidateIndex) => {
      const template = buildPromotedTemplate(
        packSlug,
        packName,
        candidate,
        startIndex + queueIndex * 3 + candidateIndex
      );
      if (template) promotedTemplates.push(template);
    });
  }

  return promotedTemplates;
}

function dedupeById(items: Template[]): Template[] {
  const seen = new Set<string>();
  const result: Template[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }
  return result;
}

export async function loadTemplateCatalog(): Promise<Template[]> {
  const importedPackTemplates = await loadImportedPackTemplates();
  const promotedTemplates = await loadPromotedNormalizationTemplates(importedPackTemplates.length);
  return dedupeById([...staticTemplates, ...importedPackTemplates, ...promotedTemplates]);
}

