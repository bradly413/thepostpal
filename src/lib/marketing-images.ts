/**
 * Marketing image inventory.
 * Keep hero/supporting illustrations here, but use real social mock assets for
 * the carousel so the landing page does not read as placeholder-heavy.
 */
const img = (name: string) => `/images/${name}`;
const socialMock = (name: string) => `/images/social-mocks/${name}`;

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
  socialMock("01.png"),
  socialMock("02.png"),
  socialMock("03.png"),
  socialMock("04.png"),
  socialMock("05.png"),
  socialMock("06.png"),
  socialMock("07.png"),
  socialMock("08.png"),
  socialMock("09.png"),
  socialMock("10.png"),
] as const;
