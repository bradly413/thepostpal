// ─────────────────────────────────────────────────────────────
//  Industry taxonomy — Phase 2 of the onboarding generalization
//
//  Twelve verticals + a generalist catch-all. Each IndustryDef
//  carries the data the wizard, the brand-book generator, and
//  the AI system prompt need to produce content that feels right
//  for *that* kind of business — without hardcoding realtor
//  framing throughout the rest of the codebase.
//
//  Pattern: pick one vertical at onboarding step 1; the rest of
//  the wizard reads the IndustryDef to seed defaults (client
//  archetype pills, content-focus pills, post-template skeletons,
//  photography direction, sample voice line, and a prompt
//  addendum that grounds the AI in this vertical's vocabulary).
//  Users can always free-text away from defaults.
//
//  See docs/onboarding-generalization-plan.md for the rollout plan.
// ─────────────────────────────────────────────────────────────

import type { ContentPillar, PhotographyStyle } from "@/lib/brand-book-schema";

export type IndustryId =
  | "real-estate"
  | "food-restaurant"
  | "fitness-wellness"
  | "beauty-personal-care"
  | "professional-services"
  | "creative-agency"
  | "retail-ecommerce"
  | "coaching-education"
  | "home-services"
  | "healthcare-practitioners"
  | "hospitality-events"
  | "other-general";

export interface ClientArchetype {
  id: string;
  label: string;
}

export interface ContentFocusOption {
  id: string;
  label: string;
  /** Emoji or icon ref — keep optional; current UI avoids emojis per brand. */
  icon?: string;
}

export interface PostTemplateSkeleton {
  name: string;
  surface: "light" | "dark";
  kicker: string;
  /**
   * Headline copy with [PLACEHOLDERS]. The generator substitutes brand
   * specifics (industry, location, target) at brand-book creation.
   */
  headlinePattern: string;
  /** The single word in the headline that takes the accent color. */
  accentWord: string;
  footerLeftPattern?: string;
  footerRightPattern?: string;
  stampPattern?: string;
}

export interface IndustryDef {
  id: IndustryId;
  /** Display label for the picker. */
  label: string;
  /** Compact label for chips, breadcrumbs. */
  shortLabel: string;
  /** Shown under the option in the picker. */
  description: string;
  /** Seeds the free-text profession field on the wizard. */
  defaultProfessionTitle: string;
  /** 6–8 pills for "Who's your ideal customer?". */
  clientArchetypes: ClientArchetype[];
  /** 6–10 pills for "What do you want to post about?". */
  contentFocus: ContentFocusOption[];
  /** 2–3 starter post-template skeletons used by the generator. */
  postTemplateSkeletons: PostTemplateSkeleton[];
  /** 4–5 default content pillars seeded into the brand book. */
  defaultPillars: Omit<ContentPillar, never>[];
  /** Photography direction (matches PhotographyStyle from brand-book-schema). */
  photography: PhotographyStyle;
  /** Sample line used in onboarding's typography preview (replaces the realtor line). */
  voiceExampleLine: string;
  /**
   * 1–2 sentence vertical-specific addendum appended to the base onboarding
   * system prompt so the AI grounds in this industry's vocabulary and
   * conventions without us rewriting the whole prompt per vertical.
   */
  promptAddendum: string;
}

// ─────────────────────────────────────────────────────────────
//  Vertical 01 — Real Estate
// ─────────────────────────────────────────────────────────────

const REAL_ESTATE: IndustryDef = {
  id: "real-estate",
  label: "Real Estate",
  shortLabel: "Real Estate",
  description: "Agents, brokers, property managers, teams.",
  defaultProfessionTitle: "Realtor",
  clientArchetypes: [
    { id: "first-time", label: "First-Time Buyers" },
    { id: "luxury", label: "Luxury" },
    { id: "investors", label: "Investors" },
    { id: "downsizers", label: "Downsizers" },
    { id: "relocation", label: "Relocation" },
    { id: "families", label: "Families" },
    { id: "new-construction", label: "New Construction" },
    { id: "commercial", label: "Commercial" },
  ],
  contentFocus: [
    { id: "listings", label: "Listings" },
    { id: "sold", label: "Sold Announcements" },
    { id: "market-updates", label: "Market Updates" },
    { id: "neighborhood", label: "Neighborhood Spotlights" },
    { id: "tips", label: "Buyer / Seller Tips" },
    { id: "open-house", label: "Open Houses" },
    { id: "testimonials", label: "Client Testimonials" },
    { id: "community", label: "Community Events" },
  ],
  postTemplateSkeletons: [
    {
      name: "Just Listed",
      surface: "light",
      kicker: "Just listed",
      headlinePattern: "[Address], just listed.",
      accentWord: "listed",
      footerLeftPattern: "Open Sat · 11—1",
      footerRightPattern: "[@handle]",
      stampPattern: "[bed] bed\n[bath] bath",
    },
    {
      name: "Just Sold",
      surface: "dark",
      kicker: "Sold",
      headlinePattern: "[Neighborhood], sold in [days] days.",
      accentWord: "sold",
      footerLeftPattern: "$[price] · [offers] offers",
      footerRightPattern: "[@handle]",
    },
    {
      name: "Market Update",
      surface: "light",
      kicker: "Market Clarity",
      headlinePattern: "[Market] — [insight].",
      accentWord: "insight",
      footerLeftPattern: "[Location] · Q[quarter]",
      footerRightPattern: "[@handle]",
    },
  ],
  defaultPillars: [
    { name: "New Listings", description: "Property announcements with key details and compelling copy.", frequency: "weekly" },
    { name: "Just Sold", description: "Celebrate wins and build social proof.", frequency: "biweekly" },
    { name: "Market Clarity", description: "Market updates, pricing insights, local data.", frequency: "weekly" },
    { name: "Buyer / Seller Tips", description: "Practical guidance for the real-estate journey.", frequency: "weekly" },
    { name: "Neighborhood Life", description: "Local lifestyle, community highlights, hidden gems.", frequency: "biweekly" },
  ],
  photography: {
    description: "Less listing photo, more editorial spread. Architectural Digest more than MLS.",
    principles: [
      { name: "Natural light", description: "Late-afternoon glow. A lit fireplace. Warmth over wattage." },
      { name: "Texture first", description: "Wood, stone, linen. Let the materials do the coloring." },
      { name: "Quiet composition", description: "Architectural details — arches, beams, runners." },
      { name: "Relaxed portrait", description: "Natural, approachable. A softly blurred domestic background." },
    ],
  },
  voiceExampleLine: "Every home tells a story. We help you find yours.",
  promptAddendum:
    "This brand serves a real-estate audience — buyers, sellers, neighborhood residents. Use vocabulary like listings, market, comps, neighborhood, open house. Avoid jargon that only agents understand (e.g. MLS, CMA) without context.",
};

