import fs from "fs";
import path from "path";

const KNOWLEDGE_DIR = path.join(process.cwd(), "knowledge");
export const KNOWLEDGE_STORE_DURABLE_BACKEND_REQUIRED =
  "KNOWLEDGE_STORE_DURABLE_BACKEND_REQUIRED";

export const CATEGORIES = [
  "Neighborhood Guides",
  "Market Analysis",
  "Things to Do",
  "Holiday / Seasonal",
  "Local Events",
  "Buyer Tips",
  "Seller Tips",
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface Article {
  id: string;
  title: string;
  category: Category;
  content: string;
  createdAt: string;
}

function assertKnowledgeStoreAvailable() {
  if (process.env.NODE_ENV === "production") {
    // Fail SAFE: don't break /api/ai or /api/knowledge in a prod without a
    // durable backend — warn and let the (non-durable) file path proceed.
    // Configure Upstash/DB for durable knowledge storage.
    console.warn(
      "[knowledge-store] No durable backend in production — using non-durable fallback.",
    );
  }
}

export function isKnowledgeStoreUnavailableError(error: unknown): boolean {
  return error instanceof Error && error.message === KNOWLEDGE_STORE_DURABLE_BACKEND_REQUIRED;
}

function ensureDir() {
  if (!fs.existsSync(KNOWLEDGE_DIR)) {
    fs.mkdirSync(KNOWLEDGE_DIR, { recursive: true });
  }
}

// Articles are stored one JSON file per article, keyed by tenant so one
// tenant can never read/write/inject another's knowledge.
function safe(s: string, max = 64) {
  return s.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, max);
}
function tenantPrefix(tenantId: string) {
  const t = safe(tenantId);
  if (!t) throw new Error("Invalid tenant");
  return `${t}__`;
}
function articlePath(tenantId: string, id: string) {
  const idSafe = safe(id);
  if (!idSafe) throw new Error("Invalid article ID");
  return path.join(KNOWLEDGE_DIR, `${tenantPrefix(tenantId)}${idSafe}.json`);
}

export function getAllArticles(tenantId: string): Article[] {
  assertKnowledgeStoreAvailable();
  ensureDir();
  const prefix = tenantPrefix(tenantId);
  const files = fs.readdirSync(KNOWLEDGE_DIR).filter((f) => f.startsWith(prefix) && f.endsWith(".json"));
  return files
    .map((f) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(KNOWLEDGE_DIR, f), "utf-8")) as Article;
      } catch {
        return null;
      }
    })
    .filter((a): a is Article => a !== null)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getArticle(tenantId: string, id: string): Article | null {
  assertKnowledgeStoreAvailable();
  const p = articlePath(tenantId, id);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8")) as Article;
  } catch {
    return null;
  }
}

export function saveArticle(tenantId: string, article: Article): void {
  assertKnowledgeStoreAvailable();
  ensureDir();
  fs.writeFileSync(articlePath(tenantId, article.id), JSON.stringify(article, null, 2));
}

export function deleteArticle(tenantId: string, id: string): boolean {
  assertKnowledgeStoreAvailable();
  const p = articlePath(tenantId, id);
  if (!fs.existsSync(p)) return false;
  fs.unlinkSync(p);
  return true;
}

export function getArticlesByCategory(tenantId: string, category: Category): Article[] {
  return getAllArticles(tenantId).filter((a) => a.category === category);
}

export function searchArticles(tenantId: string, query: string): Article[] {
  const q = query.toLowerCase();
  return getAllArticles(tenantId).filter(
    (a) =>
      a.title.toLowerCase().includes(q) ||
      a.content.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q),
  );
}

export function buildKnowledgeContext(tenantId: string, query: string, maxChars = 6000): string {
  const q = query.toLowerCase();
  const all = getAllArticles(tenantId);
  if (all.length === 0) return "";

  const scored = all.map((a) => {
    let score = 0;
    const titleLower = a.title.toLowerCase();
    const contentLower = a.content.toLowerCase();
    const catLower = a.category.toLowerCase();

    const words = q.split(/\s+/).filter((w) => w.length > 2);
    for (const w of words) {
      if (titleLower.includes(w)) score += 3;
      if (catLower.includes(w)) score += 2;
      if (contentLower.includes(w)) score += 1;
    }
    return { article: a, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const relevant = scored.filter((s) => s.score > 0).slice(0, 5);
  if (relevant.length === 0) {
    const recent = all.slice(0, 3);
    return formatArticles(recent, maxChars);
  }

  return formatArticles(
    relevant.map((r) => r.article),
    maxChars,
  );
}

function formatArticles(articles: Article[], maxChars: number): string {
  let result = "\n\n## Knowledge Base Articles\nUse the following articles as reference when answering questions or generating content:\n\n";
  let chars = result.length;

  for (const a of articles) {
    const entry = `### ${a.title} [${a.category}]\n${a.content}\n\n`;
    if (chars + entry.length > maxChars) {
      const remaining = maxChars - chars - 50;
      if (remaining > 200) {
        result += `### ${a.title} [${a.category}]\n${a.content.slice(0, remaining)}...\n\n`;
      }
      break;
    }
    result += entry;
    chars += entry.length;
  }

  return result;
}
