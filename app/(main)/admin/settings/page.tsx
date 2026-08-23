"use client";

import { useEffect, useState } from "react";
import { GlassPanel, SectionHeader, TusanButton } from "@/components/ui";

type Config = {
  business: { address?: string; phone?: string; email?: string; telegram?: string; eitaa?: string; rubika?: string };
  social: { enabled?: boolean };
  display: { showAnnouncements?: boolean; showRegistrations?: boolean };
  orders: { enabled?: boolean; closedMessage?: string };
  announcements: { maxHomeItems?: number; showUndated?: boolean };
  pricing: { defaultMultiplier?: number; currency?: string };
};

const defaults: Config = {
  business: { address: "", phone: "", email: "", telegram: "", eitaa: "", rubika: "" },
  social: { enabled: true },
  display: { showAnnouncements: true, showRegistrations: true },
  orders: { enabled: true, closedMessage: "ثبت سفارش موقتاً غیرفعال است." },
  announcements: { maxHomeItems: 4, showUndated: true },
  pricing: { defaultMultiplier: 2, currency: "تومان" },
};

export default function AdminSettingsPage() {
  const [site, setSite] = useState({ site_name: "", site_description: "", theme: "light", primary_color: "#09967c", primary_dark: "#087d69", font_family: "Vazirmatn" });
  const [config, setConfig] = useState<Config>(defaults);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/site-settings").then((r) => r.json()).then((data) => {
      if (data.success) {
        setSite((prev) => ({ ...prev, ...data.settings }));
        setConfig({ ...defaults, ...(data.settings.config || {}), business: { ...defaults.business, ...(data.settings.config?.business || {}) } });
      }
    }).finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true); setMessage("");
    const response = await fetch("/api/admin/site-settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...site, config }) });
    const data = await response.json();
    setSaving(false);
    setMessage(data.success ? "تنظیمات با موفقیت ذخیره شد." : data.error || "خطا در ذخیره تنظیمات");
  }

  const updateBusiness = (key: keyof Config["business"], value: string) => setConfig((prev) => ({ ...prev, business: { ...prev.business, [key]: value } }));

  if (loading) return <div dir="rtl" className="p-8 text-center">در حال دریافت تنظیمات...</div>;

  return (
    <div dir="rtl" className="min-h-screen page-background p-4 sm:p-6 text-[var(--text)]">
      <div className="max-w-5xl mx-auto space-y-6 pb-28">
        <SectionHeader title="تنظیمات سایت" description="کنترل تنظیمات مؤثر سایت از یک محل، بدون نیاز به تغییر مستقیم کد" />

        <GlassPanel className="p-6 space-y-6">
          <h2 className="text-xl font-black">اطلاعات کسب‌وکار</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[["site_name","نام سایت"],["site_description","توضیح سایت"]].map(([key,label]) => <label key={key} className="font-bold text-sm">{label}<input value={(site as any)[key]} onChange={(e) => setSite({ ...site, [key]: e.target.value })} className="mt-2 w-full rounded-xl border p-3 bg-[var(--surface)]" /></label>)}
            {([["address","آدرس"],["phone","تلفن"],["email","ایمیل"],["telegram","آیدی تلگرام"],["eitaa","آیدی ایتا"],["rubika","آیدی روبیکا"]] as const).map(([key,label]) => <label key={key} className="font-bold text-sm">{label}<input value={config.business[key] || ""} onChange={(e) => updateBusiness(key, e.target.value)} className="mt-2 w-full rounded-xl border p-3 bg-[var(--surface)]" /></label>)}
          </div>
        </GlassPanel>

        <GlassPanel className="p-6 space-y-5">
          <h2 className="text-xl font-black">نمایش سایت</h2>
          <label className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-[var(--surface-muted)]"><span>نمایش اطلاعیه‌ها در صفحه اصلی</span><input type="checkbox" checked={config.display.showAnnouncements !== false} onChange={(e) => setConfig({ ...config, display: { ...config.display, showAnnouncements: e.target.checked } })} /></label>
          <label className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-[var(--surface-muted)]"><span>نمایش ثبت‌نام‌های فعال در صفحه اصلی</span><input type="checkbox" checked={config.display.showRegistrations !== false} onChange={(e) => setConfig({ ...config, display: { ...config.display, showRegistrations: e.target.checked } })} /></label>
        </GlassPanel>

        <GlassPanel className="p-6 space-y-5">
          <h2 className="text-xl font-black">سفارش و اطلاعیه</h2>
          <label className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-[var(--surface-muted)]"><span>فعال بودن ثبت سفارش</span><input type="checkbox" checked={config.orders.enabled !== false} onChange={(e) => setConfig({ ...config, orders: { ...config.orders, enabled: e.target.checked } })} /></label>
          <label className="font-bold text-sm block">پیام هنگام غیرفعال بودن سفارش<input value={config.orders.closedMessage || ""} onChange={(e) => setConfig({ ...config, orders: { ...config.orders, closedMessage: e.target.value } })} className="mt-2 w-full rounded-xl border p-3 bg-[var(--surface)]" /></label>
          <label className="font-bold text-sm block">حداکثر آیتم صفحه اصلی<input type="number" min={1} max={12} value={config.announcements.maxHomeItems || 4} onChange={(e) => setConfig({ ...config, announcements: { ...config.announcements, maxHomeItems: Math.max(1, Math.min(12, Number(e.target.value) || 4)) } })} className="mt-2 w-full rounded-xl border p-3 bg-[var(--surface)]" /></label>
          <label className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-[var(--surface-muted)]"><span>نمایش اطلاعیه‌های بدون تاریخ</span><input type="checkbox" checked={config.announcements.showUndated !== false} onChange={(e) => setConfig({ ...config, announcements: { ...config.announcements, showUndated: e.target.checked } })} /></label>
        </GlassPanel>

        <GlassPanel className="p-6 space-y-5">
          <h2 className="text-xl font-black">قیمت‌گذاری</h2>
          <label className="font-bold text-sm block">ضریب پیش‌فرض فروش<input type="number" min={1} step={0.1} value={config.pricing.defaultMultiplier || 2} onChange={(e) => setConfig({ ...config, pricing: { ...config.pricing, defaultMultiplier: Math.max(1, Number(e.target.value) || 1) } })} className="mt-2 w-full rounded-xl border p-3 bg-[var(--surface)]" /></label>
          <p className="text-sm text-[var(--text-muted)]">این مقدار فقط در بخش‌هایی اثر دارد که از تنظیم قیمت پیش‌فرض سامانه استفاده می‌کنند؛ قیمت‌های اختصاصی سرویس‌ها تغییر نمی‌کنند.</p>
        </GlassPanel>

        {message && <div className="rounded-xl p-4 bg-[var(--surface-muted)] font-bold">{message}</div>}
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-auto z-50"><TusanButton onClick={save} disabled={saving} className="w-full sm:min-w-[220px] shadow-2xl">{saving ? "در حال ذخیره..." : "ذخیره تنظیمات سایت"}</TusanButton></div>
      </div>
    </div>
  );
}