// ─────────────────────────────────────────────────────────────
//  Vertical 02 — Food & Restaurant
// ─────────────────────────────────────────────────────────────

const FOOD_RESTAURANT: IndustryDef = {
  id: "food-restaurant",
  label: "Food & Restaurant",
  shortLabel: "Food",
  description: "Restaurants, cafés, bakeries, food trucks, caterers, breweries.",
  defaultProfessionTitle: "Owner / Chef",
  clientArchetypes: [
    { id: "date-night", label: "Date-Night Couples" },
    { id: "families", label: "Families" },
    { id: "brunch", label: "Brunch Crowd" },
    { id: "office-lunch", label: "Office Lunches" },
    { id: "regulars", label: "Foodies / Regulars" },
    { id: "tourists", label: "Tourists" },
    { id: "events", label: "Event Bookers" },
    { id: "delivery", label: "Delivery / Takeout" },
  ],
  contentFocus: [
    { id: "new-menu", label: "New Menu Items" },
    { id: "specials", label: "Daily Specials" },
    { id: "behind-kitchen", label: "Behind the Kitchen" },
    { id: "team", label: "Team / Staff" },
    { id: "customer-photos", label: "Customer Photos" },
    { id: "sourcing", label: "Sourcing / Suppliers" },
    { id: "events", label: "Events & Private Dining" },
    { id: "hours", label: "Hours / Location Updates" },
  ],
  postTemplateSkeletons: [
    {
      name: "On the Menu",
      surface: "light",
      kicker: "On the menu",
      headlinePattern: "[Dish] — back this week.",
      accentWord: "back",
      footerLeftPattern: "[Days] · [Hours]",
      footerRightPattern: "[@handle]",
    },
    {
      name: "Behind the Counter",
      surface: "dark",
      kicker: "Behind the counter",
      headlinePattern: "Made by [Name]. Eaten by you.",
      accentWord: "you",
      footerLeftPattern: "[Location]",
      footerRightPattern: "[@handle]",
    },
    {
      name: "Tonight",
      surface: "light",
      kicker: "Tonight",
      headlinePattern: "[Special] — until it's gone.",
      accentWord: "gone",
      footerLeftPattern: "Doors open [time]",
      footerRightPattern: "[@handle]",
    },
  ],
  defaultPillars: [
    { name: "New Menu", description: "Featured dishes, seasonal arrivals, fresh batches.", frequency: "weekly" },
    { name: "Behind the Counter", description: "Kitchen, prep, the people who make it.", frequency: "weekly" },
    { name: "Specials", description: "Daily / weekly limited offerings.", frequency: "weekly" },
    { name: "People", description: "Staff features, founder story, regulars.", frequency: "biweekly" },
    { name: "Local Sourcing", description: "Where the ingredients come from. The farmers, makers, suppliers.", frequency: "monthly" },
  ],
  photography: {
    description: "Overhead food shots, warm window light, hands in frame, lived-in kitchen texture.",
    principles: [
      { name: "Warm light", description: "Window light. Avoid overhead fluorescent. The food should glow." },
      { name: "Hands in frame", description: "A hand placing a plate, pulling bread from the oven. Lets viewers feel the making." },
      { name: "Detail crops", description: "The crust of the loaf, the rim of the espresso, the steam off the bowl." },
      { name: "Team in aprons", description: "Portraits at work, mid-shift, with tools. Not posed headshots." },
    ],
  },
  voiceExampleLine: "Made this morning. Best eaten today.",
  promptAddendum:
    "This brand is a food / restaurant business. Use sensory vocabulary — fresh, warm, made-this-morning, hand-pulled, slow-cooked. Reference dishes, ingredients, service times. Avoid corporate hospitality lingo.",
};

// ─────────────────────────────────────────────────────────────
//  Vertical 03 — Fitness & Wellness
// ─────────────────────────────────────────────────────────────

