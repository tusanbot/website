'use client';

import { Suspense } from 'react';
import AuthContainer from '@/components/auth/AuthContainer';

export default function AuthPage() {
    return (
        <div
            dir="rtl"
            className="min-h-screen page-background flex items-center justify-center p-4"
        >
            <Suspense
                fallback={
                    <div className="w-full max-w-md">
                        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-xl">
                            <div className="animate-pulse space-y-6">
                                <div className="mx-auto h-16 w-16 rounded-2xl bg-[var(--border)]" />
                                <div className="mx-auto h-6 w-48 rounded bg-[var(--border)]" />
                                <div className="mx-auto h-4 w-64 rounded bg-[var(--border)]" />
                                <div className="h-12 rounded-xl bg-[var(--border)]" />
                                <div className="h-12 rounded-xl bg-[var(--border)]" />
                            </div>
                        </div>
                    </div>
                }
            >
                <AuthContainer />
            </Suspense>
        </div>
    );
}