import type { BrandVoice } from "@/lib/brand-book-schema";
import type { OnboardingAnswers } from "@/lib/brand-book-schema";
import type { IndustryDef } from "@/lib/industries";

interface VoiceCtx {
  firstName: string;
  traits: string;
  place: string;
  audience: string;
  company?: string;
  profession: string;
  industry: IndustryDef;
  tone: OnboardingAnswers["tonePreference"];
  isRealEstate: boolean;
}

function makeCtx(answers: OnboardingAnswers, industry: IndustryDef): VoiceCtx {
  return {
    firstName: answers.name.split(" ")[0] || answers.name,
    traits:
      answers.personalityTraits.join(", ").toLowerCase() ||
      industry.shortLabel.toLowerCase(),
    place: answers.location,
    audience: answers.targetClient,
    company: answers.company ?? answers.brokerage,
    profession: answers.profession?.trim() || industry.defaultProfessionTitle,
    industry,
    tone: answers.tonePreference,
    isRealEstate: industry.id === "real-estate",
  };
}

function pillarHint(industry: IndustryDef): string {
  return industry.defaultPillars[0]?.name.toLowerCase() ?? "what you offer";
}

/** Industry-aware deterministic voice — no cross-vertical leakage. */
export function buildIndustryVoice(
  answers: OnboardingAnswers,
  industry: IndustryDef,
): BrandVoice {
  const ctx = makeCtx(answers, industry);
  const builders: Record<
    OnboardingAnswers["tonePreference"],
    (c: VoiceCtx) => BrandVoice
  > = {
    warm: buildWarmVoice,
    professional: buildProfessionalVoice,
    playful: buildPlayfulVoice,
    authoritative: buildAuthoritativeVoice,
  };
  return builders[ctx.tone](ctx);
}

/** Neutral small-business voice when industry is unknown (not realtor-coded). */
export function buildGenericVoice(answers: OnboardingAnswers): BrandVoice {
  const firstName = answers.name.split(" ")[0] || answers.name;
  const traits =
    answers.personalityTraits.join(", ").toLowerCase() || "clear, human";
  const place = answers.location;
  const audience = answers.targetClient;
  const company = answers.company ?? answers.brokerage;

  const tone = answers.tonePreference;
  const companyBit = company ? ` at ${company}` : "";

  const heroes: Record<OnboardingAnswers["tonePreference"], string> = {
    warm: `${firstName} sounds like someone you'd actually enjoy working with — ${traits}, rooted in ${place}.`,
    professional: `${firstName} leads with clarity and follow-through — ${traits}. Every post earns its place.`,
    playful: `${firstName} keeps the feed human — ${traits}, with good energy in ${place}.`,
    authoritative: `${firstName} brings quiet authority — ${traits}. Short sentences, no fluff.`,
  };

  return {
    hero: heroes[tone],
    weSay: [
      `Hi — I'm ${firstName}${companyBit}. Here's what we're up to this week.`,
      `Something new for ${audience} in ${place}.`,
      `Behind the scenes: how we actually do the work.`,
    ],
    weDontSay: [
      "Synergies and best-in-class solutions across the value chain.",
      "We're SO excited to announce!!! 🔥🔥🔥",
      "Per our previous correspondence regarding your inquiry.",
    ],
    always: "Clear, human, on-brand. No jargon piles or fake urgency.",
    sometimes: "A practical tip. A customer moment. A quiet win.",
    never: "Hype. Corporate filler. Emoji spam. Pressure tactics.",
    italicRule:
      "Use italic on one emotional word. Never on the verb. Never three in a row.",
    traits: [
      {
        name: "Human first",
        description: `${traits} — sounds like a person, not a marketing department.`,
      },
      {
        name: "Locally rooted",
        description: `Grounded in ${place} and built for ${audience}.`,
      },
      {
        name: "Useful posts",
        description: "Every caption should help, entertain, or invite — not just fill the feed.",
      },
    ],
    taglines: [
      { quiet: "Built for", loud: "how you work." },
      { quiet: "Your voice,", loud: `in ${place}.` },
    ],
  };
}