const FITNESS_WELLNESS: IndustryDef = {
  id: "fitness-wellness",
  label: "Fitness & Wellness",
  shortLabel: "Fitness",
  description: "Trainers, gyms, studios, yoga, pilates, nutritionists, recovery.",
  defaultProfessionTitle: "Trainer / Coach",
  clientArchetypes: [
    { id: "beginners", label: "Beginners" },
    { id: "returning", label: "Returning to Fitness" },
    { id: "athletes", label: "Athletes" },
    { id: "postpartum", label: "Postpartum" },
    { id: "longevity", label: "40+ Longevity" },
    { id: "weight-loss", label: "Weight Loss" },
    { id: "strength", label: "Strength" },
    { id: "pre-event", label: "Pre-Event Training" },
  ],
  contentFocus: [
    { id: "workouts", label: "Workout Demos" },
    { id: "form", label: "Form Tips" },
    { id: "transformations", label: "Client Transformations" },
    { id: "programming", label: "Programming Snippets" },
    { id: "recovery", label: "Recovery / Nutrition" },
    { id: "mindset", label: "Mindset" },
    { id: "schedule", label: "Class Schedules" },
    { id: "studio", label: "Studio Updates" },
  ],
  postTemplateSkeletons: [
    {
      name: "Workout of the Week",
      surface: "dark",
      kicker: "This week",
      headlinePattern: "[Movement] — [Reps]. Try it.",
      accentWord: "Try",
      footerLeftPattern: "[Equipment needed]",
      footerRightPattern: "[@handle]",
    },
    {
      name: "Form Cue",
      surface: "light",
      kicker: "Form cue",
      headlinePattern: "Stop [bad habit]. Start [cue].",
      accentWord: "Start",
      footerLeftPattern: "[Movement]",
      footerRightPattern: "[@handle]",
    },
  ],
  defaultPillars: [
    { name: "Workouts", description: "Demos, programs, drop-in sessions.", frequency: "weekly" },
    { name: "Form Cues", description: "Quick technique fixes, common mistakes.", frequency: "weekly" },
    { name: "Wins", description: "Client transformations and milestones.", frequency: "biweekly" },
    { name: "Mindset", description: "The why-you-train side — consistency, identity, longevity.", frequency: "weekly" },
    { name: "Programming Theory", description: "How and why we structure training.", frequency: "monthly" },
  ],
  photography: {
    description: "High-contrast action shots, sweat texture, equipment close-ups, athlete dignity.",
    principles: [
      { name: "Mid-rep, not posed", description: "Capture the working moment — strain, breath, focus. Avoid stock-photo smiles." },
      { name: "Sweat is texture", description: "Don't retouch out the work. Skin glow, dust, chalk all read true." },
      { name: "Equipment as character", description: "Barbells, kettlebells, mats — let the tools matter." },
      { name: "Hands and feet", description: "Detail shots of grip, foot placement, contact. The expertise is in the details." },
    ],
  },
  voiceExampleLine: "Show up. The rest is just reps.",
  promptAddendum:
    "This brand serves fitness / wellness clients. Use the vocabulary of training (reps, sets, programming, recovery, form) without being macho or sales-y. Lean into consistency and identity, not transformation porn.",
};

// ─────────────────────────────────────────────────────────────
//  Vertical 04 — Beauty & Personal Care
// ─────────────────────────────────────────────────────────────

const BEAUTY_PERSONAL_CARE: IndustryDef = {
  id: "beauty-personal-care",
  label: "Beauty & Personal Care",
  shortLabel: "Beauty",
  description: "Salons, barbers, spas, estheticians, lash/brow techs, nail studios.",
  defaultProfessionTitle: "Stylist / Owner",
  clientArchetypes: [
    { id: "bridal", label: "Bridal" },
    { id: "color", label: "Color Clients" },
    { id: "editorial", label: "Editorial / Shoots" },
    { id: "regulars", label: "Maintenance Regulars" },
    { id: "first-time", label: "First-Time Clients" },
    { id: "occasion", label: "Special-Occasion" },
    { id: "mens", label: "Men's Grooming" },
    { id: "teen-kids", label: "Teen / Kids" },
  ],
  contentFocus: [
    { id: "before-after", label: "Before & After" },
    { id: "client-work", label: "Client Work" },
    { id: "color-formulas", label: "Color Formulas" },
    { id: "behind-chair", label: "Behind the Chair" },
    { id: "education", label: "Education / How-To" },
    { id: "product", label: "Hair Care / Product" },
    { id: "promos", label: "Events & Promos" },
    { id: "booking", label: "Booking Info" },
  ],
  postTemplateSkeletons: [
    {
      name: "Transformation",
      surface: "dark",
      kicker: "Before & after",
      headlinePattern: "[Service] for [client] — [time].",
      accentWord: "after",
      footerLeftPattern: "Book at [link]",
      footerRightPattern: "[@handle]",
    },
    {
      name: "Behind the Chair",
      surface: "light",
      kicker: "Behind the chair",
      headlinePattern: "What [service] actually involves.",
      accentWord: "actually",
      footerLeftPattern: "[Location]",
      footerRightPattern: "[@handle]",
    },
  ],
  defaultPillars: [
    { name: "Transformations", description: "Before / after client work.", frequency: "weekly" },
    { name: "Process", description: "Behind-the-chair, color formulas, technique.", frequency: "weekly" },
    { name: "Education", description: "Care at home, product use, what to ask for.", frequency: "biweekly" },
    { name: "Personality", description: "Stylist features, studio culture, regulars.", frequency: "biweekly" },
  ],
  photography: {
    description: "Salon natural light, close detail crops, motion blur in the work, mirror angles.",
    principles: [
      { name: "Natural light", description: "Window light beats ring light. Skin reads truer." },
      { name: "Detail over portrait", description: "Hair texture, color shifts, brow shaping — the close-up sells it." },
      { name: "Motion in the work", description: "Snip mid-swing, blow-dry mid-pass. Static doesn't sell craft." },
      { name: "Mirror angles", description: "Reflections layer the final look against the process." },
    ],
  },
  voiceExampleLine: "Hair you'll keep showing off.",
  promptAddendum:
    "This brand is a beauty / personal-care business. Talk about results, technique, and care. Use vocabulary clients use ('balayage', 'lash fill', 'fade') without becoming inside-baseball.",
};

