import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/api-auth";
import { readBrandEngineDna, type BrandEngineDna } from "@/lib/brand-engine-dna";
import { withTenantDb } from "@/lib/db";
import { rateLimit, buildRateLimitKey, RateLimitUnavailableError } from "@/lib/rate-limit";
import { extractMessageText } from "@/lib/ai/message-text";

export const runtime = "nodejs";
export const maxDuration = 30;

function buildSystemPrompt(dna: BrandEngineDna): string {
  return [
    "You are the caption engine for a single tenant inside Posterboy Social.",
    "Return exactly one finished social caption and nothing else.",
    "Do not add headings, bullets, labels, quotation marks, or explanations.",
    "Do not mention being an AI assistant.",
    `The business niche is: ${dna.niche}.`,
    `The primary tone is: ${dna.primaryTone}.`,
    `The contrast vibe is: ${dna.contrastVibe}.`,
    "These constraints are mandatory. Every line of copy must stay inside them.",
    "Keep the caption concise, platform-ready, and specific to the user's topic.",
  ].join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthContext();
    try {
      if (!(await rateLimit(buildRateLimitKey("posts-generate", request.headers, auth), 10, 60_000))) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
      }
    } catch (error) {
      if (error instanceof RateLimitUnavailableError) {
        return NextResponse.json({ error: "Rate limit unavailable" }, { status: 503 });
      }
      throw error;
    }
    const body = (await request.json()) as Record<string, unknown>;
    const topic = typeof body.topic === "string" ? body.topic.trim() : "";

    if (!topic) {
      return NextResponse.json({ error: "topic is required" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
    }

    // Read the DNA inside the transaction, but keep the model call OUTSIDE it —
    // an interactive Prisma tx has a ~5s timeout and holds a Neon connection for
    // its whole lifetime, so awaiting model latency inside it throws "transaction
    // closed" and keeps compute pinned awake.
    const dna = await withTenantDb(auth, async (tx) => {
      const organization = await tx.organization.findUnique({
        where: { id: auth.tenantId },
        select: { brandEngine: true },
      });
      return readBrandEngineDna(organization?.brandEngine ?? null);
    });

    if (!dna) {
      return NextResponse.json({ error: "Brand engine DNA not found" }, { status: 404 });
    }

    try {
      const client = new Anthropic({ apiKey, timeout: 20_000, maxRetries: 1 });
      const response = await client.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 300,
        thinking: { type: "disabled" },
        system: buildSystemPrompt(dna),
        messages: [
          {
            role: "user",
            content: `Write a social caption about: ${topic}`,
          },
        ],
      });

      const caption = extractMessageText(response.content).trim();
      if (!caption) {
        return NextResponse.json({ error: "No caption returned" }, { status: 502 });
      }

      return NextResponse.json({ caption });
    } catch (error) {
      console.error("[api/posts/generate] caption failed:", error instanceof Error ? error.message : error);
      return NextResponse.json({ error: "Caption generation failed" }, { status: 502 });
    }
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
