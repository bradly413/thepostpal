import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/api-auth";
import { readBrandEngineDna, type BrandEngineDna } from "@/lib/brand-engine-dna";
import { withTenantDb } from "@/lib/db";

export const runtime = "nodejs";

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

function extractText(content: Array<{ type: string; text?: string }>): string {
  return content
    .filter((block): block is { type: "text"; text: string } => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthContext();
    const body = (await request.json()) as Record<string, unknown>;
    const topic = typeof body.topic === "string" ? body.topic.trim() : "";

    if (!topic) {
      return NextResponse.json({ error: "topic is required" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
    }

    return await withTenantDb(auth, async (tx) => {
      const organization = await tx.organization.findUnique({
        where: { id: auth.tenantId },
        select: { brandEngine: true },
      });

      const dna = readBrandEngineDna(organization?.brandEngine ?? null);
      if (!dna) {
        return NextResponse.json({ error: "Brand engine DNA not found" }, { status: 404 });
      }

      try {
        const client = new Anthropic({ apiKey });
        const response = await client.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 300,
          system: buildSystemPrompt(dna),
          messages: [
            {
              role: "user",
              content: `Write a social caption about: ${topic}`,
            },
          ],
        });

        const caption = extractText(response.content);
        if (!caption) {
          return NextResponse.json({ error: "No caption returned" }, { status: 502 });
        }

        return NextResponse.json({ caption });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Caption generation failed";
        return NextResponse.json({ error: message }, { status: 502 });
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
