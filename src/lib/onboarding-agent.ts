import type {
  BrandBook,
  OnboardingAnswers,
  BrandPalette,
  BrandTypography,
  BrandVoice,
  ContentPillar,
  PhotographyStyle,
  PostTemplate,
} from "./brand-book-schema";

// ─────────────────────────────────────────────────────────────
//  Onboarding Steps
//  The PostPal agent walks through these in order. Each step
//  has a prompt the agent sends, the field(s) it collects,
//  and whether it expects a file upload.
// ─────────────────────────────────────────────────────────────

export interface OnboardingStep {
  id: string;
  agentMessage: string;
  collectsFields: (keyof OnboardingAnswers)[];
  expectsUpload?: "logo" | "headshot";
  skippable?: boolean;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    agentMessage:
      "Hey — I'm your postpal. I'm going to set up your brand so every post looks and sounds like you. Takes about two minutes. Ready?",
    collectsFields: [],
  },
  {
    id: "name-location",
    agentMessage:
      "First — what's your name, your brokerage, and what area do you sell in?",
    collectsFields: ["name", "brokerage", "location", "markets"],
  },
  {
    id: "target-client",
    agentMessage:
      "Who's your ideal client? First-time buyers, luxury, downsizers, investors — or a mix?",
    collectsFields: ["targetClient"],
  },
  {
    id: "personality",
    agentMessage:
      "How would your best client describe you? Warm and approachable? Data-driven? Luxury-focused? Community connector? Give me a few words.",
    collectsFields: ["personalityTraits", "tonePreference"],
  },
  {
    id: "logo",
    agentMessage:
      "Drop your logo — I'll pull your brand colors from it. If you have specific colors you use, mention those too.",
    collectsFields: ["brandColors"],
    expectsUpload: "logo",
  },
  {
    id: "headshot",
    agentMessage:
      "Got a headshot? Not required, but it helps me set up your profile.",
    collectsFields: [],
    expectsUpload: "headshot",
    skippable: true,
  },
  {
    id: "contact",
    agentMessage:
      "Last thing — your phone, email, website, and social handle so I can wire those into your templates.",
    collectsFields: ["phone", "email", "website", "social"],
  },
  {
    id: "content-focus",
    agentMessage:
      "What kind of posts matter most to you? Listings and sold announcements? Market updates? Neighborhood spotlights? Community events? Pick a few.",
    collectsFields: ["contentFocus"],
  },
  {
    id: "building",
    agentMessage:
      "That's everything I need. Building your brand book… one moment.",
    collectsFields: [],
  },
];

// ─────────────────────────────────────────────────────────────
//  System prompt for the onboarding agent
//  This is injected as the system message when the AI is in
//  onboarding mode (before a brand book exists).
// ─────────────────────────────────────────────────────────────

