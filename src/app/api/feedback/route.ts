import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const KEY = "beta-feedback";

export async function GET() {
  try {
    const items = (await redis.lrange(KEY, 0, -1)) || [];
    return NextResponse.json({ items });
  } catch (err) {
    console.error("Feedback GET error:", err);
    return NextResponse.json({ items: [] });
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
      message: message.trim(),
      page: page || "/",
      timestamp: Date.now(),
    };

    await redis.lpush(KEY, JSON.stringify(item));
    return NextResponse.json({ success: true, item });
  } catch (err) {
    console.error("Feedback POST error:", err);
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id, clearAll } = await req.json();

    if (clearAll) {
      await redis.del(KEY);
      return NextResponse.json({ success: true });
    }

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const items = (await redis.lrange(KEY, 0, -1)) as string[];
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
    console.error("Feedback DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete feedback" }, { status: 500 });
  }
}
