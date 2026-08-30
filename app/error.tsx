"use client";

import { useEffect } from "react";
import SystemStatusPage from "@/components/system/SystemStatusPage";

export default function Error({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <SystemStatusPage
      kind="error"
      secondaryLabel="صفحه اصلی"
      secondaryHref="/"
    />
  );
}
