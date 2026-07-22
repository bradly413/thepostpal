/**
 * Shared marketing demo intake — scrolls visitors into the live #demo drafting form.
 */

export const DEMO_INTAKE_ANCHOR = "#demo";
export const DEMO_INTAKE_EVENT = "posterboy:demo-intake";
export const PRIMARY_CTA = "See it work";
export const DEMO_SUBMIT = "Draft my posts";

export type DemoIntakeDetail = {
  category?: string;
  /** When true, Demonstration auto-runs the drafting engine. */
  autoStart?: boolean;
};

export function goToDemo(detail: DemoIntakeDetail = {}): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<DemoIntakeDetail>(DEMO_INTAKE_EVENT, { detail }));
  document.getElementById("demo")?.scrollIntoView({ behavior: "smooth", block: "start" });
}
