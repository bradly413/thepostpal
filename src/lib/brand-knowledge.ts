export const brandKnowledge = {
  identity: {
    name: "Angie Nichols",
    title: "Realtor",
    brokerage: "Coldwell Banker Gundaker",
    office: "West Regional Real Estate Office",
    location: "St. Louis, MO",
    phone: "(314) 805-3728",
    email: "angie.nichols@cbgundaker.com",
    website: "angienichols.com",
    social: "@angienicholsrealtor",
    experience: "12+ years in West County St. Louis",
    markets: [
      "Wildwood", "Chesterfield", "Ballwin", "Ellisville",
      "Town & Country", "Ladue", "Frontenac", "Huntleigh",
      "Manchester", "Creve Coeur", "Clayton", "University City",
    ],
    target: "Adults 25-65, primarily women. Middle to upper-class buyers and sellers.",
    service: "One-stop, full service. Search through financing, staging, editorial photography, and closing.",
  },

  essence: {
    summary: "Angie Nichols isn't selling square footage. She's helping someone trade one chapter of life for the next — a first home, a quieter street, a kitchen finally big enough for Sunday.",
    description: "Twelve years of West County experience sits underneath every conversation, but what shows up at the door is curiosity, candor, and the patience to listen first. The brand reads the way her clients describe her: like advice from a trusted, knowledgeable friend. Warm, but never breezy. Polished, but never cold. Confident in the numbers because the numbers were studied carefully — and willing to slow down when the stakes are personal.",
    positioning: "The lifestyle, not the listing.",
  },

  voice: {
    traits: [
      {
        name: "Warm & Optimistic",
        description: "Advice from a trusted, knowledgeable friend. Generous, never breezy.",
      },
      {
        name: "Helpful & Informed",
        description: "Backed by deep market knowledge and a smart pricing strategy. Useful first.",
      },
      {
        name: "Casual yet Clean",
        description: "Avoid corporate jargon. Keep language accessible, elevated, uncluttered.",
      },
    ],
    taglines: [
      "It's never just about the house.",
      "What home means to me.",
      "Guiding you to the life you want, in the place you'll call home.",
    ],
    doSay: [
      "Let's find the kitchen where your Sunday mornings happen.",
      "Twelve years of West County — and still asking questions on every walk-through.",
      "A surgical approach to negotiation, a soft hand at the kitchen table.",
      "We'll review the comps together before we price it.",
      "One contact from search to closing — staging and photography included.",
    ],
    dontSay: [
      "Aggressive market disruptor delivering best-in-class results.",
      "Synergies and value-adds across the buying journey.",
      "DM ME NOW for HOT listings!!",
    ],
    italicRule: "Use italic on the emotional word. Never on the verb. Never on three words in a row.",
  },

  colors: [
    {
      name: "Signature Navy",
      hex: "#0E2547",
      role: "Primary",
      usage: "Buttons, high-contrast type, hero blocks. Signals trust, experience, and quiet luxury.",
      pantone: "PMS 282 C",
      cmyk: "100·83·45·48",
      rgb: "14·37·71",
    },
    {
      name: "Parchment White",
      hex: "#F6F4EF",
      role: "Foundation",
      usage: "Primary background. Softer than pure white — a warm, lived-in canvas.",
      pantone: "Warm Gray 1 (close)",
      cmyk: "2·3·6·0",
      rgb: "246·244·239",
    },
    {
      name: "Earthy Taupe",
      hex: "#8C8276",
      role: "Secondary",
      usage: "Borders, secondary text, soft graphic elements, captions.",
      pantone: "Warm Gray 7 (close)",
      cmyk: "42·45·52·17",
      rgb: "140·130·118",
    },
    {
      name: "Deep Moss",
      hex: "#4A5340",
      role: "Accent",
      usage: "Used sparingly — warmth, nature, and the grounding feeling of home.",
      pantone: "5743 C (close)",
      cmyk: "62·40·76·44",
      rgb: "74·83·64",
    },
  ],

  colorProportion: {
    parchment: 55,
    navy: 30,
    taupe: 10,
    moss: 5,
  },

  typography: {
    serif: {
      family: "Playfair Display",
      usage: "Headlines, accents, italic emphasis",
      sizes: {
        h1: "64px — Hero",
        h2: "44px — Section",
        h3: "28px — Subhead",
        pullQuote: "20px — Pull-quote (italic)",
      },
    },
    sans: {
      family: "Montserrat",
      usage: "Body, UI, wide-tracked labels",
      sizes: {
        eyebrow: "11px — tracking .32em",
        body: "16px — line-height 1.6",
        caption: "13px — line-height 1.55",
      },
    },
  },

  photography: {
    style: "Less listing photo, more editorial spread. Think Architectural Digest more than MLS.",
    principles: [
      { name: "Natural light", description: "Late-afternoon glow. A lit fireplace. A lamp left on. Warmth over wattage." },
      { name: "Texture first", description: "Wood, stone, linen, plaster. Let the materials do the coloring." },
      { name: "Quiet composition", description: "Architectural details — arches, beams, runners. Empty rooms welcome." },
      { name: "Relaxed portrait", description: "Hands in pockets. Neutral solids. A softly blurred domestic background." },
    ],
  },

  logos: {
    primary: "/brand/logo-navy.png",
    white: "/brand/logo-white.png",
    mark: "/brand/logo-mark.png",
    black: "/brand/ANLOGOBLACK.png",
    clearSpace: "Maintain a margin of clear space equal to the cap-height of the 'A' on all sides.",
    minSize: { fullLockup: "120px wide", standaloneMark: "28px" },
  },

  assets: {
    portrait: "/brand/angie-portrait.jpg",
    interiorArch: "/brand/interior-arch.jpg",
    interiorStaircase: "/brand/interior-staircase.jpg",
    streetscape: "/brand/streetscape.jpg",
    fireplace: "/brand/ad-fireplace.jpg",
    adPortrait: "/brand/ad-portrait.jpg",
    fbCover: "/brand/fb-cover.png",
    favicon: "/brand/ANFAVICON.jpg",
    signature: "/brand/ANGSigIma.jpg",
  },
};
