/**
 * Thin Resend HTTP client. No SDK dep — keeps the serverless bundle small.
 * Requires `RESEND_API_KEY`. Optional `EMAIL_FROM` (defaults to Resend's
 * onboarding sender, which can deliver to the Resend account owner's inbox
 * before a custom domain is verified).
 */

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

export type SendEmailResult =
  | { ok: true; id?: string }
  | { ok: false; skipped: true; error: string }
  | { ok: false; skipped?: false; error: string };

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, skipped: true, error: "RESEND_API_KEY not set" };
  }

  const from =
    process.env.EMAIL_FROM?.trim() || "Posterboy <onboarding@resend.dev>";
  const to = Array.isArray(input.to) ? input.to : [input.to];

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: input.subject,
        text: input.text,
        ...(input.html ? { html: input.html } : {}),
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
    });

    const body = (await res.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
      name?: string;
    };

    if (!res.ok) {
      return {
        ok: false,
        error: body.message || body.name || `Resend HTTP ${res.status}`,
      };
    }

    return { ok: true, id: body.id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "email send failed",
    };
  }
}
