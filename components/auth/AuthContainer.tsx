"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { GlassPanel, SectionHeader } from "@/components/ui";

import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

type Mode = "login" | "register" | "forgot";

export default function AuthContainer() {
    const searchParams = useSearchParams();

    const [mode, setMode] = useState<Mode>("login");

    useEffect(() => {
        const value = searchParams.get("mode");

        if (
            value === "login" ||
            value === "register" ||
            value === "forgot"
        ) {
            setMode(value);
        }

    }, [searchParams]);

    return (
        <div className="w-full max-w-md">
            <GlassPanel className="p-6 sm:p-8">
                <div className="text-center mb-6">
                    <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center text-3xl">
                        🛡️
                    </div>

                    <SectionHeader
                        title="حساب کاربری توسن"
                        description="برای استفاده از خدمات کافی‌نت وارد حساب خود شوید یا ثبت‌نام کنید."
                    />
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[var(--surface)] p-1 mb-6">
                    <button
                        type="button"
                        onClick={() => setMode("login")}
                        className={`rounded-xl px-4 py-3 text-sm font-bold transition ${mode === "login"
                                ? "bg-[var(--primary)] text-white shadow"
                                : "text-[var(--text-secondary)] hover:bg-white/70"
                            }`}
                    >
                        ورود
                    </button>

                    <button
                        type="button"
                        onClick={() => setMode("register")}
                        className={`rounded-xl px-4 py-3 text-sm font-bold transition ${mode === "register"
                                ? "bg-[var(--primary)] text-white shadow"
                                : "text-[var(--text-secondary)] hover:bg-white/70"
                            }`}
                    >
                        ثبت‌نام
                    </button>
                </div>

                <div className="transition-all duration-300">
                    {mode === "login" && (
                        <LoginForm
                            onRegister={() => setMode("register")}
                            onForgotPassword={() => setMode("forgot")}
                        />
                    )}

                    {mode === "register" && (
                        <RegisterForm
                            onLogin={() => setMode("login")}
                        />
                    )}

                    {mode === "forgot" && (
                        <ForgotPasswordForm
                            onLogin={() => setMode("login")}
                        />
                    )}
                </div>

                <div className="my-6 flex items-center gap-3 text-[var(--text-muted)]">
                    <div className="h-px flex-1 bg-[var(--border)]" />
                    <span className="text-xs font-medium">
                        یا ادامه با
                    </span>
                    <div className="h-px flex-1 bg-[var(--border)]" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        disabled
                        className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-bold text-[var(--text-secondary)] opacity-60 cursor-not-allowed"
                    >
                        Google
                    </button>

                    <button
                        type="button"
                        disabled
                        className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-bold text-[var(--text-secondary)] opacity-60 cursor-not-allowed"
                    >
                        LinkedIn
                    </button>
                </div>

                <p className="mt-6 text-center text-xs text-[var(--text-muted)] leading-6">
                    با ورود یا ثبت‌نام، قوانین و شرایط استفاده از خدمات توسن را می‌پذیرید.
                </p>
            </GlassPanel>
        </div>

    );
}