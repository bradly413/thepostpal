import { describe, expect, it } from "vitest";
import { computeGuardedChatPayload } from "@/lib/compliance/chat-response";
import type { ResolvedGuardrails } from "@/lib/compliance/guardrails";

// Covers the P1 chat-guardrail response shaping for POST /api/ai. The key
// contract: byte-for-byte legacy `{ message }` when there's nothing to flag, so
// existing clients are unaffected; withhold the text on a block-level violation;
// keep + flag on warn/suggest.

const guard = (over: Partial<ResolvedGuardrails> = {}): ResolvedGuardrails => ({
  bannedPhrases: [],
  preferredPhrases: [],
  enforcementLevel: "warn",
  regulatoryBodies: [],
  ...over,
});

describe("computeGuardedChatPayload", () => {
  it("passes text through unchanged when there are no guardrails", () => {
    expect(computeGuardedChatPayload("hello world", null)).toEqual({ message: "hello world" });
  });

  it("passes text through unchanged when nothing is violated", () => {
    const g = guard({ bannedPhrases: ["guarantee"], enforcementLevel: "block" });
    expect(computeGuardedChatPayload("a clean caption", g)).toEqual({ message: "a clean caption" });
  });

  it("withholds the text and returns a compliance payload at block level", () => {
    const g = guard({
      bannedPhrases: ["guaranteed returns"],
      enforcementLevel: "block",
      regulatoryBodies: ["SEC", "FINRA"],
    });
    const out = computeGuardedChatPayload("we promise guaranteed returns", g);
    expect(out.message).toBe(""); // restricted text withheld
    expect(out.compliance).toMatchObject({
      blocked: true,
      level: "block",
      flaggedPhrases: ["guaranteed returns"],
    });
    expect(out.compliance && "message" in out.compliance && out.compliance.message).toContain(
      "(SEC, FINRA)",
    );
  });

  it("keeps the text and attaches an additive flag at warn level", () => {
    const g = guard({ bannedPhrases: ["best in town"], enforcementLevel: "warn" });
    const out = computeGuardedChatPayload("we are the best in town", g);
    expect(out.message).toBe("we are the best in town"); // text preserved
    expect(out.compliance).toEqual({ level: "warn", flaggedPhrases: ["best in town"] });
  });

  it("dedupes repeated flagged phrases", () => {
    const g = guard({ bannedPhrases: ["miracle"], enforcementLevel: "suggest" });
    const out = computeGuardedChatPayload("a miracle, truly a miracle", g);
    expect(out.compliance).toEqual({ level: "suggest", flaggedPhrases: ["miracle"] });
  });

  it("omits the regulatory parenthetical when there are no bodies", () => {
    const g = guard({ bannedPhrases: ["cure"], enforcementLevel: "block" });
    const out = computeGuardedChatPayload("this will cure you", g);
    const msg = out.compliance && "message" in out.compliance ? out.compliance.message : "";
    expect(msg).not.toContain("()");
    expect(msg).toContain("compliance guardrails.");
  });
});
