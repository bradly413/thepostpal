import { afterEach, describe, expect, it, vi } from "vitest";

// Mock DNS so hostname-resolution cases are deterministic and offline.
const lookupMock = vi.fn();
vi.mock("node:dns/promises", () => ({
  lookup: (...args: unknown[]) => lookupMock(...args),
}));

import { assertUrlAllowed, SsrfError } from "../safe-fetch";

afterEach(() => {
  lookupMock.mockReset();
});

describe("assertUrlAllowed — scheme", () => {
  it.each(["file:///etc/passwd", "ftp://example.com/x", "gopher://x", "data:text/plain,hi"])(
    "rejects non-http(s) scheme: %s",
    async (url) => {
      await expect(assertUrlAllowed(url)).rejects.toBeInstanceOf(SsrfError);
    },
  );

  it("rejects a malformed URL", async () => {
    await expect(assertUrlAllowed("not a url")).rejects.toBeInstanceOf(SsrfError);
  });
});

describe("assertUrlAllowed — IP literals (no DNS)", () => {
  const blocked = [
    "http://127.0.0.1/",
    "http://127.5.6.7/",
    "http://169.254.169.254/latest/meta-data/", // cloud metadata
    "http://10.0.0.5/",
    "http://172.16.4.4/",
    "http://192.168.1.1/",
    "http://198.18.0.9/", // benchmarking / reserved
    "http://0.0.0.0/",
    "http://100.64.0.1/", // CGNAT
    "http://[::1]/", // v6 loopback
    "http://[fc00::1]/", // v6 unique-local
    "http://[fe80::1]/", // v6 link-local
    "http://[::ffff:127.0.0.1]/", // v4-mapped loopback
    "http://[::ffff:169.254.169.254]/", // v4-mapped metadata
  ];
  it.each(blocked)("blocks internal/reserved literal: %s", async (url) => {
    await expect(assertUrlAllowed(url)).rejects.toBeInstanceOf(SsrfError);
    expect(lookupMock).not.toHaveBeenCalled();
  });

  const allowed = ["http://8.8.8.8/", "https://1.1.1.1/", "http://[2606:4700:4700::1111]/"];
  it.each(allowed)("allows public literal: %s", async (url) => {
    await expect(assertUrlAllowed(url)).resolves.toBeUndefined();
    expect(lookupMock).not.toHaveBeenCalled();
  });
});

describe("assertUrlAllowed — hostname resolution", () => {
  it("allows a hostname that resolves to a public address", async () => {
    lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    await expect(assertUrlAllowed("https://example.com/photo.jpg")).resolves.toBeUndefined();
    expect(lookupMock).toHaveBeenCalledWith("example.com", { all: true });
  });

  it("blocks a hostname that resolves to a private address", async () => {
    lookupMock.mockResolvedValue([{ address: "10.0.0.9", family: 4 }]);
    await expect(assertUrlAllowed("https://evil.example/")).rejects.toBeInstanceOf(SsrfError);
  });

  it("blocks when ANY resolved address is internal (mixed records)", async () => {
    lookupMock.mockResolvedValue([
      { address: "93.184.216.34", family: 4 },
      { address: "169.254.169.254", family: 4 },
    ]);
    await expect(assertUrlAllowed("https://rebind.example/")).rejects.toBeInstanceOf(SsrfError);
  });

  it("blocks when the hostname does not resolve", async () => {
    lookupMock.mockRejectedValue(new Error("ENOTFOUND"));
    await expect(assertUrlAllowed("https://nope.invalid/")).rejects.toBeInstanceOf(SsrfError);
  });

  it("blocks a hostname resolving to a v4-mapped v6 internal address", async () => {
    lookupMock.mockResolvedValue([{ address: "::ffff:127.0.0.1", family: 6 }]);
    await expect(assertUrlAllowed("https://sneaky.example/")).rejects.toBeInstanceOf(SsrfError);
  });
});
