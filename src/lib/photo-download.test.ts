import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  convertPhotoToDownloadPng,
  photoDownloadFilename,
} from "./photo-download";

describe("photo download", () => {
  it("builds a safe PNG filename from Library copy", () => {
    expect(
      photoDownloadFilename(
        "Mercy Recruiting flyer — July 2026.jpg",
        "photo-1234567890",
      ),
    ).toBe("Mercy-Recruiting-flyer-July-2026.png");
    expect(photoDownloadFilename("", "photo-1234567890")).toBe(
      "posterboy-photo-123456.png",
    );
  });

  it("converts image bytes to PNG without changing normal dimensions", async () => {
    const input = await sharp({
      create: {
        width: 40,
        height: 50,
        channels: 3,
        background: "#17325a",
      },
    })
      .jpeg()
      .toBuffer();

    const png = await convertPhotoToDownloadPng(input);
    const metadata = await sharp(png).metadata();

    expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(metadata.format).toBe("png");
    expect(metadata.width).toBe(40);
    expect(metadata.height).toBe(50);
  });
});
