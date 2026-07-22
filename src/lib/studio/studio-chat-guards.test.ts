import { describe, expect, it } from "vitest";
import { canStartStudioChatTurn, isSoftStudioNotice } from "./studio-chat-guards";

describe("canStartStudioChatTurn", () => {
  it("allows a normal idle submit", () => {
    expect(
      canStartStudioChatTurn({
        genState: "idle",
        refImageLoading: false,
        composeInFlight: false,
        userText: "make a post about coffee",
      }),
    ).toEqual({ ok: true });
  });

  it("blocks while generating or in-flight", () => {
    expect(
      canStartStudioChatTurn({
        genState: "generating",
        refImageLoading: false,
        composeInFlight: false,
        userText: "again",
      }).ok,
    ).toBe(false);
    expect(
      canStartStudioChatTurn({
        genState: "done",
        refImageLoading: false,
        composeInFlight: true,
        userText: "again",
      }).ok,
    ).toBe(false);
  });

  it("blocks while website/ref upload is loading", () => {
    expect(
      canStartStudioChatTurn({
        genState: "idle",
        refImageLoading: true,
        composeInFlight: false,
        userText: "socelle.com",
      }).ok,
    ).toBe(false);
  });
});

describe("isSoftStudioNotice", () => {
  it("detects website soft-fail copy", () => {
    expect(
      isSoftStudioNotice("Could not read that website. Generating from your prompt instead."),
    ).toBe(true);
    expect(isSoftStudioNotice("Generation failed")).toBe(false);
  });
});