function buildWarmVoice(c: VoiceCtx): BrandVoice {
  const hint = pillarHint(c.industry);
  if (c.isRealEstate) {
    return {
      hero: `${c.firstName} sounds like the friend who happens to know every block — ${c.traits}, always rooting for you in ${c.place}.`,
      weSay: [
        `Hi, I'm ${c.firstName}. Let's find your next chapter.`,
        "The kitchen catches the morning sun — I thought of you.",
        "We'll walk through the numbers together, no rush.",
      ],
      weDontSay: [
        "Aggressive market disruptor delivering best-in-class results.",
        "Synergies across the buying journey.",
        "DM ME NOW for HOT listings!! 🔥🏡",
      ],
      always: "Warm, genuine, helpful. Lowercase by default. Em-dashes welcome.",
      sometimes: "A personal story. A practical number. A quiet celebration.",
      never: "Hype. Jargon. Emoji parties. Pressure tactics.",
      italicRule:
        "Use italic on the emotional word. Never on the verb. Never three in a row.",
      traits: [
        {
          name: "Warm & local",
          description: `Trusted neighbor energy in ${c.place} — ${c.traits}.`,
        },
        {
          name: "Helpful & informed",
          description: `Useful first for ${c.audience}.`,
        },
        {
          name: "Casual yet clean",
          description: "Accessible language, never corporate.",
        },
      ],
      taglines: [
        { quiet: "It's never just", loud: "about the house." },
        { quiet: "Your next chapter,", loud: `in ${c.place}.` },
      ],
    };
  }

  return {
    hero: `${c.firstName} sounds like the host people come back to — ${c.traits}. ${c.industry.voiceExampleLine}`,
    weSay: [
      `${c.firstName} here — something fresh on ${hint} this week.`,
      `Made for ${c.audience} in ${c.place}.`,
      `A little behind-the-scenes from the ${c.industry.shortLabel.toLowerCase()} side.`,
    ],
    weDontSay: [
      "Best-in-class solutions for discerning clientele.",
      "We're SO blessed to serve you!!!",
      "Leverage synergies across the customer journey.",
      ...(c.isRealEstate
        ? []
        : [
            "Listings, closings, open houses, and comps.",
            "Your dream home awaits — act now!",
            "Brokerage excellence across the market.",
          ]),
    ],
    always: `Warm, sensory, specific to ${c.industry.label}. Match ${c.industry.promptAddendum.split(".")[0]}.`,
    sometimes: "A dish, a detail, a face, a quiet win.",
    never: "Corporate hospitality jargon. Fake urgency. Wrong-industry vocabulary.",
    italicRule:
      "Use italic on one sensory or emotional word. Never on the verb.",
    traits: [
      {
        name: "Warm & welcoming",
        description: `${c.traits} — ${c.audience} should feel invited, not sold to.`,
      },
      {
        name: `${c.industry.shortLabel}-grounded`,
        description: c.industry.promptAddendum.slice(0, 120) + ".",
      },
      {
        name: "Locally rooted",
        description: `Anchored in ${c.place}, not generic national copy.`,
      },
    ],
    taglines: [
      { quiet: c.industry.voiceExampleLine.split(".")[0] + ".", loud: c.place + "." },
      { quiet: "For", loud: c.audience + "." },
    ],
  };
}

function buildProfessionalVoice(c: VoiceCtx): BrandVoice {
  if (c.isRealEstate) {
    return {
      hero: `${c.firstName} leads with data, follows with care — ${c.traits}. Every recommendation is backed by the numbers in ${c.place}.`,
      weSay: [
        `${c.firstName} here. Let's look at what the market is telling us.`,
        "The comps support this price — here's why.",
        "I'll send you the analysis before our call.",
      ],
      weDontSay: [
        "Trust me, this is a steal!",
        "You NEED to see this before it's gone!!!",
        "Let's manifest your dream home.",
      ],
      always: "Measured, confident, clear. Data before opinion.",
      sometimes: "A market insight. A subtle personal touch.",
      never: "Hype. Urgency tricks. Unsubstantiated claims.",
      italicRule:
        "Use italic on the emotional word. Never on the verb.",
      traits: [
        { name: "Data-driven", description: `Market clarity for ${c.audience} in ${c.place}.` },
        { name: "Measured", description: c.traits },
        { name: "Strategic", description: "Complex ideas made simple." },
      ],
      taglines: [
        { quiet: "The numbers speak.", loud: "We listen." },
        { quiet: `Your ${c.place}`, loud: "market." },
      ],
    };
  }

  const hint = pillarHint(c.industry);
  return {
    hero: `${c.firstName} is the ${c.profession.toLowerCase()} who explains clearly — ${c.traits}. ${c.industry.voiceExampleLine}`,
    weSay: [
      `${c.firstName} — here's what's new with ${hint}.`,
      `For ${c.audience}: the detail that actually matters.`,
      `How we run ${c.industry.shortLabel.toLowerCase()} in ${c.place}, without the fluff.`,
    ],
    weDontSay: [
      "Disrupting the industry with paradigm-shifting excellence.",
      "Limited-time offer — don't miss out!!!",
      "We are passionate about delivering value.",
      "Listings, brokerages, closings, or open houses.",
    ],
    always: `Professional, plain-language, ${c.industry.label}-specific.`,
    sometimes: "A proof point. A process insight.",
    never: "Buzzwords. Wrong vertical. Fake scarcity.",
    italicRule: "Italic sparingly — one emphasis per caption.",
    traits: [
      { name: "Clear & credible", description: c.traits },
      { name: "Industry-fit", description: c.industry.promptAddendum.slice(0, 100) + "…" },
      { name: "Client-aware", description: `Built for ${c.audience}.` },
    ],
    taglines: [
      { quiet: "Clear work.", loud: c.place + "." },
      { quiet: "For", loud: c.audience + "." },
    ],
  };
}

