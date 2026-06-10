import type { BrandBook } from "../brand-book-schema";

// Neutral demo brand — a believable neighborhood café/bakery, used as the
// sample/seed for the demo workspace. Deliberately vertical-agnostic-friendly
// (warm local small business) rather than tied to one industry.
export const demoBrandBook: BrandBook = {
  id: "maple-main-001",
  userId: "maple-main",
  createdAt: "2026-05-01T00:00:00Z",
  updatedAt: "2026-05-15T00:00:00Z",
  status: "active",

  identity: {
    name: "Maple & Main",
    title: "Neighborhood Café & Bakery",
    brokerage: "Family-owned · est. 2019",
    location: "Maplewood, MO",
    markets: [
      "Maplewood", "Brentwood", "Richmond Heights", "Webster Groves",
      "Maplewood Commons", "Sutton Loop", "Manchester Road", "Big Bend",
    ],
    phone: "(314) 555-0148",
    email: "hello@mapleandmain.co",
    website: "mapleandmain.co",
    social: "@mapleandmaincafe",
    target: "Locals 25–65 — morning regulars, weekend families, and remote workers looking for a warm third place.",
    experience: "Serving the neighborhood since 2019",
    headshot: "/brand/demo-portrait.jpg",
  },

  glance: {
    story: "Maple & Main isn't just selling coffee and pastries. It's the corner where the neighborhood slows down — the first stop on a school run, the table where the freelancers set up, the smell of something good at 7am. Small batches, real butter, names remembered. The kind of place that feels like it's always been here.",
    whatItIs: "A neighborhood café and bakery — espresso, fresh-baked pastries, simple lunches, and a few stools by the window.",
    howItWorks: "Walk in, order at the counter, stay as long as you like. Catering and standing orders for the regulars.",
    whoItsFor: "Neighbors who want good coffee, a warm welcome, and a seat that feels like theirs.",
    howWeSound: "Like the friendly face behind the counter who already knows your order. Warm, easy, never trying too hard.",
  },

  mark: {
    variants: [
      { label: "Primary · Dark on Light", url: "/brand/demo-logo-dark.png", surface: "light" },
      { label: "Reversed · Light on Dark", url: "/brand/demo-logo-white.png", surface: "dark" },
      { label: "Stacked Lockup", url: "/brand/demo-logo-stacked.png", surface: "light" },
      { label: "Standalone Mark", url: "/brand/demo-logo-mark.png", surface: "light" },
    ],
    minSizePx: 120,
    clearSpace: "Maintain a margin equal to the cap-height of the 'M' on all sides.",
    donts: [
      "Don't stretch or compress the logo",
      "Don't rotate the logo",
      "Don't add shadows, glows, or outlines",
      "Don't recolor — only use approved variants",
    ],
  },

  palette: {
    ink: {
      name: "Roasted Bean",
      hex: "#2C211B",
      role: "primary-dark",
      rgb: "44·33·27",
      cmyk: "60·68·73·77",
      pantone: "Black 4 C",
    },
    bone: {
      name: "Fresh Cream",
      hex: "#F6F1E7",
      role: "primary-light",
      rgb: "246·241·231",
      cmyk: "2·3·8·0",
      pantone: "Warm Gray 1",
    },
    signal: {
      name: "Maple Amber",
      hex: "#B5762E",
      role: "accent",
      rgb: "181·118·46",
      cmyk: "24·56·92·9",
      pantone: "7572 C",
    },
    muted: {
      name: "Sage Leaf",
      hex: "#8C8C74",
      role: "accent",
      rgb: "140·140·116",
      cmyk: "45·36·56·8",
      pantone: "5773 C",
    },
    proportion: { ink: 30, bone: 55, signal: 10, muted: 5 },
  },

  typography: {
    display: {
      family: "Playfair Display",
      role: "display",
      weights: ["400", "500", "600", "700"],
      letterSpacing: "-0.035em",
      googleFontsUrl: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap",
    },
    body: {
      family: "Montserrat",
      role: "body",
      weights: ["300", "400", "500", "600"],
      letterSpacing: "-0.005em",
      googleFontsUrl: "https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600&display=swap",
    },
    scale: [
      { name: "Display 01", face: "display", size: "64px", weight: "500", tracking: "-3.5%", sample: "Fresh out of the oven." },
      { name: "Display 02", face: "display", size: "44px", weight: "500", tracking: "-3%", sample: "Your usual, ready when you are." },
      { name: "Heading", face: "display", size: "28px", weight: "500", tracking: "-2.5%", sample: "Open at seven, every day." },
      { name: "Body L", face: "body", size: "16px", weight: "400", tracking: "0%", sample: "Small-batch sourdough, pulled from the oven all morning long." },
      { name: "Body M", face: "body", size: "13px", weight: "400", tracking: "0%", sample: "Grab a seat by the window." },
      { name: "Eyebrow", face: "body", size: "11px", weight: "600", tracking: "32%", sample: "FRESH TODAY" },
    ],
  },

  voice: {
    hero: "The brand reads the way regulars describe it: like the person behind the counter who already knows your order — warm, easy, and glad you came in.",
    weSay: [
      "Fresh batch out of the oven — come get one while they're warm.",
      "Your usual, or feeling brave today?",
      "Pull up a stool, we saved you the good seat.",
      "Weekend special: brown-butter banana bread, while it lasts.",
    ],
    weDontSay: [
      "Artisanal hand-crafted small-batch culinary experience.",
      "Synergizing community engagement across touchpoints.",
      "LIMITED TIME!! Don't miss out — order NOW!!",
      "We're the #1 best-rated café, period.",
    ],
    always: "Warm, easy, neighborly. Lowercase by default. Em-dashes welcome.",
    sometimes: "A wry aside. A daily special. A quiet thank-you to the regulars.",
    never: "Hype. Corporate jargon. Emoji parties. Pushy sales language.",
    italicRule: "Use italic on the warm word. Never on the verb. Never on three words in a row.",
    traits: [
      { name: "Warm & Welcoming", description: "Like a friend behind the counter. Generous, never breezy." },
      { name: "Simple & Honest", description: "Real ingredients, plain language. Useful first." },
      { name: "Casual yet Clean", description: "Avoid corporate jargon. Keep it accessible, warm, uncluttered." },
    ],
    taglines: [
      { quiet: "Fresh out", loud: "of the oven." },
      { quiet: "Your corner", loud: "for the good stuff." },
      { quiet: "Good coffee, kind faces,", loud: "and a seat that's yours." },
    ],
  },

  applications: {
    postTemplates: [
      {
        name: "Fresh Today",
        surface: "light",
        kicker: "Fresh today",
        headlinePattern: "[Item], just out of the oven.",
        accentWord: "oven",
        footerLeft: "Open 7—3 · daily",
        footerRight: "@mapleandmaincafe",
        stamp: "small\nbatch",
      },
      {
        name: "Weekend Special",
        surface: "dark",
        kicker: "This weekend",
        headlinePattern: "[Special] — while it lasts.",
        accentWord: "lasts",
        footerLeft: "Sat & Sun · from 8am",
        footerRight: "@mapleandmaincafe",
      },
      {
        name: "Behind the Counter",
        surface: "light",
        kicker: "Behind the counter",
        headlinePattern: "[Moment] — that's the [detail].",
        accentWord: "detail",
        footerLeft: "Maplewood · est. 2019",
        footerRight: "@mapleandmaincafe",
      },
    ],
    onboardingChat: {
      agentName: "your postpal",
      greeting: "Hey Maya — I'm your postpal. Let's set up your brand together.",
      sampleExchange: [
        { role: "agent", text: "Hey Maya — I'm your postpal. Let's set up your brand together." },
        { role: "agent", text: "First, what's your business and the neighborhood you're in?" },
        { role: "user", text: "Maple & Main — a café and bakery in Maplewood." },
        { role: "agent", text: "Love it. Drop your logo and any brand colours — I'll learn the look." },
        { role: "user", text: "[uploaded maple-main-logo.png]" },
        { role: "agent", text: "Building your brand book… one moment." },
      ],
    },
  },

  photography: {
    description: "Less stock-photo, more warm editorial. Think morning light and real hands, not a catalog.",
    principles: [
      { name: "Natural light", description: "Early-morning glow through the window. Steam off a cup. Warmth over wattage." },
      { name: "Texture first", description: "Flour-dusted wood, ceramic, kraft paper, crumb. Let the materials do the coloring." },
      { name: "Quiet composition", description: "Close on the details — a flaky layer, a latte pour, a hand-written board." },
      { name: "Relaxed portrait", description: "Aprons on, mid-laugh. Neutral solids. A softly blurred café background." },
    ],
  },

  pillars: [
    { name: "Fresh Today", description: "Daily bakes, specials, what's out of the oven", frequency: "weekly" },
    { name: "Menu Features", description: "Drinks, pastries, seasonal items", frequency: "weekly" },
    { name: "Behind the Counter", description: "The team, the process, the early mornings", frequency: "biweekly" },
    { name: "Neighborhood Life", description: "Local community, regulars, nearby spots", frequency: "biweekly" },
    { name: "Maple & Main Personal", description: "Behind-the-scenes, milestones, the story", frequency: "monthly" },
    { name: "Local Life", description: "Maplewood events, makers, things to do", frequency: "biweekly" },
    { name: "Stories / Reels", description: "Short-form video content ideas", frequency: "weekly" },
  ],

  colophon: {
    version: "1.0",
    issuedDate: "2026-05-15",
    contact: "hello@mapleandmain.co",
  },
};