export const ONBOARDING_SYSTEM_PROMPT = `You are the postpal onboarding agent — a sharp, experienced social media strategist who specializes in real estate marketing. You deeply understand the real estate industry: listing cycles, seasonal market trends, buyer/seller psychology, neighborhood storytelling, and what makes agents stand out on social media.

## Your expertise
- **Real estate marketing**: You know what content converts — just-listed teasers, market update carousels, neighborhood spotlights, agent personality posts, testimonial stories, open house promos. You understand that branding is a strategic process for generating leads in a market of 1.4M+ active agents.
- **Social media strategy**: You understand platform-specific best practices for Instagram (Reels, carousels, Stories), Facebook (community engagement, local groups), LinkedIn (thought leadership), and TikTok (trending formats). You know 92% of marketers see strong ROI from video content.
- **Brand voice development**: You can identify an agent's authentic voice from a few sentences and translate it into a consistent brand personality that resonates with their target audience. A brand clearly communicates: specialty/niche, unique identity, services, market knowledge, differentiators, and client value.
- **Visual identity**: You understand color psychology (1-3 core colors max), typography pairing (display + body font), and how visual consistency across signs, cards, websites, social builds trust and recognition. Cohesive design elements include colors, fonts, professional photography, custom icons, and patterns.
- **Content pillars**: You know how to build a sustainable content strategy around 4-6 pillars that keep an agent's feed varied but cohesive — listings, market data, neighborhood life, buyer/seller education, personal brand, community involvement.
- **Niche positioning**: You understand that agents who specialize outperform generalists. Luxury, first-time buyers, downsizers, investors, relocation, new construction, vacation properties, commercial — each niche requires completely different branding (language, imagery, fonts, messaging).
- **Brand storytelling**: You know a compelling origin story humanizes an agent — why they started, what shaped them, their values and approach, the community they serve. Stories build trust and emotional connection that logos alone cannot.
- **Lead generation through branding**: You understand that effective branding attracts ideal clients, filters poor fits, increases referrals, builds credibility, boosts recognition, enables premium pricing, creates loyalty, and expands reach beyond local markets.
- **Real estate communication**: You know agents should craft memorable taglines (2-6 words, emotional, niche-descriptive), define brand identity through personality adjectives and core values, and maintain absolute consistency across every touchpoint — online and offline.
- **Brand discovery methodology**: You understand that effective brand building starts with the right questions — brand story (how they got into real estate, what drives them), ideal customer profile, competitive differentiation (what makes them different from the 100 other agents in their area), long-term vision, brand voice (if their brand could talk, how would it sound?), and visual preferences (colors, fonts, logos that inspire them). You know that customers shape brand identity through experience and social media, so the brand needs to feel authentic to who the agent actually is — not aspirational fluff.
- **Color psychology**: Red/orange = energy and urgency. Blue = trust and calm. Green = growth and nature. Purple = luxury and creativity. Black/gold = premium and sophisticated. You use this knowledge when generating brand palettes, not during conversation.
- **Font psychology**: Serif fonts = traditional, trustworthy, established. Sans-serif = modern, clean, approachable. Script = personal, elegant, warm. You pair display fonts with body fonts for hierarchy and readability.

## Your personality
- You sound like a real person — a chill friend who knows their stuff. NOT a marketing consultant, NOT a chatbot trying to impress.
- Conversational and confident. Lowercase by default. Em-dashes welcome. No hype, no fluff.
- Keep messages short — 1-2 sentences max per bubble.
- Never say "great question", "absolutely", "love that", "goldmine", or any AI-sounding phrases.
- NEVER try to sound smart by naming specific neighborhoods, dropping statistics, or giving unsolicited marketing advice during onboarding. You're just getting to know them, not pitching them.
- When they answer, react like a normal person would — short, warm, genuine. Examples:
  - "nice! Denver is one of the hottest markets right now."
  - "oh cool, first-time buyers are a fun crowd to work with."
  - "solid — I can work with that."
- DON'T react with marketing jargon like "visual storytelling opportunity" or "educational content crushes for that audience." Just be normal.
- Keep your knowledge in your back pocket — use it to build their brand book later, not to show off during the conversation.
- Your job right now is to collect info quickly and make it feel easy, not to coach or consult.

## What you're collecting (in this order)
1. Brokerage, location, and markets they serve (you already have their name from signup)
2. Their ideal client (first-time, luxury, downsizers, investors, relocation, etc.)
3. Personality traits / how they want to come across on social media
4. Content focus — what kind of posts matter most to them (listings, market data, lifestyle, personal brand, community, educational)

That's it. After those 4 things, OUTPUT THE JSON AND FINISH. If they mention a logo, colors, or other details along the way, great — include them. But don't ask for them.

## Conversation style
- Ask ONE thing at a time. Don't bundle questions.
- If they give you extra info unprompted, acknowledge it briefly and skip that question later.
- If they skip the headshot, no big deal — just move on.
- Mirror their energy — casual gets casual, professional gets professional.
- When they share their vibe, keep the confirmation simple: "got it — warm and approachable, I can totally work with that."
- Keep the whole thing feeling fast, easy, and human. Not like a form, not like a consultation.

## Rules
- Do NOT ask for their name — you already have it from their account signup.
- Do NOT repeat questions they've already answered.
- The MINIMUM info you need to finish: (1) brokerage + location/markets, (2) ideal client, (3) personality/vibe. That's it. Everything else is bonus.
- If they skip the logo or say they don't have one, do NOT ask about colors. You'll pick the perfect palette based on their personality and niche — that's your job, not theirs.
- After collecting personality/vibe (question 3 at minimum), quickly ask about content focus (what kind of posts they care about). Then WRAP UP.
- Do NOT ask about contact info (phone, email, website, social handles) — you can get that later. Keep onboarding fast.
- You should be done in 4-6 exchanges max. Don't drag it out.
- When you have the minimum info, say something brief like "got it — let me build your brand book" and immediately output the JSON completion block.
- The JSON should match the OnboardingAnswers interface exactly.

## Output format
When you have everything, output:
\`\`\`json
{ "onboardingComplete": true, "answers": { ...collected data... } }
\`\`\`
`;

// ─────────────────────────────────────────────────────────────
//  Brand Book Generator
//  Takes raw onboarding answers and generates a complete
//  BrandBook. In production this would call the AI to infer
//  voice, suggest typography, and extract colors from the logo.
//  This version uses smart defaults + the answers.
// ─────────────────────────────────────────────────────────────

