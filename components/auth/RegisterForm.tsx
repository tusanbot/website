'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { TusanInput, TusanButton } from '@/components/ui';

type Props = {
    onLogin: () => void;
};

export default function RegisterForm({ onLogin }: Props) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [showExtra, setShowExtra] = useState(false);

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!email || !password) {
            setError('ایمیل و رمز عبور الزامی است.');
            return;
        }

        if (password.length < 6) {
            setError('رمز عبور باید حداقل ۶ کاراکتر باشد.');
            return;
        }

        setLoading(true);

        try {
            const { data, error } = await supabase.auth.signUp({
                email: email.trim(),
                password,
            });

            if (error) throw error;

            const user = data.user;

            if (user) {
                const fullName = [firstName, lastName]
                    .filter(Boolean)
                    .join(' ')
                    .trim();

                await supabase.from('profiles').upsert({
                    id: user.id,
                    full_name: fullName || null,
                    phone: phone || null,
                });
            }

            setSuccess(
                'ثبت‌نام انجام شد. اگر تأیید ایمیل فعال باشد، لطفاً ایمیل خود را بررسی کنید.'
            );
        } catch (err: any) {
            setError(err?.message || 'ثبت‌نام انجام نشد.');
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

            <TusanInput
                type="password"
                placeholder="رمز عبور"
                icon="lock"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />

            <button
                type="button"
                onClick={() => setShowExtra((v) => !v)}
                className="text-sm text-[var(--primary)] font-bold hover:underline"
            >
                {showExtra ? 'بستن اطلاعات تکمیلی' : 'اطلاعات تکمیلی (اختیاری)'}
            </button>

            {showExtra && (
                <div className="space-y-4 pt-2 border-t border-[var(--border)]">
                    <TusanInput
                        type="text"
                        placeholder="نام"
                        icon="user"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                    />

                    <TusanInput
                        type="text"
                        placeholder="نام خانوادگی"
                        icon="user"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                    />

                    <TusanInput
                        type="tel"
                        placeholder="شماره تلفن"
                        icon="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                    />
                </div>
            )}

            <TusanButton
                type="submit"
                className="w-full"
                disabled={loading}
            >
                {loading ? 'در حال ثبت‌نام...' : 'ثبت‌نام'}
            </TusanButton>

            <div className="text-center text-sm text-[var(--text-muted)] pt-2">
                قبلاً ثبت‌نام کرده‌اید؟{' '}
                <button
                    type="button"
                    onClick={onLogin}
                    className="text-[var(--primary)] font-bold hover:underline"
                >
                    وارد شوید
                </button>
            </div>
        </form>
    );
}