// ─────────────────────────────────────────────────────────────
//  Vertical 05 — Professional Services
//  (legal, financial, consulting, insurance, accounting)
// ─────────────────────────────────────────────────────────────

const PROFESSIONAL_SERVICES: IndustryDef = {
  id: "professional-services",
  label: "Professional Services",
  shortLabel: "Pro Services",
  description: "Lawyers, accountants, financial advisors, consultants, insurance.",
  defaultProfessionTitle: "Advisor / Consultant",
  clientArchetypes: [
    { id: "small-business", label: "Small Business Owners" },
    { id: "families", label: "Families / Individuals" },
    { id: "hnw", label: "High Net Worth" },
    { id: "startups", label: "Startups" },
    { id: "estates", label: "Estates" },
    { id: "solopreneurs", label: "Solopreneurs" },
    { id: "niche", label: "Industry-Specific Niche" },
    { id: "corporate", label: "Corporate" },
  ],
  contentFocus: [
    { id: "explainers", label: "Educational Explainers" },
    { id: "mistakes", label: "Common Mistakes" },
    { id: "updates", label: "Industry Updates" },
    { id: "case-studies", label: "Case Studies" },
    { id: "qa", label: "Q & A" },
    { id: "tips", label: "Quick Tips" },
    { id: "culture", label: "Team / Culture" },
    { id: "process", label: "Process Transparency" },
  ],
  postTemplateSkeletons: [
    {
      name: "Explainer",
      surface: "light",
      kicker: "Plain English",
      headlinePattern: "What [topic] actually means.",
      accentWord: "actually",
      footerLeftPattern: "[Firm]",
      footerRightPattern: "[@handle]",
    },
    {
      name: "Mistake to Avoid",
      surface: "dark",
      kicker: "Common mistake",
      headlinePattern: "[Audience] keep doing [mistake]. Here's why.",
      accentWord: "why",
      footerLeftPattern: "Read more at [link]",
      footerRightPattern: "[@handle]",
    },
  ],
  defaultPillars: [
    { name: "Explainers", description: "Topic-by-topic, plain-language education.", frequency: "weekly" },
    { name: "Mistakes / FAQs", description: "What clients commonly get wrong.", frequency: "biweekly" },
    { name: "Insights", description: "Industry shifts, regulation, market context.", frequency: "weekly" },
    { name: "Behind the Firm", description: "Team, process, how decisions get made.", frequency: "monthly" },
  ],
  photography: {
    description: "Considered office detail, hands at work, calm portrait against texture (no seamless backdrops).",
    principles: [
      { name: "Detail over portrait", description: "Pen on paper, hands on keyboard, books on the shelf — competence in detail." },
      { name: "Calm portrait", description: "Confident, looking off-camera. Avoid the LinkedIn-headshot crossed-arms pose." },
      { name: "Office as character", description: "The space communicates the firm — texture, warmth, taste." },
      { name: "Real meetings", description: "Two people across a table, mid-conversation. Beats stock 'shaking hands.'" },
    ],
  },
  voiceExampleLine: "Plain English. Real answers.",
  promptAddendum:
    "This brand is a professional-services firm. Be clear, conservative, and useful. Translate jargon, never use it as a shield. Avoid hype; lean into clarity and authority.",
};

// ─────────────────────────────────────────────────────────────
//  Vertical 06 — Creative & Agency
//  (designers, photographers, videographers, marketing)
// ─────────────────────────────────────────────────────────────

