'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string | null;
  order_id: string | null;
  created_at: string;
  read_at: string | null;
};

const icons: Record<string, string> = {
  new_order: '📋',
  order_created: '📋',
  order_status_changed: '🔄',
  payment_status: '💳',
  payment_success: '💳',
  receipt_uploaded: '🧾',
  new_message: '💬',
  document_requested: '📎',
  documents_requested: '📎',
  order_completed: '✅',
};

export default function NotificationCenter() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);

  async function load() {
    try {
      const response = await fetch('/api/notifications?limit=8', { cache: 'no-store' });
      if (!response.ok) throw new Error('failed to load notifications');
      const data = await response.json();
      const next = Array.isArray(data.notifications) ? data.notifications : [];
      setItems(next);
      setUnread(next.filter((item: NotificationItem) => !item.read_at).length);
    } catch {
      setItems([]);
      setUnread(0);
    } finally {
      setLoading(false);
    }
  }

  async function markAllRead() {
    if (!unread) return;
    const response = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    });
    if (response.ok) {
      setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
      setUnread(0);
    }
  }

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 30000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <section aria-label="اعلان‌ها" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm" dir="rtl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-bold">اعلان‌ها</h2>
          {unread > 0 && <span className="min-w-6 rounded-full bg-red-500 px-2 py-0.5 text-center text-xs text-white">{unread.toLocaleString('fa-IR')}</span>}
        </div>
        <div className="flex items-center gap-3">
          {unread > 0 && <button type="button" onClick={markAllRead} className="text-xs font-bold text-[var(--text-muted)]">خواندن همه</button>}
          <Link href="/notifications" className="text-sm font-bold text-[var(--primary)]">مشاهده همه</Link>
        </div>
      </div>
      {loading ? <p className="text-sm opacity-60">در حال بارگذاری...</p> : items.length === 0 ? <p className="text-sm opacity-60">اعلان جدیدی وجود ندارد.</p> : (
        <div className="space-y-2">
          {items.map((item) => (
            <Link key={item.id} href={item.order_id ? `/admin/orders/${item.order_id}` : '/notifications'} className={`block rounded-xl border border-[var(--border)] p-3 transition hover:bg-[var(--background)] ${!item.read_at ? 'bg-[var(--primary)]/5' : ''}`}>
              <div className="flex items-start gap-2">
                <span aria-hidden="true">{icons[item.type] || '🔔'}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3"><strong className="text-sm">{item.title}</strong>{!item.read_at && <span aria-label="خوانده نشده" className="h-2 w-2 shrink-0 rounded-full bg-[var(--primary)]" />}</div>
                  {item.message && <p className="mt-1 line-clamp-2 text-sm opacity-70">{item.message}</p>}
                  <time className="mt-1 block text-[10px] opacity-50">{new Date(item.created_at).toLocaleString('fa-IR')}</time>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
