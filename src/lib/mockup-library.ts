export type MockupCategory =
  | "listing"
  | "interior"
  | "sold"
  | "neighborhood"
  | "seasonal"
  | "lifestyle"
  | "local";

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
    { src: "/mockup-library/listing/14.jpg", alt: "White stone estate with arched entry" },
    { src: "/mockup-library/listing/15.jpg", alt: "Light brick home with black windows at dusk" },
    { src: "/mockup-library/listing/16.jpg", alt: "Gray brick cottage with black windows and lanterns" },
    { src: "/mockup-library/listing/17.jpg", alt: "White estate with flowering landscaping" },
    { src: "/mockup-library/listing/18.jpg", alt: "White brick home with ivy and arched door" },
    { src: "/mockup-library/listing/19.jpg", alt: "White farmhouse with picket fence at dusk" },
    { src: "/mockup-library/listing/20.jpg", alt: "Brick tudor with arched doorway" },
    { src: "/mockup-library/listing/21.jpg", alt: "White colonial with black shutters and porch" },
    { src: "/mockup-library/listing/22.jpg", alt: "White cottage with stone accent and porch" },
    { src: "/mockup-library/listing/23.jpg", alt: "White cottage with blue shutters and garage" },
    { src: "/mockup-library/listing/24.jpg", alt: "Modern farmhouse with wraparound porch" },
    { src: "/mockup-library/listing/25.jpg", alt: "Brick and stone estate with landscaping" },
  ],
  interior: [
    { src: "/mockup-library/interior/1.jpg", alt: "Living room with stone fireplace and arched entry" },
    { src: "/mockup-library/interior/2.jpg", alt: "Foyer with iron staircase and reading nook" },
    { src: "/mockup-library/interior/3.jpg", alt: "Living room with exposed beams and stone fireplace" },
    { src: "/mockup-library/interior/4.jpg", alt: "Living room with built-in shelves and fireplace" },
    { src: "/mockup-library/interior/5.jpg", alt: "Foyer with french doors and console table" },
    { src: "/mockup-library/interior/6.jpg", alt: "Gourmet kitchen with island and chandelier" },
    { src: "/mockup-library/interior/7.jpg", alt: "Living room with stone fireplace and built-ins" },
    { src: "/mockup-library/interior/8.jpg", alt: "Foyer with french doors and staircase" },
    { src: "/mockup-library/interior/9.jpg", alt: "Grand foyer with curved staircase" },
    { src: "/mockup-library/interior/10.jpg", alt: "Gourmet kitchen with granite and chandelier" },
  ],
  sold: [
    { src: "/mockup-library/sold/1.jpg", alt: "Brick colonial with mature trees" },
    { src: "/mockup-library/sold/2.jpg", alt: "Brick and stone estate with shutters" },
    { src: "/mockup-library/sold/3.jpg", alt: "Brick mansion with manicured landscaping" },
    { src: "/mockup-library/sold/4.jpg", alt: "Brick two-story with three-car garage" },
    { src: "/mockup-library/sold/5.jpg", alt: "Stone and brick estate with circular drive" },
    { src: "/mockup-library/sold/6.jpg", alt: "Brick colonial on wooded lot" },
    { src: "/mockup-library/sold/7.jpg", alt: "Ranch home with mature landscaping" },
    { src: "/mockup-library/sold/8.jpg", alt: "Craftsman farmhouse with cherry blossoms" },
  ],
  neighborhood: [
    { src: "/mockup-library/neighborhood/1.jpg", alt: "Flagstone walkway with hydrangeas" },
    { src: "/mockup-library/neighborhood/2.jpg", alt: "Brick planter with roses" },
    { src: "/mockup-library/neighborhood/3.jpg", alt: "Hostas and hydrangeas landscaping" },
    { src: "/mockup-library/neighborhood/4.jpg", alt: "Flagstone path with hydrangeas and hostas" },
    { src: "/mockup-library/neighborhood/5.jpg", alt: "Foundation plantings with hydrangeas and stepping stones" },
    { src: "/mockup-library/neighborhood/6.jpg", alt: "White brick home with rose garden" },
    { src: "/mockup-library/neighborhood/7.jpg", alt: "Aerial view of suburban neighborhood" },
    { src: "/mockup-library/neighborhood/8.jpg", alt: "Tree-lined street with traditional homes" },
    { src: "/mockup-library/neighborhood/9.jpg", alt: "Brick townhouse row with young trees" },
    { src: "/mockup-library/neighborhood/10.jpg", alt: "Upscale neighborhood street in summer" },
  ],
  seasonal: [
    { src: "/mockup-library/seasonal/1.jpg", alt: "Spring neighborhood with flowering trees" },
    { src: "/mockup-library/seasonal/2.jpg", alt: "Summer garden path with hydrangeas" },
    { src: "/mockup-library/seasonal/3.jpg", alt: "White farmhouse with spring blossoms" },
    { src: "/mockup-library/seasonal/4.jpg", alt: "Aerial spring neighborhood with cherry blossoms" },
    { src: "/mockup-library/seasonal/5.jpg", alt: "Stone estate with circular driveway" },
    { src: "/mockup-library/seasonal/6.jpg", alt: "Light brick home with autumn landscaping" },
  ],
  lifestyle: [
    { src: "/mockup-library/lifestyle/1.jpg", alt: "Patio with outdoor furniture" },
    { src: "/mockup-library/lifestyle/2.jpg", alt: "Craftsman backyard patio" },
    { src: "/mockup-library/lifestyle/3.jpg", alt: "Outdoor firepit and seating" },
    { src: "/mockup-library/lifestyle/4.jpg", alt: "Luxury patio with firepit and lanterns" },
    { src: "/mockup-library/lifestyle/5.jpg", alt: "Backyard patio with outdoor dining" },
    { src: "/mockup-library/lifestyle/6.jpg", alt: "Covered patio with fireplace and pool" },
  ],
  local: [
    { src: "/mockup-library/local/1.jpg", alt: "Busch Stadium in St. Louis" },
    { src: "/mockup-library/local/2.jpg", alt: "Missouri History Museum with fountain" },
    { src: "/mockup-library/local/3.jpg", alt: "Maryville University entrance" },
    { src: "/mockup-library/local/4.jpg", alt: "Jewel Box in Forest Park with tulips" },
  ],
};

