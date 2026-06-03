import { redirect } from "next/navigation";

// The Brand Architect was promoted to be the main onboarding route.
// Keep this path working for any existing links.
export default function ArchitectRedirect() {
  redirect("/onboarding");
}
