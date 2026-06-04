import Anthropic from "@anthropic-ai/sdk";
import { buildKnowledgeContext } from "@/lib/knowledge-store";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { loadTemplateCatalog } from "@/lib/template-catalog";
import { requireAuthContext, type AuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import { readBrandEngineImageContext } from "@/lib/brand-engine-dna";

// Neutral, industry-agnostic brand voice. (Per-tenant brand voice from
// Organization.brandEngine is a follow-up — see audit notes.)
const brandContext = `## Brand Voice
Write in a warm, clear, professional voice. Be concrete and benefit-led; avoid jargon and hype. Adapt tone to the business and the platform. When the user shares brand details, mission, or sample copy, follow them closely.`;

const SYSTEM_PROMPT = `You are the AI assistant for Posterboy, a social media management platform for local businesses and creators.

## Your Role
You help businesses create compelling social media content for Facebook, Instagram, X, TikTok, and LinkedIn that aligns with their brand voice and guidelines. You are warm, knowledgeable, and efficient.

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
When the user asks you to write a post, caption, or any content — ALWAYS generate it immediately. NEVER ask clarifying questions or say you need more details. Use the information provided and fill in reasonable defaults for anything missing. If they mention specifics (a product, offer, location, or event), use them. If details are missing, make a reasonable assumption or keep the copy general. The user wants to see a finished post they can edit, not a conversation about what the post should be.

When writing a platform-specific post (Instagram, Facebook, LinkedIn, Twitter), structure your response as:

---
[The actual caption/post text here, written in the brand's voice]
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
  let auth: AuthContext;
  try {
    auth = await requireAuthContext();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(req.headers as unknown as Headers);
  if (!rateLimit(`ai:${ip}`, 20, 60_000)) {
    return Response.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 },
    );
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!anthropicKey && !geminiKey) {
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
  const knowledgeContext = lastUserMsg ? buildKnowledgeContext(auth.tenantId, lastUserMsg.content) : "";

  // Per-tenant brand voice from Organization.brandEngine (falls back to the
  // neutral voice baked into SYSTEM_PROMPT when the tenant has no brand engine).
  let tenantBrandContext = "";
  try {
    await withTenantDb(auth, async (tx) => {
      const org = await tx.organization.findUnique({
        where: { id: auth.tenantId },
        select: { brandEngine: true, name: true, businessType: true },
      });
      const dna = readBrandEngineImageContext(org?.brandEngine);
      const lines: string[] = [];
      if (org?.name) lines.push(`- Business: ${org.name}${org.businessType ? ` (${org.businessType})` : ""}`);
      if (dna?.niche) lines.push(`- Niche / focus: ${dna.niche}`);
      if (dna?.primaryTone) lines.push(`- Voice & tone: ${dna.primaryTone}`);
      if (dna?.contrastVibe) lines.push(`- Visual vibe: ${dna.contrastVibe}`);
      if (lines.length > 0) {
        tenantBrandContext = `\n\n## This Business's Brand\n${lines.join("\n")}\nWrite all content in this business's voice, for this niche and audience.`;
      }
    });
  } catch {
    /* fall back to the neutral brand voice */
  }

  const templateCatalog = await loadTemplateCatalog();
  const templateContext = lastUserMsg
    ? buildTemplateContext(lastUserMsg.content, templateCatalog)
    : "";
  const systemPrompt = SYSTEM_PROMPT + tenantBrandContext + knowledgeContext + templateContext;
  const chat = messages.filter(
    (m: { role: string }) => m.role === "user" || m.role === "assistant",
  );

  try {
    // Prefer Claude (brand voice); fall back to Gemini when Anthropic
    // isn't configured so captions / chat still generate.
    if (anthropicKey) {
      const client = new Anthropic({ apiKey: anthropicKey });
      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        system: systemPrompt,
        messages: chat.map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      });
      const text =
        response.content[0].type === "text" ? response.content[0].text : "";
      return Response.json({ message: text });
    }

    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey! },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: chat.map((m: { role: string; content: string }) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
          generationConfig: { maxOutputTokens: 1500 },
        }),
      },
    );
    const data = await res.json();
    if (!res.ok) {
      return Response.json(
        { error: data?.error?.message || "AI request failed" },
        { status: res.status },
      );
    }
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const text = parts.map((p: { text?: string }) => p.text || "").join("");
    return Response.json({ message: text });
  } catch (err) {
    console.error("[api/ai] request failed:", err instanceof Error ? err.message : err);
    return Response.json({ error: "AI request failed" }, { status: 500 });
  }
}
