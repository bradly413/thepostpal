// ─── Design Templates (Marketplace Packs) ──────────────────────
// These are professional design templates from Envato/Creative Market
// that users customize in Canva. Separate from app-rendered templates.

export type DesignPlatform =
  | "instagram-post"
  | "instagram-story"
  | "instagram-reel"
  | "facebook-post"
  | "postcard";

export type DesignCategory =
  | "listing"
  | "sold"
  | "open-house"
  | "market-update"
  | "luxury"
  | "lifestyle"
  | "agent-branding";

export type DesignStyle =
  | "minimal"
  | "bold"
  | "luxury"
  | "modern"
  | "classic"
  | "editorial";

export interface DesignTextField {
  id: string;
  label: string;
  placeholder: string;
  maxLength?: number;
}

export interface DesignTemplate {
  id: string;
  name: string;
  packId: string;
  /** Preview image path — relative to /public */
  preview: string;
  platform: DesignPlatform;
  category: DesignCategory;
  style: DesignStyle;
  tags: string[];
  /** Canva template URL for customization */
  canvaUrl?: string;
  dimensions: { width: number; height: number };
  /** Editable text fields the AI can generate content for */
  textFields: DesignTextField[];
  fonts: string[];
}

export interface DesignPack {
  id: string;
  name: string;
  source: string;
  sourceFile: string;
  /** Number of design variants in this pack */
  variantCount: number;
  templates: DesignTemplate[];
}

// ─── Packs ──────────────────────────────────────────────────────
// Preview images go in /public/templates/previews/<template-id>.jpg
// Grab previews from the Envato/Creative Market listing pages.

