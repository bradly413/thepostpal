import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/api-auth";
import { rateLimit, buildRateLimitKey, RateLimitUnavailableError } from "@/lib/rate-limit";

const LEONARDO_BASE = "https://cloud.leonardo.ai/api/rest/v1";

export async function POST(req: NextRequest) {
  let auth;
  try { auth = await requireAuthContext(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  try {
    if (!(await rateLimit(buildRateLimitKey("leonardo-upload", req.headers, auth), 10, 60_000))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return NextResponse.json({ error: "Rate limit unavailable" }, { status: 503 });
    }
    throw error;
  }

  const apiKey = process.env.LEONARDO_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "LEONARDO_API_KEY not configured" },
      { status: 500 }
    );
  }

  const { imageBase64 } = await req.json();

  if (!imageBase64 || typeof imageBase64 !== "string") {
    return NextResponse.json(
      { error: "imageBase64 is required" },
      { status: 400 }
    );
  }

  try {
    // Step 1: Request presigned URL from Leonardo
    const initRes = await fetch(`${LEONARDO_BASE}/init-image`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ extension: "png" }),
    });

    if (!initRes.ok) {
      const err = await initRes.text();
      console.error("Leonardo init-image error:", err);
      return NextResponse.json(
        { error: "Failed to initialize upload" },
        { status: initRes.status }
      );
    }

    const initData = await initRes.json();
    const { id: imageId, url: uploadUrl, fields: fieldsStr } =
      initData.uploadInitImage || initData;

    if (!imageId || !uploadUrl) {
      console.error("Leonardo init-image unexpected response:", initData);
      return NextResponse.json(
        { error: "Unexpected response from Leonardo" },
        { status: 500 }
      );
    }

    // Step 2: Upload the image binary to S3 via presigned URL
    const fields =
      typeof fieldsStr === "string" ? JSON.parse(fieldsStr) : fieldsStr;

    // Strip the data URI prefix to get raw base64
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, "base64");

    // Build multipart form data
    const formData = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      formData.append(key, value as string);
    }
    formData.append("file", new Blob([imageBuffer], { type: "image/png" }), "image.png");

    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
    });

    if (!uploadRes.ok && uploadRes.status !== 204) {
      const err = await uploadRes.text();
      console.error("S3 upload error:", uploadRes.status, err);
      return NextResponse.json(
        { error: "Failed to upload image" },
        { status: 500 }
      );
    }

    return NextResponse.json({ imageId });
  } catch (err) {
    console.error("Leonardo upload error:", err);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
