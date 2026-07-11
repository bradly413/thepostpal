import { getUpcomingHolidays } from "@/lib/holidays";

export interface HeroHolidaySlide {
  title: string;
  date: string;
  img?: string;
  grad: number;
  brief: string;
  dateKey: string;
}

/** Optional hero photo per holiday — add under public/hero/ as you create assets. */
const HOLIDAY_HERO_ASSETS: Record<string, { img?: string; grad: number; dateLabel?: string }> = {
  "New Year's Day": { grad: 1, dateLabel: "January 1" },
  "Valentine's Day": { grad: 1 },
  "St. Patrick's Day": { grad: 3 },
  "Easter": { grad: 0 },
  "Mother's Day": { grad: 1 },
  "Memorial Day": { grad: 3 },
  "Juneteenth": { img: "/hero/juneteenth.jpg", grad: 2 },
  "Father's Day": { img: "/hero/fathers-day.jpg", grad: 0 },
  "Independence Day": { img: "/hero/fourth-of-july.jpg", grad: 1, dateLabel: "Fourth of July" },
  "Labor Day": { img: "/hero/labor-day.jpg", grad: 3 },
  "Columbus Day": { img: "/hero/columbus-day.jpg", grad: 0 },
  "Halloween": { img: "/hero/halloween.jpg", grad: 1 },
  "Veterans Day": { img: "/hero/veterans-day.jpg", grad: 3 },
  "Thanksgiving": { img: "/hero/thanksgiving.jpg", grad: 0 },
  "Christmas Day": { img: "/hero/christmas-day.jpg", grad: 1, dateLabel: "December 25" },
};

const FALLBACK_SLIDES: HeroHolidaySlide[] = [
  {
    title: "Plan ahead",
    date: "Schedule your next post",
    grad: 2,
    brief: "a post about ",
    dateKey: "",
  },
];

function formatSlideDate(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00`);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

/** Upcoming holiday cards for the home hero carousel — always date-aware. */
export function buildHeroHolidaySlides(now = new Date(), limit = 6): HeroHolidaySlide[] {
  const upcoming = getUpcomingHolidays({ from: now, limit, horizonDays: 150 });
  if (upcoming.length === 0) return FALLBACK_SLIDES;

  return upcoming.map((h, i) => {
    const asset = HOLIDAY_HERO_ASSETS[h.name] ?? { grad: i % 4 };
    return {
      title: h.name,
      date: asset.dateLabel ?? formatSlideDate(h.date),
      img: asset.img,
      grad: asset.grad,
      brief: `a post about ${h.name.toLowerCase()}`,
      dateKey: h.date,
    };
  });
}
