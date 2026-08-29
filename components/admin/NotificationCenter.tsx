'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  href?: string;
  created_at: string;
  read_at?: string | null;
};

export default function NotificationCenter() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/notifications', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { notifications: [] }))
      .then((data) => {
        if (active) setItems(Array.isArray(data.notifications) ? data.notifications : []);
      })
      .catch(() => {
        if (active) setItems([]);
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const unread = items.filter((item) => !item.read_at).length;

  return (
    <section aria-label="اعلان‌ها" className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold">اعلان‌ها {unread > 0 && <span className="mr-2 rounded-full px-2 py-0.5 text-xs">{unread}</span>}</h2>
        <Link href="/admin/notifications" className="text-sm">مشاهده همه</Link>
      </div>
      {loading ? <p className="text-sm opacity-60">در حال بارگذاری...</p> : items.length === 0 ? <p className="text-sm opacity-60">اعلان جدیدی وجود ندارد.</p> : (
        <div className="space-y-2">
          {items.slice(0, 8).map((item) => (
            <Link key={item.id} href={item.href || '/admin/notifications'} className="block rounded-xl border p-3 hover:bg-gray-50">
              <div className="flex items-center justify-between gap-3"><strong>{item.title}</strong>{!item.read_at && <span aria-label="خوانده نشده" className="h-2 w-2 rounded-full" />}</div>
              <p className="mt-1 text-sm opacity-70">{item.message}</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
