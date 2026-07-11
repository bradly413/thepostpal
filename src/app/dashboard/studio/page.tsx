"use client";

import { Suspense } from "react";
import PosterboyStudio from "@/components/dashboard/studio/PosterboyStudio";
import { PageLoadingState } from "@/components/dashboard/StateViews";

export default function StudioPage() {
  return (
    <Suspense fallback={<PageLoadingState label="Loading Studio" />}>
      <PosterboyStudio />
    </Suspense>
  );
}
