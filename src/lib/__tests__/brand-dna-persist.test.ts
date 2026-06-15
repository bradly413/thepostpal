import { describe, expect, it } from "vitest";
import { voiceProfileFields, paletteToBrandColors } from "@/lib/brand-dna/persist";
import type { PaletteColor } from "@/lib/brand-dna/palette";

const palette = (hex: string, weight: number): PaletteColor => ({
  hex,
  rgb: { r: 0, g: 0, b: 0 },
  weight,
});

describe("voiceProfileFields", () => {
  it("splits the tone sentence into labels and maps the arrays", () => {
    const out = voiceProfileFields({
      tone: "Warm. Local. Honest.",
      pillars: ["food", "team"],
      weSay: ["come hungry"],
      weDontSay: ["world-class"],
    });
    expect(out.tone).toEqual(["Warm", "Local", "Honest"]);
    expect(out.preferredPhrases).toEqual(["come hungry"]);
    expect(out.bannedPhrases).toEqual(["world-class"]);
    expect(out.recurringThemes).toEqual(["food", "team"]);
  });

  it("handles a single-word / unpunctuated tone", () => {
    const out = voiceProfileFields({ tone: "Playful", pillars: [], weSay: [], weDontSay: [] });
    expect(out.tone).toEqual(["Playful"]);
  });
});

describe("paletteToBrandColors", () => {
  it("takes the top two colors as primary/secondary", () => {
    expect(paletteToBrandColors([palette("#ff0000", 0.6), palette("#0000ff", 0.4)])).toEqual({
      primaryColor: "#ff0000",
      secondaryColor: "#0000ff",
    });
  });

  it("returns nulls for an empty palette and null secondary for one color", () => {
    expect(paletteToBrandColors([])).toEqual({ primaryColor: null, secondaryColor: null });
    expect(paletteToBrandColors([palette("#abcdef", 1)])).toEqual({
      primaryColor: "#abcdef",
      secondaryColor: null,
    });
  });
});
