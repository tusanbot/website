"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import StaffRoleManagement from "@/components/admin/StaffRoleManagement";
import StaffBankAccountsManagement from "@/components/admin/StaffBankAccountsManagement";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  strengths: string[];
  weaknesses: string[];
  created_at: string;
};

type StaffRole = {
  id: string;
  code: string;
  name: string;
  status: string;
  commission_percent: number | null;
};

type Staff = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  rank: number;
  average_rating: number | null;
  review_count: number;
  roles: StaffRole[];
  reviews: Review[];
};

export default function StaffManagement() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selected, setSelected] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("نشست مدیریت معتبر نیست.");
      }

      const response = await fetch("/api/admin/staff", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || "خطا در دریافت اطلاعات کارکنان");
      }

      const nextStaff = (json.staff || []) as Staff[];
      setStaff(nextStaff);
      setSelected((current) =>
        current ? nextStaff.find((item) => item.id === current.id) || null : null,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "خطا در دریافت اطلاعات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const overallAverage = staff.length
    ? staff.reduce((sum, item) => sum + (item.average_rating ?? 0), 0) / staff.length
    : null;
  const totalReviews = staff.reduce((sum, item) => sum + item.review_count, 0);

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">مدیریت مدیران و اپراتورها</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            مقام‌ها، امتیازات، رتبه‌بندی و نظرات کارکنان
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-xl border px-4 py-2 text-sm font-bold"
        >
          بروزرسانی
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border p-8 text-center">در حال بارگذاری...</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border p-5">
              <div className="text-sm text-[var(--text-muted)]">تعداد کارکنان فعال</div>
              <div className="mt-2 text-3xl font-black">{staff.length}</div>
            </div>
            <div className="rounded-2xl border p-5">
              <div className="text-sm text-[var(--text-muted)]">میانگین امتیاز کل</div>
              <div className="mt-2 text-3xl font-black">
                {overallAverage == null ? "—" : overallAverage.toFixed(2)} ⭐
              </div>
            </div>
            <div className="rounded-2xl border p-5">
              <div className="text-sm text-[var(--text-muted)]">کل نظرات</div>
              <div className="mt-2 text-3xl font-black">{totalReviews}</div>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
            <div className="overflow-hidden rounded-2xl border">
              <div className="border-b p-4 font-black">مدیران و اپراتورها — رتبه‌بندی</div>
              {staff.length === 0 ? (
                <div className="p-8 text-center text-sm text-[var(--text-muted)]">
                  هنوز مقام فعالی ثبت نشده است.
                </div>
              ) : (
                staff.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setSelected(item)}
                    className={`w-full border-b p-4 text-right ${
                      selected?.id === item.id
                        ? "bg-[var(--primary)]/10"
                        : "hover:bg-[var(--surface-muted)]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)]/10 font-black">
                        #{item.rank}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-black">
                          {item.full_name || item.email || "بدون نام"}
                        </div>
                        <div className="mt-1 text-xs text-[var(--text-muted)]">
                          {item.roles.map((role) => role.name).join("، ") || "بدون مقام فعال"}
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="font-black">
                          {item.average_rating == null ? "—" : item.average_rating.toFixed(2)} ⭐
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)]">
                          {item.review_count} نظر
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="rounded-2xl border p-5">
              {!selected ? (
                <div className="flex min-h-[500px] items-center justify-center text-[var(--text-muted)]">
                  یک مدیر یا اپراتور را انتخاب کنید.
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-black">{selected.full_name || "بدون نام"}</h2>
                      <div className="mt-1 text-sm text-[var(--text-muted)]">
                        {selected.email || "—"} · {selected.phone || "—"}
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="text-2xl font-black">
                        {selected.average_rating == null
                          ? "—"
                          : selected.average_rating.toFixed(2)} ⭐
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        رتبه #{selected.rank} · {selected.review_count} نظر
                      </div>
                    </div>
                  </div>

                  <StaffRoleManagement userId={selected.id} />

                  <section>
                    <h3 className="mb-3 text-lg font-black">نظرات ثبت‌شده</h3>
                    {selected.reviews.length === 0 ? (
                      <div className="rounded-xl border p-5 text-sm text-[var(--text-muted)]">
                        نظری برای این مدیر/اپراتور ثبت نشده است.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selected.reviews.map((review) => (
                          <div key={review.id} className="rounded-xl border p-4">
                            <div className="flex justify-between gap-3">
                              <b>
                                {"★".repeat(review.rating)}
                                {"☆".repeat(5 - review.rating)}
                              </b>
                              <span className="text-xs text-[var(--text-muted)]">
                                {new Date(review.created_at).toLocaleDateString("fa-IR")}
                              </span>
                            </div>
                            {review.comment && (
                              <p className="mt-2 text-sm leading-7">{review.comment}</p>
                            )}
                            {review.strengths?.length > 0 && (
                              <div className="mt-2 text-xs">
                                <b>نقاط قوت:</b> {review.strengths.join("، ")}
                              </div>
                            )}
                            {review.weaknesses?.length > 0 && (
                              <div className="mt-1 text-xs">
                                <b>نقاط ضعف:</b> {review.weaknesses.join("، ")}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              )}
            </div>
          </div>

          <StaffBankAccountsManagement />
        </>
      )}
    </div>
  );
}
