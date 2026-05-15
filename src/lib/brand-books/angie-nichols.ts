import type { BrandBook } from "../brand-book-schema";

export const angieNicholsBrandBook: BrandBook = {
  id: "angie-nichols-001",
  userId: "angie-nichols",
  createdAt: "2026-05-01T00:00:00Z",
  updatedAt: "2026-05-15T00:00:00Z",
  status: "active",

  identity: {
    name: "Angie Nichols",
    title: "Realtor",
    brokerage: "Coldwell Banker Gundaker",
    location: "St. Louis, MO",
    markets: [
      "Wildwood", "Chesterfield", "Ballwin", "Ellisville",
      "Town & Country", "Ladue", "Frontenac", "Huntleigh",
      "Manchester", "Creve Coeur", "Clayton", "University City",
    ],
    phone: "(314) 805-3728",
    email: "angie.nichols@cbgundaker.com",
    website: "angienichols.com",
    social: "@angienicholsrealtor",
    target: "Adults 25–65, primarily women. Middle to upper-class buyers and sellers in West County St. Louis.",
    experience: "12+ years in West County St. Louis",
    headshot: "/brand/angie-portrait.jpg",
  },

  glance: {
    story: "Angie Nichols isn't selling square footage. She's helping someone trade one chapter of life for the next — a first home, a quieter street, a kitchen finally big enough for Sunday. Twelve years of West County experience sits underneath every conversation, but what shows up at the door is curiosity, candor, and the patience to listen first.",
    whatItIs: "A full-service real estate experience — search through financing, staging, editorial photography, and closing.",
    howItWorks: "One contact from start to finish. Angie handles the details so you can focus on the decision that matters.",
    whoItsFor: "Buyers and sellers in West County St. Louis who want a trusted guide, not a sales pitch.",
    howWeSound: "Like advice from a trusted, knowledgeable friend. Warm, but never breezy. Polished, but never cold.",
  },

  mark: {
    variants: [
      { label: "Primary · Dark on Light", url: "/brand/ANLOGOBLACK.png", surface: "light" },
      { label: "Reversed · Light on Dark", url: "/brand/logo-white.png", surface: "dark" },
      { label: "Navy Lockup", url: "/brand/logo-navy.png", surface: "light" },
      { label: "Standalone Mark", url: "/brand/logo-mark.png", surface: "light" },
    ],
    minSizePx: 120,
    clearSpace: "Maintain a margin equal to the cap-height of the 'A' on all sides.",
    donts: [
      "Don't stretch or compress the logo",
      "Don't rotate the logo",
      "Don't add shadows, glows, or outlines",
      "Don't recolor — only use approved variants",
    ],
  },

  palette: {
    ink: {
      name: "Signature Navy",
      hex: "#0E2547",
      role: "primary-dark",
      rgb: "14·37·71",
      cmyk: "100·83·45·48",
      pantone: "PMS 282 C",
    },
    bone: {
      name: "Parchment White",
      hex: "#F6F4EF",
      role: "primary-light",
      rgb: "246·244·239",
      cmyk: "2·3·6·0",
      pantone: "Warm Gray 1",
    },
    signal: {
      name: "Deep Moss",
      hex: "#4A5340",
      role: "accent",
      rgb: "74·83·64",
      cmyk: "62·40·76·44",
      pantone: "5743 C",
    },
    muted: {
      name: "Earthy Taupe",
      hex: "#8C8276",
      role: "accent",
      rgb: "140·130·118",
      cmyk: "42·45·52·17",
      pantone: "Warm Gray 7",
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
      { name: "Display 01", face: "display", size: "64px", weight: "500", tracking: "-3.5%", sample: "It's never just about the house." },
      { name: "Display 02", face: "display", size: "44px", weight: "500", tracking: "-3%", sample: "What home means to me." },
      { name: "Heading", face: "display", size: "28px", weight: "500", tracking: "-2.5%", sample: "Open house, Saturday at eleven." },
      { name: "Body L", face: "body", size: "16px", weight: "400", tracking: "0%", sample: "Three bedrooms, two baths, a kitchen that catches the morning sun." },
      { name: "Body M", face: "body", size: "13px", weight: "400", tracking: "0%", sample: "Schedule your showing today." },
      { name: "Eyebrow", face: "body", size: "11px", weight: "600", tracking: "32%", sample: "MARKET CLARITY" },
    ],
  },

  voice: {
    hero: "The brand reads the way her clients describe her: like advice from a trusted, knowledgeable friend — the one who studied the comps, not the algorithm.",
    weSay: [
      "Let's find the kitchen where your Sunday mornings happen.",
      "Twelve years of West County — and still asking questions on every walk-through.",
      "We'll review the comps together before we price it.",
      "One contact from search to closing — staging and photography included.",
    ],
    weDontSay: [
      "Aggressive market disruptor delivering best-in-class results.",
      "Synergies and value-adds across the buying journey.",
      "DM ME NOW for HOT listings!!",
      "Crush the algorithm. Dominate your market.",
    ],
    always: "Warm, optimistic, informed. Lowercase by default. Em-dashes welcome.",
    sometimes: "A wry aside. A practical number. A quiet personal moment.",
    never: "Hype. Corporate jargon. Emoji parties. Pushy sales language.",
    italicRule: "Use italic on the emotional word. Never on the verb. Never on three words in a row.",
    traits: [
      { name: "Warm & Optimistic", description: "Advice from a trusted, knowledgeable friend. Generous, never breezy." },
      { name: "Helpful & Informed", description: "Backed by deep market knowledge and a smart pricing strategy. Useful first." },
      { name: "Casual yet Clean", description: "Avoid corporate jargon. Keep language accessible, elevated, uncluttered." },
    ],
    taglines: [
      { quiet: "It's never just", loud: "about the house." },
      { quiet: "What", loud: "home means to me." },
      { quiet: "Guiding you to the life you want,", loud: "in the place you'll call home." },
    ],
  },

  applications: {
    postTemplates: [
      {
        name: "Just Listed",
        surface: "light",
        kicker: "Just listed",
        headlinePattern: "[Address], just listed.",
        accentWord: "listed",
        footerLeft: "Open Sat · 11—1",
        footerRight: "@angienicholsrealtor",
        stamp: "3 bed\n2 bath",
      },
      {
        name: "Just Sold",
        surface: "dark",
        kicker: "Sold",
        headlinePattern: "[Neighborhood], sold in [days] days.",
        accentWord: "sold",
        footerLeft: "$[price] · [offers] offers",
        footerRight: "@angienicholsrealtor",
      },
      {
        name: "Market Update",
        surface: "light",
        kicker: "Market Clarity",
        headlinePattern: "[Market] — [insight].",
        accentWord: "insight verb",
        footerLeft: "West County · Q[quarter] [year]",
        footerRight: "@angienicholsrealtor",
      },
    ],
    onboardingChat: {
      agentName: "your postpal",
      greeting: "Hey Angie — I'm your postpal. Let's set up your brand together.",
      sampleExchange: [
        { role: "agent", text: "Hey Angie — I'm your postpal. Let's set up your brand together." },
        { role: "agent", text: "First, what's your name and the area you sell in?" },
        { role: "user", text: "Angie Nichols. West County St. Louis — Wildwood, Chesterfield, Ballwin area." },
        { role: "agent", text: "Love it. Drop your logo and any brand colours — I'll learn the look." },
        { role: "user", text: "[uploaded angie-logo.png]" },
        { role: "agent", text: "Building your brand book… one moment." },
      ],
    },
  },

  photography: {
    description: "Less listing photo, more editorial spread. Think Architectural Digest more than MLS.",
    principles: [
      { name: "Natural light", description: "Late-afternoon glow. A lit fireplace. A lamp left on. Warmth over wattage." },
      { name: "Texture first", description: "Wood, stone, linen, plaster. Let the materials do the coloring." },
      { name: "Quiet composition", description: "Architectural details — arches, beams, runners. Empty rooms welcome." },
      { name: "Relaxed portrait", description: "Hands in pockets. Neutral solids. A softly blurred domestic background." },
    ],
  },

  pillars: [
    { name: "Market Clarity", description: "Market updates, pricing insights, local data", frequency: "weekly" },
    { name: "Buyer / Seller Tips", description: "Practical guidance for the real estate journey", frequency: "weekly" },
    { name: "Neighborhood Life", description: "Local lifestyle, community highlights, hidden gems", frequency: "biweekly" },
    { name: "Home + Lifestyle", description: "Interior design, staging tips, home improvement", frequency: "biweekly" },
    { name: "Angie Personal", description: "Behind-the-scenes, personal stories, milestones", frequency: "monthly" },
    { name: "Local Life", description: "St. Louis events, restaurants, things to do", frequency: "biweekly" },
    { name: "Stories / Reels", description: "Short-form video content ideas", frequency: "weekly" },
  ],

  colophon: {
    version: "1.0",
    issuedDate: "2026-05-15",
    contact: "angie.nichols@cbgundaker.com",
  },
};
