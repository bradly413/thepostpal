import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Legacy bulk page — Schedule owns bulk upload inline. */
export default function BulkSchedulePage() {
  redirect("/dashboard/calendar");
}
