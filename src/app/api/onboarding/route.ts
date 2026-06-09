import Anthropic from "@anthropic-ai/sdk";
import { ONBOARDING_SYSTEM_PROMPT } from "@/lib/onboarding-agent";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = getClientIp(req.headers as unknown as Headers);
  if (!rateLimit(`onboarding:${ip}`, 30, 60_000)) {
    return Response.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 },
    );
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
      model: "claude-sonnet-4-6",
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
      response.content[0].type === "text" ? response.content[0].text : "";

    return Response.json({ message: text });
  } catch (err) {
    console.error("[api/onboarding] request failed:", err instanceof Error ? err.message : err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