export const DESIGN_PACKS: DesignPack[] = [
  {
    id: "luxury-ig-2026",
    name: "Luxury Real Estate Instagram Post",
    source: "envato",
    sourceFile: "luxury-real-estate-instagram-post-2026-04-30-18-57-23-utc.zip",
    variantCount: 6,
    templates: [
      {
        id: "luxury-ig-2026-01", name: "Luxury Listing 01", packId: "luxury-ig-2026",
        preview: "/templates/previews/luxury-ig-2026-01.jpg",
        platform: "instagram-post", category: "luxury", style: "luxury",
        tags: ["luxury", "listing", "elegant", "gold"],
        canvaUrl: "https://www.canva.com/design/DAG6C0Znwig/3b9ggnvfMHX8UyUcUbVj3Q/view",
        dimensions: { width: 1080, height: 1080 },
        textFields: [
          { id: "headline", label: "Headline", placeholder: "Luxury Living", maxLength: 30 },
          { id: "address", label: "Address", placeholder: "123 Ocean Drive, Malibu", maxLength: 60 },
          { id: "price", label: "Price", placeholder: "$4,500,000", maxLength: 15 },
          { id: "details", label: "Details", placeholder: "5 Bed | 4 Bath | 4,200 sqft", maxLength: 40 },
          { id: "agent", label: "Agent Name", placeholder: "Jane Smith", maxLength: 30 },
        ],
        fonts: ["Libre Baskerville", "Montserrat"],
      },
      {
        id: "luxury-ig-2026-02", name: "Luxury Listing 02", packId: "luxury-ig-2026",
        preview: "/templates/previews/luxury-ig-2026-02.jpg",
        platform: "instagram-post", category: "luxury", style: "luxury",
        tags: ["luxury", "listing", "elegant"],
        canvaUrl: "https://www.canva.com/design/DAG6C0Znwig/3b9ggnvfMHX8UyUcUbVj3Q/view",
        dimensions: { width: 1080, height: 1080 },
        textFields: [
          { id: "headline", label: "Headline", placeholder: "For Sale", maxLength: 30 },
          { id: "address", label: "Address", placeholder: "456 Hillside Ave", maxLength: 60 },
          { id: "price", label: "Price", placeholder: "$2,800,000", maxLength: 15 },
          { id: "agent", label: "Agent Name", placeholder: "Jane Smith", maxLength: 30 },
        ],
        fonts: ["Libre Baskerville", "Montserrat"],
      },
      {
        id: "luxury-ig-2026-03", name: "Luxury Listing 03", packId: "luxury-ig-2026",
        preview: "/templates/previews/luxury-ig-2026-03.jpg",
        platform: "instagram-post", category: "luxury", style: "luxury",
        tags: ["luxury", "listing", "minimal"],
        canvaUrl: "https://www.canva.com/design/DAG6C0Znwig/3b9ggnvfMHX8UyUcUbVj3Q/view",
        dimensions: { width: 1080, height: 1080 },
        textFields: [
          { id: "headline", label: "Headline", placeholder: "New Listing", maxLength: 30 },
          { id: "address", label: "Address", placeholder: "789 Sunset Blvd", maxLength: 60 },
          { id: "price", label: "Price", placeholder: "$3,200,000", maxLength: 15 },
          { id: "agent", label: "Agent Name", placeholder: "Jane Smith", maxLength: 30 },
        ],
        fonts: ["Libre Baskerville", "Montserrat"],
      },
      {
        id: "luxury-ig-2026-04", name: "Luxury Listing 04", packId: "luxury-ig-2026",
        preview: "/templates/previews/luxury-ig-2026-04.jpg",
        platform: "instagram-post", category: "luxury", style: "luxury",
        tags: ["luxury", "listing"],
        canvaUrl: "https://www.canva.com/design/DAG6C0Znwig/3b9ggnvfMHX8UyUcUbVj3Q/view",
        dimensions: { width: 1080, height: 1080 },
        textFields: [
          { id: "headline", label: "Headline", placeholder: "Dream Home", maxLength: 30 },
          { id: "address", label: "Address", placeholder: "321 Palm St", maxLength: 60 },
          { id: "price", label: "Price", placeholder: "$5,100,000", maxLength: 15 },
          { id: "agent", label: "Agent Name", placeholder: "Jane Smith", maxLength: 30 },
        ],
        fonts: ["Libre Baskerville", "Montserrat"],
      },
      {
        id: "luxury-ig-2026-05", name: "Luxury Listing 05", packId: "luxury-ig-2026",
        preview: "/templates/previews/luxury-ig-2026-05.jpg",
        platform: "instagram-post", category: "luxury", style: "luxury",
        tags: ["luxury", "listing"],
        canvaUrl: "https://www.canva.com/design/DAG6C0Znwig/3b9ggnvfMHX8UyUcUbVj3Q/view",
        dimensions: { width: 1080, height: 1080 },
        textFields: [
          { id: "headline", label: "Headline", placeholder: "Exclusive Property", maxLength: 30 },
          { id: "address", label: "Address", placeholder: "555 Bayfront Dr", maxLength: 60 },
          { id: "price", label: "Price", placeholder: "$6,750,000", maxLength: 15 },
          { id: "agent", label: "Agent Name", placeholder: "Jane Smith", maxLength: 30 },
        ],
        fonts: ["Libre Baskerville", "Montserrat"],
      },
      {
        id: "luxury-ig-2026-06", name: "Luxury Listing 06", packId: "luxury-ig-2026",
        preview: "/templates/previews/luxury-ig-2026-06.jpg",
        platform: "instagram-post", category: "luxury", style: "luxury",
        tags: ["luxury", "listing"],
        canvaUrl: "https://www.canva.com/design/DAG6C0Znwig/3b9ggnvfMHX8UyUcUbVj3Q/view",
        dimensions: { width: 1080, height: 1080 },
        textFields: [
          { id: "headline", label: "Headline", placeholder: "Just Listed", maxLength: 30 },
          { id: "address", label: "Address", placeholder: "888 Marina Way", maxLength: 60 },
          { id: "price", label: "Price", placeholder: "$4,200,000", maxLength: 15 },
          { id: "agent", label: "Agent Name", placeholder: "Jane Smith", maxLength: 30 },
        ],
        fonts: ["Libre Baskerville", "Montserrat"],
      },
    ],
  },
  {
    id: "luxury-living-2026",
    name: "Real Estate x Luxury Living",
    source: "envato",
    sourceFile: "real-estate-x-luxury-living-instagram-post-2026-02-20-22-53-16-utc.zip",
    variantCount: 6,
    templates: [
      {
        id: "luxury-living-01", name: "Luxury Living 01", packId: "luxury-living-2026",
        preview: "/templates/previews/luxury-living-01.jpg",
        platform: "instagram-post", category: "luxury", style: "modern",
        tags: ["luxury", "living", "lifestyle", "modern"],
        dimensions: { width: 1080, height: 1080 },
        textFields: [
          { id: "headline", label: "Headline", placeholder: "Luxury Living", maxLength: 30 },
          { id: "subhead", label: "Subheadline", placeholder: "Redefine your lifestyle", maxLength: 50 },
          { id: "agent", label: "Agent Name", placeholder: "Jane Smith", maxLength: 30 },
        ],
        fonts: [],
      },
      {
        id: "luxury-living-02", name: "Luxury Living 02", packId: "luxury-living-2026",
        preview: "/templates/previews/luxury-living-02.jpg",
        platform: "instagram-post", category: "luxury", style: "modern",
        tags: ["luxury", "living", "lifestyle"],
        dimensions: { width: 1080, height: 1080 },
        textFields: [
          { id: "headline", label: "Headline", placeholder: "Your Dream Home", maxLength: 30 },
          { id: "address", label: "Address", placeholder: "123 Luxury Lane", maxLength: 60 },
          { id: "agent", label: "Agent Name", placeholder: "Jane Smith", maxLength: 30 },
        ],
        fonts: [],
      },
      {
        id: "luxury-living-03", name: "Luxury Living 03", packId: "luxury-living-2026",
        preview: "/templates/previews/luxury-living-03.jpg",
        platform: "instagram-post", category: "luxury", style: "modern",
        tags: ["luxury", "living", "lifestyle"],
        dimensions: { width: 1080, height: 1080 },
        textFields: [
          { id: "headline", label: "Headline", placeholder: "Modern Elegance", maxLength: 30 },
          { id: "agent", label: "Agent Name", placeholder: "Jane Smith", maxLength: 30 },
        ],
        fonts: [],
      },
      {
        id: "luxury-living-04", name: "Luxury Living 04", packId: "luxury-living-2026",
        preview: "/templates/previews/luxury-living-04.jpg",
        platform: "instagram-post", category: "luxury", style: "modern",
        tags: ["luxury", "living"],
        dimensions: { width: 1080, height: 1080 },
        textFields: [
          { id: "headline", label: "Headline", placeholder: "Premium Property", maxLength: 30 },
          { id: "agent", label: "Agent Name", placeholder: "Jane Smith", maxLength: 30 },
        ],
        fonts: [],
      },
      {
        id: "luxury-living-05", name: "Luxury Living 05", packId: "luxury-living-2026",
        preview: "/templates/previews/luxury-living-05.jpg",
        platform: "instagram-post", category: "luxury", style: "modern",
        tags: ["luxury", "living"],
        dimensions: { width: 1080, height: 1080 },
        textFields: [
          { id: "headline", label: "Headline", placeholder: "Elevated Living", maxLength: 30 },
          { id: "agent", label: "Agent Name", placeholder: "Jane Smith", maxLength: 30 },
        ],
        fonts: [],
      },
      {
        id: "luxury-living-06", name: "Luxury Living 06", packId: "luxury-living-2026",
        preview: "/templates/previews/luxury-living-06.jpg",
        platform: "instagram-post", category: "luxury", style: "modern",
        tags: ["luxury", "living"],
        dimensions: { width: 1080, height: 1080 },
        textFields: [
          { id: "headline", label: "Headline", placeholder: "Find Your Place", maxLength: 30 },
          { id: "agent", label: "Agent Name", placeholder: "Jane Smith", maxLength: 30 },
        ],
        fonts: [],
      },
    ],
  },
  {
    id: "re-ig-2025",
    name: "Real Estate Instagram Post",
    source: "envato",
    sourceFile: "real-estate-instagram-post-2025-01-08-00-51-00-utc.zip",
    variantCount: 6,
    templates: Array.from({ length: 6 }, (_, i) => ({
      id: `re-ig-2025-0${i + 1}`,
      name: `Real Estate Post 0${i + 1}`,
      packId: "re-ig-2025",
      preview: `/templates/previews/re-ig-2025-0${i + 1}.jpg`,
      platform: "instagram-post" as DesignPlatform,
      category: "listing" as DesignCategory,
      style: "modern" as DesignStyle,
      tags: ["listing", "modern", "clean"],
      dimensions: { width: 1080, height: 1080 },
      textFields: [
        { id: "headline", label: "Headline", placeholder: "For Sale", maxLength: 30 },
        { id: "address", label: "Address", placeholder: "123 Main St", maxLength: 60 },
        { id: "price", label: "Price", placeholder: "$750,000", maxLength: 15 },
        { id: "agent", label: "Agent Name", placeholder: "Jane Smith", maxLength: 30 },
      ],
      fonts: [],
    })),
  },
  {
    id: "luxury-set-2025",
    name: "Luxury Real Estate Instagram Set",
    source: "envato",
    sourceFile: "luxury-real-estate-instagram-post-set-2025-07-10-02-45-17-utc.zip",
    variantCount: 6,
    templates: Array.from({ length: 6 }, (_, i) => ({
      id: `luxury-set-0${i + 1}`,
      name: `Luxury Set 0${i + 1}`,
      packId: "luxury-set-2025",
      preview: `/templates/previews/luxury-set-0${i + 1}.jpg`,
      platform: "instagram-post" as DesignPlatform,
      category: "luxury" as DesignCategory,
      style: "luxury" as DesignStyle,
      tags: ["luxury", "elegant", "set"],
      dimensions: { width: 1080, height: 1080 },
      textFields: [
        { id: "headline", label: "Headline", placeholder: "Luxury Estate", maxLength: 30 },
        { id: "address", label: "Address", placeholder: "100 Prestige Way", maxLength: 60 },
        { id: "price", label: "Price", placeholder: "$3,500,000", maxLength: 15 },
        { id: "agent", label: "Agent Name", placeholder: "Jane Smith", maxLength: 30 },
      ],
      fonts: [],
    })),
  },
  {
    id: "market-value-2025",
    name: "Real Estate Market Value Post",
    source: "envato",
    sourceFile: "real-estate-market-value-post-2025-09-24-23-45-13-utc.zip",
    variantCount: 6,
    templates: Array.from({ length: 6 }, (_, i) => ({
      id: `market-value-0${i + 1}`,
      name: `Market Value 0${i + 1}`,
      packId: "market-value-2025",
      preview: `/templates/previews/market-value-0${i + 1}.jpg`,
      platform: "instagram-post" as DesignPlatform,
      category: "market-update" as DesignCategory,
      style: "modern" as DesignStyle,
      tags: ["market", "value", "data", "stats"],
      dimensions: { width: 1080, height: 1080 },
      textFields: [
        { id: "headline", label: "Headline", placeholder: "Market Update", maxLength: 30 },
        { id: "stat1", label: "Stat 1", placeholder: "Median Price: $450K", maxLength: 30 },
        { id: "stat2", label: "Stat 2", placeholder: "Days on Market: 21", maxLength: 30 },
        { id: "agent", label: "Agent Name", placeholder: "Jane Smith", maxLength: 30 },
      ],
      fonts: [],
    })),
  },
  {
    id: "classic-a",
    name: "Property Luxury Instagram A",
    source: "envato",
    sourceFile: "real-estate-2024-06-11-03-23-13-utc.zip",
    variantCount: 5,
    templates: Array.from({ length: 5 }, (_, i) => ({
      id: `classic-a-0${i + 1}`,
      name: `Classic A-0${i + 1}`,
      packId: "classic-a",
      preview: `/templates/previews/classic-a-0${i + 1}.jpg`,
      platform: "instagram-post" as DesignPlatform,
      category: "listing" as DesignCategory,
      style: "classic" as DesignStyle,
      tags: ["classic", "listing", "property", "luxury"],
      dimensions: { width: 1080, height: 1080 },
      textFields: [
        { id: "headline", label: "Headline", placeholder: "For Sale", maxLength: 30 },
        { id: "address", label: "Address", placeholder: "123 Main St", maxLength: 60 },
        { id: "price", label: "Price", placeholder: "$650,000", maxLength: 15 },
        { id: "agent", label: "Agent Name", placeholder: "Jane Smith", maxLength: 30 },
      ],
      fonts: [],
    })),
  },
  {
    id: "classic-b",
    name: "Property Luxury Instagram B",
    source: "envato",
    sourceFile: "real-estate-2024-06-11-02-30-52-utc.zip",
    variantCount: 5,
    templates: Array.from({ length: 5 }, (_, i) => ({
      id: `classic-b-0${i + 1}`,
      name: `Classic B-0${i + 1}`,
      packId: "classic-b",
      preview: `/templates/previews/classic-b-0${i + 1}.jpg`,
      platform: "instagram-post" as DesignPlatform,
      category: "listing" as DesignCategory,
      style: "classic" as DesignStyle,
      tags: ["classic", "listing", "property"],
      dimensions: { width: 1080, height: 1080 },
      textFields: [
        { id: "headline", label: "Headline", placeholder: "For Sale", maxLength: 30 },
        { id: "address", label: "Address", placeholder: "555 Walnut St", maxLength: 60 },
        { id: "price", label: "Price", placeholder: "$720,000", maxLength: 15 },
        { id: "agent", label: "Agent Name", placeholder: "Jane Smith", maxLength: 30 },
      ],
      fonts: [],
    })),
  },
  {
    id: "postcard-2026",
    name: "Real Estate Postcard",
    source: "envato",
    sourceFile: "real-estate-postcard-2026-03-25-16-16-48-utc.zip",
    variantCount: 2,
    templates: [
      {
        id: "postcard-front", name: "Postcard Front", packId: "postcard-2026",
        preview: "/templates/previews/postcard-front.jpg",
        platform: "postcard", category: "listing", style: "classic",
        tags: ["postcard", "print", "mailer", "front"],
        dimensions: { width: 1875, height: 1275 },
        textFields: [
          { id: "headline", label: "Headline", placeholder: "Just Listed", maxLength: 20 },
          { id: "address", label: "Address", placeholder: "123 Main St", maxLength: 60 },
          { id: "price", label: "Price", placeholder: "$899,000", maxLength: 15 },
          { id: "details", label: "Details", placeholder: "4 Bed | 3 Bath | 2,400 sqft", maxLength: 40 },
          { id: "agent", label: "Agent Name", placeholder: "Jane Smith", maxLength: 30 },
          { id: "phone", label: "Phone", placeholder: "(555) 123-4567", maxLength: 20 },
        ],
        fonts: [],
      },
      {
        id: "postcard-back", name: "Postcard Back", packId: "postcard-2026",
        preview: "/templates/previews/postcard-back.jpg",
        platform: "postcard", category: "listing", style: "classic",
        tags: ["postcard", "print", "mailer", "back"],
        dimensions: { width: 1875, height: 1275 },
        textFields: [
          { id: "description", label: "Description", placeholder: "Beautiful family home...", maxLength: 200 },
          { id: "agent", label: "Agent Name", placeholder: "Jane Smith", maxLength: 30 },
          { id: "brokerage", label: "Brokerage", placeholder: "RE/MAX Premier", maxLength: 40 },
          { id: "phone", label: "Phone", placeholder: "(555) 123-4567", maxLength: 20 },
        ],
        fonts: [],
      },
    ],
  },
];

// ─── Helpers ────────────────────────────────────────────────────

export function getAllDesignTemplates(): DesignTemplate[] {
  return DESIGN_PACKS.flatMap((p) => p.templates);
}

export function getDesignTemplatesByCategory(cat: DesignCategory): DesignTemplate[] {
  return getAllDesignTemplates().filter((t) => t.category === cat);
}

export function getDesignTemplatesByPlatform(plat: DesignPlatform): DesignTemplate[] {
  return getAllDesignTemplates().filter((t) => t.platform === plat);
}

export function searchDesignTemplates(query: string): DesignTemplate[] {
  const q = query.toLowerCase();
  return getAllDesignTemplates().filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.includes(q)) ||
      t.category.includes(q) ||
      t.style.includes(q)
  );
}

export function getDesignTemplateById(id: string): DesignTemplate | undefined {
  return getAllDesignTemplates().find((t) => t.id === id);
}
