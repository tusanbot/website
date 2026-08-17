'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { TusanButton } from '@/components/ui';

export default function AuthButton() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);

    useEffect(() => {
        let mounted = true;

        async function checkAuth() {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!mounted) return;
            setAuthenticated(!!session);
            setLoading(false);
        }

        checkAuth();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!mounted) return;
            setAuthenticated(!!session);
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    function handleClick() {
        router.push(authenticated ? '/dashboard' : '/auth');
    }

    return (
        <TusanButton onClick={handleClick} disabled={loading}>
            {loading
                ? '...'
                : authenticated
                    ? 'ورود به داشبورد'
                    : 'ورود / ثبت‌نام'}
        </TusanButton>
    );
}