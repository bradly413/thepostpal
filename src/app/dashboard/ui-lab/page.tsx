import { redirect } from "next/navigation";
import UiLabGallery from "./gallery";

/** Dev UI snippet gallery — blocked in production. */
export default function UiLabPage() {
  if (process.env.NODE_ENV === "production") {
    redirect("/dashboard");
  }
  return <UiLabGallery />;
}