const CREATIVE_AGENCY: IndustryDef = {
  id: "creative-agency",
  label: "Creative & Agency",
  shortLabel: "Creative",
  description: "Designers, photographers, videographers, marketing agencies, content creators.",
  defaultProfessionTitle: "Designer / Founder",
  clientArchetypes: [
    { id: "small-brands", label: "Small Brands" },
    { id: "personal-brands", label: "Personal Brands" },
    { id: "local", label: "Local Businesses" },
    { id: "startups", label: "Startups" },
    { id: "restaurants", label: "Restaurants" },
    { id: "agencies", label: "Other Agencies" },
    { id: "editorial", label: "Editorial" },
    { id: "weddings", label: "Weddings / Events" },
  ],
  contentFocus: [
    { id: "case-studies", label: "Case Studies" },
    { id: "wip", label: "Work in Progress" },
    { id: "final-work", label: "Final Deliverables" },
    { id: "process", label: "Process / Tools" },
    { id: "client-wins", label: "Client Wins" },
    { id: "industry-takes", label: "Industry Takes" },
    { id: "reels", label: "Reels of the Work" },
    { id: "bts", label: "Behind the Scenes" },
  ],
  postTemplateSkeletons: [
    {
      name: "Case Study",
      surface: "light",
      kicker: "Case study",
      headlinePattern: "[Client] — [outcome].",
      accentWord: "outcome",
      footerLeftPattern: "Full case at [link]",
      footerRightPattern: "[@handle]",
    },
    {
      name: "Work in Progress",
      surface: "dark",
      kicker: "WIP",
      headlinePattern: "[Project], Day [N].",
      accentWord: "Day",
      footerLeftPattern: "[Studio]",
      footerRightPattern: "[@handle]",
    },
  ],
  defaultPillars: [
    { name: "Case Studies", description: "Finished work with the brief, the choices, the result.", frequency: "biweekly" },
    { name: "WIP", description: "Mid-project process — sketches, alts, drafts.", frequency: "weekly" },
    { name: "Process", description: "How the work gets made. Tools, references, methods.", frequency: "weekly" },
    { name: "Hot Takes", description: "Industry opinion, taste, what's overrated.", frequency: "monthly" },
  ],
  photography: {
    description: "Strong art direction, gallery-quality stills of own work, candid studio detail.",
    principles: [
      { name: "Work is the hero", description: "Crop tight on the deliverable. The work itself shouldn't share frame with branding chrome." },
      { name: "Studio as backdrop", description: "Where the work gets made tells half the story. Lean in." },
      { name: "Real tools", description: "Pencils, screens, paper, hands. Avoid stock laptop shots." },
      { name: "Mood-board adjacency", description: "Pinned refs, swatches, color stories show the thinking." },
    ],
  },
  voiceExampleLine: "Less polish. More taste.",
  promptAddendum:
    "This brand is a creative / agency business. Show taste, not pitch. Reference the craft (art direction, type, color, edit, frame) and avoid agency-speak like 'synergy', 'storytelling solution', 'ROI-driven.'",
};

// ─────────────────────────────────────────────────────────────
//  Vertical 07 — Retail & E-Commerce
// ─────────────────────────────────────────────────────────────

const RETAIL_ECOMMERCE: IndustryDef = {
  id: "retail-ecommerce",
  label: "Retail & E-Commerce",
  shortLabel: "Retail",
  description: "Boutiques, makers, online stores, product brands, DTC.",
  defaultProfessionTitle: "Founder / Owner",
  clientArchetypes: [
    { id: "gift-givers", label: "Gift Givers" },
    { id: "collectors", label: "Collectors" },
    { id: "daily-wearers", label: "Daily Wearers" },
    { id: "new", label: "New Customers" },
    { id: "repeat", label: "Repeat Buyers" },
    { id: "locals", label: "Locals" },
    { id: "wholesale", label: "Wholesale" },
    { id: "influencer", label: "Influencer / Press" },
  ],
  contentFocus: [
    { id: "new-products", label: "New Products" },
    { id: "restocks", label: "Restocks" },
    { id: "customer-photos", label: "Customer Photos" },
    { id: "founder-story", label: "Founder Story" },
    { id: "making", label: "Materials / Making" },
    { id: "brand", label: "Behind the Brand" },
    { id: "launches", label: "Sales / Launches" },
    { id: "lookbook", label: "Lookbook" },
  ],
  postTemplateSkeletons: [
    {
      name: "New Drop",
      surface: "light",
      kicker: "New",
      headlinePattern: "[Product] is here.",
      accentWord: "here",
      footerLeftPattern: "Shop at [link]",
      footerRightPattern: "[@handle]",
    },
    {
      name: "Customer Spotlight",
      surface: "dark",
      kicker: "Spotted",
      headlinePattern: "[Customer name], [where].",
      accentWord: "Spotted",
      footerLeftPattern: "Wearing [product]",
      footerRightPattern: "[@handle]",
    },
  ],
  defaultPillars: [
    { name: "New Drops", description: "Product launches, restocks, limited runs.", frequency: "weekly" },
    { name: "Customer Love", description: "Real customers in real settings — UGC, photos, reviews.", frequency: "weekly" },
    { name: "Making Of", description: "Materials, craft, supply chain, ethics.", frequency: "biweekly" },
    { name: "Founder POV", description: "The why behind the brand — taste, choices, philosophy.", frequency: "monthly" },
  ],
  photography: {
    description: "Lifestyle in use over flat-lay. Product detail crops, hands holding, contextual environment.",
    principles: [
      { name: "Use over display", description: "Show the product being used, worn, lived with. Skip the seamless backdrop." },
      { name: "Hands holding", description: "Human scale and contact. Makes scale and feel land." },
      { name: "Contextual environment", description: "Where the product lives matters as much as the product." },
      { name: "Detail at scale", description: "Stitches, grain, finish — proof of craft." },
    ],
  },
  voiceExampleLine: "Made the way we wish more things still were.",
  promptAddendum:
    "This brand is a retail / e-commerce business. Show the product in life, not on a backdrop. Reference materials, craft, customers. Avoid 'buy now' urgency tactics — taste over hype.",
};

// ─────────────────────────────────────────────────────────────
//  Vertical 08 — Coaching & Education
// ─────────────────────────────────────────────────────────────

