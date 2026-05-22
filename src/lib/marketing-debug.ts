/** Debug session logging — remove after marketing site verification. */
const ENDPOINT =
  "http://127.0.0.1:7634/ingest/35de4ff3-3f93-4d9c-b106-5e62cf921280";
const SESSION_ID = "13796f";

export function marketingDbg(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string,
  runId = "pre-fix",
) {
  if (process.env.NODE_ENV !== "development") return;

  // #region agent log
  fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": SESSION_ID,
    },
    body: JSON.stringify({
      sessionId: SESSION_ID,
      location,
      message,
      data,
      hypothesisId,
      runId,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}
