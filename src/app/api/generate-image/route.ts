import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  if (!rateLimit(`gen-image:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { prompt, aspectRatio = "1:1", referenceImage } = await req.json();

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

  const parts: Record<string, unknown>[] = [];

  if (referenceImage && typeof referenceImage === "string") {
    const match = referenceImage.match(/^data:(.+?);base64,(.+)$/);
    if (match) {
      parts.push({
        inlineData: {
          mimeType: match[1],
          data: match[2],
        },
      });
    }
  }

  parts.push({
    text: referenceImage
      ? `Using the uploaded image as a reference, generate a new image based on this description: ${prompt}`
      : prompt,
  });

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts,
            },
          ],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
            responseMimeType: "text/plain",
          },
        }),
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Image generation failed" },
        { status: res.status }
      );
    }

    const data = await res.json();
    const responseParts = data.candidates?.[0]?.content?.parts || [];

    let imageData: string | null = null;
    let mimeType: string = "image/png";
    let textResponse: string = "";

    for (const part of responseParts) {
      if (part.inlineData) {
        imageData = part.inlineData.data;
        mimeType = part.inlineData.mimeType || "image/png";
      }
      if (part.text) {
        textResponse += part.text;
      }
    }

    if (!imageData) {
      return NextResponse.json(
        { error: "No image was generated. Try a different prompt.", text: textResponse },
        { status: 422 }
      );
    }

    return NextResponse.json({
      image: `data:${mimeType};base64,${imageData}`,
      text: textResponse,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    );
  }
}
