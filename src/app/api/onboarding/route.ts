import Anthropic from "@anthropic-ai/sdk";
import { ONBOARDING_SYSTEM_PROMPT } from "@/lib/onboarding-agent";
import { rateLimit, buildRateLimitKey, RateLimitUnavailableError } from "@/lib/rate-limit";
import { extractMessageText } from "@/lib/ai/message-text";

export async function POST(req: Request) {
  try {
    if (!(await rateLimit(buildRateLimitKey("onboarding", req.headers as unknown as Headers), 30, 60_000))) {
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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "AI service not configured" },
      { status: 500 },
    );
  }

  const { messages } = await req.json();

  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 50) {
    return Response.json({ error: "Invalid messages" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-5",
      // Structured/routing call — reasoning would only add latency + budget risk.
      thinking: { type: "disabled" },
      max_tokens: 800,
      system: ONBOARDING_SYSTEM_PROMPT,
      messages: messages
        .filter((m: { role: string }) => m.role === "user" || m.role === "assistant")
        .map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
    });

    const text =
      extractMessageText(response.content);

    return Response.json({ message: text });
  } catch (err) {
    console.error("[api/onboarding] request failed:", err instanceof Error ? err.message : err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
