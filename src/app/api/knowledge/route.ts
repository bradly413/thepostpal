import { randomUUID } from "crypto";
import { getAllArticles, saveArticle, deleteArticle, CATEGORIES, type Category } from "@/lib/knowledge-store";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const ip = getClientIp(req.headers as unknown as Headers);
  if (!rateLimit(`knowledge-read:${ip}`, 30, 60_000)) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }
  const articles = getAllArticles();
  return Response.json({ articles, categories: CATEGORIES });
}

export async function POST(req: Request) {
  const ip = getClientIp(req.headers as unknown as Headers);
  if (!rateLimit(`knowledge-write:${ip}`, 10, 60_000)) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  const { title, category, content } = await req.json();

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

  saveArticle(article);
  return Response.json({ article }, { status: 201 });
}

export async function DELETE(req: Request) {
  const ip = getClientIp(req.headers as unknown as Headers);
  if (!rateLimit(`knowledge-delete:${ip}`, 10, 60_000)) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  const { id } = await req.json();
  if (!id || typeof id !== "string") {
    return Response.json({ error: "ID is required" }, { status: 400 });
  }
  const deleted = deleteArticle(id);
  if (!deleted) {
    return Response.json({ error: "Article not found" }, { status: 404 });
  }
  return Response.json({ success: true });
}
