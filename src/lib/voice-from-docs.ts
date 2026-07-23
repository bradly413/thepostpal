import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Document ingestion — the cold-start unlock. A local business almost always has
// rich OWNED text (website copy, listing write-ups, a newsletter, a few real
// posts) even when its social history is thin. This extracts the real voice +
// substance from that text so generation sounds like THEM, not a template.
//
// Output is merged into the existing brand book (Location.brandVoiceJson), so it
// flows into every generator via ai-brand-context — no new store, no migration.

const MAX_INPUT = 24_000; // characters; plenty for a site + newsletter, caps cost

export interface ExtractedVoice {
  /** Short voice-trait descriptors grounded in the text. */
  tone: string[];
  /** One-line positioning, in their spirit. "" if not inferable. */
  hero: string;
  /** Signature phrases + a few REAL verbatim sentences that capture the voice. */
  weSay: string[];
  /** Anti-patterns to avoid (inferred). */
  weDontSay: string[];
  /** Recurring topics / content pillars. */
  topics: string[];
  /** Who they serve, if stated. "" otherwise. */
  audience: string;
}

const SYSTEM = `You analyze a small business's OWN written material (website copy, newsletters, listing descriptions, real social posts) and extract their authentic brand voice + substance. You are NOT writing new copy — you are profiling how THEY already write.

Return ONLY JSON (no prose, no fences):
{
  "tone": ["3-6 short voice descriptors grounded in the text, e.g. 'warm', 'plain-spoken', 'dry humor' — not generic 'professional'"],
  "hero": "one sentence capturing what they're really about, in their spirit (or "" if unclear)",
  "weSay": ["4-8 items: their signature phrases AND 2-3 SHORT verbatim sentences copied from the text that best capture their voice — real examples beat descriptions"],
  "weDontSay": ["2-4 things that would feel off-brand for them, inferred from the text"],
  "topics": ["3-7 recurring subjects/themes they actually write about"],
  "audience": "who they serve, if the text says so (or "")"
}

Rules:
- Ground everything in the supplied text. Do NOT invent products, names, or claims not present.
- For weSay verbatim examples, copy real sentences exactly — these become few-shot voice anchors.
- If the text is thin or generic, return fewer items rather than padding with filler.`;

export async function extractVoiceFromDocs(textRaw: string): Promise<ExtractedVoice | null> {
  const text = (textRaw || "").trim().slice(0, MAX_INPUT);
  if (text.length < 40) return null; // not enough to learn from
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("AI service not configured");

  const client = new Anthropic({ apiKey: key, timeout: 45_000, maxRetries: 1 });
  const resp = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 900,
    system: SYSTEM,
    messages: [{ role: "user", content: text }],
  });
  const out = resp.content[0]?.type === "text" ? resp.content[0].text : "";
  const match = out.match(/\{[\s\S]*\}/);
  if (!match) return null;

  let p: Record<string, unknown>;
  try {
    p = JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
  const strArr = (v: unknown, cap: number): string[] =>
    Array.isArray(v)
      ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim()).slice(0, cap)
      : [];

  return {
    tone: strArr(p.tone, 6),
    hero: typeof p.hero === "string" ? p.hero.trim() : "",
    weSay: strArr(p.weSay, 8),
    weDontSay: strArr(p.weDontSay, 4),
    topics: strArr(p.topics, 7),
    audience: typeof p.audience === "string" ? p.audience.trim() : "",
  };
}
