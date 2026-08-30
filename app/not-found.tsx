import type { Metadata } from "next";
import SystemStatusPage from "@/components/system/SystemStatusPage";

export const metadata: Metadata = {
  title: "صفحه پیدا نشد",
  description: "صفحه موردنظر در کافی‌نت توسن پیدا نشد.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <SystemStatusPage
      kind="not-found"
      actionHref="/"
      actionLabel="بازگشت به صفحه اصلی"
    />
  );
}