function buildPlayfulVoice(c: VoiceCtx): BrandVoice {
  if (c.isRealEstate) {
    return {
      hero: `${c.firstName} makes the search feel less like paperwork and more like a good story — ${c.traits}, with good energy in ${c.place}.`,
      weSay: [
        `Hey! I'm ${c.firstName}. Let's find you something great.`,
        "This backyard? Weekend barbecue energy.",
        "Sold in a week. Not bad for a Tuesday.",
      ],
      weDontSay: [
        "Per our previous correspondence regarding the property.",
        "Pursuant to market conditions, we advise...",
        "This exclusive opportunity won't last.",
      ],
      always: "Energetic, approachable, real.",
      sometimes: "A joke. A celebration.",
      never: "Corporate speak. Fake urgency.",
      italicRule: "Use italic on the fun word.",
      traits: [
        { name: "Energetic", description: c.traits },
        { name: "Approachable expert", description: c.place },
        { name: "Fun but focused", description: "Playful doesn't mean careless." },
      ],
      taglines: [
        { quiet: "Find your vibe", loud: `in ${c.place}.` },
        { quiet: "Let's find you", loud: "something great." },
      ],
    };
  }

  return {
    hero: `${c.firstName} keeps ${c.industry.shortLabel.toLowerCase()} fun without trying too hard — ${c.traits}. ${c.industry.voiceExampleLine}`,
    weSay: [
      `Hey — ${c.firstName} here. New ${pillarHint(c.industry)} drop.`,
      `If you're in ${c.place}, you already know the vibe.`,
      `For ${c.audience}: come hungry / come curious / come as you are.`,
    ],
    weDontSay: [
      "Corporate synergy summit for stakeholders.",
      "Exclusive opportunity for discerning clientele!!!",
      "Real estate, listings, brokerages, or closings.",
    ],
    always: `Upbeat, real, ${c.industry.label}-native.`,
    sometimes: "A pun. A plate. A team moment.",
    never: "Cringe hype. Wrong-industry words.",
    italicRule: "Italic on the playful beat.",
    traits: [
      { name: "Fun & real", description: c.traits },
      { name: "Local energy", description: c.place },
      { name: "On-brand", description: c.industry.shortLabel },
    ],
    taglines: [
      { quiet: c.industry.shortLabel + ",", loud: "but make it fun." },
      { quiet: "See you in", loud: c.place + "." },
    ],
  };
}

function buildAuthoritativeVoice(c: VoiceCtx): BrandVoice {
  if (c.isRealEstate) {
    return {
      hero: `${c.firstName} brings quiet authority to every deal — ${c.traits}. The kind of agent other agents call in ${c.place}.`,
      weSay: [
        `${c.firstName}. ${c.place} specialist.`,
        "The data is clear. Here's my recommendation.",
        "Precision pricing. Expert negotiation. Clean closings.",
      ],
      weDontSay: [
        "OMG you guys this house is AMAZING!!",
        "I'm so blessed to be in real estate!",
        "Let's vibe on this listing.",
      ],
      always: "Confident, direct, knowledgeable.",
      sometimes: "A decisive recommendation.",
      never: "Slang. Hedging. Excitement for its own sake.",
      italicRule: "Italic on one precise word.",
      traits: [
        { name: "Quiet authority", description: c.traits },
        { name: "Decisive", description: c.place },
        { name: "Elevated precision", description: "Every word earns its place." },
      ],
      taglines: [
        { quiet: c.place + ".", loud: "Mastered." },
        { quiet: "Precision.", loud: "Clarity." },
      ],
    };
  }

  return {
    hero: `${c.firstName} is the ${c.profession.toLowerCase()} people trust for the real answer — ${c.traits}. ${c.industry.voiceExampleLine}`,
    weSay: [
      `${c.firstName}. ${c.profession} — ${c.place}.`,
      `What we stand for in ${c.industry.shortLabel.toLowerCase()}, in one line.`,
      `For ${c.audience}: the standard we hold.`,
    ],
    weDontSay: [
      "OMG best night ever!!!",
      "Synergy-driven experiential offerings.",
      "Brokerage, listings, comps, or closings.",
    ],
    always: `Confident, refined, ${c.industry.label}-correct.`,
    sometimes: "A standard. A craft detail.",
    never: "Slang piles. Wrong vertical vocabulary.",
    italicRule: "One italic emphasis max.",
    traits: [
      { name: "Authority", description: c.traits },
      { name: "Craft", description: c.industry.label },
      { name: "Clarity", description: `For ${c.audience}` },
    ],
    taglines: [
      { quiet: c.industry.voiceExampleLine.split(".")[0] + ".", loud: "Always." },
      { quiet: c.place + ".", loud: "Done right." },
    ],
  };
}
