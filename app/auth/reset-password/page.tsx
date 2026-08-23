'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { GlassPanel, TusanInput, TusanButton, SectionHeader } from '@/components/ui';

export default function ResetPasswordPage() {
    const router = useRouter();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!password || !confirmPassword) {
            setError('هر دو فیلد را تکمیل کنید.');
            return;
        }

        if (password.length < 6) {
            setError('رمز عبور باید حداقل ۶ کاراکتر باشد.');
            return;
        }

        if (password !== confirmPassword) {
            setError('رمز عبور و تکرار آن یکسان نیست.');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password,
            });

            if (error) {
                throw new Error('PASSWORD_UPDATE_FAILED');
            }

            setSuccess('رمز عبور با موفقیت تغییر کرد.');

            setTimeout(() => {
                router.push('/auth');
            }, 1500);
        } catch {
            setError('تغییر رمز عبور انجام نشد. لطفاً دوباره از لینک بازیابی استفاده کنید.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div dir="rtl" className="min-h-screen page-background flex items-center justify-center p-4">
            <GlassPanel className="w-full max-w-md p-6">
                <SectionHeader
                    title="تعیین رمز عبور جدید"
                    description="رمز عبور جدید خود را وارد کنید."
                />

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
                        type="password"
                        placeholder="رمز عبور جدید"
                        icon="lock"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    <TusanInput
                        type="password"
                        placeholder="تکرار رمز عبور جدید"
                        icon="lock"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />

                    <TusanButton
                        type="submit"
                        className="w-full"
                        disabled={loading}
                    >
                        {loading ? 'در حال ذخیره...' : 'ذخیره رمز جدید'}
                    </TusanButton>
                </form>
            </GlassPanel>
        </div>
    );
}
