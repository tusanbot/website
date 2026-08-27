"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string | null;
  order_id: string | null;
  created_at: string;
  read_at: string | null;
};

export default function NotificationBell() {
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);

  async function load(id: string) {
    const { data } = await supabase
      .from("notifications")
      .select("id,type,title,message,order_id,created_at,read_at")
      .eq("recipient_id", id)
      .order("created_at", { ascending: false })
      .limit(8);
    setItems((data || []) as NotificationItem[]);
  }

  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!mounted || !user) return;
      setUserId(user.id);
      load(user.id);

      channel = supabase
        .channel(`central-notifications-${user.id}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${user.id}` }, (payload) => {
          const next = payload.new as NotificationItem;
          setItems((current) => [next, ...current.filter((item) => item.id !== next.id)].slice(0, 8));
        })
        .subscribe();
    });

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const unread = useMemo(() => items.filter((item) => !item.read_at).length, [items]);

  async function markRead(id: string) {
    if (!userId) return;
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("id", id)
      .eq("recipient_id", userId)
      .is("read_at", null);
    if (!error) setItems((current) => current.map((item) => item.id === id ? { ...item, read_at: now } : item));
  }

  async function markAllRead() {
    if (!userId || unread === 0) return;
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("recipient_id", userId)
      .is("read_at", null);
    if (!error) setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at || now })));
  }

  return (
    <div className="relative">
      <button type="button" aria-label="اعلان‌ها" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="relative rounded-xl border border-[var(--border)] px-3 py-2 hover:bg-[var(--background)] transition">
        🔔
        {unread > 0 && <span className="absolute -right-1 -top-1 min-w-5 h-5 rounded-full bg-red-500 text-white text-[11px] font-black flex items-center justify-center px-1">{unread > 9 ? "۹+" : unread.toLocaleString("fa-IR")}</span>}
      </button>

      {open && (
        <>
          <button aria-label="بستن اعلان‌ها" className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-12 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl overflow-hidden" dir="rtl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <span className="font-black">اعلان‌ها</span>
              <div className="flex items-center gap-3">
                {unread > 0 && <button type="button" onClick={markAllRead} className="text-xs font-bold text-[var(--text-muted)]">خواندن همه</button>}
                <Link href="/notifications" onClick={() => setOpen(false)} className="text-xs font-bold text-[var(--primary)]">مشاهده همه</Link>
              </div>
            </div>
            {items.length === 0 ? <div className="p-6 text-center text-sm text-[var(--text-muted)]">اعلان جدیدی ندارید.</div> : (
              <div className="max-h-96 overflow-y-auto divide-y divide-[var(--border)]">
                {items.map((item) => (
                  <button key={item.id} type="button" onClick={() => markRead(item.id)} className={`w-full text-right px-4 py-3 hover:bg-[var(--background)] ${!item.read_at ? "bg-[var(--primary)]/5" : ""}`}>
                    <div className="flex gap-2 items-start">
                      {!item.read_at && <span className="mt-1.5 w-2 h-2 rounded-full bg-[var(--primary)] shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm">{item.title}</div>
                        {item.message && <div className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{item.message}</div>}
                        <div className="text-[10px] text-[var(--text-muted)] mt-2">{new Date(item.created_at).toLocaleString("fa-IR")}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
