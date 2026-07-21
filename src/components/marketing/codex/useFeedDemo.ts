"use client";

import { useCallback, useRef, useState } from "react";
import { track } from "@/lib/marketing/track";
import {
  DEMO_TIMEOUT_MS,
  getDemoCategory,
  type DemoCategory,
  type DemoPost,
} from "@/components/marketing/codex/demo-feed";

export type DemoStatus = "idle" | "writing" | "done";

export interface DemoResult {
  summary: string;
  posts: DemoPost[];
  /** true when the pre-written example was used instead of live drafting. */
  usedFallback: boolean;
  category: DemoCategory;
}

interface ApiWeek {
  summary?: string;
  posts?: DemoPost[];
  error?: string;
}

/**
 * Shared state machine for the hero and footer live demos.
 *
 * Calls the real drafting engine (/api/tools/what-to-post — IP rate-limited,
 * input-clamped, no client-side keys) with a hard timeout. Any failure —
 * timeout, 429, 5xx, malformed JSON — resolves to the category's complete
 * pre-written example so the visitor never sees a dead spinner or an error.
 */
export function useFeedDemo(location: "hero" | "footer") {
  const [status, setStatus] = useState<DemoStatus>("idle");
  const [result, setResult] = useState<DemoResult | null>(null);
  const inflight = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    inflight.current?.abort();
    inflight.current = null;
    setStatus("idle");
    setResult(null);
  }, []);

  const submit = useCallback(
    async (categoryId: string, businessName: string) => {
      if (inflight.current) return; // one demonstration at a time
      const category = getDemoCategory(categoryId);
      setStatus("writing");
      setResult(null);
      track("hero_demo_started", { category: category.id, location });

      const controller = new AbortController();
      inflight.current = controller;
      const timer = setTimeout(() => controller.abort(), DEMO_TIMEOUT_MS);

      const name = businessName.trim().slice(0, 60);
      const businessType = name ? `${category.engineHint} called ${name}` : category.engineHint;

      let final: DemoResult;
      try {
        const res = await fetch("/api/tools/what-to-post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ businessType, whatsNew: "", offer: "", tone: "warm" }),
          signal: controller.signal,
        });
        const data = (await res.json()) as ApiWeek;
        if (!res.ok || !Array.isArray(data.posts) || data.posts.length < 3) {
          throw new Error(data.error || "unavailable");
        }
        final = {
          summary:
            typeof data.summary === "string" && data.summary.trim()
              ? data.summary.trim()
              : category.fallback.summary,
          posts: data.posts.slice(0, 3),
          usedFallback: false,
          category,
        };
      } catch {
        // Timeout, rate limit, or engine failure → the finished pre-written
        // example. Intentional demonstration, not an error state.
        final = {
          summary: category.fallback.summary,
          posts: [...category.fallback.posts],
          usedFallback: true,
          category,
        };
        track("hero_demo_fallback_used", { category: category.id, location });
      } finally {
        clearTimeout(timer);
        inflight.current = null;
      }

      setResult(final);
      setStatus("done");
      track("hero_demo_completed", {
        category: category.id,
        location,
        fallback: final.usedFallback,
      });
    },
    [location],
  );

  const retry = useCallback(() => {
    track("hero_demo_retry", { location });
    reset();
  }, [location, reset]);

  return { status, result, submit, retry, reset };
}
