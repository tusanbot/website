"use client";

import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

type Status = {
  value: string;
  label: string;
};

const statuses: Status[] = [
  { value: "registered", label: "ثبت شده" },
  { value: "checking", label: "در حال بررسی" },
  { value: "need_documents", label: "نیاز به مدارک" },
  { value: "processing", label: "در حال انجام" },
  { value: "ready", label: "آماده تحویل" },
  { value: "completed", label: "تکمیل شده" },
  { value: "cancelled", label: "لغو شده" },
  { value: "rejected", label: "رد شده" },
];

const statusLabels = Object.fromEntries(statuses.map((x) => [x.value, x.label]));

const managerTransitions: Record<string, string[]> = {
  checking: ["checking", "processing", "need_documents"],
  need_documents: ["need_documents", "processing"],
  processing: ["processing", "ready", "need_documents"],
  ready: ["ready"],
};

export default function AdminOrderStatus({
  orderId,
  currentStatus,
  onUpdate,
}: {
  orderId: string;
  currentStatus: string;
  onUpdate: () => void;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOrderManager, setIsOrderManager] = useState(false);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => setStatus(currentStatus), [currentStatus]);

  useEffect(() => {
    let active = true;

    async function loadRole() {
      setRoleLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const [{ data: profile }, { data: assignment }] = await Promise.all([
          supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
          supabase
            .from("staff_role_assignments")
            .select("status,staff_roles!inner(code)")
            .eq("user_id", user.id)
            .eq("status", "approved")
            .eq("staff_roles.code", "order_manager")
            .maybeSingle(),
        ]);

        if (!active) return;
        setIsAdmin(profile?.role === "admin");
        setIsOrderManager(Boolean(assignment));
      } catch {
        if (active) {
          setIsAdmin(false);
          setIsOrderManager(false);
        }
      } finally {
        if (active) setRoleLoading(false);
      }
    }

    void loadRole();
    return () => {
      active = false;
    };
  }, []);

  const allowedStatuses = isAdmin
    ? statuses
    : isOrderManager
      ? (managerTransitions[currentStatus] ?? [currentStatus]).map(
          (value) => statuses.find((item) => item.value === value)!
        )
      : [];

  async function saveStatus() {
    if (status === currentStatus) {
      alert("وضعیت تغییری نکرده است");
      return;
    }

    if (!isAdmin && !isOrderManager) {
      alert("شما مجوز تغییر وضعیت این سفارش را ندارید.");
      return;
    }

    if (!isAdmin && !managerTransitions[currentStatus]?.includes(status)) {
      alert("این وضعیت برای مدیر سفارشات مجاز نیست.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("update_staff_order_status", {
        p_order_id: orderId,
        p_status: status,
        p_note: `تغییر وضعیت سفارش به «${statusLabels[status] || status}»`,
      });

      if (error || data !== true) {
        throw new Error(error?.message || "تغییر وضعیت سفارش ناموفق بود.");
      }

      alert("وضعیت سفارش با موفقیت تغییر کرد.");
      onUpdate();
    } catch (e: any) {
      alert(e?.message || "تغییر وضعیت سفارش ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }

  if (roleLoading) {
    return <div className="text-sm text-gray-500">در حال بررسی دسترسی...</div>;
  }

  if (!isAdmin && !isOrderManager) {
    return <div className="text-sm text-gray-500">شما دسترسی تغییر وضعیت سفارش را ندارید.</div>;
  }

  return (
    <div className="flex gap-2 items-center">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        disabled={loading}
        className="border rounded p-2"
      >
        {allowedStatuses.map((x) => (
          <option key={x.value} value={x.value}>
            {x.label}
          </option>
        ))}
      </select>
      <button
        onClick={() => void saveStatus()}
        disabled={loading}
        className="bg-[#09967C] text-white px-4 py-2 rounded disabled:opacity-60"
      >
        {loading ? "در حال ذخیره..." : "ثبت تغییر"}
      </button>
    </div>
  );
}
