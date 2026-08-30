import type { Metadata } from "next";
import SystemStatusPage from "@/components/system/SystemStatusPage";
import { getSiteSettings } from "@/lib/siteSettings";

export const metadata: Metadata = {
  title: "در دست تعمیر",
  description: "کافی‌نت توسن در حال به‌روزرسانی و بهبود است.",
  robots: { index: false, follow: false },
};

export default async function MaintenancePage() {
  const settings = await getSiteSettings();
  const maintenance = settings.config?.maintenance;
  const title = maintenance?.title?.trim() || "سایت در حال به‌روزرسانی است";
  const baseMessage = maintenance?.message?.trim() || "در حال انجام چند بهبود و به‌روزرسانی هستیم. کمی دیگر دوباره به ما سر بزنید.";
  const eta = maintenance?.eta?.trim();
  const description = eta ? `${baseMessage} ${eta}` : baseMessage;

  return (
    <SystemStatusPage
      kind="maintenance"
      title={title}
      description={description}
      actionHref="/"
      actionLabel="بازگشت به سایت"
      secondaryLabel="تلاش دوباره"
      secondaryHref="/maintenance"
    />
  );
}
