import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import { requireAuthContext } from "@/lib/api-auth";
import { handleRouteError } from "@/lib/route-errors";

const KEY = "beta-feedback";

// Reading or deleting beta feedback is an authenticated admin action.
// Submitting (POST) stays open so the in-app feedback widget works for any tester.
export async function GET() {
  try {
    await requireAuthContext();
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

    const item = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      type: type || "other",
      message: String(message).trim().slice(0, 5000),
      page: page || "/",
      timestamp: Date.now(),
    };

    const redis = getRedis();
    // Upstash is optional (graceful degrade): accept without persisting rather
    // than 500-ing the widget when no store is configured.
    if (!redis) return NextResponse.json({ success: true, stored: false });

    await redis.lpush(KEY, JSON.stringify(item));
    return NextResponse.json({ success: true, item });
  } catch (err) {
    return handleRouteError("api.feedback.POST", err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAuthContext();
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
