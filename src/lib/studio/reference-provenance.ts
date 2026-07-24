export type StudioReferenceSource = "manual" | "direct" | "website" | "history";

/**
 * Website previews are automatic, turn-scoped references. A new website brief
 * replaces the previous website preview, while user-selected references remain
 * attached until the user removes them.
 */
export function shouldReplaceWebsiteReference(
  source: StudioReferenceSource | null,
  nextWebsiteUrl: string | null,
): boolean {
  return source === "website" && Boolean(nextWebsiteUrl);
}
