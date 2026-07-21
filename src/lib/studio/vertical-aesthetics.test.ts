import { describe, expect, it } from "vitest";
import {
  inferStudioVertical,
  verticalAestheticBlock,
} from "@/lib/studio/vertical-aesthetics";

describe("vertical-aesthetics", () => {
  it("routes med spa / beauty to high-key clinical — not beige documentary", () => {
    expect(inferStudioVertical("create an image for Aurora Med Spa")).toBe("med_spa_beauty");
    expect(inferStudioVertical("lip filler patient portrait")).toBe("med_spa_beauty");
    const block = verticalAestheticBlock("Aurora Med Spa beauty");
    expect(block).toMatch(/high-key|ivory|seamless/i);
    expect(block).toMatch(/NEVER muted warm grey/i);
    expect(block).toMatch(/punchy clean color/i);
  });

  it("routes vibrant food to pop-art studio — not rustic café", () => {
    expect(inferStudioVertical("vibrant red smoothie on a red background")).toBe(
      "food_beverage_pop",
    );
    const block = verticalAestheticBlock("vibrant red smoothie");
    expect(block).toMatch(/color-block|Pop-Art|solid/i);
    expect(block).toMatch(/NEVER rustic|NEVER.*café|No table/i);
  });

  it("lets brief food win over spa business type", () => {
    expect(inferStudioVertical("red smoothie", "Medical Spa")).toBe("food_beverage_pop");
  });

  it("includes technical lens/light and anti-AI hints", () => {
    const block = verticalAestheticBlock("product bottle");
    expect(block).toMatch(/85mm|50mm|softbox|lens/i);
    expect(block).toMatch(/CGI|3D render|plastic skin/i);
  });
});
