'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { TusanInput, TusanButton } from '@/components/ui';

type Props = {
    onRegister: () => void;
    onForgotPassword: () => void;
};

export default function LoginForm({
    onRegister,
    onForgotPassword,
}: Props) {
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('ایمیل و رمز عبور را وارد کنید.');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });

            if (error) throw error;

            router.push('/dashboard');
            router.refresh();
        } catch (err: any) {
            setError(err?.message || 'ورود انجام نشد.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            <TusanInput
                type="email"
                placeholder="ایمیل"
                icon="mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />

            <TusanInput
                type="password"
                placeholder="رمز عبور"
                icon="lock"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />

            <TusanButton
                type="submit"
                className="w-full"
                disabled={loading}
            >
                {loading ? "در حال ورود..." : "ورود"}
            </TusanButton>

            <div className="text-center text-sm text-[var(--text-muted)] pt-2">
                حساب کاربری ندارید؟
                <button
                    type="button"
                    onClick={onRegister}
                    className="text-[var(--primary)] font-bold hover:underline"
                >
                    ثبت‌نام کنید
                </button>
            </div>

            <div className="text-center">
                <button
                    type="button"
                    onClick={onForgotPassword}
                    className="text-sm text-[var(--primary)] font-bold hover:underline"
                >
                    رمز عبور را فراموش کرده‌ام
                </button>
            </div>
        </form>
    );
}