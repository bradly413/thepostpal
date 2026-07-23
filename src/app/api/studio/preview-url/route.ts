import { requireAuthContext, type AuthContext } from "@/lib/api-auth";
import { rateLimit, buildRateLimitKey, RateLimitUnavailableError } from "@/lib/rate-limit";
import { assertUrlAllowed, readCappedBuffer, safeFetch, SsrfError } from "@/lib/safe-fetch";
import {
  extractImageCandidates,
  extractReadableText,
  parseOpenGraphHtml,
} from "@/lib/studio/open-graph";
import {
  parseShopifyProducts,
  readSiteIntel,
  searchGroundedIntel,
  type ShopifyPull,
} from "@/lib/studio/site-intel";
import { normalizeWebsiteUrl } from "@/lib/studio/page-url";

export const runtime = "nodejs";
export const maxDuration = 45; // HTML attempt + Shopify + search-grounded fallbacks

const MAX_HTML_BYTES = 1_000_000;
const TIMEOUT_MS = 12_000;

// Storefront bot walls (Shopify et al.) block obvious bots from datacenter
// IPs — a browser-realistic fingerprint gets the same HTML a customer sees.
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

/** Best-effort Shopify /products.json pull — null when not a Shopify store. */
async function tryShopifyProducts(pageUrl: string): Promise<ShopifyPull | null> {
  try {
    const origin = new URL(pageUrl).origin;
    const url = `${origin}/products.json?limit=6`;
    await assertUrlAllowed(url);
    const res = await safeFetch(
      url,
      { headers: { ...BROWSER_HEADERS, Accept: "application/json" } },
      { timeoutMs: 8_000, maxBytes: 400_000, maxRedirects: 2 },
    );
    if (!res.ok) return null;
    const buf = await readCappedBuffer(res, 400_000);
    return parseShopifyProducts(JSON.parse(buf.toString("utf8")));
  } catch {
    return null;
  }
}

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

  // Shopify fallback used whenever the HTML path yields nothing usable —
  // bot walls block datacenter IPs from pages, but the products API is open.
  const shopifyResponse = async (pageUrl: string): Promise<Response | null> => {
    const shop = await tryShopifyProducts(pageUrl);
    if (!shop) return null;
    const intel = await readSiteIntel({
      url: pageUrl,
      title: shop.title,
      description: shop.description,
      bodyText: shop.bodyText,
      images: shop.images,
    });
    let imageUrl: string | null = intel?.bestImageUrl ?? shop.images[0]?.url ?? null;
    if (imageUrl) {
      try {
        await assertUrlAllowed(imageUrl);
      } catch {
        imageUrl = null;
      }
    }
    let description = shop.description ?? "";
    if (intel && intel.facts.length > 0) {
      const factLine = `Key facts from the site: ${intel.facts.join("; ")}.`;
      description = description ? `${description} ${factLine}`.slice(0, 700) : factLine.slice(0, 700);
    }
    let host = "";
    try {
      host = new URL(pageUrl).hostname.replace(/^www\./, "");
    } catch {
      /* keep empty */
    }
    return Response.json({
      url: pageUrl,
      title: shop.title,
      description: description || null,
      imageUrl,
      siteName: intel?.brandName ?? host ?? null,
    });
  };

  // Hard-walled sites (Cloudflare challenges HTML *and* the products API):
  // web-search grounding still gets verifiable brand facts — the image stays
  // null and the Director's knowledge-mode handles aesthetics.
  const groundedResponse = async (pageUrl: string): Promise<Response | null> => {
    let host = "";
    try {
      host = new URL(pageUrl).hostname.replace(/^www\./, "");
    } catch {
      return null;
    }
    const intel = await searchGroundedIntel(host);
    if (!intel || intel.facts.length === 0) return null;
    return Response.json({
      url: pageUrl,
      title: intel.brandName ?? host,
      description: `Key facts from web search: ${intel.facts.join("; ")}.`.slice(0, 700),
      imageUrl: null,
      siteName: intel.brandName ?? host,
    });
  };

  try {
    const res = await safeFetch(
      normalized,
      { headers: BROWSER_HEADERS },
      { timeoutMs: TIMEOUT_MS, maxBytes: MAX_HTML_BYTES, maxRedirects: 3 },
    );

    if (!res.ok) {
      const viaShop = await shopifyResponse(normalized);
      if (viaShop) return viaShop;
      const viaSearch = await groundedResponse(normalized);
      if (viaSearch) return viaSearch;
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

    // No product-worthy image from the page (bot-walled HTML often parses but
    // is a challenge shell) → the Shopify products API usually still delivers.
    if (!meta.imageUrl || (!meta.title && !meta.description)) {
      const viaShop = await shopifyResponse(finalUrl);
      if (viaShop) return viaShop;
    }

    if (!meta.title && !meta.description && !meta.imageUrl) {
      const viaSearch = await groundedResponse(finalUrl);
      if (viaSearch) return viaSearch;
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
