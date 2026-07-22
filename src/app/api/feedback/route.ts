import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import { getSessionData } from "@/lib/auth";
import { requireSuperadminContext } from "@/lib/api-auth";
import { handleRouteError } from "@/lib/route-errors";
import { sendEmail } from "@/lib/send-email";

const KEY = "beta-feedback";
const DEFAULT_NOTIFY_TO = "brad@posterboysocial.com";

// Reading or deleting beta feedback is superadmin-only.
// Submitting (POST) stays open so the in-app feedback widget works for any tester.
export async function GET() {
  try {
    await requireSuperadminContext();
    const redis = getRedis();
    if (!redis) return NextResponse.json({ items: [] });
    const items = (await redis.lrange(KEY, 0, -1)) || [];
    return NextResponse.json({ items });
  } catch (err) {
    return handleRouteError("api.feedback.GET", err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, message, page } = body;
    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const session = await getSessionData();
    const feedbackType = String(type || "other").slice(0, 40);
    const feedbackPage = String(page || "/").slice(0, 500);
    const feedbackMessage = String(message).trim().slice(0, 5000);
    const fromUser =
      session?.email ||
      [session?.firstName, session?.lastName].filter(Boolean).join(" ") ||
      session?.sub ||
      "anonymous";

    const item = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      type: feedbackType,
      message: feedbackMessage,
      page: feedbackPage,
      timestamp: Date.now(),
      userEmail: session?.email || null,
      userId: session?.sub || null,
    };

    const redis = getRedis();
    // Upstash is optional (graceful degrade): accept without persisting rather
    // than 500-ing the widget when no store is configured.
    let stored = false;
    if (redis) {
      await redis.lpush(KEY, JSON.stringify(item));
      stored = true;
    }

    const notifyTo =
      process.env.FEEDBACK_NOTIFY_EMAIL?.trim() || DEFAULT_NOTIFY_TO;
    const when = new Date(item.timestamp).toISOString();
    const emailResult = await sendEmail({
      to: notifyTo,
      subject: `[Posterboy feedback] ${feedbackType} — ${feedbackPage}`,
      replyTo: session?.email || undefined,
      text: [
        `Type: ${feedbackType}`,
        `Page: ${feedbackPage}`,
        `From: ${fromUser}`,
        `When: ${when}`,
        `Id: ${item.id}`,
        "",
        feedbackMessage,
      ].join("\n"),
      html: `
        <p><strong>Type:</strong> ${escapeHtml(feedbackType)}</p>
        <p><strong>Page:</strong> ${escapeHtml(feedbackPage)}</p>
        <p><strong>From:</strong> ${escapeHtml(String(fromUser))}</p>
        <p><strong>When:</strong> ${escapeHtml(when)}</p>
        <p><strong>Id:</strong> ${escapeHtml(item.id)}</p>
        <hr />
        <pre style="white-space:pre-wrap;font-family:ui-sans-serif,system-ui,sans-serif">${escapeHtml(feedbackMessage)}</pre>
      `.trim(),
    });

    if (!emailResult.ok && !("skipped" in emailResult && emailResult.skipped)) {
      console.error("[api.feedback.POST] email failed", emailResult.error);
    } else if (!emailResult.ok && "skipped" in emailResult && emailResult.skipped) {
      console.warn("[api.feedback.POST] email skipped", emailResult.error);
    }

    return NextResponse.json({
      success: true,
      stored,
      emailed: emailResult.ok,
      item,
    });
  } catch (err) {
    return handleRouteError("api.feedback.POST", err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireSuperadminContext();
    const redis = getRedis();
    if (!redis) return NextResponse.json({ success: true });

    const { id, clearAll } = await req.json();

    if (clearAll) {
      await redis.del(KEY);
      return NextResponse.json({ success: true });
    }

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const items = ((await redis.lrange(KEY, 0, -1)) || []) as string[];
    const filtered = items.filter((raw) => {
      try {
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        return parsed.id !== id;
      } catch {
        return true;
      }
    });

    await redis.del(KEY);
    if (filtered.length > 0) {
      await redis.rpush(KEY, ...filtered);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleRouteError("api.feedback.DELETE", err);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
