/** Interactive scheduling calendar — demo month with social mock posts. */

export type ScheduledPost = {
  image: string;
  title: string;
};

export type CalendarDay =
  | {
      kind: "blank";
      iso: string;
      label: string;
    }
  | {
      kind: "post";
      iso: string;
      label: string;
      post: ScheduledPost;
    };

const mock = (n: number) => `/images/social-mocks/${n}.svg`;

const SCHEDULED_POSTS: ScheduledPost[] = [
  { image: mock(1), title: "Weekend open house" },
  { image: mock(2), title: "Neighborhood spotlight" },
  { image: mock(3), title: "Market clarity tip" },
  { image: mock(4), title: "Just listed — curb appeal" },
  { image: mock(5), title: "Client testimonial" },
  { image: mock(6), title: "Tuesday tips carousel" },
  { image: mock(7), title: "Sunday story — local cafe" },
  { image: mock(8), title: "Price reduction alert" },
  { image: mock(9), title: "Behind the scenes reel" },
  { image: mock(10), title: "Listing feature — backyard" },
  { image: mock(11), title: "Memorial Day market note" },
  { image: mock(12), title: "Quote card — your voice" },
  { image: mock(13), title: "June goals post" },
  { image: mock(14), title: "Brand refresh teaser" },
];

const GRID_DAYS = 35;
const GRID_START = new Date(2026, 3, 27); // Apr 27, 2026

function addDays(base: Date, offset: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + offset);
  return d;
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayLabel(d: Date): string {
  return String(d.getDate()).padStart(2, "0");
}

/** Evenly space post indices across the 5-week grid (0 … GRID_DAYS-1). */
function postSlotIndices(count: number, total: number): number[] {
  if (count <= 1) return [0];
  return Array.from({ length: count }, (_, i) =>
    Math.round((i * (total - 1)) / (count - 1)),
  );
}

function buildCalendarDays(): CalendarDay[] {
  const postSlots = new Set(postSlotIndices(SCHEDULED_POSTS.length, GRID_DAYS));
  const days: CalendarDay[] = [];
  let postCursor = 0;

  for (let i = 0; i < GRID_DAYS; i++) {
    const date = addDays(GRID_START, i);
    const label = dayLabel(date);
    const iso = isoDate(date);

    if (postSlots.has(i) && postCursor < SCHEDULED_POSTS.length) {
      days.push({
        kind: "post",
        iso,
        label,
        post: SCHEDULED_POSTS[postCursor++],
      });
    } else {
      days.push({ kind: "blank", iso, label });
    }
  }

  return days;
}

export const SCHEDULING_CALENDAR_DAYS = buildCalendarDays();
export const SCHEDULING_CALENDAR_MONTH_LABEL = "April – May 2026";
