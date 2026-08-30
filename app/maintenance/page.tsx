import type { Metadata } from "next";
import SystemStatusPage from "@/components/system/SystemStatusPage";

export const metadata: Metadata = {
  title: "در دست تعمیر",
  description: "کافی‌نت توسن در حال به‌روزرسانی و بهبود است.",
  robots: { index: false, follow: false },
};

export default function MaintenancePage() {
  return (
    <SystemStatusPage
      kind="maintenance"
      actionHref="/"
      actionLabel="بازگشت به سایت"
      secondaryLabel="تلاش دوباره"
      secondaryHref="/maintenance"
    />
  );
}
