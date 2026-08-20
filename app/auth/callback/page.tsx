"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function AuthCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;
        async function exchangeCode() {
            const code = searchParams.get("code");
            if (!code) {
                if (active) setError("کد ورود از گوگل دریافت نشد.");
                return;
            }
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (!active) return;
            if (exchangeError) {
                setError(exchangeError.message || "تکمیل ورود با گوگل انجام نشد.");
                return;
            }
            router.replace("/dashboard");
            router.refresh();
        }
        exchangeCode();
        return () => { active = false; };
    }, [router, searchParams]);

    return (
        <main dir="rtl" className="min-h-screen page-background flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-xl">
                {error ? (
                    <>
                        <h1 className="text-xl font-black text-[var(--text)]">ورود انجام نشد</h1>
                        <p className="mt-3 text-sm text-[var(--text-secondary)]">{error}</p>
                        <button type="button" onClick={() => router.replace("/auth?mode=login")} className="mt-6 rounded-xl bg-[var(--primary)] px-5 py-3 font-bold text-white">بازگشت به ورود</button>
                    </>
                ) : (
                    <>
                        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--primary)]" />
                        <h1 className="mt-5 text-xl font-black text-[var(--text)]">در حال تکمیل ورود...</h1>
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">لطفاً چند لحظه صبر کنید.</p>
                    </>
                )}
            </div>
        </main>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={
            <main dir="rtl" className="min-h-screen page-background flex items-center justify-center p-4">
                <div className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-xl">
                    <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[var(--border)] border-t-[var(--primary)]" />
                    <h1 className="mt-5 text-xl font-black text-[var(--text)]">در حال تکمیل ورود...</h1>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">لطفاً چند لحظه صبر کنید.</p>
                </div>
            </main>
        }>
            <AuthCallbackContent />
        </Suspense>
    );
}
