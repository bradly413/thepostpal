import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  if (!rateLimit(`enhance:${ip}`, 15, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { prompt } = await req.json();

  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  if (prompt.length > 2000) {
    return NextResponse.json({ error: "Prompt too long (2000 char max)" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are an expert image prompt engineer. Take the user's rough image description and enhance it into a detailed, vivid prompt optimized for AI image generation. Add specific details about lighting, composition, color palette, mood, and style. Keep it concise (2-3 sentences max). Only return the enhanced prompt text, nothing else.\n\nUser prompt: ${prompt}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 200,
          },
        }),
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Enhancement failed" }, { status: res.status });
    }

    const data = await res.json();
    const enhanced = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!enhanced) {
      return NextResponse.json({ error: "No enhanced prompt returned" }, { status: 422 });
    }

    return NextResponse.json({ enhanced });
  } catch {
    return NextResponse.json({ error: "Enhancement failed" }, { status: 500 });
  }
}
