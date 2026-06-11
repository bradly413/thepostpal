import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * SSRF-safe server-side fetch.
 *
 * When the server fetches a URL that an authenticated (or anonymous) user
 * supplied, a naive `fetch(userUrl)` lets the caller point us at internal
 * services — cloud metadata (169.254.169.254), loopback, or RFC1918 hosts —
 * and read the response or infer state from timing/errors. This guard:
 *
 *   - rejects non-http(s) schemes,
 *   - resolves the hostname and blocks private / loopback / link-local /
 *     reserved IP ranges (v4 and v6, including IPv4-mapped v6),
 *   - follows redirects manually (`redirect: "manual"`) and re-validates every
 *     hop so a public URL can't 30x us onto an internal one,
 *   - caps total time and response size.
 *
 * Residual caveat: there is a small TOCTOU window between DNS validation and
 * the actual connection (DNS rebinding). For our use — fetching user photos —
 * the dominant risk is the obvious "point at 169.254/localhost" case, which
 * this closes. Pinning the validated IP at the socket layer (custom undici
 * dispatcher) would close the rebinding window too, if we ever need it.
 */

export class SsrfError extends Error {
  constructor(message: string) {
    // Prefix matches the route-level "could not fetch image" handling so a
    // blocked address surfaces as the same graceful 502 as any unreachable
    // photo — and never reveals *which* internal address was blocked.
    super(`Could not fetch image (${message})`);
    this.name = "SsrfError";
  }
}

const DEFAULTS = {
  maxBytes: 10 * 1024 * 1024, // 10 MB
  timeoutMs: 10_000,
  maxRedirects: 3,
};

export interface SafeFetchOptions {
  maxBytes?: number;
  timeoutMs?: number;
  maxRedirects?: number;
}

function ipv4ToInt(ip: string): number {
  const parts = ip.split(".");
  if (parts.length !== 4) return -1;
  let int = 0;
  for (const part of parts) {
    const n = Number(part);
    if (!Number.isInteger(n) || n < 0 || n > 255) return -1;
    int = (int << 8) + n;
  }
  return int >>> 0;
}

function inV4Cidr(ipInt: number, base: string, bits: number): boolean {
  const baseInt = ipv4ToInt(base);
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipInt & mask) >>> 0 === (baseInt & mask) >>> 0;
}

/** RFC1918, loopback, link-local (incl. cloud metadata), CGNAT, reserved, etc. */
function isBlockedV4(ip: string): boolean {
  const ipInt = ipv4ToInt(ip);
  if (ipInt < 0) return true; // unparseable → block
  return (
    inV4Cidr(ipInt, "0.0.0.0", 8) || // "this" network
    inV4Cidr(ipInt, "10.0.0.0", 8) || // private
    inV4Cidr(ipInt, "100.64.0.0", 10) || // CGNAT
    inV4Cidr(ipInt, "127.0.0.0", 8) || // loopback
    inV4Cidr(ipInt, "169.254.0.0", 16) || // link-local (169.254.169.254 metadata)
    inV4Cidr(ipInt, "172.16.0.0", 12) || // private
    inV4Cidr(ipInt, "192.0.0.0", 24) || // IETF protocol assignments
    inV4Cidr(ipInt, "192.0.2.0", 24) || // TEST-NET-1
    inV4Cidr(ipInt, "192.168.0.0", 16) || // private
    inV4Cidr(ipInt, "198.18.0.0", 15) || // benchmarking
    inV4Cidr(ipInt, "198.51.100.0", 24) || // TEST-NET-2
    inV4Cidr(ipInt, "203.0.113.0", 24) || // TEST-NET-3
    inV4Cidr(ipInt, "224.0.0.0", 4) || // multicast
    inV4Cidr(ipInt, "240.0.0.0", 4) // reserved + 255.255.255.255
  );
}

