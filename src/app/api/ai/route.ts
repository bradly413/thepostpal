import Anthropic from "@anthropic-ai/sdk";
import {
  buildKnowledgeContext,
  isKnowledgeStoreUnavailableError,
} from "@/lib/knowledge-store";
import {
  rateLimit,
  buildRateLimitKey,
  RateLimitUnavailableError,
} from "@/lib/rate-limit";
import { loadTemplateCatalog } from "@/lib/template-catalog";
import { requireAuthContext, type AuthContext } from "@/lib/api-auth";
import { buildTenantBrandContext } from "@/lib/ai-brand-context";
import { extractMessageText } from "@/lib/ai/message-text";

export const runtime = "nodejs";
export const maxDuration = 60;

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

// Industry-agnostic stopwords so generic words ("the", "post", "make") don't
// produce spurious matches against template names/pillars.
const TEMPLATE_MATCH_STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "for", "to", "of", "in", "on", "with", "my",
  "our", "your", "me", "i", "we", "us", "this", "that", "it", "is", "are", "be",
  "make", "create", "write", "post", "posts", "caption", "content", "about",
  "new", "please", "want", "need", "help", "can", "you", "some", "draft", "card",
]);

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !TEMPLATE_MATCH_STOPWORDS.has(word));
}

// Match the user's message against the ACTUAL pillar/name strings in the loaded
// template catalog — no hardcoded industry assumptions. A template is included
// when any of its name/pillar keywords appears in the user's message. Returns
// "" when nothing matches so we don't push irrelevant context to the model.
function buildTemplateContext(userMessage: string, templates: Awaited<ReturnType<typeof loadTemplateCatalog>>): string {
  const messageTokens = new Set(tokenize(userMessage));
  if (messageTokens.size === 0) return "";

  const scored = templates
    .map((t) => {
      const templateTokens = new Set([...tokenize(t.name), ...tokenize(t.pillar)]);
      let score = 0;
      for (const token of templateTokens) {
        if (messageTokens.has(token)) score += 1;
      }
      return { template: t, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return "";

  // Cap the context to the strongest matches to keep the prompt focused.
  const matched = scored.slice(0, 4).map((entry) => entry.template);

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

  try {
    if (!(await rateLimit(
      buildRateLimitKey("ai", req.headers as unknown as Headers, auth),
      20,
      60_000,
    ))) {
      return Response.json(
        { error: "Too many requests. Please wait a moment." },
        { status: 429 },
      );
    }
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return Response.json({ error: "Rate limit unavailable" }, { status: 503 });
    }
    throw error;
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
  let knowledgeContext = "";
  if (lastUserMsg) {
    try {
      knowledgeContext = buildKnowledgeContext(auth.tenantId, lastUserMsg.content);
    } catch (error) {
      if (!isKnowledgeStoreUnavailableError(error)) {
        throw error;
      }
    }
  }

  // Per-tenant brand voice — the shared builder reads BOTH the legacy
  // Organization.brandEngine DNA and the full onboarding brand book
  // (Location.brandVoiceJson). Falls back to the neutral voice baked into
  // SYSTEM_PROMPT when the tenant has neither.
  const tenantBrandContext = await buildTenantBrandContext(auth);

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
      const client = new Anthropic({ apiKey: anthropicKey, timeout: 45_000, maxRetries: 1 });
      const response = await client.messages.create({
        model: "claude-sonnet-5",
      // Structured/routing call — reasoning would only add latency + budget risk.
      thinking: { type: "disabled" },
        max_tokens: 1500,
        system: systemPrompt,
        messages: chat.map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      });
      const text =
        extractMessageText(response.content);
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
      console.error("[api/ai] gemini request failed:", data?.error?.message || res.statusText);
      return Response.json(
        { error: "AI request failed" },
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
