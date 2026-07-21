export interface GeminiImageResult {
  image: string;
  text: string;
}

export function parseInlineReferenceImage(referenceImage?: string | null): {
  mimeType: string;
  data: string;
} | null {
  if (!referenceImage || typeof referenceImage !== "string") return null;
  const match = referenceImage.match(/^data:(image\/.+?);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

export async function generateGeminiImage(input: {
  prompt: string;
  referenceImage?: string | null;
  apiKey: string;
}): Promise<GeminiImageResult> {
  const parts: Record<string, unknown>[] = [];

  const inlineReference = parseInlineReferenceImage(input.referenceImage);
  if (inlineReference) {
    parts.push({
      inlineData: {
        mimeType: inlineReference.mimeType,
        data: inlineReference.data,
      },
    });
  }

  parts.push({
    text: input.referenceImage
      ? `Using the uploaded image as a reference, generate a new image based on this description: ${input.prompt}`
      : input.prompt,
  });

  // Legacy helper path — keep generateContent for callers outside Studio.
  // Studio uses Interactions + Nano Banana via src/lib/studio/nano-banana.ts.
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": input.apiKey },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
          responseMimeType: "text/plain",
        },
      }),
    },
  );

  if (!res.ok) {
    throw new Error(`GEMINI_IMAGE_${res.status}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string }; text?: string }> } }>;
  };

  const responseParts = data.candidates?.[0]?.content?.parts ?? [];
  let imageData: string | null = null;
  let mimeType = "image/png";
  let textResponse = "";

  for (const part of responseParts) {
    if (part.inlineData?.data) {
      imageData = part.inlineData.data;
      mimeType = part.inlineData.mimeType || "image/png";
    }
    if (part.text) {
      textResponse += part.text;
    }
  }

  if (!imageData) {
    throw new Error("GEMINI_IMAGE_EMPTY");
  }

  return {
    image: `data:${mimeType};base64,${imageData}`,
    text: textResponse,
  };
}