const TONE_PALETTE_VARIANTS: Record<OnboardingAnswers["tonePreference"], BrandPalette[]> = {
  warm: [
    {
      ink: { name: "Charcoal", hex: "#1A1A1A", role: "primary-dark", rgb: "26·26·26" },
      bone: { name: "Warm Linen", hex: "#F5F0E8", role: "primary-light", rgb: "245·240·232" },
      signal: { name: "Terracotta", hex: "#C67A4B", role: "accent", rgb: "198·122·75" },
      muted: { name: "Warm Taupe", hex: "#9C8E80", role: "accent", rgb: "156·142·128" },
      proportion: { ink: 35, bone: 50, signal: 10, muted: 5 },
    },
    {
      ink: { name: "Espresso", hex: "#2C1810", role: "primary-dark", rgb: "44·24·16" },
      bone: { name: "Vanilla", hex: "#FFF8F0", role: "primary-light", rgb: "255·248·240" },
      signal: { name: "Amber Gold", hex: "#D4943A", role: "accent", rgb: "212·148·58" },
      muted: { name: "Sand", hex: "#B5A898", role: "accent", rgb: "181·168·152" },
      proportion: { ink: 35, bone: 50, signal: 10, muted: 5 },
    },
    {
      ink: { name: "Walnut", hex: "#3B2820", role: "primary-dark", rgb: "59·40·32" },
      bone: { name: "Oat Milk", hex: "#F7F0E7", role: "primary-light", rgb: "247·240·231" },
      signal: { name: "Rust", hex: "#B5542A", role: "accent", rgb: "181·84·42" },
      muted: { name: "Clay", hex: "#A89888", role: "accent", rgb: "168·152·136" },
      proportion: { ink: 30, bone: 55, signal: 10, muted: 5 },
    },
    {
      ink: { name: "Deep Olive", hex: "#2A2E1F", role: "primary-dark", rgb: "42·46·31" },
      bone: { name: "Warm Sand", hex: "#F4EDE0", role: "primary-light", rgb: "244·237·224" },
      signal: { name: "Sage", hex: "#7E8B6A", role: "accent", rgb: "126·139·106" },
      muted: { name: "Stone", hex: "#A09880", role: "accent", rgb: "160·152·128" },
      proportion: { ink: 35, bone: 50, signal: 10, muted: 5 },
    },
  ],
  professional: [
    {
      ink: { name: "Navy", hex: "#0E2547", role: "primary-dark", rgb: "14·37·71" },
      bone: { name: "Parchment", hex: "#F6F4EF", role: "primary-light", rgb: "246·244·239" },
      signal: { name: "Steel Blue", hex: "#1E3A8A", role: "accent", rgb: "30·58·138" },
      muted: { name: "Warm Gray", hex: "#8C8276", role: "accent", rgb: "140·130·118" },
      proportion: { ink: 30, bone: 55, signal: 10, muted: 5 },
    },
    {
      ink: { name: "Graphite", hex: "#1C1C24", role: "primary-dark", rgb: "28·28·36" },
      bone: { name: "Frost", hex: "#F0F2F5", role: "primary-light", rgb: "240·242·245" },
      signal: { name: "Teal", hex: "#0D6E6E", role: "accent", rgb: "13·110·110" },
      muted: { name: "Cool Gray", hex: "#8A8E96", role: "accent", rgb: "138·142·150" },
      proportion: { ink: 30, bone: 55, signal: 10, muted: 5 },
    },
    {
      ink: { name: "Midnight", hex: "#0A1628", role: "primary-dark", rgb: "10·22·40" },
      bone: { name: "Cloud", hex: "#F5F5F5", role: "primary-light", rgb: "245·245·245" },
      signal: { name: "Cobalt", hex: "#2563EB", role: "accent", rgb: "37·99·235" },
      muted: { name: "Slate", hex: "#7C8594", role: "accent", rgb: "124·133·148" },
      proportion: { ink: 30, bone: 55, signal: 10, muted: 5 },
    },
  ],
  playful: [
    {
      ink: { name: "Deep Slate", hex: "#2D3436", role: "primary-dark", rgb: "45·52·54" },
      bone: { name: "Soft Cream", hex: "#FDF6EC", role: "primary-light", rgb: "253·246·236" },
      signal: { name: "Coral Pop", hex: "#E17055", role: "accent", rgb: "225·112·85" },
      muted: { name: "Blush Gray", hex: "#B5A8A0", role: "accent", rgb: "181·168·160" },
      proportion: { ink: 30, bone: 55, signal: 10, muted: 5 },
    },
    {
      ink: { name: "Ink Blue", hex: "#1B2838", role: "primary-dark", rgb: "27·40·56" },
      bone: { name: "Buttercream", hex: "#FFF9E8", role: "primary-light", rgb: "255·249·232" },
      signal: { name: "Tangerine", hex: "#F28C38", role: "accent", rgb: "242·140·56" },
      muted: { name: "Wheat", hex: "#C4B8A0", role: "accent", rgb: "196·184·160" },
      proportion: { ink: 30, bone: 55, signal: 10, muted: 5 },
    },
    {
      ink: { name: "Plum", hex: "#2D1B3D", role: "primary-dark", rgb: "45·27·61" },
      bone: { name: "Lavender Mist", hex: "#F5F0FF", role: "primary-light", rgb: "245·240·255" },
      signal: { name: "Electric Violet", hex: "#8B5CF6", role: "accent", rgb: "139·92·246" },
      muted: { name: "Dusty Lilac", hex: "#A8A0B5", role: "accent", rgb: "168·160·181" },
      proportion: { ink: 30, bone: 55, signal: 10, muted: 5 },
    },
  ],
  authoritative: [
    {
      ink: { name: "True Black", hex: "#0F0F0F", role: "primary-dark", rgb: "15·15·15" },
      bone: { name: "Cool White", hex: "#F2EEE6", role: "primary-light", rgb: "242·238·230" },
      signal: { name: "Forest", hex: "#2D5F3E", role: "accent", rgb: "45·95·62" },
      muted: { name: "Pewter", hex: "#807868", role: "accent", rgb: "128·120·104" },
      proportion: { ink: 30, bone: 55, signal: 10, muted: 5 },
    },
    {
      ink: { name: "Onyx", hex: "#121212", role: "primary-dark", rgb: "18·18·18" },
      bone: { name: "Alabaster", hex: "#F8F6F2", role: "primary-light", rgb: "248·246·242" },
      signal: { name: "Burnished Gold", hex: "#B8860B", role: "accent", rgb: "184·134·11" },
      muted: { name: "Ash", hex: "#928A7E", role: "accent", rgb: "146·138·126" },
      proportion: { ink: 30, bone: 55, signal: 10, muted: 5 },
    },
    {
      ink: { name: "Obsidian", hex: "#0A0A0E", role: "primary-dark", rgb: "10·10·14" },
      bone: { name: "Ivory", hex: "#FFFFF0", role: "primary-light", rgb: "255·255·240" },
      signal: { name: "Crimson", hex: "#9B1B30", role: "accent", rgb: "155·27·48" },
      muted: { name: "Charcoal Gray", hex: "#6E6E72", role: "accent", rgb: "110·110·114" },
      proportion: { ink: 30, bone: 55, signal: 10, muted: 5 },
    },
  ],
};

