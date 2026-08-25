import Link from "next/link";
import { GlassPanel, TusanButton } from "@/components/ui";

const links = [
  { href: "/admin/services/new", icon: "🤖", title: "ایجاد خدمت با هوش مصنوعی", text: "تولید اطلاعات خدمت و تنظیمات SEO با Gemini." },
  { href: "/admin/blog", icon: "📝", title: "مدیریت وبلاگ و AI", text: "ایجاد، ویرایش و انتشار مقاله و تولید پیش‌نویس سئو محور با Gemini." },
  { href: "/admin/seo", icon: "📈", title: "مدیریت SEO و Search Console", text: "Performance، سلامت SEO و تحلیل داده‌های Google." },
  { href: "/tools", icon: "🧰", title: "مشاهده همه ابزارها", text: "بررسی ابزارهای عمومی و هوش مصنوعی سایت." },
];

export default function AdminToolLinks() {
  return (
    <GlassPanel className="p-6">
      <div className="mb-5">
        <h2 className="text-xl font-black">🧰 ابزارها و هوش مصنوعی</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">دسترسی سریع به ابزارهای متصل‌شده به سایت و بخش‌های مدیریتی آن‌ها.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {links.map((item) => (
          <div key={item.href} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="text-2xl">{item.icon}</div>
            <h3 className="mt-3 font-black">{item.title}</h3>
            <p className="mt-2 min-h-12 text-sm leading-6 text-[var(--text-muted)]">{item.text}</p>
            <Link href={item.href} className="mt-4 block">
              <TusanButton fullWidth>ورود</TusanButton>
            </Link>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}