const HOLIDAY_UNSPLASH: Record<string, string[]> = {
  "memorial day": [
    "https://images.unsplash.com/photo-1569161031678-f49b4b9ca4f2?w=800&q=80",
    "https://images.unsplash.com/photo-1508433957232-3107f5fd5995?w=800&q=80",
    "https://images.unsplash.com/photo-1603827457577-609e6f42a45e?w=800&q=80",
  ],
  "fourth of july": [
    "https://images.unsplash.com/photo-1498931299210-d53e5ca8ae29?w=800&q=80",
    "https://images.unsplash.com/photo-1530982011887-3cc11cc85693?w=800&q=80",
    "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&q=80",
  ],
  "4th of july": [
    "https://images.unsplash.com/photo-1498931299210-d53e5ca8ae29?w=800&q=80",
    "https://images.unsplash.com/photo-1530982011887-3cc11cc85693?w=800&q=80",
    "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&q=80",
  ],
  "independence day": [
    "https://images.unsplash.com/photo-1498931299210-d53e5ca8ae29?w=800&q=80",
    "https://images.unsplash.com/photo-1530982011887-3cc11cc85693?w=800&q=80",
  ],
  "veterans day": [
    "https://images.unsplash.com/photo-1569161031678-f49b4b9ca4f2?w=800&q=80",
    "https://images.unsplash.com/photo-1508433957232-3107f5fd5995?w=800&q=80",
  ],
  "labor day": [
    "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80",
    "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&q=80",
  ],
  "mothers day": [
    "https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=800&q=80",
    "https://images.unsplash.com/photo-1462275646964-a0e3c11f18a6?w=800&q=80",
  ],
  "mother's day": [
    "https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=800&q=80",
    "https://images.unsplash.com/photo-1462275646964-a0e3c11f18a6?w=800&q=80",
  ],
  "fathers day": [
    "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&q=80",
    "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80",
  ],
  "father's day": [
    "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&q=80",
    "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80",
  ],
  thanksgiving: [
    "https://images.unsplash.com/photo-1509315811345-a59b07a951e7?w=800&q=80",
    "https://images.unsplash.com/photo-1541532713592-79a0317b6b77?w=800&q=80",
  ],
  christmas: [
    "https://images.unsplash.com/photo-1512389142860-9c449e58a814?w=800&q=80",
    "https://images.unsplash.com/photo-1543589077-47d81606c1bf?w=800&q=80",
  ],
  "new years": [
    "https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=800&q=80",
    "https://images.unsplash.com/photo-1514862402476-a3f8dc245b93?w=800&q=80",
  ],
  "new year's": [
    "https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=800&q=80",
    "https://images.unsplash.com/photo-1514862402476-a3f8dc245b93?w=800&q=80",
  ],
  halloween: [
    "https://images.unsplash.com/photo-1509557965875-b88c97052f0e?w=800&q=80",
    "https://images.unsplash.com/photo-1508361001413-7a9dca21d08a?w=800&q=80",
  ],
  "valentines day": [
    "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=800&q=80",
    "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=800&q=80",
  ],
  "valentine's day": [
    "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=800&q=80",
    "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=800&q=80",
  ],
  easter: [
    "https://images.unsplash.com/photo-1521967906867-14ec9d64bee8?w=800&q=80",
    "https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=800&q=80",
  ],
  "st patricks": [
    "https://images.unsplash.com/photo-1521176022425-73a1cbf41097?w=800&q=80",
  ],
  "juneteenth": [
    "https://images.unsplash.com/photo-1569161031678-f49b4b9ca4f2?w=800&q=80",
  ],
  fireworks: [
    "https://images.unsplash.com/photo-1498931299210-d53e5ca8ae29?w=800&q=80",
    "https://images.unsplash.com/photo-1530982011887-3cc11cc85693?w=800&q=80",
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
  "st. louis": "local",
  "st louis": "local",
  "forest park": "local",
  "busch stadium": "local",
  cardinals: "local",
  "west county": "local",
  ballwin: "local",
  chesterfield: "local",
  kirkwood: "local",
  "webster groves": "local",
  "creve coeur": "local",
  "town and country": "local",
  "local event": "local",
  "things to do": "local",
  restaurant: "local",
  event: "local",
  festival: "local",
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function hasImages(category: MockupCategory): boolean {
  return library[category].length > 0;
}

export function pickMockupImage(prompt: string): string | null {
  const lower = prompt.toLowerCase();

  // Check holidays first — use Unsplash images for holiday posts
  const sortedHolidays = Object.keys(HOLIDAY_UNSPLASH).sort(
    (a, b) => b.length - a.length
  );
  for (const holiday of sortedHolidays) {
    if (lower.includes(holiday)) {
      return pickRandom(HOLIDAY_UNSPLASH[holiday]);
    }
  }

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
