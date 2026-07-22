import { describe, expect, it, afterEach } from "vitest";
import { sendEmail } from "./send-email";

describe("sendEmail", () => {
  const prev = process.env.RESEND_API_KEY;

  afterEach(() => {
    if (prev === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = prev;
  });

  it("skips cleanly when RESEND_API_KEY is missing", async () => {
    delete process.env.RESEND_API_KEY;
    const result = await sendEmail({
      to: "brad@posterboysocial.com",
      subject: "test",
      text: "hello",
    });
    expect(result).toEqual({
      ok: false,
      skipped: true,
      error: "RESEND_API_KEY not set",
    });
  });
});
