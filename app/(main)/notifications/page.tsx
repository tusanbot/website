"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { GlassPanel, SectionHeader, TusanButton } from "@/components/ui";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string | null;
  order_id: string | null;
  created_at: string;
  read_at: string | null;
};

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  async function load(id: string) {
    const { data } = await supabase
      .from("notifications")
      .select("id,type,title,message,order_id,created_at,read_at")
      .eq("recipient_id", id)
      .order("created_at", { ascending: false });
    setItems((data || []) as NotificationItem[]);
    setLoading(false);
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      load(user.id);
    });
  }, []);

  async function markAllRead() {
    if (!userId) return;
    const now = new Date().toISOString();
    await supabase.from("notifications").update({ read_at: now }).eq("recipient_id", userId).is("read_at", null);
    setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at || now })));
  }

  async function markRead(id: string) {
    const now = new Date().toISOString();
    await supabase.from("notifications").update({ read_at: now }).eq("id", id);
    setItems((current) => current.map((item) => item.id === id ? { ...item, read_at: now } : item));
  }

  return (
    <div dir="rtl" className="min-h-screen page-background p-4 lg:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-6">
          <SectionHeader title="اعلان‌ها" description="آخرین رویدادها و اطلاع‌رسانی‌های حساب شما" />
          <Link href="/"><TusanButton variant="outline">بازگشت</TusanButton></Link>
        </div>
        <GlassPanel className="overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
            <span className="text-sm text-[var(--text-muted)]">{items.filter((item) => !item.read_at).length.toLocaleString("fa-IR")} اعلان خوانده‌نشده</span>
            <button type="button" onClick={markAllRead} className="text-sm font-bold text-[var(--primary)]">علامت‌گذاری همه به‌عنوان خوانده‌شده</button>
          </div>
          {loading ? (
            <div className="p-10 text-center text-[var(--text-muted)]">در حال دریافت اعلان‌ها...</div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-[var(--text-muted)]">اعلانی برای نمایش وجود ندارد.</div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {items.map((item) => (
                <div key={item.id} className={`p-5 ${!item.read_at ? "bg-[var(--primary)]/5" : ""}`}>
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{item.type === "new_message" ? "💬" : item.type === "payment_status" ? "💳" : item.type === "new_order" ? "📋" : "🔔"}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="font-black">{item.title}</h2>
                        {!item.read_at && <span className="w-2 h-2 rounded-full bg-[var(--primary)] mt-2 shrink-0" />}
                      </div>
                      {item.message && <p className="mt-1 text-sm text-[var(--text-muted)] leading-7">{item.message}</p>}
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <time className="text-xs text-[var(--text-muted)]">{new Date(item.created_at).toLocaleString("fa-IR")}</time>
                        <div className="flex gap-3">
                          {item.order_id && <Link href={`/orders/${item.order_id}`} className="text-xs font-bold text-[var(--primary)]">مشاهده سفارش</Link>}
                          {!item.read_at && <button type="button" onClick={() => markRead(item.id)} className="text-xs font-bold text-[var(--text-muted)]">خوانده شد</button>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassPanel>
      </div>
    </div>
  );
}