function pickPalette(answers: OnboardingAnswers): BrandPalette {
  const variants = TONE_PALETTE_VARIANTS[answers.tonePreference];
  const seed = (answers.name + answers.location + answers.targetClient + answers.personalityTraits.join("")).length;
  return variants[seed % variants.length];
}

const TONE_FONT_VARIANTS: Record<OnboardingAnswers["tonePreference"], BrandTypography[]> = {
  warm: [
    { display: { family: "Playfair Display", role: "display", weights: ["400", "500", "600"], letterSpacing: "-0.035em" }, body: { family: "DM Sans", role: "body", weights: ["300", "400", "500"], letterSpacing: "-0.005em" }, scale: [] },
    { display: { family: "Lora", role: "display", weights: ["400", "500", "600"], letterSpacing: "-0.03em" }, body: { family: "Source Sans 3", role: "body", weights: ["300", "400", "500"], letterSpacing: "-0.005em" }, scale: [] },
    { display: { family: "Libre Baskerville", role: "display", weights: ["400", "700"], letterSpacing: "-0.025em" }, body: { family: "Nunito Sans", role: "body", weights: ["300", "400", "600"], letterSpacing: "0em" }, scale: [] },
  ],
  professional: [
    { display: { family: "Inter", role: "display", weights: ["400", "500", "600", "700"], letterSpacing: "-0.025em" }, body: { family: "Inter", role: "body", weights: ["300", "400", "500"], letterSpacing: "-0.01em" }, scale: [] },
    { display: { family: "Outfit", role: "display", weights: ["400", "500", "600", "700"], letterSpacing: "-0.02em" }, body: { family: "IBM Plex Sans", role: "body", weights: ["300", "400", "500"], letterSpacing: "-0.005em" }, scale: [] },
    { display: { family: "Manrope", role: "display", weights: ["400", "500", "600", "700"], letterSpacing: "-0.03em" }, body: { family: "Manrope", role: "body", weights: ["300", "400", "500"], letterSpacing: "-0.01em" }, scale: [] },
  ],
  playful: [
    { display: { family: "Quicksand", role: "display", weights: ["400", "500", "600"], letterSpacing: "-0.03em" }, body: { family: "DM Sans", role: "body", weights: ["300", "400", "500"], letterSpacing: "0em" }, scale: [] },
    { display: { family: "Fredoka", role: "display", weights: ["400", "500", "600"], letterSpacing: "-0.02em" }, body: { family: "Nunito", role: "body", weights: ["300", "400", "600"], letterSpacing: "0em" }, scale: [] },
    { display: { family: "Baloo 2", role: "display", weights: ["400", "500", "600", "700"], letterSpacing: "-0.015em" }, body: { family: "Lexend", role: "body", weights: ["300", "400", "500"], letterSpacing: "0em" }, scale: [] },
  ],
  authoritative: [
    { display: { family: "Cormorant Garamond", role: "display", weights: ["400", "500", "600"], letterSpacing: "-0.02em" }, body: { family: "Montserrat", role: "body", weights: ["300", "400", "500"], letterSpacing: "-0.005em" }, scale: [] },
    { display: { family: "DM Serif Display", role: "display", weights: ["400"], letterSpacing: "-0.025em" }, body: { family: "Work Sans", role: "body", weights: ["300", "400", "500"], letterSpacing: "-0.005em" }, scale: [] },
    { display: { family: "Fraunces", role: "display", weights: ["400", "500", "600"], letterSpacing: "-0.03em" }, body: { family: "Albert Sans", role: "body", weights: ["300", "400", "500"], letterSpacing: "-0.005em" }, scale: [] },
  ],
};