const COACHING_EDUCATION: IndustryDef = {
  id: "coaching-education",
  label: "Coaching & Education",
  shortLabel: "Coaching",
  description: "Life / business / health coaches, tutors, course creators.",
  defaultProfessionTitle: "Coach",
  clientArchetypes: [
    { id: "career-changers", label: "Career Changers" },
    { id: "founders", label: "Founders" },
    { id: "executives", label: "Executives" },
    { id: "new-parents", label: "New Parents" },
    { id: "athletes", label: "Athletes" },
    { id: "high-achievers", label: "High Achievers Stuck" },
    { id: "burnout", label: "Burnout" },
    { id: "transition", label: "Identity Transition" },
  ],
  contentFocus: [
    { id: "frameworks", label: "Frameworks" },
    { id: "client-wins", label: "Client Wins" },
    { id: "patterns", label: "Common Patterns / Mistakes" },
    { id: "mindset", label: "Mindset" },
    { id: "qa", label: "Q & A" },
    { id: "behind-coaching", label: "Behind the Coaching" },
    { id: "offers", label: "Live Offers" },
    { id: "resources", label: "Free Resources" },
  ],
  postTemplateSkeletons: [
    {
      name: "Framework",
      surface: "light",
      kicker: "Framework",
      headlinePattern: "[N] questions to [outcome].",
      accentWord: "outcome",
      footerLeftPattern: "Get the worksheet at [link]",
      footerRightPattern: "[@handle]",
    },
    {
      name: "Pattern I See",
      surface: "dark",
      kicker: "What I see",
      headlinePattern: "[Audience] keep [mistake]. The fix: [solution].",
      accentWord: "fix",
      footerLeftPattern: "[Coach name]",
      footerRightPattern: "[@handle]",
    },
  ],
  defaultPillars: [
    { name: "Frameworks", description: "Reusable mental models and processes.", frequency: "weekly" },
    { name: "Patterns", description: "What you see across many clients — the diagnostic patterns.", frequency: "weekly" },
    { name: "Wins", description: "Client outcomes with permission.", frequency: "biweekly" },
    { name: "Offers", description: "Programs, cohorts, intensives.", frequency: "biweekly" },
  ],
  photography: {
    description: "Portrait warmth, hands on notebook detail, considered interior environment over studio.",
    principles: [
      { name: "Warm portrait", description: "Eye contact, slight smile, soft light. Confident not aggressive." },
      { name: "Tools of the work", description: "Notebook, pen, mug — the props of thinking." },
      { name: "Interior environment", description: "Real spaces. Books, plants, texture. Avoid studio seamless." },
      { name: "Listening pose", description: "Hand on chin, leaning in. Coaches listen more than they speak." },
    ],
  },
  voiceExampleLine: "What's actually getting in your way?",
  promptAddendum:
    "This brand is a coaching / education business. Speak to the audience's actual situation, not a generic 'you.' Use frameworks and named patterns. Avoid guru-speak; lean into specific, useful, hard-won observations.",
};

// ─────────────────────────────────────────────────────────────
//  Vertical 09 — Home Services
//  (contractors, electricians, landscapers, cleaners, painters, HVAC)
// ─────────────────────────────────────────────────────────────

const HOME_SERVICES: IndustryDef = {
  id: "home-services",
  label: "Home Services",
  shortLabel: "Home Services",
  description: "Contractors, electricians, landscapers, cleaners, painters, HVAC, plumbing, roofing.",
  defaultProfessionTitle: "Owner",
  clientArchetypes: [
    { id: "homeowners", label: "Homeowners" },
    { id: "property-mgrs", label: "Property Managers" },
    { id: "new-construction", label: "New Construction" },
    { id: "renovators", label: "Renovators" },
    { id: "emergency", label: "Emergency Calls" },
    { id: "maintenance", label: "Repeat / Maintenance" },
    { id: "commercial", label: "Commercial" },
    { id: "realtor-referrals", label: "Realtor Referrals" },
  ],
  contentFocus: [
    { id: "before-after", label: "Before & After" },
    { id: "project-process", label: "Project Process" },
    { id: "tips", label: "Tips & Maintenance" },
    { id: "crew", label: "Team on the Job" },
    { id: "common-problems", label: "Common Problems" },
    { id: "pricing", label: "Estimates / Pricing Transparency" },
    { id: "reviews", label: "Reviews" },
    { id: "service-area", label: "Service Area" },
  ],
  postTemplateSkeletons: [
    {
      name: "Before & After",
      surface: "dark",
      kicker: "Before & after",
      headlinePattern: "[Project] in [days] days.",
      accentWord: "days",
      footerLeftPattern: "[Service area]",
      footerRightPattern: "[@handle]",
    },
    {
      name: "What to Watch For",
      surface: "light",
      kicker: "What to watch for",
      headlinePattern: "If you see [symptom], call us before [consequence].",
      accentWord: "before",
      footerLeftPattern: "[Phone]",
      footerRightPattern: "[@handle]",
    },
  ],
  defaultPillars: [
    { name: "Before & After", description: "Project transformations with the scope and timeline.", frequency: "weekly" },
    { name: "How It Works", description: "Process transparency — what we do, in what order, why.", frequency: "weekly" },
    { name: "Crew on Site", description: "The people doing the work, mid-job.", frequency: "biweekly" },
    { name: "Common Issues", description: "What homeowners commonly misdiagnose, what to call us about.", frequency: "biweekly" },
  ],
  photography: {
    description: "Honest work-in-progress, sweat & dust, finished detail, no stock-photo smiles, truck/equipment context.",
    principles: [
      { name: "Mid-job, not posed", description: "Show the work happening. Tools in hand, work clothes, dust." },
      { name: "Detail of the fix", description: "Tight on the finished joint, paint line, fixture install." },
      { name: "Crew with dignity", description: "Crew in their work clothes, looking confident — not goofy stock energy." },
      { name: "Truck / equipment", description: "Branded truck, ladder, tools — proof of operation." },
    ],
  },
  voiceExampleLine: "Done right. Done once.",
  promptAddendum:
    "This brand is a home-services business. Use direct, practical language. Reference real problems homeowners have. Avoid corporate B2B framing; talk like the crew talks.",
};

