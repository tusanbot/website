"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { GlassPanel, SectionHeader } from "@/components/ui";
import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import { supabase } from "@/lib/supabase";

type Mode = "login" | "register" | "forgot";

export default function AuthContainer() {
    const searchParams = useSearchParams();
    const [mode, setMode] = useState<Mode>(() => {
        const value = searchParams.get("mode");
        return value === "register" || value === "forgot" ? value : "login";
    });
    const [googleLoading, setGoogleLoading] = useState(false);
    const [googleError, setGoogleError] = useState("");

    async function handleGoogleLogin() {
        setGoogleLoading(true);
        setGoogleError("");
        const redirectTo = `${window.location.origin}/auth/callback`;
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo },
        });
        if (error) {
            setGoogleError(error.message || "ورود با گوگل انجام نشد.");
            setGoogleLoading(false);
        }
    }

    return (
        <div className="w-full max-w-md">
            <GlassPanel className="p-6 sm:p-8">
                <div className="text-center mb-6">
                    <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center text-3xl">🛡️</div>
                    <SectionHeader title="حساب کاربری توسن" description="برای استفاده از خدمات کافی‌نت وارد حساب خود شوید یا ثبت‌نام کنید." />
                </div>
                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[var(--surface)] p-1 mb-6">
                    <button type="button" onClick={() => setMode("login")} className={`rounded-xl px-4 py-3 text-sm font-bold transition ${mode === "login" ? "bg-[var(--primary)] text-white shadow" : "text-[var(--text-secondary)] hover:bg-[var(--surface-strong)]"}`}>ورود</button>
                    <button type="button" onClick={() => setMode("register")} className={`rounded-xl px-4 py-3 text-sm font-bold transition ${mode === "register" ? "bg-[var(--primary)] text-white shadow" : "text-[var(--text-secondary)] hover:bg-[var(--surface-strong)]"}`}>ثبت‌نام</button>
                </div>
                <div className="transition-all duration-300">
                    {mode === "login" && <LoginForm onRegister={() => setMode("register")} onForgotPassword={() => setMode("forgot")} />}
                    {mode === "register" && <RegisterForm onLogin={() => setMode("login")} />}
                    {mode === "forgot" && <ForgotPasswordForm onLogin={() => setMode("login")} />}
                </div>
                <div className="my-6 flex items-center gap-3 text-[var(--text-muted)]">
                    <div className="h-px flex-1 bg-[var(--border)]" /><span className="text-xs font-medium">یا ادامه با</span><div className="h-px flex-1 bg-[var(--border)]" />
                </div>
                {googleError && <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{googleError}</div>}
                <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={handleGoogleLogin} disabled={googleLoading} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-bold text-[var(--text)] hover:bg-[var(--surface-strong)] transition disabled:opacity-60 disabled:cursor-not-allowed">{googleLoading ? "در حال اتصال..." : "🔵 Google"}</button>
                    <button type="button" disabled className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-bold text-[var(--text-secondary)] opacity-60 cursor-not-allowed">LinkedIn</button>
                </div>
                <p className="mt-6 text-center text-xs text-[var(--text-muted)] leading-6">با ورود یا ثبت‌نام، قوانین و شرایط استفاده از خدمات توسن را می‌پذیرید.</p>
            </GlassPanel>
        </div>
    );
}
