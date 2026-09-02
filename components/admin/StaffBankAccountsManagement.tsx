"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { GlassPanel, TusanButton } from "@/components/ui";

type BankAccount = {
  id: string;
  user_id: string;
  account_title: string;
  iban: string;
  account_number: string | null;
  is_default: boolean;
  is_active: boolean;
  status: "pending" | "approved" | "rejected" | string;
  created_at: string;
  verified_at: string | null;
  profile: { full_name: string | null; phone: string | null } | null;
};

const statusLabel: Record<string, string> = {
  pending: "در انتظار تأیید",
  approved: "تأیید شده",
  rejected: "رد شده",
};

const maskIban = (iban: string) => {
  if (!iban) return "—";
  return iban.length > 8 ? `${iban.slice(0, 4)}••••••••${iban.slice(-6)}` : iban;
};

export default function StaffBankAccountsManagement() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setMessage("");
    const { data, error } = await supabase
      .from("staff_bank_accounts")
      .select(
        "id,user_id,account_title,iban,account_number,is_default,is_active,status,created_at,verified_at,profile:profiles!staff_bank_accounts_user_id_fkey(full_name,phone)",
      )
      .order("status", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      setAccounts([]);
    } else {
      setAccounts((data || []) as unknown as BankAccount[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function setStatus(id: string, status: "approved" | "rejected") {
    setBusy(id);
    setMessage("");
    const { error } = await supabase.rpc("admin_set_bank_account_status", {
      p_account_id: id,
      p_status: status,
    });
    if (error) setMessage(error.message);
    else await load();
    setBusy(null);
  }

  const pendingCount = accounts.filter((item) => item.status === "pending").length;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-black">حساب‌های بانکی کارکنان</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            حساب‌های ثبت‌شده را بررسی و قبل از استفاده برای تسویه تأیید کنید.
          </p>
        </div>
        <div className="rounded-xl bg-[var(--surface-muted)] px-4 py-2 text-sm font-bold">
          {pendingCount.toLocaleString("fa-IR")} حساب در انتظار تأیید
        </div>
      </div>

      {message && <GlassPanel className="p-4 text-sm">{message}</GlassPanel>}

      {loading ? (
        <GlassPanel className="p-8 text-center">در حال دریافت حساب‌های بانکی...</GlassPanel>
      ) : accounts.length === 0 ? (
        <GlassPanel className="p-8 text-center text-sm text-[var(--text-muted)]">
          هنوز حساب بانکی‌ای برای بررسی ثبت نشده است.
        </GlassPanel>
      ) : (
        <div className="grid gap-4">
          {accounts.map((account) => (
            <GlassPanel key={account.id} className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black text-lg">
                      {account.profile?.full_name || "کارمند بدون نام"}
                    </h3>
                    <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-bold">
                      {statusLabel[account.status] || account.status}
                    </span>
                    {account.is_default && (
                      <span className="rounded-full bg-[var(--primary)]/10 px-3 py-1 text-xs font-bold text-[var(--primary)]">
                        حساب پیش‌فرض
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-sm text-[var(--text-muted)]">
                    {account.profile?.phone || "شماره تماس ثبت نشده"}
                  </div>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <span className="text-[var(--text-muted)]">عنوان حساب: </span>
                      <b>{account.account_title}</b>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)]">شماره شبا: </span>
                      <b dir="ltr" className="font-mono">{maskIban(account.iban)}</b>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)]">شماره حساب: </span>
                      <b dir="ltr" className="font-mono">{account.account_number || "—"}</b>
                    </div>
                    <div>
                      <span className="text-[var(--text-muted)]">تاریخ ثبت: </span>
                      <b>{new Date(account.created_at).toLocaleDateString("fa-IR")}</b>
                    </div>
                  </div>
                </div>

                {account.status === "pending" && (
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <TusanButton
                      disabled={busy === account.id}
                      onClick={() => void setStatus(account.id, "approved")}
                    >
                      تأیید حساب
                    </TusanButton>
                    <TusanButton
                      variant="secondary"
                      disabled={busy === account.id}
                      onClick={() => void setStatus(account.id, "rejected")}
                    >
                      رد حساب
                    </TusanButton>
                  </div>
                )}
              </div>
            </GlassPanel>
          ))}
        </div>
      )}
    </section>
  );
}
