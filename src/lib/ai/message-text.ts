/**
 * Extract the assistant text from a raw Anthropic SDK message.
 *
 * Reasoning-capable models (claude-sonnet-5+) emit a `thinking` block BEFORE
 * the text block, so `content[0].text` silently reads "" — every raw-SDK call
 * site must use this instead of indexing content[0].
 */
export function extractMessageText(
  content: ReadonlyArray<{ type: string; text?: string }> | undefined | null,
): string {
  if (!content) return "";
  for (const block of content) {
    if (block.type === "text" && typeof block.text === "string") return block.text;
  }
  return "";
}
