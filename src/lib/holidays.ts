export interface Holiday {
  date: string;
  name: string;
}

export function getHolidaysForYear(year: number): Holiday[] {
  const holidays: Holiday[] = [
    { date: `${year}-01-01`, name: "New Year's Day" },
    { date: nthWeekday(year, 0, 1, 3), name: "MLK Jr. Day" },
    { date: nthWeekday(year, 1, 1, 3), name: "Presidents' Day" },
    { date: lastWeekday(year, 4, 1), name: "Memorial Day" },
    { date: `${year}-06-19`, name: "Juneteenth" },
    { date: `${year}-07-04`, name: "Independence Day" },
    { date: nthWeekday(year, 8, 1, 1), name: "Labor Day" },
    { date: nthWeekday(year, 9, 1, 2), name: "Columbus Day" },
    { date: `${year}-11-11`, name: "Veterans Day" },
    { date: nthWeekday(year, 10, 4, 4), name: "Thanksgiving" },
    { date: `${year}-12-25`, name: "Christmas Day" },
    { date: `${year}-02-14`, name: "Valentine's Day" },
    { date: `${year}-03-17`, name: "St. Patrick's Day" },
    { date: easterDate(year), name: "Easter" },
    { date: mothersDayDate(year), name: "Mother's Day" },
    { date: fathersDayDate(year), name: "Father's Day" },
    { date: `${year}-10-31`, name: "Halloween" },
  ];
  return holidays;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function nthWeekday(year: number, month: number, weekday: number, n: number): string {
  let count = 0;
  for (let day = 1; day <= 31; day++) {
    const d = new Date(year, month, day);
    if (d.getMonth() !== month) break;
    if (d.getDay() === weekday) {
      count++;
      if (count === n) return `${year}-${pad(month + 1)}-${pad(day)}`;
    }
  }
  return `${year}-${pad(month + 1)}-01`;
}

function lastWeekday(year: number, month: number, weekday: number): string {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let day = daysInMonth; day >= 1; day--) {
    if (new Date(year, month, day).getDay() === weekday) {
      return `${year}-${pad(month + 1)}-${pad(day)}`;
    }
  }
  return `${year}-${pad(month + 1)}-01`;
}

function easterDate(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${pad(month)}-${pad(day)}`;
}

function mothersDayDate(year: number): string {
  return nthWeekday(year, 4, 0, 2);
}

function fathersDayDate(year: number): string {
  return nthWeekday(year, 5, 0, 3);
}

export function getHolidayMap(year: number): Map<string, string> {
  const map = new Map<string, string>();
  for (const h of getHolidaysForYear(year)) {
    map.set(h.date, h.name);
  }
  return map;
}

function dateKeyFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface UpcomingHolidayOptions {
  /** Inclusive start (defaults to now). */
  from?: Date;
  /** Max holidays to return. */
  limit?: number;
  /** Only holidays within this many days ahead (default 120). */
  horizonDays?: number;
}

/** Holidays from today through the horizon — sorted, excludes past dates. */
export function getUpcomingHolidays(opts: UpcomingHolidayOptions = {}): Holiday[] {
  const from = opts.from ?? new Date();
  const todayKey = dateKeyFromDate(from);
  const limit = opts.limit ?? 6;
  const horizonDays = opts.horizonDays ?? 120;

  const end = new Date(from);
  end.setDate(end.getDate() + horizonDays);
  const endKey = dateKeyFromDate(end);

  const years = new Set([from.getFullYear(), end.getFullYear()]);
  const all = [...years].flatMap((y) => getHolidaysForYear(y));

  return all
    .filter((h) => h.date >= todayKey && h.date <= endKey)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit);
}
