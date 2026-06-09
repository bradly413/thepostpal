"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

function CheckoutQueryToastInner() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (!checkout) return;

    if (checkout === "success") {
      setToast("You're on Command.");
    } else if (checkout === "cancelled") {
      setToast("Checkout cancelled.");
    }

    const next = new URLSearchParams(searchParams.toString());
    next.delete("checkout");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, router, pathname]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  if (!toast) return null;
  return (
    <div className="pb-toast" role="status">
      {toast}
    </div>
  );
}

export default function CheckoutQueryToast() {
  return (
    <Suspense fallback={null}>
      <CheckoutQueryToastInner />
    </Suspense>
  );
}
