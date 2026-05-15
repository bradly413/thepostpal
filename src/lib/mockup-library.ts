export type MockupCategory =
  | "listing"
  | "interior"
  | "sold"
  | "neighborhood"
  | "seasonal"
  | "lifestyle";

interface MockupImage {
  src: string;
  alt: string;
}

const library: Record<MockupCategory, MockupImage[]> = {
  listing: [
    { src: "/mockup-library/listing/1.jpg", alt: "White stone mansion with topiary" },
    { src: "/mockup-library/listing/2.jpg", alt: "White brick home with ivy" },
    { src: "/mockup-library/listing/3.jpg", alt: "French stone house with brick driveway" },
    { src: "/mockup-library/listing/4.jpg", alt: "White estate with green lawn" },
    { src: "/mockup-library/listing/5.jpg", alt: "Light brick home with black windows" },
    { src: "/mockup-library/listing/6.jpg", alt: "Light brick cottage with planters" },
    { src: "/mockup-library/listing/7.jpg", alt: "White cottage with picket fence" },
    { src: "/mockup-library/listing/8.jpg", alt: "White farmhouse with front porch" },
    { src: "/mockup-library/listing/9.jpg", alt: "Stone cottage with wreath" },
    { src: "/mockup-library/listing/10.jpg", alt: "White colonial with front porch" },
    { src: "/mockup-library/listing/11.jpg", alt: "Brick tudor with hedges" },
    { src: "/mockup-library/listing/12.jpg", alt: "Tudor brick exterior" },
    { src: "/mockup-library/listing/13.jpg", alt: "Suburban brick with garage" },
  ],
  interior: [
    { src: "/mockup-library/interior/1.jpg", alt: "Living room with stone fireplace and arched entry" },
    { src: "/mockup-library/interior/2.jpg", alt: "Foyer with iron staircase and reading nook" },
    { src: "/mockup-library/interior/3.jpg", alt: "Living room with exposed beams and stone fireplace" },
    { src: "/mockup-library/interior/4.jpg", alt: "Living room with built-in shelves and fireplace" },
    { src: "/mockup-library/interior/5.jpg", alt: "Foyer with french doors and console table" },
    { src: "/mockup-library/interior/6.jpg", alt: "Gourmet kitchen with island and chandelier" },
  ],
  sold: [
    { src: "/mockup-library/sold/1.jpg", alt: "Brick colonial with mature trees" },
    { src: "/mockup-library/sold/2.jpg", alt: "Brick and stone estate with shutters" },
    { src: "/mockup-library/sold/3.jpg", alt: "Brick mansion with manicured landscaping" },
  ],
  neighborhood: [
    { src: "/mockup-library/neighborhood/1.jpg", alt: "Flagstone walkway with hydrangeas" },
    { src: "/mockup-library/neighborhood/2.jpg", alt: "Brick planter with roses" },
    { src: "/mockup-library/neighborhood/3.jpg", alt: "Hostas and hydrangeas landscaping" },
  ],
  seasonal: [
    { src: "/mockup-library/seasonal/1.jpg", alt: "Spring neighborhood with flowering trees" },
    { src: "/mockup-library/seasonal/2.jpg", alt: "Summer garden path with hydrangeas" },
    { src: "/mockup-library/seasonal/3.jpg", alt: "White farmhouse with spring blossoms" },
  ],
  lifestyle: [
    { src: "/mockup-library/lifestyle/1.jpg", alt: "Patio with outdoor furniture" },
    { src: "/mockup-library/lifestyle/2.jpg", alt: "Craftsman backyard patio" },
    { src: "/mockup-library/lifestyle/3.jpg", alt: "Outdoor firepit and seating" },
  ],
};

const keywordMap: Record<string, MockupCategory> = {
  listing: "listing",
  "new listing": "listing",
  "just listed": "listing",
  property: "listing",
  house: "listing",
  home: "listing",
  "open house": "listing",
  pool: "listing",
  backyard: "listing",
  kitchen: "interior",
  bathroom: "interior",
  bedroom: "interior",
  staging: "interior",
  interior: "interior",
  sold: "sold",
  "just sold": "sold",
  closing: "sold",
  neighborhood: "neighborhood",
  community: "neighborhood",
  spotlight: "neighborhood",
  market: "neighborhood",
  spring: "seasonal",
  summer: "seasonal",
  fall: "seasonal",
  winter: "seasonal",
  holiday: "seasonal",
  christmas: "seasonal",
  thanksgiving: "seasonal",
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function hasImages(category: MockupCategory): boolean {
  return library[category].length > 0;
}

export function pickMockupImage(prompt: string): string | null {
  const lower = prompt.toLowerCase();

  const sortedKeywords = Object.keys(keywordMap).sort(
    (a, b) => b.length - a.length
  );

  for (const keyword of sortedKeywords) {
    if (lower.includes(keyword)) {
      const category = keywordMap[keyword];
      if (hasImages(category)) {
        return pickRandom(library[category]).src;
      }
    }
  }

  const fallbackOrder: MockupCategory[] = ["listing", "lifestyle", "neighborhood"];
  for (const cat of fallbackOrder) {
    if (hasImages(cat)) return pickRandom(library[cat]).src;
  }

  return null;
}

export function getLibraryCategories(): {
  category: MockupCategory;
  count: number;
}[] {
  return (Object.keys(library) as MockupCategory[]).map((cat) => ({
    category: cat,
    count: library[cat].length,
  }));
}
