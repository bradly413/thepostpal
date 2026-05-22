export interface VerticalContent {
  slug: string;
  name: string;
  headline: string;
  painPoint: string;
  examplePosts: string[];
  features: string[];
}

export const VERTICALS: VerticalContent[] = [
  {
    slug: "realtors",
    name: "Brokers",
    headline: "Listings, closings, open houses, market notes. None of them need to become a dance.",
    painPoint: "You sell homes. The algorithm wants a performance.",
    examplePosts: [
      "Open Saturday, 1–3. Good light in the kitchen. Bring questions, not offers.",
      "Closed on Maple. The sellers cried. The buyers cried. Normal Tuesday.",
      "Mortgage rates moved again. Here is what that means in plain English.",
    ],
    features: ["Drafts", "Dispatch", "Brand voice", "Issues"],
  },
  {
    slug: "restaurants",
    name: "Restaurants",
    headline: "Menus change. Hours change. The internet should find out before someone leaves a review.",
    painPoint: "Your specials board updates daily. Your social feed hasn't since March.",
    examplePosts: [
      "Tonight: halibut, asparagus, a sauce we will not explain.",
      "Closed Monday. Open Tuesday with more bread than sense.",
      "The patio is back. Jackets recommended after eight.",
    ],
    features: ["Drafts", "Dispatch", "Seasonal Issues", "Press"],
  },
  {
    slug: "salons",
    name: "Salons & Med Spas",
    headline: "Appointments fill. Captions shouldn't drain you first.",
    painPoint: "Clients trust your hands. They shouldn't have to trust your hashtag strategy.",
    examplePosts: [
      "New availability Thursday. Link in bio, as they say.",
      "A quiet note about our spring skin menu. Two services. That is all.",
      "Before and after, with permission and good lighting.",
    ],
    features: ["Drafts", "Brand voice", "The Editor", "Dispatch"],
  },
  {
    slug: "local-services",
    name: "Local Services",
    headline: "Look alive online without hiring a marketing person.",
    painPoint: "You fix things. You don't fix engagement rates.",
    examplePosts: [
      "Spring tune-up season. Book before the rush, or don't. We will be busy either way.",
      "A photo of a job we are allowed to show. No dramatic music required.",
      "Holiday hours, once, clearly, so nobody has to call.",
    ],
    features: ["Drafts", "Dispatch", "Simple analytics"],
  },
  {
    slug: "nonprofits",
    name: "Nonprofits",
    headline: "Mission first. Posts second. Both can be true.",
    painPoint: "Your work matters. Your content calendar shouldn't be a second job.",
    examplePosts: [
      "Volunteers needed Saturday. Coffee provided. Impact guaranteed.",
      "Thank you to everyone who showed up. We mean it.",
      "Registration open for the fall fundraiser. Details inside.",
    ],
    features: ["Drafts", "Issues", "Press", "Dispatch"],
  },
  {
    slug: "multi-location",
    name: "Multi-location Teams",
    headline: "One brand. Many locations. Nobody freelancing the caption.",
    painPoint: "Twelve managers. Twelve voices. One brand guideline nobody read.",
    examplePosts: [
      "Corporate campaign, localized hours and addresses.",
      "Grand opening in Kirkwood. Same brand. Different door.",
      "Quarterly update from HQ. Local managers add the details.",
    ],
    features: ["House Account", "Location switcher", "Corporate approval", "Campaign distribution"],
  },
  {
    slug: "credit-unions-banks",
    name: "Credit Unions & Community Banks",
    headline: "Member-first. Compliance-friendly. Posted on time.",
    painPoint: "Marketing has the ideas. Compliance has the questions. The post sits in the queue.",
    examplePosts: [
      "Rate update for our 36-month CD. Two sentences, one disclosure.",
      "Member appreciation week starts Monday. Stop by the branch.",
      "A note from the team about the new mobile deposit limits.",
    ],
    features: ["Approval workflow", "Brand voice profile", "Audit log", "Multi-branch publishing"],
  },
  {
    slug: "hvac-trades",
    name: "HVAC & Trades",
    headline: "Spring tune-up. Fall cleaning. Emergency calls. Posted before the rush.",
    painPoint: "You're under a unit at 7 a.m. The phone is dead. Nobody updated the feed since June.",
    examplePosts: [
      "Heat wave incoming. Book your AC tune-up this week or wait two.",
      "Photo of the install we finished yesterday. Quiet, clean, on time.",
      "Fall furnace check special starts Monday. Same crew you trust.",
    ],
    features: ["Drafts", "Dispatch", "Seasonal Issues", "Brand voice"],
  },
  {
    slug: "industrial",
    name: "Industrial & Manufacturing",
    headline: "Real work, real photos, real updates. Posted without a marketing department.",
    painPoint: "B2B social shouldn't feel like LinkedIn cosplay. It should feel like a job site.",
    examplePosts: [
      "New CNC machine on the floor this week. Tolerances tighter. Lead times shorter.",
      "Recognizing our team for hitting 300 days without an incident.",
      "Plant tour available for prospective customers. Tuesday and Thursday.",
    ],
    features: ["Drafts", "Brand voice", "The Editor", "Press"],
  },
];

const VERTICAL_ALIASES: Record<string, string> = {
  brokers: "realtors",
  "salons-med-spas": "salons",
  "multi-location-teams": "multi-location",
  "credit-unions-community-banks": "credit-unions-banks",
  "industrial-manufacturing": "industrial",
};

export function getVerticalAliases(): string[] {
  return Object.keys(VERTICAL_ALIASES);
}

export function getVertical(slug: string): VerticalContent | undefined {
  const canonicalSlug = VERTICAL_ALIASES[slug] || slug;
  return VERTICALS.find((v) => v.slug === canonicalSlug);
}
