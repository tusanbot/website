'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { TusanInput, TusanButton } from '@/components/ui';

type Props = {
    onLogin: () => void;
    referralCode?: string | null;
};

export default function RegisterForm({ onLogin, referralCode }: Props) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [showExtra, setShowExtra] = useState(false);

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const activeReferralCode = (referralCode || (typeof window !== 'undefined' ? localStorage.getItem('tusan_referral') : '') || '').trim().toUpperCase();

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
            const redirectOrigin = typeof window !== 'undefined' ? window.location.origin : '';
            const emailRedirectTo = activeReferralCode && redirectOrigin
                ? `${redirectOrigin}/auth/callback?next=/dashboard&ref=${encodeURIComponent(activeReferralCode)}`
                : redirectOrigin
                    ? `${redirectOrigin}/auth/callback?next=/dashboard`
                    : undefined;

            const { data, error } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: {
                    ...(activeReferralCode ? { data: { referral_code: activeReferralCode } } : {}),
                    ...(emailRedirectTo ? { emailRedirectTo } : {}),
                },
            });

            if (error) {
                throw new Error('SIGNUP_FAILED');
            }

            const user = data.user;

            if (user) {
                const fullName = [firstName, lastName]
                    .filter(Boolean)
                    .join(' ')
                    .trim();

                // member_tag_assignments has a foreign key to profiles(id),
                // so the profile must exist before a referral tag can be claimed.
                const { error: profileError } = await supabase.from('profiles').upsert({
                    id: user.id,
                    full_name: fullName || null,
                    phone: phone || null,
                });

                if (profileError) {
                    console.error('Profile upsert failed:', profileError);
                } else if (activeReferralCode && data.session) {
                    try {
                        const claimResponse = await fetch('/api/referral/claim', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ code: activeReferralCode }),
                        });

                        if (claimResponse.ok) {
                            localStorage.removeItem('tusan_referral');
                        } else {
                            console.error('Referral claim failed:', await claimResponse.text().catch(() => ''));
                        }
                    } catch (claimError) {
                        console.error('Referral claim failed:', claimError);
                    }
                }
            }

            setSuccess(
                'ثبت‌نام انجام شد. اگر تأیید ایمیل فعال باشد، لطفاً ایمیل خود را بررسی کنید.'
            );
        } catch {
            setError('ثبت‌نام انجام نشد. لطفاً اطلاعات را بررسی کرده و دوباره تلاش کنید.');
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