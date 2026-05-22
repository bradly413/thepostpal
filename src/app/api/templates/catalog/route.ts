import { loadTemplateCatalog } from "@/lib/template-catalog";

export async function GET() {
  try {
    const templates = await loadTemplateCatalog();
    return Response.json({
      templates,
      count: templates.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load template catalog.";
    return Response.json(
      { error: message },
      { status: 500 }
    );
  }
}

