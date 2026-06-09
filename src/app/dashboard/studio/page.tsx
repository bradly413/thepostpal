"use client";

import { Suspense } from "react";
import PosterboyStudio from "@/components/dashboard/studio/PosterboyStudio";

export default function StudioPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm opacity-60">Loading Studio…</div>}>
      <PosterboyStudio />
    </Suspense>
  );
}
