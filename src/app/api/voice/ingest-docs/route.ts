import { NextRequest, NextResponse } from "next/server";
import { requireAuthContext, type AuthContext } from "@/lib/api-auth";
import { withTenantDb } from "@/lib/db";
import { resolveAccess } from "@/lib/authz";
import { rateLimit, buildRateLimitKey, RateLimitUnavailableError } from "@/lib/rate-limit";
import { loadBrandBookForLocation, saveBrandBookForLocation } from "@/lib/brand-book-db";
import { extractVoiceFromDocs } from "@/lib/voice-from-docs";
import type { BrandBook } from "@/lib/brand-book-schema";

export const runtime = "nodejs";

// POST /api/voice/ingest-docs
//   body: { locationId, text }
//   Extract the real voice from the user's own written material and merge it,
//   non-destructively, into their existing brand book — sharpening every
//   generator that reads ai-brand-context. (Option A: augment the brand book;
//   no new store, no migration, no Brand-DNA-engine coupling.)
export async function POST(req: NextRequest) {
  let auth: AuthContext;
  try {
    auth = await requireAuthContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!(await rateLimit(buildRateLimitKey("ingest-docs", req.headers, auth), 12, 60 * 60_000))) {
      return NextResponse.json({ error: "Too many imports for now. Try again later." }, { status: 429 });
    }
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return NextResponse.json({ error: "Rate limit unavailable" }, { status: 503 });
    }
    throw error;
  }

  let body: { locationId?: string; text?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const locationId = typeof body.locationId === "string" ? body.locationId : "";
  const text = typeof body.text === "string" ? body.text : "";
  if (!locationId) return NextResponse.json({ error: "locationId is required" }, { status: 400 });
  if (text.trim().length < 40) {
    return NextResponse.json({ error: "Paste a bit more — a few sentences of your real writing." }, { status: 400 });
  }

  try {
    // 1. Access + load existing book — SHORT tx (AI call must be outside it).
    const pre = await withTenantDb(auth, async (tx) => {
      const access = await resolveAccess(auth.userId, locationId, tx);
      if (!access.hasAccess) return { forbidden: true as const };
      const { brandBook } = await loadBrandBookForLocation(tx, auth.tenantId, locationId);
      return { forbidden: false as const, brandBook };
    });
    if (pre.forbidden) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!pre.brandBook) {
      return NextResponse.json(
        { error: "Finish brand setup first — then import your writing to sharpen it." },
        { status: 409 },
      );
    }

    // 2. Extract (no tx).
    const extracted = await extractVoiceFromDocs(text);
    if (!extracted) {
      return NextResponse.json({ error: "Couldn't read a clear voice from that. Try more text." }, { status: 422 });
    }

    // 3. Non-destructive merge into the brand book voice.
    const book = pre.brandBook;
    const dedupe = (existing: string[], add: string[], cap: number): string[] => {
      const seen = new Set(existing.map((s) => s.toLowerCase().trim()));
      const merged = [...existing];
      for (const a of add) {
        const k = a.toLowerCase().trim();
        if (k && !seen.has(k)) {
          seen.add(k);
          merged.push(a);
        }
      }
      return merged.slice(0, cap);
    };

    const before = {
      weSay: book.voice?.weSay?.length ?? 0,
      weDontSay: book.voice?.weDontSay?.length ?? 0,
      pillars: book.pillars?.length ?? 0,
    };

    const merged: BrandBook = {
      ...book,
      identity: {
        ...book.identity,
        target: book.identity?.target?.trim() || extracted.audience || book.identity?.target,
      },
      voice: {
        ...book.voice,
        hero: book.voice?.hero?.trim() || extracted.hero || book.voice?.hero,
        weSay: dedupe(book.voice?.weSay ?? [], extracted.weSay, 12),
        weDontSay: dedupe(book.voice?.weDontSay ?? [], extracted.weDontSay, 10),
        traits:
          book.voice?.traits?.length
            ? book.voice.traits
            : extracted.tone.slice(0, 4).map((name) => ({ name, description: "" })),
      },
      pillars: (() => {
        const existing = book.pillars ?? [];
        const names = new Set(existing.map((p) => p.name.toLowerCase().trim()));
        const additions = extracted.topics
          .filter((t) => !names.has(t.toLowerCase().trim()))
          .map((name) => ({ name, description: "", frequency: "weekly" as const }));
        return [...existing, ...additions].slice(0, 8);
      })(),
    };

    // 4. Persist — SHORT tx.
    await withTenantDb(auth, (tx) => saveBrandBookForLocation(tx, auth.tenantId, locationId, { brandBook: merged }));

    return NextResponse.json({
      ok: true,
      learned: {
        phrases: merged.voice.weSay.length - before.weSay,
        avoid: merged.voice.weDontSay.length - before.weDontSay,
        topics: merged.pillars.length - before.pillars,
        tone: extracted.tone,
        hero: extracted.hero,
      },
    });
  } catch (err) {
    console.error("[api/voice/ingest-docs] failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Couldn't import your writing. Try again." }, { status: 500 });
  }
}