// ─────────────────────────────────────────────────────────────
//  Vertical 10 — Healthcare & Practitioners
//  (dentists, vets, chiro, therapists, holistic providers)
// ─────────────────────────────────────────────────────────────

const HEALTHCARE_PRACTITIONERS: IndustryDef = {
  id: "healthcare-practitioners",
  label: "Healthcare & Practitioners",
  shortLabel: "Healthcare",
  description: "Dentists, vets, chiropractors, therapists, optometrists, holistic providers.",
  defaultProfessionTitle: "Practitioner",
  clientArchetypes: [
    { id: "families", label: "Families" },
    { id: "new-patients", label: "New Patients" },
    { id: "anxious", label: "Anxious Patients" },
    { id: "athletes", label: "Athletes / Active" },
    { id: "chronic", label: "Chronic Conditions" },
    { id: "pediatric", label: "Pediatric" },
    { id: "senior", label: "Senior" },
    { id: "specific-concern", label: "Specific Concern" },
  ],
  contentFocus: [
    { id: "patient-education", label: "Patient Education" },
    { id: "myth-busting", label: "Myth Busting" },
    { id: "team", label: "Team / Staff" },
    { id: "appointment-prep", label: "What to Expect at Appointment" },
    { id: "conditions", label: "Conditions Explained" },
    { id: "aftercare", label: "Recovery / Aftercare" },
    { id: "office-tour", label: "Office Tour" },
    { id: "wins", label: "Wins (with consent)" },
  ],
  postTemplateSkeletons: [
    {
      name: "Patient Education",
      surface: "light",
      kicker: "Did you know",
      headlinePattern: "[Common belief] — what's actually true.",
      accentWord: "actually",
      footerLeftPattern: "[Practice]",
      footerRightPattern: "[@handle]",
    },
    {
      name: "What to Expect",
      surface: "dark",
      kicker: "Your first visit",
      headlinePattern: "[Procedure] — what happens.",
      accentWord: "happens",
      footerLeftPattern: "Book at [link]",
      footerRightPattern: "[@handle]",
    },
  ],
  defaultPillars: [
    { name: "Education", description: "Conditions, treatments, what each thing actually does.", frequency: "weekly" },
    { name: "Myths", description: "What patients commonly get wrong, kindly corrected.", frequency: "biweekly" },
    { name: "Team / Practice", description: "Who works there, how the practice runs.", frequency: "biweekly" },
    { name: "Welcoming Detail", description: "Office spaces, waiting room, calm operational details.", frequency: "monthly" },
  ],
  photography: {
    description: "Soft natural light, hands in care detail, clean but not sterile, considered team portraits.",
    principles: [
      { name: "Soft light", description: "Healthcare reads warmer with window light than overhead clinical." },
      { name: "Hands in care", description: "Practitioner hands gentle on patient — without showing identifying patient detail." },
      { name: "Clean, not sterile", description: "Plants, art, texture. Clinical can feel cold; soften without losing professionalism." },
      { name: "Team in scrubs / coats", description: "Real working portraits, not stock 'shaking-hands' compositions." },
    ],
  },
  voiceExampleLine: "Care that explains itself.",
  promptAddendum:
    "This brand is a healthcare / practitioner business. Be educational, calm, and never alarmist. Always note that posts are not medical advice and patients should consult the practitioner directly for their situation.",
};

// ─────────────────────────────────────────────────────────────
//  Vertical 11 — Hospitality & Events
//  (hotels, airbnb hosts, event planners, venues, wedding pros)
// ─────────────────────────────────────────────────────────────

const HOSPITALITY_EVENTS: IndustryDef = {
  id: "hospitality-events",
  label: "Hospitality & Events",
  shortLabel: "Hospitality",
  description: "Hotels, Airbnb hosts, event planners, venues, wedding pros, florists.",
  defaultProfessionTitle: "Host / Planner",
  clientArchetypes: [
    { id: "couples", label: "Couples" },
    { id: "corporate", label: "Corporate Events" },
    { id: "weddings", label: "Wedding Parties" },
    { id: "vacationers", label: "Vacationers" },
    { id: "reunions", label: "Family Reunions" },
    { id: "staycation", label: "Local Staycation" },
    { id: "solo", label: "Solo Travelers" },
    { id: "press", label: "Influencers / Press" },
  ],
  contentFocus: [
    { id: "spaces", label: "Spaces / Property Tour" },
    { id: "event-recaps", label: "Event Recaps" },
    { id: "planning", label: "Behind the Planning" },
    { id: "vendor-partners", label: "Vendor Partners" },
    { id: "local-guide", label: "Local Guide" },
    { id: "availability", label: "Booking Availability" },
    { id: "couple-features", label: "Couple / Guest Features" },
    { id: "seasonal", label: "Seasonal Moments" },
  ],
  postTemplateSkeletons: [
    {
      name: "Featured Space",
      surface: "dark",
      kicker: "The space",
      headlinePattern: "[Room / venue] at [time of day].",
      accentWord: "time",
      footerLeftPattern: "Book at [link]",
      footerRightPattern: "[@handle]",
    },
    {
      name: "Event Recap",
      surface: "light",
      kicker: "Last weekend",
      headlinePattern: "[Couple] · [date].",
      accentWord: "date",
      footerLeftPattern: "Planning by [planner]",
      footerRightPattern: "[@handle]",
    },
  ],
  defaultPillars: [
    { name: "The Space", description: "The property, the rooms, the views — the physical thing being booked.", frequency: "weekly" },
    { name: "Events", description: "Recent events with full credit to couple / hosts / vendors.", frequency: "weekly" },
    { name: "Local Guide", description: "What guests should do nearby — restaurants, walks, hidden gems.", frequency: "biweekly" },
    { name: "Behind the Planning", description: "Planning process, vendor relationships, decisions.", frequency: "monthly" },
  ],
  photography: {
    description: "Twilight property exteriors, detail-rich tablescapes, candid emotion at events, warm interior with lights on.",
    principles: [
      { name: "Twilight exteriors", description: "Property shot at dusk with interior lights on. Maximum draw." },
      { name: "Tablescape detail", description: "Settings, florals, paper goods — wedding-magazine close-up energy." },
      { name: "Candid emotion", description: "Real reactions at events, not posed group lines." },
      { name: "Warm interior light", description: "Lamps on, fireplace if any, evening atmosphere reads as 'invite me in.'" },
    ],
  },
  voiceExampleLine: "The day you'll keep telling stories about.",
  promptAddendum:
    "This brand is a hospitality / events business. Reference the experience, the place, the moment — not the booking transaction. Use sensory language: light, scent, sound. Avoid 'experience' as a generic noun (every event is one).",
};

