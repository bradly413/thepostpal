import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/api-auth";
import { resolveAccess } from "@/lib/authz";
import { readBrandEngineImageContext } from "@/lib/brand-engine-dna";
import { withTenantDb } from "@/lib/db";
import { generateGeminiImage } from "@/lib/gemini-image";
import {
  buildAugmentedImagePrompt,
  formatLocationGeography,
} from "@/lib/image-prompt-augmentation";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { isInlineReferenceImage } from "@/lib/reference-image";

const PROMPT_MAX = 2000;
const DEFAULT_GEOGRAPHY = "Midwestern United States";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  if (!rateLimit(`images-generate:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const auth = await requireAuthContext();
    const body = (await req.json()) as Record<string, unknown>;
    const basePrompt = typeof body.basePrompt === "string" ? body.basePrompt.trim() : "";
    const locationId =
      typeof body.locationId === "string" && body.locationId.trim()
        ? body.locationId.trim()
        : null;
    const referenceImage =
      typeof body.referenceImage === "string" ? body.referenceImage : null;

    if (!basePrompt) {
      return NextResponse.json({ error: "basePrompt is required" }, { status: 400 });
    }

    if (basePrompt.length > PROMPT_MAX) {
      return NextResponse.json(
        { error: `Prompt too long (${PROMPT_MAX} char max)` },
        { status: 400 },
      );
    }

    if (
      referenceImage != null &&
      referenceImage !== "" &&
      !isInlineReferenceImage(referenceImage)
    ) {
      return NextResponse.json(
        { error: "referenceImage must be an inline data:image/*;base64 URL" },
        { status: 400 },
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
    }

    const context = await withTenantDb(auth, async (tx) => {
      const organization = await tx.organization.findUnique({
        where: { id: auth.tenantId },
        select: { brandEngine: true },
      });

      const memberships = await tx.locationMembership.findMany({
        where: {
          userId: auth.userId,
          location: { organizationId: auth.tenantId, status: { not: "ARCHIVED" } },
        },
        include: {
          location: {
            select: { id: true, city: true, state: true, country: true, createdAt: true },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      if (locationId != null) {
        const access = await resolveAccess(auth.userId, locationId, tx);
        if (!access.hasAccess) {
          return { forbidden: true as const };
        }
      }

      const target =
        locationId != null
          ? memberships.find((m) => m.location.id === locationId)?.location
          : memberships[0]?.location;

      const geography =
        (target && formatLocationGeography(target)) ?? DEFAULT_GEOGRAPHY;

      const brand = readBrandEngineImageContext(organization?.brandEngine ?? null);
      const augmentedPrompt = buildAugmentedImagePrompt(basePrompt, geography, brand);

      return { augmentedPrompt, forbidden: false as const };
    });

    if (context.forbidden) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { image, text } = await generateGeminiImage({
      prompt: context.augmentedPrompt,
      referenceImage,
      apiKey,
    });

    return NextResponse.json({
      success: true,
      image,
      imageUrl: image,
      text,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "GEMINI_IMAGE_EMPTY") {
        return NextResponse.json(
          { error: "No image was generated. Try a different prompt." },
          { status: 422 },
        );
      }
      if (error.message.startsWith("GEMINI_IMAGE_")) {
        return NextResponse.json({ error: "Image generation failed" }, { status: 502 });
      }
    }

    console.error("[IMAGE_GENERATE_ERROR]", error);
    return NextResponse.json({ error: "Failed to generate image" }, { status: 500 });
  }
}
