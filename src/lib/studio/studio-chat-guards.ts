/**
 * Pure guards for Studio chat turn lifecycle (debug hardening).
 */

export function canStartStudioChatTurn(args: {
  genState: "idle" | "generating" | "done";
  refImageLoading: boolean;
  composeInFlight: boolean;
  userText: string;
}): { ok: true } | { ok: false; reason: string } {
  const text = args.userText.trim();
  if (!text) return { ok: false, reason: "empty" };
  if (args.composeInFlight) return { ok: false, reason: "in_flight" };
  if (args.genState === "generating") return { ok: false, reason: "generating" };
  if (args.refImageLoading) return { ok: false, reason: "ref_loading" };
  return { ok: true };
}

/** Soft website warnings must not mark the assistant bubble as failed. */
export function isSoftStudioNotice(message: string): boolean {
  return /generating from your prompt instead/i.test(message);
}
