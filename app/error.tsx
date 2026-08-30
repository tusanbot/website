"use client";

import { useEffect } from "react";
import SystemStatusPage from "@/components/system/SystemStatusPage";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <SystemStatusPage
      kind="error"
      actionLabel="تلاش دوباره"
      secondaryLabel="صفحه اصلی"
      secondaryHref="/"
      // The shared page owns the lightweight UI; Next.js reset is handled here.
      icon={<span hidden />}
    />
  );
}
