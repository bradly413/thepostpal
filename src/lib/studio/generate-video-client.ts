/**
 * Client helper: start Veo via /api/generate-video and poll until ready.
 */

export type VideoGenAspect = "16:9" | "9:16";

export type VideoGenStatus =
  | { phase: "starting" }
  | { phase: "processing"; taskId: string; elapsedMs: number }
  | { phase: "succeeded"; videoUrl: string; taskId: string }
  | { phase: "failed"; error: string };

export function veoAspectForPlatform(platformId: string): VideoGenAspect {
  if (platformId === "tiktok" || platformId === "instagram") return "9:16";
  return "16:9";
}

const POLL_MS = 8_000;
const MAX_WAIT_MS = 6 * 60_000;

export async function startAndPollVideo(opts: {
  prompt: string;
  image?: string | null;
  aspectRatio?: VideoGenAspect;
  signal?: AbortSignal;
  onStatus?: (status: VideoGenStatus) => void;
}): Promise<{ videoUrl: string; taskId: string }> {
  const { prompt, image, aspectRatio = "16:9", signal, onStatus } = opts;
  onStatus?.({ phase: "starting" });

  const startRes = await fetch("/api/generate-video", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      ...(image ? { image } : {}),
      aspectRatio,
      resolution: "720p",
    }),
    signal,
  });
  const startData = (await startRes.json()) as {
    taskId?: string;
    error?: string;
    upgrade?: boolean;
  };
  if (!startRes.ok || !startData.taskId) {
    const err =
      startData.error ||
      (startRes.status === 403 ? "Video is a Pro feature." : "Couldn't start the video.");
    onStatus?.({ phase: "failed", error: err });
    throw new Error(err);
  }

  const taskId = startData.taskId;
  const startedAt = Date.now();

  while (Date.now() - startedAt < MAX_WAIT_MS) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    onStatus?.({
      phase: "processing",
      taskId,
      elapsedMs: Date.now() - startedAt,
    });

    await new Promise((r) => setTimeout(r, POLL_MS));
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const pollRes = await fetch(
      `/api/generate-video?taskId=${encodeURIComponent(taskId)}`,
      { signal },
    );
    const pollData = (await pollRes.json()) as {
      status?: string;
      videoUrl?: string;
      error?: string;
    };

    if (!pollRes.ok) {
      const err = pollData.error || "Couldn't check the video status.";
      onStatus?.({ phase: "failed", error: err });
      throw new Error(err);
    }

    if (pollData.status === "succeed" && pollData.videoUrl) {
      onStatus?.({ phase: "succeeded", videoUrl: pollData.videoUrl, taskId });
      return { videoUrl: pollData.videoUrl, taskId };
    }
    if (pollData.status === "failed") {
      const err = pollData.error || "Video generation failed.";
      onStatus?.({ phase: "failed", error: err });
      throw new Error(err);
    }
  }

  const timeoutErr = "Video is taking too long. Try again in a moment.";
  onStatus?.({ phase: "failed", error: timeoutErr });
  throw new Error(timeoutErr);
}
