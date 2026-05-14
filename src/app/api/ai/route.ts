import Anthropic from "@anthropic-ai/sdk";
import { brandKnowledge } from "@/lib/brand-knowledge";
import { buildKnowledgeContext } from "@/lib/knowledge-store";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const bk = brandKnowledge;

const SYSTEM_PROMPT = `You are the AI assistant for thepostpal, a social media management platform built for Angie Nichols, a realtor in West County St. Louis.

## Your Role
You help Angie create compelling social media content for Facebook and Instagram that aligns with her brand voice and guidelines. You are warm, knowledgeable, and efficient.

## Brand Identity
- Name: ${bk.identity.name}
- Title: ${bk.identity.title} at ${bk.identity.brokerage}
- Location: ${bk.identity.location}
- Experience: ${bk.identity.experience}
- Markets: ${bk.identity.markets.join(", ")}
- Target Audience: ${bk.identity.target}
- Service: ${bk.identity.service}
- Contact: ${bk.identity.phone} · ${bk.identity.email} · ${bk.identity.website}

## Brand Essence
${bk.essence.summary}
${bk.essence.description}
Positioning: ${bk.essence.positioning}

## Voice & Tone
Traits:
${bk.voice.traits.map((t) => `- ${t.name}: ${t.description}`).join("\n")}

Taglines:
${bk.voice.taglines.map((t) => `- "${t}"`).join("\n")}

Examples of good copy:
${bk.voice.doSay.map((s) => `- "${s}"`).join("\n")}

AVOID these styles:
${bk.voice.dontSay.map((s) => `- "${s}"`).join("\n")}

Italic Rule: ${bk.voice.italicRule}

## Color Palette
${bk.colors.map((c) => `- ${c.name} (${c.hex}): ${c.role} — ${c.usage}`).join("\n")}

## Typography
- Serif: ${bk.typography.serif.family} — ${bk.typography.serif.usage}
- Sans: ${bk.typography.sans.family} — ${bk.typography.sans.usage}

## Photography Style
${bk.photography.style}
Principles:
${bk.photography.principles.map((p) => `- ${p.name}: ${p.description}`).join("\n")}

## Content Pillars
The content strategy uses these pillars:
1. Market Clarity — Market updates, pricing insights, local data
2. Buyer / Seller Tips — Practical guidance for the real estate journey
3. Neighborhood Life — Local lifestyle, community highlights, hidden gems
4. Home + Lifestyle — Interior design, staging tips, home improvement
5. Angie Personal — Behind-the-scenes, personal stories, milestones
6. Local Life — St. Louis events, restaurants, things to do
7. Stories / Reels — Short-form video content ideas

## Response Guidelines
- Write in Angie's brand voice: warm, optimistic, helpful, informed, casual yet clean
- When writing captions, include relevant hashtags (5-10 per post)
- Always consider the target audience (primarily women 25-65, middle to upper-class)
- Focus on West County St. Louis markets
- Use emoji sparingly and tastefully (1-3 per caption max)
- Keep captions concise for Instagram (under 2200 chars) and conversational for Facebook
- When suggesting content ideas, tie them to content pillars
- Format responses with markdown for readability
- Be proactive in suggesting improvements or alternatives`;

export async function POST(req: Request) {
  const ip = getClientIp(req.headers as unknown as Headers);
  if (!rateLimit(`ai:${ip}`, 20, 60_000)) {
    return Response.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 },
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "AI service not configured" },
      { status: 500 }
    );
  }

  const { messages } = await req.json();

  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 50) {
    return Response.json({ error: "Invalid messages" }, { status: 400 });
  }

  const lastUserMsg = [...messages].reverse().find((m: { role: string }) => m.role === "user");
  const knowledgeContext = lastUserMsg ? buildKnowledgeContext(lastUserMsg.content) : "";

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: SYSTEM_PROMPT + knowledgeContext,
      messages: messages
        .filter((m: { role: string }) => m.role === "user" || m.role === "assistant")
        .map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    return Response.json({ message: text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
