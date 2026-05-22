import Anthropic from "@anthropic-ai/sdk";
import { buildBrandPrompt } from "@/lib/brand-book-schema";
import { angieNicholsBrandBook } from "@/lib/brand-books/angie-nichols";
import { buildKnowledgeContext } from "@/lib/knowledge-store";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { loadTemplateCatalog } from "@/lib/template-catalog";

const brandContext = buildBrandPrompt(angieNicholsBrandBook);

const SYSTEM_PROMPT = `You are the AI assistant for thepostpal, a social media management platform for real estate agents.

## Your Role
You help ${angieNicholsBrandBook.identity.name} create compelling social media content for Facebook and Instagram that aligns with their brand voice and guidelines. You are warm, knowledgeable, and efficient.

${brandContext}

## Response Guidelines
- Write in the brand voice described above
- When writing captions, include relevant hashtags (5-10 per post)
- Always consider the target audience
- Use emoji sparingly and tastefully (1-3 per caption max)
- Keep captions concise for Instagram (under 2200 chars) and conversational for Facebook
- When suggesting content ideas, tie them to content pillars
- Format responses with markdown for readability
- Be proactive in suggesting improvements or alternatives

## CRITICAL: Always Generate Content
When the user asks you to write a post, caption, or any content — ALWAYS generate it immediately. NEVER ask clarifying questions or say you need more details. Use the information provided and fill in reasonable defaults for anything missing. If they mention a property address, use it. If they don't specify details like bedrooms/bathrooms, make a reasonable assumption or keep the copy general. The user wants to see a finished post they can edit, not a conversation about what the post should be.

When writing a platform-specific post (Instagram, Facebook, LinkedIn, Twitter), structure your response as:

---
[The actual caption/post text here, written as if Angie is posting it]
---

**Hashtags:** #tag1 #tag2 #tag3 ...

This separator format helps the platform mockup extract and display your content correctly.`;

function buildTemplateContext(userMessage: string, templates: Awaited<ReturnType<typeof loadTemplateCatalog>>): string {
  const lower = userMessage.toLowerCase();
  const matched: typeof templates = [];

  if (/new listing|just listed|listing announce/i.test(lower)) {
    matched.push(...templates.filter((t) => t.pillar === "New Listing"));
  } else if (/just sold|sold|closing/i.test(lower)) {
    matched.push(...templates.filter((t) => t.pillar === "Just Sold"));
  } else if (/market|stats|data|update|snapshot/i.test(lower)) {
    matched.push(...templates.filter((t) => t.pillar === "Market Clarity"));
  } else if (/tip|checklist|buyer|seller|staging/i.test(lower)) {
    matched.push(...templates.filter((t) => t.pillar === "Buyer / Seller Tips"));
  } else if (/neighborhood|community|spotlight/i.test(lower)) {
    matched.push(...templates.filter((t) => t.pillar === "Neighborhood Life"));
  } else if (/holiday|memorial|christmas|thanksgiving|halloween|fourth|labor day/i.test(lower)) {
    matched.push(...templates.filter((t) => t.pillar === "Holiday"));
  } else if (/season|spring|summer|fall|winter/i.test(lower)) {
    matched.push(...templates.filter((t) => t.pillar === "Seasonal"));
  } else if (/event|festival/i.test(lower)) {
    matched.push(...templates.filter((t) => t.pillar === "Local Life"));
  } else if (/story|reel|stories/i.test(lower)) {
    matched.push(...templates.filter((t) => t.pillar === "Stories / Reels"));
  }

  if (matched.length === 0) return "";

  const templateInfo = matched
    .map((t) => {
      const fields = t.fields.map((f) => `  - ${f.label} (${f.type}): e.g. "${f.defaultValue}"`).join("\n");
      return `Template: ${t.name}\nFormat: ${t.width}x${t.height}\nFields:\n${fields}`;
    })
    .join("\n\n");

  return `\n\n## Matching Brand Template
The user's request matches these brand templates. Use the template structure and default values as inspiration for the content format and tone. Write the post content to match this template's fields:

${templateInfo}`;
}

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
  const templateCatalog = await loadTemplateCatalog();
  const templateContext = lastUserMsg
    ? buildTemplateContext(lastUserMsg.content, templateCatalog)
    : "";

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: SYSTEM_PROMPT + knowledgeContext + templateContext,
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