/** Expand an IPv6 address (compressed or with embedded v4) to 16 bytes. */
function ipv6ToBytes(ip: string): number[] | null {
  const addr = ip.split("%")[0]; // strip zone id
  const halves = addr.split("::");
  if (halves.length > 2) return null;

  const parseGroups = (s: string): number[] | null => {
    if (!s) return [];
    const groups: number[] = [];
    for (const part of s.split(":")) {
      if (part.includes(".")) {
        const v4 = part.split(".").map(Number);
        if (v4.length !== 4 || v4.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
          return null;
        }
        groups.push((v4[0] << 8) | v4[1]);
        groups.push((v4[2] << 8) | v4[3]);
      } else {
        const n = parseInt(part, 16);
        if (!Number.isInteger(n) || n < 0 || n > 0xffff || !/^[0-9a-f]{1,4}$/i.test(part)) {
          return null;
        }
        groups.push(n);
      }
    }
    return groups;
  };

  const head = parseGroups(halves[0]);
  const tail = halves.length === 2 ? parseGroups(halves[1]) : [];
  if (head === null || tail === null) return null;

  let groups: number[];
  if (halves.length === 2) {
    const missing = 8 - (head.length + tail.length);
    if (missing < 0) return null;
    groups = [...head, ...Array(missing).fill(0), ...tail];
  } else {
    groups = head;
  }
  if (groups.length !== 8) return null;

  const bytes: number[] = [];
  for (const g of groups) {
    bytes.push((g >> 8) & 0xff, g & 0xff);
  }
  return bytes;
}

function isBlockedV6(ip: string): boolean {
  const bytes = ipv6ToBytes(ip);
  if (!bytes) return true; // unparseable → block

  // ::ffff:a.b.c.d — IPv4-mapped: unwrap and apply the v4 rules.
  const isV4Mapped =
    bytes.slice(0, 10).every((b) => b === 0) && bytes[10] === 0xff && bytes[11] === 0xff;
  if (isV4Mapped) {
    return isBlockedV4(bytes.slice(12).join("."));
  }

  const allZero = bytes.every((b) => b === 0);
  if (allZero) return true; // :: unspecified
  if (bytes.slice(0, 15).every((b) => b === 0) && bytes[15] === 1) return true; // ::1 loopback
  if ((bytes[0] & 0xfe) === 0xfc) return true; // fc00::/7 unique-local
  if (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80) return true; // fe80::/10 link-local
  if (bytes[0] === 0xff) return true; // ff00::/8 multicast

  return false;
}

function isBlockedAddress(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) return isBlockedV4(ip);
  if (kind === 6) return isBlockedV6(ip);
  return true; // not a recognizable IP → block
}

/**
 * Validate a URL for server-side fetching: http(s) only, and every resolved
 * address must be a public, routable host. Throws {@link SsrfError} otherwise.
 */
export async function assertUrlAllowed(rawUrl: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SsrfError("invalid URL");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SsrfError("unsupported scheme");
  }

  // URL.hostname keeps the brackets around IPv6 literals ("[::1]"); strip them
  // so isIP() recognizes the address.
  const host = url.hostname.replace(/^\[|\]$/g, "");

  // Hostname is already a literal IP — validate directly, no DNS.
  if (isIP(host)) {
    if (isBlockedAddress(host)) throw new SsrfError("blocked address");
    return;
  }

  let records: { address: string }[];
  try {
    records = await lookup(host, { all: true });
  } catch {
    throw new SsrfError("host did not resolve");
  }

  if (records.length === 0) throw new SsrfError("host did not resolve");

  // Block if ANY resolved address is internal (defends against a hostname that
  // returns one public and one private record).
  for (const { address } of records) {
    if (isBlockedAddress(address)) throw new SsrfError("blocked address");
  }
}

/** Read a response body into a Buffer, aborting if it exceeds `maxBytes`. */
export async function readCappedBuffer(res: Response, maxBytes: number): Promise<Buffer> {
  const declared = res.headers.get("content-length");
  if (declared && Number(declared) > maxBytes) {
    throw new SsrfError("response too large");
  }

  if (!res.body) {
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > maxBytes) throw new SsrfError("response too large");
    return buf;
  }

  const reader = res.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new SsrfError("response too large");
      }
      chunks.push(Buffer.from(value));
    }
  }
  return Buffer.concat(chunks);
}

/**
 * Fetch a user-supplied URL with SSRF protection: validates the target (and
 * every redirect hop) against {@link assertUrlAllowed}, follows redirects
 * manually, and enforces a timeout. The returned Response's body has NOT been
 * size-checked — read it with {@link readCappedBuffer}.
 */
export async function safeFetch(
  rawUrl: string,
  init: RequestInit = {},
  options: SafeFetchOptions = {},
): Promise<Response> {
  const { timeoutMs, maxRedirects } = { ...DEFAULTS, ...options };

  let currentUrl = rawUrl;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    await assertUrlAllowed(currentUrl);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch(currentUrl, { ...init, redirect: "manual", signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }

    // Manual redirect handling so each hop is re-validated.
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return res; // 3xx without Location — hand back as-is
      // Drain the redirect body so the connection can be reused/closed.
      await res.body?.cancel().catch(() => {});
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    return res;
  }

  throw new SsrfError("too many redirects");
}
