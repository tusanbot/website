"use client";

import Script from "next/script";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type GoogleCredentialResponse = { credential: string };
type GooglePromptNotification = {
    isNotDisplayed: () => boolean;
    isSkippedMoment: () => boolean;
    getNotDisplayedReason?: () => string;
    getSkippedReason?: () => string;
};
type GoogleAccountsId = {
    initialize: (config: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void | Promise<void>;
        nonce?: string;
        context?: "signin" | "signup" | "use";
        auto_select?: boolean;
        itp_support?: boolean;
        cancel_on_tap_outside?: boolean;
    }) => void;
    prompt: (listener?: (notification: GooglePromptNotification) => void) => void;
    cancel: () => void;
    renderButton: (parent: HTMLElement, options: {
        type?: "standard" | "icon";
        theme?: "outline" | "filled_blue" | "filled_black";
        size?: "large" | "medium" | "small";
        text?: "signin_with" | "signup_with" | "continue_with" | "signin";
        shape?: "rectangular" | "pill" | "circle" | "square";
        width?: number;
        logo_alignment?: "left" | "center";
    }) => void;
};

declare global {
    interface Window {
        google?: { accounts?: { id?: GoogleAccountsId } };
    }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

async function generateNonce(): Promise<{ raw: string; hashed: string }> {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const raw = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    const hashed = Array.from(new Uint8Array(hashBuffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
    return { raw, hashed };
}

export default function GoogleOneTap() {
    const pathname = usePathname();
    const router = useRouter();
    const initializedRef = useRef(false);
    const scriptReadyRef = useRef(false);
    const initializingRef = useRef(false);
    const nonceRef = useRef<string | null>(null);
    const fallbackRef = useRef<HTMLDivElement | null>(null);
    const [showFallback, setShowFallback] = useState(false);

    const isAuthRoute = pathname === "/auth" || pathname.startsWith("/auth/");

    const cancelPrompt = useCallback(() => {
        window.google?.accounts?.id?.cancel();
    }, []);

    // Keep a standards-based OAuth path available if the Google ID-token exchange
    // is rejected by Auth. The callback route exchanges the code into the same
    // Supabase browser session and then returns the user to the dashboard.
    const startOAuthFallback = useCallback(async () => {
        if (isAuthRoute) return;
        const redirectTo = `${window.location.origin}/auth/callback?next=/dashboard`;
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo },
        });
        if (error) console.error("Google OAuth fallback failed:", error.message);
    }, [isAuthRoute]);

    const handleCredential = useCallback(async (response: GoogleCredentialResponse) => {
        const nonce = nonceRef.current;
        if (!response.credential || !nonce) return;

        const { data, error } = await supabase.auth.signInWithIdToken({
            provider: "google",
            token: response.credential,
            nonce,
        });

        if (error || !data.session) {
            console.error("Google ID-token sign-in failed:", error?.message ?? "No Supabase session returned");
            // Do not leave the user apparently logged out after Google accepted
            // the account. Continue through Supabase's normal OAuth flow.
            await startOAuthFallback();
            return;
        }

        setShowFallback(false);
        cancelPrompt();
        router.replace("/dashboard");
        router.refresh();
    }, [cancelPrompt, router, startOAuthFallback]);

    const renderFallbackButton = useCallback(() => {
        const googleId = window.google?.accounts?.id;
        const container = fallbackRef.current;
        if (!googleId || !container || isAuthRoute) return;
        container.innerHTML = "";
        googleId.renderButton(container, {
            type: "standard",
            theme: "outline",
            size: "large",
            text: "signin_with",
            shape: "pill",
            width: 230,
            logo_alignment: "left",
        });
    }, [isAuthRoute]);

    const showPrompt = useCallback(async () => {
        const googleId = window.google?.accounts?.id;
        if (!GOOGLE_CLIENT_ID || !googleId || !initializedRef.current || isAuthRoute) return;

        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
            setShowFallback(false);
            cancelPrompt();
            return;
        }

        setShowFallback(false);
        googleId.prompt((notification) => {
            if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                console.info(
                    "Google One Tap unavailable:",
                    notification.getNotDisplayedReason?.() ?? notification.getSkippedReason?.() ?? "unknown",
                );
                setShowFallback(true);
            }
        });
    }, [cancelPrompt, isAuthRoute]);

    const initialize = useCallback(async () => {
        const googleId = window.google?.accounts?.id;
        if (!GOOGLE_CLIENT_ID || !googleId || initializedRef.current || initializingRef.current || isAuthRoute) return;

        initializingRef.current = true;
        try {
            const { data } = await supabase.auth.getSession();
            if (data.session?.user) return;

            const { raw, hashed } = await generateNonce();
            nonceRef.current = raw;
            googleId.initialize({
                client_id: GOOGLE_CLIENT_ID,
                nonce: hashed,
                context: "signin",
                auto_select: false,
                itp_support: true,
                cancel_on_tap_outside: true,
                callback: handleCredential,
            });
            initializedRef.current = true;
            await showPrompt();
        } finally {
            initializingRef.current = false;
        }
    }, [handleCredential, isAuthRoute, showPrompt]);

    const handleScriptReady = useCallback(() => {
        scriptReadyRef.current = true;
        void initialize();
    }, [initialize]);

    useEffect(() => {
        if (!GOOGLE_CLIENT_ID || !scriptReadyRef.current) return;
        if (isAuthRoute) {
            cancelPrompt();
            setShowFallback(false);
            return;
        }
        if (!initializedRef.current) {
            void initialize();
            return;
        }
        void showPrompt();
    }, [cancelPrompt, initialize, isAuthRoute, pathname, showPrompt]);

    useEffect(() => {
        if (showFallback) renderFallbackButton();
    }, [renderFallbackButton, showFallback]);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === "SIGNED_IN") {
                setShowFallback(false);
                cancelPrompt();
            }
            if (event === "SIGNED_OUT" && scriptReadyRef.current && !isAuthRoute) {
                void showPrompt();
            }
        });
        return () => subscription.unsubscribe();
    }, [cancelPrompt, isAuthRoute, showPrompt]);

    if (!GOOGLE_CLIENT_ID) return null;

    return (
        <>
            <Script id="google-one-tap" src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={handleScriptReady} />
            {showFallback && !isAuthRoute && (
                <div
                    ref={fallbackRef}
                    dir="ltr"
                    className="fixed right-4 top-4 z-[9999] rounded-full bg-background/95 p-1 shadow-lg ring-1 ring-black/10 backdrop-blur"
                    aria-label="ورود با حساب گوگل"
                />
            )}
        </>
    );
}