// ─────────────────────────────────────────────────────────────
//  Vertical 12 — Other / Generalist (catch-all)
// ─────────────────────────────────────────────────────────────

const OTHER_GENERAL: IndustryDef = {
  id: "other-general",
  label: "Other",
  shortLabel: "Other",
  description: "Doesn't quite fit the buckets above — that's fine. We'll generalize.",
  defaultProfessionTitle: "Owner",
  clientArchetypes: [
    { id: "new", label: "New Customers" },
    { id: "repeat", label: "Repeat Customers" },
    { id: "local", label: "Local" },
    { id: "online", label: "Online" },
    { id: "b2b", label: "B2B" },
    { id: "b2c", label: "B2C" },
    { id: "referrals", label: "Referrals" },
    { id: "press", label: "Press" },
  ],
  contentFocus: [
    { id: "what-we-do", label: "What We Do" },
    { id: "bts", label: "Behind the Scenes" },
    { id: "customer-stories", label: "Customer Stories" },
    { id: "tips", label: "Tips & Education" },
    { id: "team", label: "Team" },
    { id: "offerings", label: "Products / Services" },
    { id: "events", label: "Events" },
    { id: "updates", label: "Updates" },
  ],
  postTemplateSkeletons: [
    {
      name: "What We Do",
      surface: "light",
      kicker: "What we do",
      headlinePattern: "[Offering] for [audience].",
      accentWord: "for",
      footerLeftPattern: "[Location or link]",
      footerRightPattern: "[@handle]",
    },
    {
      name: "Behind the Scenes",
      surface: "dark",
      kicker: "Behind the scenes",
      headlinePattern: "How [thing] gets made.",
      accentWord: "made",
      footerLeftPattern: "[Brand]",
      footerRightPattern: "[@handle]",
    },
  ],
  defaultPillars: [
    { name: "What We Do", description: "The offering, simply and well.", frequency: "weekly" },
    { name: "Behind the Scenes", description: "How the work happens — process, tools, people.", frequency: "weekly" },
    { name: "Customers", description: "Real customers and their stories.", frequency: "biweekly" },
    { name: "Tips", description: "Useful, free, generous content for the audience.", frequency: "biweekly" },
  ],
  photography: {
    description: "Generic warm-authentic small-business — natural light, candid, no stock energy.",
    principles: [
      { name: "Natural light", description: "Window light over fluorescent. Texture reads truer." },
      { name: "Real moments", description: "Actual work happening, not staged setups." },
      { name: "Hands in frame", description: "Human scale via hands on the thing being made / done." },
      { name: "Avoid stock smiles", description: "Real people looking confident or busy beat posed grins." },
    ],
  },
  voiceExampleLine: "Built for the way we actually work.",
  promptAddendum:
    "This brand doesn't fit a single industry bucket. Pay extra attention to the user's voice samples, mission, and profession field to ground the writing. Avoid leaning on industry conventions; lean on the user's own words.",
};

// ─────────────────────────────────────────────────────────────
//  Exported registry
// ─────────────────────────────────────────────────────────────

export const INDUSTRIES: IndustryDef[] = [
  REAL_ESTATE,
  FOOD_RESTAURANT,
  FITNESS_WELLNESS,
  BEAUTY_PERSONAL_CARE,
  PROFESSIONAL_SERVICES,
  CREATIVE_AGENCY,
  RETAIL_ECOMMERCE,
  COACHING_EDUCATION,
  HOME_SERVICES,
  HEALTHCARE_PRACTITIONERS,
  HOSPITALITY_EVENTS,
  OTHER_GENERAL,
];

export const INDUSTRY_BY_ID: Record<IndustryId, IndustryDef> = Object.fromEntries(
  INDUSTRIES.map((i) => [i.id, i]),
) as Record<IndustryId, IndustryDef>;

/** Helper for the wizard's industry-picker step. */
export function getIndustry(id: IndustryId | string | undefined): IndustryDef | undefined {
  if (!id) return undefined;
  return INDUSTRY_BY_ID[id as IndustryId];
}

/** Helper — best-effort default when the user hasn't picked yet. */
export const DEFAULT_INDUSTRY: IndustryDef = OTHER_GENERAL;
