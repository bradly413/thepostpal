import { beforeEach, describe, expect, it } from "vitest";
import {
  STUDIO_SCHEDULE_HANDOFF_KEY,
  takeStudioScheduleHandoff,
  writeStudioScheduleHandoff,
} from "./schedule-handoff";

function createSessionStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}

describe("studio schedule handoff", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: createSessionStorage(),
    });
  });

  it("round-trips an ordered multi-image queue once", () => {
    writeStudioScheduleHandoff({
      mediaUrl: "https://media.example.com/one.png",
      mediaType: "image",
      format: "single",
      queue: [
        {
          mediaUrl: "https://media.example.com/one.png",
          mediaType: "image",
        },
        {
          mediaUrl: "https://media.example.com/two.png",
          mediaType: "image",
        },
      ],
    });

    expect(takeStudioScheduleHandoff()?.queue).toEqual([
      {
        mediaUrl: "https://media.example.com/one.png",
        mediaType: "image",
      },
      {
        mediaUrl: "https://media.example.com/two.png",
        mediaType: "image",
      },
    ]);
    expect(takeStudioScheduleHandoff()).toBeNull();
  });

  it("drops malformed queue items without rejecting a valid single handoff", () => {
    sessionStorage.setItem(
      STUDIO_SCHEDULE_HANDOFF_KEY,
      JSON.stringify({
        mediaUrl: "https://media.example.com/primary.png",
        mediaType: "image",
        queue: [
          { mediaUrl: "", mediaType: "image" },
          { mediaUrl: "https://media.example.com/wrong.png", mediaType: "audio" },
          { mediaUrl: "https://media.example.com/valid.png", mediaType: "image" },
        ],
      }),
    );

    expect(takeStudioScheduleHandoff()?.queue).toEqual([
      {
        mediaUrl: "https://media.example.com/valid.png",
        mediaType: "image",
      },
    ]);
  });
});
