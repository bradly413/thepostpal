export const PB = {
  paper: "#f7f4ee",
  ink: "#141418",
  accent: "#ee2532",
  accentDeep: "#c81e2a",
  white: "#ffffff",
  muted: "rgba(20, 20, 24, 0.55)",
  frameShadow: "0 28px 80px rgba(20, 20, 24, 0.18)",
  sans: 'Inter, "Instrument Sans", ui-sans-serif, system-ui, sans-serif',
} as const;

export const SLIDE_FPS = 30;
export const SLIDE_DURATION = 240; // 8s
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const clean = (n: number) =>
  `remotion/bulk-upload/bulk-${String(n).padStart(2, "0")}-clean.png`;
