import { randomUUID } from "crypto";
import { getAllArticles, saveArticle, deleteArticle, CATEGORIES, type Category } from "@/lib/knowledge-store";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { requireAuthContext } from "@/lib/api-auth";

// Knowledge articles are scoped per tenant. Every handler requires an
// authenticated session and only ever touches its own tenant's articles.
async function tenant(): Promise<string | null> {
  try {
    return (await requireAuthContext()).tenantId;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const tenantId = await tenant();
  if (!tenantId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const ip = getClientIp(req.headers as unknown as Headers);
  if (!rateLimit(`knowledge-read:${ip}`, 30, 60_000)) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }
  const articles = getAllArticles(tenantId);
  return Response.json({ articles, categories: CATEGORIES });
}

export async function POST(req: Request) {
  const tenantId = await tenant();
  if (!tenantId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const ip = getClientIp(req.headers as unknown as Headers);
  if (!rateLimit(`knowledge-write:${ip}`, 10, 60_000)) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
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

  saveArticle(tenantId, article);
  return Response.json({ article }, { status: 201 });
}

export async function DELETE(req: Request) {
  const tenantId = await tenant();
  if (!tenantId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const ip = getClientIp(req.headers as unknown as Headers);
  if (!rateLimit(`knowledge-delete:${ip}`, 10, 60_000)) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
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
  const deleted = deleteArticle(tenantId, id);
  if (!deleted) {
    return Response.json({ error: "Article not found" }, { status: 404 });
  }
  return Response.json({ success: true });
}