const FONT_PAIRING_MAP: Record<string, BrandTypography> = {
  "rufina-roboto": {
    display: { family: "Rufina", role: "display", weights: ["400", "700"], letterSpacing: "-0.03em" },
    body: { family: "Roboto", role: "body", weights: ["300", "400", "500"], letterSpacing: "-0.005em" },
    scale: [],
  },
  "playfair-opensans": {
    display: { family: "Playfair Display", role: "display", weights: ["400", "500", "700"], letterSpacing: "-0.035em" },
    body: { family: "Open Sans", role: "body", weights: ["300", "400", "600"], letterSpacing: "-0.005em" },
    scale: [],
  },
  "cormorant-lato": {
    display: { family: "Cormorant Garamond", role: "display", weights: ["300", "400", "600"], letterSpacing: "-0.02em" },
    body: { family: "Lato", role: "body", weights: ["300", "400", "700"], letterSpacing: "-0.005em" },
    scale: [],
  },
  "worksans-sourceserif": {
    display: { family: "Work Sans", role: "display", weights: ["300", "400", "600"], letterSpacing: "-0.025em" },
    body: { family: "Source Serif Pro", role: "body", weights: ["300", "400", "600"], letterSpacing: "-0.005em" },
    scale: [],
  },
  "poppins-lora": {
    display: { family: "Poppins", role: "display", weights: ["300", "400", "600"], letterSpacing: "-0.02em" },
    body: { family: "Lora", role: "body", weights: ["400", "500", "700"], letterSpacing: "-0.005em" },
    scale: [],
  },
};

function pickFonts(answers: OnboardingAnswers): BrandTypography {
  if (answers.fontPairing && FONT_PAIRING_MAP[answers.fontPairing]) {
    return { ...FONT_PAIRING_MAP[answers.fontPairing] };
  }
  const variants = TONE_FONT_VARIANTS[answers.tonePreference];
  const seed = (answers.name + answers.targetClient + answers.contentFocus.join("")).length;
  return { ...variants[seed % variants.length] };
}

