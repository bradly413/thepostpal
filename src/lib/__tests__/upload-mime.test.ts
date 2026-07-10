import { describe, expect, it } from "vitest";
import {
  inferMediaContentType,
  isUploadableMediaFile,
} from "@/lib/upload-mime";

describe("upload-mime", () => {
  it("keeps explicit image and video MIME types", () => {
    expect(inferMediaContentType("photo.jpg", "image/jpeg")).toBe("image/jpeg");
    expect(inferMediaContentType("clip.mov", "video/quicktime")).toBe("video/quicktime");
  });

  it("infers type from extension when MIME is empty or octet-stream", () => {
    expect(inferMediaContentType("Screenshot 2026-07-10.png", "")).toBe("image/png");
    expect(inferMediaContentType("scan.JPG", "application/octet-stream")).toBe("image/jpeg");
    expect(inferMediaContentType("reel.mov", "")).toBe("video/quicktime");
  });

  it("recognizes uploadable files for client-side gating", () => {
    expect(
      isUploadableMediaFile({
        name: "Screen Shot.png",
        type: "",
      } as File),
    ).toBe(true);
    expect(
      isUploadableMediaFile({
        name: "notes.txt",
        type: "text/plain",
      } as File),
    ).toBe(false);
  });
});
