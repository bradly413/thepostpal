import { requireAuthContext, type AuthContext } from "@/lib/api-auth";
import { rateLimit, buildRateLimitKey, RateLimitUnavailableError } from "@/lib/rate-limit";
import { assertUrlAllowed, readCappedBuffer, safeFetch, SsrfError } from "@/lib/safe-fetch";
import {
  extractImageCandidates,
  extractReadableText,
  parseOpenGraphHtml,
} from "@/lib/studio/open-graph";
import { readSiteIntel } from "@/lib/studio/site-intel";
import { normalizeWebsiteUrl } from "@/lib/studio/page-url";

export const runtime = "nodejs";

const MAX_HTML_BYTES = 1_000_000;
const TIMEOUT_MS = 12_000;

/**
 * POST /api/studio/preview-url
 * SSRF-safe fetch of a public website → Open Graph title/description/image
 * so Studio can brand-match when a user pastes "socelle.com".
 *
 * Body: { url: string }
 * Returns: { url, title, description, imageUrl, siteName }
 */
export async function POST(req: Request) {
  let auth: AuthContext;
  try {
    auth = await requireAuthContext();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (
      !(await rateLimit(
        buildRateLimitKey("studio-preview-url", req.headers as unknown as Headers, auth),
        12,
        60_000,
      ))
    ) {
      return Response.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
    }
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return Response.json({ error: "Rate limit unavailable" }, { status: 503 });
    }
    throw error;
  }

  let body: { url?: string };
  try {
    body = (await req.json()) as { url?: string };
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const normalized = typeof body.url === "string" ? normalizeWebsiteUrl(body.url) : null;
  if (!normalized) {
    return Response.json({ error: "A valid website URL is required" }, { status: 400 });
  }

  try {
    await assertUrlAllowed(normalized);
  } catch (err) {
    if (err instanceof SsrfError) {
      return Response.json({ error: "Could not reach that website" }, { status: 400 });
    }
    throw err;
  }

  try {
    const res = await safeFetch(
      normalized,
      {
        headers: {
          "User-Agent": "PosterboySocial/1.0 (+https://www.posterboysocial.com)",
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        },
      },
      { timeoutMs: TIMEOUT_MS, maxBytes: MAX_HTML_BYTES, maxRedirects: 3 },
    );

    if (!res.ok) {
      return Response.json(
        { error: "Could not load that website", url: normalized },
        { status: 502 },
      );
    }

    const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
    if (
      contentType.length > 0 &&
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml") &&
      !contentType.includes("text/plain")
    ) {
      // Some sites return image/* for og — rare; still try if image URL itself
      if (contentType.startsWith("image/")) {
        return Response.json({
          url: normalized,
          title: null,
          description: null,
          imageUrl: normalized,
          siteName: null,
        });
      }
      return Response.json(
        { error: "That link is not a website page", url: normalized },
        { status: 422 },
      );
    }

    const buf = await readCappedBuffer(res, MAX_HTML_BYTES);
    const html = buf.toString("utf8");
    const finalUrl = res.url || normalized;
    const meta = parseOpenGraphHtml(html, finalUrl);

    if (meta.imageUrl) {
      try {
        await assertUrlAllowed(meta.imageUrl);
      } catch {
        meta.imageUrl = null;
      }
    }

    // Deep read (best-effort): page text + image candidates → Haiku picks the
    // image that actually shows the subject and extracts postable facts. On
    // any failure the plain OpenGraph result stands.
    const intel = await readSiteIntel({
      url: finalUrl,
      title: meta.title,
      description: meta.description,
      bodyText: extractReadableText(html),
      images: extractImageCandidates(html, finalUrl),
    });
    if (intel) {
      if (intel.bestImageUrl) {
        try {
          await assertUrlAllowed(intel.bestImageUrl);
          meta.imageUrl = intel.bestImageUrl;
        } catch {
          /* keep the og image */
        }
      }
      if (intel.facts.length > 0) {
        // Facts ride inside description so the existing client contract —
        // and enrichIntentWithSiteContext — carry them without changes.
        const factLine = `Key facts from the site: ${intel.facts.join("; ")}.`;
        meta.description = meta.description
          ? `${meta.description} ${factLine}`.slice(0, 700)
          : factLine.slice(0, 700);
      }
      if (intel.brandName && !meta.siteName) meta.siteName = intel.brandName;
    }

    if (!meta.title && !meta.description && !meta.imageUrl) {
      return Response.json(
        {
          error: "Could not read brand details from that site",
          url: finalUrl,
          title: null,
          description: null,
          imageUrl: null,
          siteName: null,
        },
        { status: 422 },
      );
    }

    return Response.json({
      url: finalUrl,
      title: meta.title,
      description: meta.description,
      imageUrl: meta.imageUrl,
      siteName: meta.siteName,
    });
  } catch (err) {
    if (err instanceof SsrfError) {
      return Response.json({ error: "Could not reach that website" }, { status: 400 });
    }
    console.error(
      "[api/studio/preview-url] failed:",
      err instanceof Error ? err.message : err,
    );
    return Response.json({ error: "Could not load that website" }, { status: 502 });
  }
}
