/**
 * Central config for the homepage live demo (hero + footer CTA share this).
 *
 * Categories map to real product verticals (/for/*). Every category ships a
 * complete pre-written fallback so the visitor ALWAYS gets a finished
 * demonstration — live generation failing, timing out, or rate-limiting
 * falls back here without an error screen.
 *
 * The fallback posts are illustrative demo content written in the product
 * voice — they are examples, not customer posts. Images are the same
 * Studio-generated set the site's "From studio to post" section documents.
 */

export interface DemoPost {
  day: string;
  time: string;
  copy: string;
}

export interface DemoTile {
  src: string;
  alt: string;
}

export interface DemoCategory {
  id: string;
  /** Short label shown on the selector chip. */
  label: string;
  /** Sent to the drafting engine as the business type. */
  engineHint: string;
  /** Real product vertical page. */
  verticalSlug: string;
  /** Image shown on the generated-post result cards. */
  resultImage: DemoTile;
  /** Tiles this category surfaces in the orbiting field. */
  tiles: DemoTile[];
  /** Complete pre-written demonstration used when live drafting is unavailable. */
  fallback: { summary: string; posts: DemoPost[] };
}

export const DEMO_TIMEOUT_MS = 12_000;

export const DEMO_CATEGORIES: DemoCategory[] = [
  {
    id: "cafe",
    label: "Corner café",
    engineHint: "corner café and bakery",
    verticalSlug: "restaurants",
    resultImage: {
      src: "/hero-ring/01.jpg",
      alt: "Brunch spread of waffles, pancakes, and coffee on a café table",
    },
    tiles: [
      { src: "/hero-ring/01.jpg", alt: "Brunch spread on a café table" },
      { src: "/hero-ring/17.jpg", alt: "Sprinkled donut on a teal background" },
      { src: "/hero-ring/14.jpg", alt: "Strawberry smoothie in a tall glass" },
    ],
    fallback: {
      summary: "A calm week: mornings, lunch, and one slow Saturday.",
      posts: [
        {
          day: "Monday",
          time: "08:00",
          copy:
            "Monday. The espresso machine is warmed up and the cinnamon rolls just came out. Come start the week like a person.",
        },
        {
          day: "Wednesday",
          time: "11:30",
          copy:
            "The lunch rush is real but the corner table usually isn't. Soup today is tomato basil.",
        },
        {
          day: "Saturday",
          time: "09:00",
          copy: "Saturday starts slow around here. Pancakes on at 8. No rush, no reservations.",
        },
      ],
    },
  },
  {
    id: "restaurant",
    label: "Neighborhood restaurant",
    engineHint: "neighborhood restaurant",
    verticalSlug: "restaurants",
    resultImage: {
      src: "/hero-ring/03.jpg",
      alt: "Double cheeseburger with bacon on parchment paper",
    },
    tiles: [
      { src: "/hero-ring/03.jpg", alt: "Double cheeseburger on parchment" },
      { src: "/hero-ring/11.jpg", alt: "Plated spaghetti with basil and parmesan" },
      { src: "/hero-ring/15.jpg", alt: "Caesar salad in a ceramic bowl" },
    ],
    fallback: {
      summary: "Dinner-forward week with a brunch payoff on Sunday.",
      posts: [
        {
          day: "Monday",
          time: "11:00",
          copy: "Lunch specials are up. The special is whatever looked best at the market this morning.",
        },
        {
          day: "Tuesday",
          time: "16:00",
          copy:
            "Tuesday dinner doesn't have to be cereal. Kitchen's open at 5.",
        },
        {
          day: "Thursday",
          time: "17:00",
          copy: "Weeknight tables still open. Bring the group chat before Friday books you out.",
        },
        {
          day: "Friday",
          time: "12:00",
          copy:
            "Friday night books up by Wednesday lately. Not complaining. Grab a table before your group chat does.",
        },
        {
          day: "Sunday",
          time: "10:00",
          copy: "Sunday brunch, no notes. Bring the family, we'll bring the bacon.",
        },
      ],
    },
  },
  {
    id: "real-estate",
    label: "Local real estate",
    engineHint: "local real estate agent",
    verticalSlug: "realtors",
    resultImage: {
      src: "/hero-ring/02.jpg",
      alt: "Brick two-story home with a for-sale sign in the front yard",
    },
    tiles: [
      { src: "/hero-ring/02.jpg", alt: "Home with a for-sale sign out front" },
      { src: "/hero-ring/16.jpg", alt: "Family celebrating with a sold sign outside their new home" },
    ],
    fallback: {
      summary: "Listings early, open house midweek, and one win to close.",
      posts: [
        {
          day: "Monday",
          time: "09:00",
          copy:
            "New week, new listings on the way. If you've been waiting for a sign to start looking — this is it, technically.",
        },
        {
          day: "Wednesday",
          time: "12:00",
          copy: "Three new photos just landed for this week's favorite listing. Walkthrough reel coming Thursday.",
        },
        {
          day: "Thursday",
          time: "17:30",
          copy: "Open house this Saturday, 1 to 3. Come see it before the internet does.",
        },
        {
          day: "Saturday",
          time: "13:00",
          copy: "Doors open. Coffee in the kitchen. Questions welcome — pressure isn't.",
        },
        {
          day: "Sunday",
          time: "16:00",
          copy: "Another set of keys handed over this week. Never gets old.",
        },
      ],
    },
  },
  {
    id: "salon",
    label: "Salon & med spa",
    engineHint: "salon and med spa",
    verticalSlug: "salons",
    resultImage: {
      src: "/hero-ring/09.jpg",
      alt: "Bright salon interior with stylists working at gold-trimmed stations",
    },
    tiles: [
      { src: "/hero-ring/09.jpg", alt: "Salon interior with stylists at work" },
      { src: "/hero-ring/05.jpg", alt: "Calm med spa lobby with a front desk" },
      { src: "/hero-ring/19.jpg", alt: "Beauty editorial portrait with pink sunglasses" },
    ],
    fallback: {
      summary: "Bookings, maintenance, a treatment spotlight, and a full-house Saturday.",
      posts: [
        {
          day: "Monday",
          time: "09:00",
          copy: "Books just opened for next month. The 4pm Friday slots go first — you know who you are.",
        },
        {
          day: "Tuesday",
          time: "10:00",
          copy:
            "A trim you get in March is why your hair behaves in June. Book the maintenance appointment.",
        },
        {
          day: "Thursday",
          time: "14:00",
          copy: "New facial slots this week. Quiet room, soft light, zero small talk if you don't want it.",
        },
        {
          day: "Friday",
          time: "11:00",
          copy: "Walk-ins welcome until 2. After that we're in appointment mode for the weekend rush.",
        },
        {
          day: "Saturday",
          time: "09:30",
          copy:
            "Saturday is fully booked and the playlist is carrying the whole room. Next week still has openings.",
        },
      ],
    },
  },
  {
    id: "retail",
    label: "Boutique retail",
    engineHint: "boutique clothing shop",
    verticalSlug: "local-services",
    resultImage: {
      src: "/hero-ring/07.jpg",
      alt: "Boutique clothing shop with dresses on wooden racks",
    },
    tiles: [
      { src: "/hero-ring/07.jpg", alt: "Boutique interior with dress racks" },
      { src: "/hero-ring/04.jpg", alt: "Florist holding a bouquet of red ranunculus" },
    ],
    fallback: {
      summary: "New arrivals midweek, a friendly Friday, a slow Sunday browse.",
      posts: [
        {
          day: "Wednesday",
          time: "11:00",
          copy:
            "New arrivals hit the floor this morning. The good sizes never last the weekend — just saying.",
        },
        {
          day: "Friday",
          time: "15:00",
          copy:
            "Friday treat: come in, try things on, tell us about your week. The mirror lighting in here is very forgiving.",
        },
        {
          day: "Sunday",
          time: "12:00",
          copy: "Sunday hours, slow browsing, zero pressure. The fitting room is all yours.",
        },
      ],
    },
  },
  {
    id: "hvac",
    label: "HVAC & trades",
    engineHint: "HVAC and home services company",
    verticalSlug: "hvac-trades",
    resultImage: {
      src: "/hero-ring/10.jpg",
      alt: "HVAC technician servicing a unit beside a branded service van",
    },
    tiles: [{ src: "/hero-ring/10.jpg", alt: "HVAC technician at work beside a service van" }],
    fallback: {
      summary: "Season prep up front, one plain-spoken reminder, gratitude to close.",
      posts: [
        {
          day: "Monday",
          time: "08:00",
          copy:
            "First cold week of the season and the phones know it. If your furnace made a new noise this weekend, don't wait it out.",
        },
        {
          day: "Wednesday",
          time: "12:00",
          copy:
            "A filter change costs a few bucks. A frozen coil costs a weekend. We do reminders so you don't have to.",
        },
        {
          day: "Friday",
          time: "09:00",
          copy:
            "Booked solid this week — thank you. Next-week slots are open now for tune-ups.",
        },
      ],
    },
  },
];

export function getDemoCategory(id: string): DemoCategory {
  return DEMO_CATEGORIES.find((c) => c.id === id) ?? DEMO_CATEGORIES[0];
}

/** Full orbit pool: every category tile, deduped by src, category-tagged. */
export const ORBIT_POOL: (DemoTile & { categoryId: string })[] = (() => {
  const seen = new Set<string>();
  const pool: (DemoTile & { categoryId: string })[] = [];
  for (const cat of DEMO_CATEGORIES) {
    for (const tile of cat.tiles) {
      if (seen.has(tile.src)) continue;
      seen.add(tile.src);
      pool.push({ ...tile, categoryId: cat.id });
    }
  }
  return pool;
})();
