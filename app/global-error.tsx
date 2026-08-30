"use client";

import SystemStatusPage from "@/components/system/SystemStatusPage";

export default function GlobalError() {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <SystemStatusPage kind="error" secondaryLabel="صفحه اصلی" secondaryHref="/" />
      </body>
    </html>
  );
}