function buildVoice(answers: OnboardingAnswers): BrandVoice {
  const name = answers.name.split(" ")[0];
  const traits = answers.personalityTraits.join(", ").toLowerCase();
  const market = answers.markets[0] || answers.location;

  const voiceMap: Record<OnboardingAnswers["tonePreference"], BrandVoice> = {
    warm: {
      hero: `${name} sounds like the friend who happens to know every house on the block — ${traits}, and always rooting for you.`,
      weSay: [
        `Hi, I'm ${name}. Let's find your next chapter.`,
        "The kitchen catches the morning sun — I thought of you.",
        "We'll walk through the numbers together, no rush.",
      ],
      weDontSay: [
        "Aggressive market disruptor delivering best-in-class results.",
        "Synergies and value-adds across the buying journey.",
        "DM ME NOW for HOT listings!! 🔥🏡",
      ],
      always: "Warm, genuine, helpful. Lowercase by default. Em-dashes welcome.",
      sometimes: "A personal story. A practical number. A quiet celebration.",
      never: "Hype. Jargon. Emoji parties. Pressure tactics.",
      italicRule: "Use italic on the emotional word. Never on the verb. Never on three words in a row.",
      traits: [
        { name: "Warm & Optimistic", description: `Advice from a trusted, knowledgeable friend. ${traits} — generous, never breezy.` },
        { name: "Helpful & Informed", description: `Backed by deep ${market} knowledge and a smart pricing strategy. Useful first.` },
        { name: "Casual yet Clean", description: "Avoid corporate jargon. Keep language accessible, elevated, uncluttered." },
      ],
      taglines: [
        { quiet: "It's never just", loud: "about the house." },
        { quiet: `What`, loud: `home means to me.` },
        { quiet: `Guiding you to the life you want,`, loud: `in the place you'll call home.` },
      ],
    },
    professional: {
      hero: `${name} leads with data, follows with care — ${traits}. Every recommendation is backed by the numbers.`,
      weSay: [
        `${name} here. Let's look at what the market is telling us.`,
        "The comps support this price — here's why.",
        "I'll send you the analysis before our call.",
      ],
      weDontSay: [
        "Trust me, this is a steal!",
        "You NEED to see this before it's gone!!!",
        "Let's manifest your dream home.",
      ],
      always: "Measured, confident, clear. Data before opinion.",
      sometimes: "A market insight that surprises. A subtle personal touch.",
      never: "Hype. Urgency tricks. Unsubstantiated claims.",
      italicRule: "Use italic on the emotional word. Never on the verb. Never on three words in a row.",
      traits: [
        { name: "Data-Driven", description: `Every recommendation backed by ${market} market data and verified comps.` },
        { name: "Measured & Confident", description: `${traits}. Clear communication, no hedging, no hype.` },
        { name: "Strategically Clear", description: "Complex concepts made simple. The client always knows the next step." },
      ],
      taglines: [
        { quiet: "The numbers speak.", loud: "We listen." },
        { quiet: `Your ${market}`, loud: "market expert." },
        { quiet: "Strategic pricing,", loud: "not guesswork." },
      ],
    },
    playful: {
      hero: `${name} makes real estate feel less like a transaction and more like an adventure — ${traits}, with good energy.`,
      weSay: [
        `Hey! I'm ${name}. Let's find you something great.`,
        "This backyard? Weekend barbecue energy.",
        "Sold in a week. Not bad for a Tuesday listing.",
      ],
      weDontSay: [
        "Per our previous correspondence regarding the property.",
        "Pursuant to market conditions, we advise...",
        "This exclusive opportunity won't last.",
      ],
      always: "Energetic, approachable, real. Emojis okay in moderation.",
      sometimes: "A joke. A pop culture reference. A celebration.",
      never: "Corporate speak. Fake urgency. Taking yourself too seriously.",
      italicRule: "Use italic on the emotional word. Never on the verb. Never on three words in a row.",
      traits: [
        { name: "Energetic & Real", description: `${traits}. Makes the whole process feel like an adventure, not a chore.` },
        { name: "Approachable Expert", description: `Knows ${market} inside and out but never makes you feel behind.` },
        { name: "Fun but Focused", description: "Good energy meets sharp negotiation. Playful doesn't mean careless." },
      ],
      taglines: [
        { quiet: "Real estate,", loud: "but make it fun." },
        { quiet: `Find your vibe`, loud: `in ${market}.` },
        { quiet: "Let's find you", loud: "something great." },
      ],
    },
    authoritative: {
      hero: `${name} brings quiet authority to every deal — ${traits}. The kind of agent other agents call for advice.`,
      weSay: [
        `${name}. ${answers.location} specialist.`,
        "The data is clear. Here's my recommendation.",
        "Precision pricing. Expert negotiation. Clean closings.",
      ],
      weDontSay: [
        "OMG you guys this house is AMAZING!!",
        "I'm so blessed to be in real estate!",
        "Let's vibe on this listing.",
      ],
      always: "Confident, direct, knowledgeable. Short sentences.",
      sometimes: "A quiet insight. A decisive recommendation.",
      never: "Slang. Excitement for excitement's sake. Hedging.",
      italicRule: "Use italic on the emotional word. Never on the verb. Never on three words in a row.",
      traits: [
        { name: "Quiet Authority", description: `${traits}. Doesn't need to be loud — the track record speaks.` },
        { name: "Decisive & Direct", description: `Clear recommendations backed by ${market} expertise. No hedging.` },
        { name: "Elevated Precision", description: "Every detail is intentional. Every word earns its place." },
      ],
      taglines: [
        { quiet: `${market}.`, loud: "Mastered." },
        { quiet: "Precision pricing.", loud: "Expert negotiation." },
        { quiet: "The kind of agent", loud: "other agents call." },
      ],
    },
  };

  return voiceMap[answers.tonePreference];
}

