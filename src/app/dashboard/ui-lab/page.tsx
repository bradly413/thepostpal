import { redirect } from "next/navigation";
import { requireAuthContext } from "@/lib/api-auth";
import UiLabGallery from "./gallery";

/** Dev UI snippet gallery — blocked in production and for non-superadmins. */
export default async function UiLabPage() {
  if (process.env.NODE_ENV === "production") {
    redirect("/dashboard");
  }
  try {
    const auth = await requireAuthContext();
    if (!auth.isSuperadmin) redirect("/dashboard");
  } catch {
    redirect("/sign-in");
  }
  return <UiLabGallery />;
}
