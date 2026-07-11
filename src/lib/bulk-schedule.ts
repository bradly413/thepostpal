export type PlatformChoice = "facebook" | "instagram" | "both";

export function todayISODate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function bumpOffWeekend(d: Date): void {
  const dow = d.getDay();
  if (dow === 6) d.setDate(d.getDate() + 2);
  else if (dow === 0) d.setDate(d.getDate() + 1);
}

/** Resolve the local posting datetime for item `index` in a bulk batch. */
export function resolvePostingDate(
  startDate: string,
  time: string,
  index: number,
  intervalDays: number,
  skipWeekends: boolean,
): Date {
  const [y, m, day] = startDate.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const d = new Date(y, m - 1, day, hh, mm, 0, 0);

  if (skipWeekends) bumpOffWeekend(d);

  for (let i = 0; i < index; i++) {
    d.setDate(d.getDate() + intervalDays);
    if (skipWeekends) bumpOffWeekend(d);
  }

  return d;
}

export function scheduledForISO(
  startDate: string,
  time: string,
  index: number,
  intervalDays: number,
  skipWeekends: boolean,
): string {
  return resolvePostingDate(startDate, time, index, intervalDays, skipWeekends).toISOString();
}

export function prettyScheduleDate(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) +
    " · " +
    d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  );
}

export function captionPlatformFor(choice: PlatformChoice): "facebook" | "instagram" {
  return choice === "facebook" ? "facebook" : "instagram";
}