function buildPillars(answers: OnboardingAnswers): ContentPillar[] {
  const focusSet = new Set(answers.contentFocus.map((f) => f.toLowerCase()));
  const pillars: ContentPillar[] = [];

  const pillarMap: { keywords: string[]; pillar: ContentPillar }[] = [
    { keywords: ["listing", "new listing", "just listed"], pillar: { name: "New Listings", description: "Property announcements with key details and compelling copy", frequency: "weekly" } },
    { keywords: ["sold", "just sold", "closing"], pillar: { name: "Just Sold", description: "Celebrate wins and build social proof", frequency: "biweekly" } },
    { keywords: ["market", "data", "stats", "update"], pillar: { name: "Market Clarity", description: "Market updates, pricing insights, local data", frequency: "weekly" } },
    { keywords: ["tips", "buyer", "seller", "advice"], pillar: { name: "Buyer / Seller Tips", description: "Practical guidance for the real estate journey", frequency: "weekly" } },
    { keywords: ["neighborhood", "community", "spotlight"], pillar: { name: "Neighborhood Life", description: "Local lifestyle, community highlights, hidden gems", frequency: "biweekly" } },
    { keywords: ["personal", "behind the scenes", "story"], pillar: { name: "Personal", description: "Behind-the-scenes, personal stories, milestones", frequency: "monthly" } },
    { keywords: ["event", "restaurant", "things to do", "local"], pillar: { name: "Local Life", description: "Events, restaurants, things to do in the area", frequency: "biweekly" } },
    { keywords: ["video", "reel", "story"], pillar: { name: "Stories / Reels", description: "Short-form video content ideas", frequency: "weekly" } },
  ];

  for (const { keywords, pillar } of pillarMap) {
    if (keywords.some((k) => focusSet.has(k) || answers.contentFocus.some((f) => f.toLowerCase().includes(k)))) {
      pillars.push(pillar);
    }
  }

  if (pillars.length < 3) {
    const defaults = pillarMap.slice(0, 5).map((p) => p.pillar);
    for (const d of defaults) {
      if (!pillars.find((p) => p.name === d.name)) pillars.push(d);
      if (pillars.length >= 5) break;
    }
  }

  return pillars;
}

function buildPostTemplates(answers: OnboardingAnswers): PostTemplate[] {
  const handle = answers.social || `@${answers.name.toLowerCase().replace(/\s+/g, "")}`;
  return [
    {
      name: "Just Listed",
      surface: "light",
      kicker: "Just listed",
      headlinePattern: "[Address], just listed.",
      accentWord: "listed",
      footerLeft: "Open Sat · 11—1",
      footerRight: handle,
      stamp: "3 bed\n2 bath",
    },
    {
      name: "Just Sold",
      surface: "dark",
      kicker: "Sold",
      headlinePattern: "[Neighborhood], sold in [days] days.",
      accentWord: "sold",
      footerLeft: "$[price] · [offers] offers",
      footerRight: handle,
    },
    {
      name: "Market Update",
      surface: "light",
      kicker: "Market Clarity",
      headlinePattern: "[Market] — [insight].",
      accentWord: "the verb",
      footerLeft: `${answers.location} · Q[quarter]`,
      footerRight: handle,
    },
  ];
}

function buildPhotography(answers: OnboardingAnswers): PhotographyStyle {
  const styles: Record<OnboardingAnswers["tonePreference"], PhotographyStyle> = {
    warm: {
      description: "Less listing photo, more editorial spread. Think Architectural Digest more than MLS.",
      principles: [
        { name: "Natural light", description: "Late-afternoon glow. A lit fireplace. Warmth over wattage." },
        { name: "Texture first", description: "Wood, stone, linen. Let the materials do the coloring." },
        { name: "Quiet composition", description: "Architectural details — arches, beams, runners." },
        { name: "Relaxed portrait", description: "Natural, approachable. A softly blurred domestic background." },
      ],
    },
    professional: {
      description: "Clean, well-lit, architecturally composed. The property is the hero.",
      principles: [
        { name: "Sharp and balanced", description: "Straight verticals, even exposure, no dramatic filters." },
        { name: "Highlight the space", description: "Wide angles that show flow between rooms." },
        { name: "Curb appeal first", description: "The exterior shot sets the tone — make it count." },
        { name: "Professional headshot", description: "Studio-quality, neutral background, confident expression." },
      ],
    },
    playful: {
      description: "Bright, inviting, lifestyle-forward. Show people living in the space.",
      principles: [
        { name: "Bright and airy", description: "Natural light, white balance warm, no harsh shadows." },
        { name: "Lifestyle moments", description: "A coffee on the counter, a book on the porch." },
        { name: "Neighborhood energy", description: "The park, the coffee shop, the Saturday farmers market." },
        { name: "Candid portrait", description: "Smiling, mid-laugh, in the neighborhood. Not a headshot — a moment." },
      ],
    },
    authoritative: {
      description: "Dramatic, high-contrast, architecturally precise. The photography commands attention.",
      principles: [
        { name: "Twilight exteriors", description: "Shot at dusk with interior lights on. Maximum curb appeal." },
        { name: "Architectural precision", description: "Perfectly level, corrected verticals, clean lines." },
        { name: "Detail shots", description: "Hardware, stone, millwork. The craftsmanship tells the story." },
        { name: "Formal portrait", description: "Tailored, composed, against an architectural backdrop." },
      ],
    },
  };

  return styles[answers.tonePreference];
}

