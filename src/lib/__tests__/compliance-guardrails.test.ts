import { describe, expect, it } from "vitest";
import {
  checkViolations,
  guardrailsPromptBlock,
  resolveGuardrails,
  type ResolvedGuardrails,
  type VerticalGuardrailNode,
} from "@/lib/compliance/guardrails";

// These functions are the contract the live AI routes depend on
// (/api/ai chat, /api/ai/captions, /api/studio/elevate): resolve a tenant's
// effective guardrails, inject them into the system prompt, and post-validate
// generated text. The route wiring withholds `block`-level output and flags
// `warn`/`suggest`, so the primitives below must stay correct.

const guard = (over: Partial<ResolvedGuardrails> = {}): ResolvedGuardrails => ({
  bannedPhrases: [],
  preferredPhrases: [],
  enforcementLevel: "warn",
  regulatoryBodies: [],
  ...over,
});

describe("checkViolations", () => {
  it("flags a banned phrase case-insensitively", () => {
    const v = checkViolations("We GUARANTEE results", guard({ bannedPhrases: ["guarantee"] }));
    expect(v.map((x) => x.phrase)).toEqual(["guarantee"]);
  });

  it("respects word-ish boundaries so substrings don't match", () => {
    // "cure" must not match "manicure" / "secure"
    const v = checkViolations("book a manicure, feel secure", guard({ bannedPhrases: ["cure"] }));
    expect(v).toHaveLength(0);
  });

  it("returns empty when there are no banned phrases", () => {
    expect(checkViolations("anything goes", guard())).toHaveLength(0);
  });

  it("reports every occurrence of a banned phrase", () => {
    const v = checkViolations("risk-free and risk-free again", guard({ bannedPhrases: ["risk-free"] }));
    expect(v).toHaveLength(2);
  });
});

describe("guardrailsPromptBlock", () => {
  it("is empty when there are no phrases (no-op injection)", () => {
    expect(guardrailsPromptBlock(guard())).toBe("");
  });

  it("uses NEVER + a non-negotiable note at block level", () => {
    const block = guardrailsPromptBlock(
      guard({ bannedPhrases: ["guaranteed returns"], enforcementLevel: "block", regulatoryBodies: ["SEC"] }),
    );
    expect(block).toContain("NEVER use");
    expect(block).toContain("(SEC)");
    expect(block).toContain("non-negotiable");
  });

  it("uses Avoid (not NEVER) at warn level", () => {
    const block = guardrailsPromptBlock(guard({ bannedPhrases: ["best in town"], enforcementLevel: "warn" }));
    expect(block).toContain("Avoid");
    expect(block).not.toContain("NEVER use");
  });
});

describe("resolveGuardrails", () => {
  const node = (over: Partial<VerticalGuardrailNode>): VerticalGuardrailNode => ({
    slug: "x",
    name: "X",
    bannedPhrases: [],
    preferredPhrases: [],
    enforcementLevel: "suggest",
    ...over,
  });

  it("unions banned phrases up the parent chain and takes the strictest level", () => {
    const registry = new Map<string, VerticalGuardrailNode>([
      ["parent", node({ slug: "parent", bannedPhrases: ["cure"], enforcementLevel: "block", regulatoryBody: "FDA" })],
      ["leaf", node({ slug: "leaf", parentSlug: "parent", bannedPhrases: ["miracle"], preferredPhrases: ["support"], enforcementLevel: "warn" })],
    ]);
    const resolved = resolveGuardrails("leaf", registry);
    expect(new Set(resolved.bannedPhrases)).toEqual(new Set(["miracle", "cure"]));
    expect(resolved.preferredPhrases).toEqual(["support"]); // leaf vocabulary
    expect(resolved.enforcementLevel).toBe("block"); // strictest wins
    expect(resolved.regulatoryBodies).toEqual(["FDA"]);
  });

  it("is cycle-safe", () => {
    const registry = new Map<string, VerticalGuardrailNode>([
      ["a", node({ slug: "a", parentSlug: "b", bannedPhrases: ["x"] })],
      ["b", node({ slug: "b", parentSlug: "a", bannedPhrases: ["y"] })],
    ]);
    const resolved = resolveGuardrails("a", registry);
    expect(new Set(resolved.bannedPhrases)).toEqual(new Set(["x", "y"]));
  });
});
