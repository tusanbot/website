"use client";

import { useState } from "react";
import AppSidebar from "./AppSidebar";

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);

    return (
        <div
            dir="rtl"
            className="min-h-screen bg-[var(--background)] text-[var(--text)]"
        >
            <div className="flex">
                {/* دسکتاپ */}
                <aside className="hidden lg:block w-72 p-4">
                    <AppSidebar />
                </aside>

                {/* موبایل */}
                {open && (
                    <>
                        <div
                            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
                            onClick={() => setOpen(false)}
                        />

                        <aside className="fixed right-0 top-0 z-50 h-full w-72 lg:hidden">
                            <AppSidebar
                                mobile
                                onClose={() => setOpen(false)}
                            />
                        </aside>
                    </>
                )}

                <div className="flex-1 min-w-0">
                    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur">
                        <div className="flex h-16 items-center justify-between px-4 lg:px-6">
                            <button
                                type="button"
                                className="lg:hidden rounded-xl border border-[var(--border)] px-3 py-2"
                                onClick={() => setOpen(true)}
                            >
                                ☰
                            </button>

                            <div className="font-bold">پنل توسن</div>

                            <div />
                        </div>
                    </header>

                    <main className="p-4 lg:p-6">{children}</main>
                </div>
            </div>
        </div>
    );
}