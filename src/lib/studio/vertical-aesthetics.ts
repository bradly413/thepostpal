/**
 * Vertical aesthetic map for Studio compose + art-director.
 * Distilled from campaign art-director guidance — only rules that raise
 * commercial Instagram quality without reintroducing café/beige/documentary.
 */

export type StudioVertical =
  | "med_spa_beauty"
  | "food_beverage_pop"
  | "beverage"
  | "product"
  | "fashion_retail"
  | "fitness"
  | "hospitality"
  | "professional"
  | "real_estate"
  | "default";

/** Lens / light / anti-AI positives — Gemini follows these better than long ban lists. */
export const TECHNICAL_PROMPT_HINTS =
  "Include one lens cue (e.g. 85mm f/2.8 or 50mm f/2.8) and one light cue (large softbox / bright soft daylight / hard studio key for pop-art food). Always: real photograph, true skin/product texture. Avoid: plastic skin, CGI, 3D render, cartoon, over-smoothed AI gloss, watermark, text in image.";

const MED_SPA = `Vertical: Med spa / clinical beauty — Editorial Clinical (Posterboy). Soft white or ivory seamless infinity, bright high-key wraparound beauty light, dewy luminous skin, punchy clean color. NEVER muted warm grey, soft beige documentary grade, rustic brown, or spa-room wood/brick. Brand hero = person/glow, not invented product bottles.`;

const FOOD_POP = `Vertical: Commercial food & beverage — Pop-Art Studio. Solid bold saturated color-block or seamless backdrop matching the brief (e.g. vibrant red → solid red). Hard directional studio key, crisp shadows, hyper-real glistening textures, hero food/drink large and centered. NEVER rustic Food & Wine table, wood, kraft, café, marble counter, or kitchen bokeh unless the brief names that place.`;

const BEVERAGE = `Vertical: Beverage — Premium commercial pour. Backlit liquid clarity, condensation, vivid true color. Default to bright high-key or solid color-block studio — NOT dim speakeasy / tungsten café unless the brief asks for moody/speakeasy. No table edge unless named.`;

const PRODUCT = `Vertical: Product / e-commerce — Minimalist Studio. Seamless paper or solid-color fill, structural precision, soft commercial light, generous clean backdrop, hero product large. No lifestyle room filler.`;

const FASHION = `Vertical: Retail & fashion — Lookbook commercial. Crisp white/grey sweep or curated color-block matching the garment; sharp texture detail; bright clean grade. No cluttered boutique interiors unless named.`;

const FITNESS = `Vertical: Fitness & wellness — Premium active. Bright airy diffused light or clean high-contrast gym energy; vivid true color; subject large. Avoid muddy brown documentary gym grit unless asked.`;

const HOSPITALITY = `Vertical: Hospitality & travel — polished aspirational. Only when a place is named: warm inviting light, real environment. When no place is named, stay seamless commercial — do not invent a lobby/café.`;

const PROFESSIONAL = `Vertical: Professional services — Modern executive commercial. Clean bright window-lit or soft studio; confident subject; ivory/white seamless when no office is named. No café lifestyle filler.`;

const REAL_ESTATE = `Vertical: Real estate — bright curb-appeal / interior daylight when a listing photo is attached. Never invent a property.`;

const DEFAULT = `Vertical: Local-business Instagram — neutral chic modern commercial. Clean composition, vibrant true color, high-key light, seamless or solid-color set when no venue is named. Catalog / brand-ad energy.`;

const VERTICAL_BLOCK: Record<StudioVertical, string> = {
  med_spa_beauty: MED_SPA,
  food_beverage_pop: FOOD_POP,
  beverage: BEVERAGE,
  product: PRODUCT,
  fashion_retail: FASHION,
  fitness: FITNESS,
  hospitality: HOSPITALITY,
  professional: PROFESSIONAL,
  real_estate: REAL_ESTATE,
  default: DEFAULT,
};

/**
 * Infer vertical from the owner's brief and optional businessType.
 * Brief keywords win over business type (smoothie at a spa account → food pop).
 */
export function inferStudioVertical(
  brief: string,
  businessType?: string | null,
): StudioVertical {
  const briefL = brief.toLowerCase();
  const bt = (businessType ?? "").toLowerCase();
  const t = `${briefL} ${bt}`;

  // Subject keywords in the brief win over account niche (smoothie at a spa org).
  if (/\b(listing|open house|for sale|real estate|property|mls)\b/.test(briefL)) {
    return "real_estate";
  }
  if (
    /\b(smoothie|milkshake|burger|pizza|taco|sushi|salad|dessert|cake|pastry|donut|brunch|food|dish|meal|plate)\b/.test(
      briefL,
    )
  ) {
    return "food_beverage_pop";
  }
  if (
    /\b(cocktail|mocktail|wine|beer|latte|espresso|coffee|matcha|juice|pour|beverage|drink)\b/.test(
      briefL,
    )
  ) {
    return "beverage";
  }
  if (
    /\b(med(?:ical)?\s*spa|injectable|botox|filler|facial|dermatolog|skincare|serum|glowing?\s+skin|beauty\s+portrait|wellness\s+portrait|lip\s+filler)\b/.test(
      t,
    )
  ) {
    return "med_spa_beauty";
  }
  if (
    /\b(sneaker|handbag|dress|jacket|apparel|fashion|lookbook|flat\s*lay|product|bottle|candle|packaging)\b/.test(
      briefL,
    )
  ) {
    return "product";
  }
  if (/\b(gym|workout|yoga|pilates|fitness|activewear|training)\b/.test(t)) {
    return "fitness";
  }
  if (/\b(hotel|resort|travel|vacation|hospitality|airbnb)\b/.test(t)) {
    return "hospitality";
  }
  if (/\b(lawyer|attorney|dentist|doctor|cpa|consultant|executive|office)\b/.test(t)) {
    return "professional";
  }
  if (/\b(boutique|retail|clothing|jewelry)\b/.test(t)) {
    return "fashion_retail";
  }

  if (/\b(spa|beauty|salon|skin|aesthetic|wellness)\b/.test(bt)) return "med_spa_beauty";
  if (/\b(restaurant|cafe|café|bakery|food|cater)\b/.test(bt)) return "food_beverage_pop";
  if (/\b(gym|fitness|yoga)\b/.test(bt)) return "fitness";
  if (/\b(hotel|travel)\b/.test(bt)) return "hospitality";
  if (/\b(real\s*estate|realtor)\b/.test(bt)) return "real_estate";
  if (/\b(retail|fashion|boutique)\b/.test(bt)) return "fashion_retail";

  return "default";
}

/** Compact block for compose / art-director system or user messages. */
export function verticalAestheticBlock(
  brief: string,
  businessType?: string | null,
): string {
  const vertical = inferStudioVertical(brief, businessType);
  return `${VERTICAL_BLOCK[vertical]}\n${TECHNICAL_PROMPT_HINTS}`;
}
