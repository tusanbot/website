'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { TusanInput, TusanButton } from '@/components/ui';

type Props = {
    onLogin: () => void;
};

export default function ForgotPasswordForm({ onLogin }: Props) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!email) {
            setError('ایمیل را وارد کنید.');
            return;
        }

        setLoading(true);

        try {
            const redirectTo =
                typeof window !== 'undefined'
                    ? `${window.location.origin}/auth/reset-password`
                    : undefined;

            const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                redirectTo,
            });

            if (error) {
                throw new Error('PASSWORD_RESET_FAILED');
            }

            setSuccess(
                'اگر این ایمیل در سیستم وجود داشته باشد، لینک بازیابی رمز عبور برای شما ارسال شد.'
            );
        } catch {
            setError('ارسال لینک بازیابی انجام نشد. لطفاً کمی بعد دوباره تلاش کنید.');
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

            {success && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {success}
                </div>
            )}

            <TusanInput
                type="email"
                placeholder="ایمیل"
                icon="mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />

            <TusanButton
                type="submit"
                className="w-full"
                disabled={loading}
            >
                {loading ? 'در حال ارسال...' : 'ارسال لینک بازیابی'}
            </TusanButton>

            <div className="text-center text-sm text-[var(--text-muted)] pt-2">
                رمز عبور را به خاطر آوردید؟{' '}
                <button
                    type="button"
                    onClick={onLogin}
                    className="text-[var(--primary)] font-bold hover:underline"
                >
                    بازگشت به ورود
                </button>
            </div>
        </form>
    );
}