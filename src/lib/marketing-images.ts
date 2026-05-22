/**
 * Local placeholder SVGs in `public/images/`.
 * Replace any file with a real JPG/PNG using the same basename (e.g. phone-post.jpg)
 * and update the extension here.
 */
const img = (name: string) => `/images/${name}`;

export const MARKETING_IMAGES = {
  /** Red squircle + paper plane — hero headline */
  appIcon: img("posterboy-app-icon.png"),
  phonePost: img("phone-post.svg"),
  deskClutter: img("desk-clutter.svg"),
  calendar: img("calendar.svg"),
  heroHands: img("hero-hands.svg"),
  analytics: img("analytics.svg"),
  carousel1: img("carousel-1.svg"),
  carousel2: img("carousel-2.svg"),
  carousel3: img("carousel-3.svg"),
  carousel4: img("carousel-4.svg"),
  ownerPortrait: img("owner-portrait.svg"),
} as const;

export const CAROUSEL_IMAGES = [
  MARKETING_IMAGES.deskClutter,
  MARKETING_IMAGES.calendar,
  MARKETING_IMAGES.heroHands,
  MARKETING_IMAGES.analytics,
  MARKETING_IMAGES.carousel1,
  MARKETING_IMAGES.carousel2,
  MARKETING_IMAGES.carousel3,
  MARKETING_IMAGES.carousel4,
  MARKETING_IMAGES.phonePost,
  MARKETING_IMAGES.ownerPortrait,
] as const;
