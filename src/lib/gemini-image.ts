export interface GeminiImageResult {
  image: string;
  text: string;
}

export async function generateGeminiImage(input: {
  prompt: string;
  referenceImage?: string | null;
  apiKey: string;
}): Promise<GeminiImageResult> {
  const parts: Record<string, unknown>[] = [];

  if (input.referenceImage && typeof input.referenceImage === "string") {
    const match = input.referenceImage.match(/^data:(.+?);base64,(.+)$/);
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
    text: input.referenceImage
      ? `Using the uploaded image as a reference, generate a new image based on this description: ${input.prompt}`
      : input.prompt,
  });

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent",
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