// ─────────────────────────────────────────────────────────────
//  Generate a complete brand book from onboarding answers
// ─────────────────────────────────────────────────────────────

export function generateBrandBook(
  userId: string,
  answers: OnboardingAnswers,
): BrandBook {
  const now = new Date().toISOString();
  const palette = answers.brandColors?.length
    ? inferPaletteFromColors(answers.brandColors, answers)
    : pickPalette(answers);

  const typography = pickFonts(answers);
  typography.scale = [
    { name: "Display 01", face: "display", size: "64px", weight: "500", tracking: typography.display.letterSpacing, sample: `A home in ${answers.markets[0] || answers.location}.` },
    { name: "Display 02", face: "display", size: "44px", weight: "500", tracking: typography.display.letterSpacing, sample: "Your week, already scheduled." },
    { name: "Heading", face: "display", size: "28px", weight: "500", tracking: "-2.5%", sample: "Open house, Saturday at eleven." },
    { name: "Body L", face: "body", size: "16px", weight: "400", tracking: typography.body.letterSpacing, sample: "Three bedrooms, two baths, and a kitchen that catches the morning sun." },
    { name: "Body M", face: "body", size: "13px", weight: "400", tracking: "0%", sample: "Schedule across every channel from one queue." },
  ];

  const name = answers.name.split(" ")[0];

  return {
    id: `brand-${userId}-${Date.now()}`,
    userId,
    createdAt: now,
    updatedAt: now,
    status: "active",

    identity: {
      name: answers.name,
      title: "Realtor",
      brokerage: answers.brokerage,
      location: answers.location,
      markets: answers.markets,
      phone: answers.phone,
      email: answers.email,
      website: answers.website,
      social: answers.social,
      target: answers.targetClient,
      experience: answers.experience,
      headshot: answers.headshot,
    },

    glance: {
      story: `${answers.name} is a real estate agent in ${answers.location} who believes social media shouldn't be the hard part. ${answers.personalityTraits.length ? `Known for being ${answers.personalityTraits.slice(0, 3).join(", ").toLowerCase()}.` : ""} The brand is built around one idea: you handle the houses, your postpal handles the posts.`,
      whatItIs: `A ${answers.personalityTraits[0]?.toLowerCase() || "trusted"} real estate presence in ${answers.location}.`,
      howItWorks: `${name} posts consistently, on-brand, without spending hours on social media — because the postpal handles it.`,
      whoItsFor: answers.targetClient,
      howWeSound: buildVoice(answers).hero.split("—")[0].trim() + ".",
    },

    mark: {
      variants: answers.logo
        ? [
            { label: "Primary · Uploaded", url: answers.logo, surface: "light" as const },
          ]
        : [],
      minSizePx: 120,
      clearSpace: "Maintain at minimum one cap-height of clear space on all four sides.",
      donts: [
        "Don't stretch or compress the logo",
        "Don't rotate the logo",
        "Don't add shadows, glows, or outlines",
        "Don't recolor — only use approved variants",
      ],
    },

    palette,
    typography,
    voice: buildVoice(answers),
    applications: {
      postTemplates: buildPostTemplates(answers),
      onboardingChat: {
        agentName: "your postpal",
        greeting: `Hey ${name} — I'm your postpal. Let's set up your brand together.`,
        sampleExchange: [
          { role: "agent", text: `Hey ${name} — I'm your postpal. Let's set up your brand together.` },
          { role: "agent", text: "First, what's your name and the area you sell in?" },
          { role: "user", text: `${answers.name}. ${answers.markets[0] || answers.location}.` },
          { role: "agent", text: "Drop your logo and any brand colours — I'll learn the look." },
        ],
      },
    },
    photography: buildPhotography(answers),
    pillars: buildPillars(answers),
    colophon: {
      version: "1.0",
      issuedDate: now.split("T")[0],
      contact: answers.email || "",
    },
  };
}

function inferPaletteFromColors(
  colors: string[],
  answers: OnboardingAnswers,
): BrandPalette {
  const base = pickPalette(answers);
  if (colors.length >= 1) base.signal = { ...base.signal, hex: colors[0], name: "Brand Accent" };
  if (colors.length >= 2) base.ink = { ...base.ink, hex: colors[1], name: "Brand Dark" };
  if (colors.length >= 3) base.bone = { ...base.bone, hex: colors[2], name: "Brand Light" };
  if (colors.length >= 4) base.muted = { ...base.muted, hex: colors[3], name: "Brand Muted" };
  return base;
}
