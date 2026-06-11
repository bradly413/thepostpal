import { randomUUID } from "crypto";
import {
  getAllArticles,
  saveArticle,
  deleteArticle,
  CATEGORIES,
  type Category,
  isKnowledgeStoreUnavailableError,
} from "@/lib/knowledge-store";
import {
  rateLimit,
  buildRateLimitKey,
  RateLimitUnavailableError,
} from "@/lib/rate-limit";
import { requireAuthContext, type AuthContext } from "@/lib/api-auth";

// Knowledge articles are scoped per tenant. Every handler requires an
// authenticated session and only ever touches its own tenant's articles.
async function tenant(): Promise<AuthContext | null> {
  try {
    return await requireAuthContext();
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const auth = await tenant();
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    if (!(await rateLimit(
      buildRateLimitKey("knowledge-read", req.headers as unknown as Headers, auth),
      30,
      60_000,
    ))) {
      return Response.json({ error: "Too many requests" }, { status: 429 });
    }
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return Response.json({ error: "Rate limit unavailable" }, { status: 503 });
    }
    throw error;
  }
  try {
    const articles = getAllArticles(auth.tenantId);
    return Response.json({ articles, categories: CATEGORIES });
  } catch (error) {
    if (isKnowledgeStoreUnavailableError(error)) {
      return Response.json({ error: "Knowledge storage unavailable" }, { status: 503 });
    }
    throw error;
  }
}

export async function POST(req: Request) {
  const auth = await tenant();
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    if (!(await rateLimit(
      buildRateLimitKey("knowledge-write", req.headers as unknown as Headers, auth),
      10,
      60_000,
    ))) {
      return Response.json({ error: "Too many requests" }, { status: 429 });
    }
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return Response.json({ error: "Rate limit unavailable" }, { status: 503 });
    }
    throw error;
  }

  let body: { title?: unknown; category?: unknown; content?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { title, category, content } = body;

  if (!title || typeof title !== "string" || !category || typeof category !== "string" || !content || typeof content !== "string") {
    return Response.json({ error: "Title, category, and content are required" }, { status: 400 });
  }

  if (!CATEGORIES.includes(category as Category)) {
    return Response.json({ error: "Invalid category" }, { status: 400 });
  }

  const article = {
    id: randomUUID(),
    title: title.trim().slice(0, 200),
    category: category as Category,
    content: content.trim().slice(0, 50000),
    createdAt: new Date().toISOString(),
  };

  try {
    saveArticle(auth.tenantId, article);
    return Response.json({ article }, { status: 201 });
  } catch (error) {
    if (isKnowledgeStoreUnavailableError(error)) {
      return Response.json({ error: "Knowledge storage unavailable" }, { status: 503 });
    }
    throw error;
  }
}

export async function DELETE(req: Request) {
  const auth = await tenant();
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    if (!(await rateLimit(
      buildRateLimitKey("knowledge-delete", req.headers as unknown as Headers, auth),
      10,
      60_000,
    ))) {
      return Response.json({ error: "Too many requests" }, { status: 429 });
    }
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return Response.json({ error: "Rate limit unavailable" }, { status: 503 });
    }
    throw error;
  }

  let body: { id?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { id } = body;
  if (!id || typeof id !== "string") {
    return Response.json({ error: "ID is required" }, { status: 400 });
  }
  try {
    const deleted = deleteArticle(auth.tenantId, id);
    if (!deleted) {
      return Response.json({ error: "Article not found" }, { status: 404 });
    }
    return Response.json({ success: true });
  } catch (error) {
    if (isKnowledgeStoreUnavailableError(error)) {
      return Response.json({ error: "Knowledge storage unavailable" }, { status: 503 });
    }
    throw error;
  }
}
