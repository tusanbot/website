"use client";

import Script from "next/script";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

type GoogleCredentialResponse = {
    credential: string;
};

type GooglePromptNotification = {
    isNotDisplayed: () => boolean;
    isSkippedMoment: () => boolean;
};

type GoogleAccountsId = {
    initialize: (config: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void | Promise<void>;
        nonce?: string;
        context?: "signin" | "signup" | "use";
        auto_select?: boolean;
        use_fedcm_for_prompt?: boolean;
        itp_support?: boolean;
        cancel_on_tap_outside?: boolean;
    }) => void;
    prompt: (listener?: (notification: GooglePromptNotification) => void) => void;
    cancel: () => void;
};

declare global {
    interface Window {
        google?: {
            accounts?: {
                id?: GoogleAccountsId;
            };
        };
    }
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

async function generateNonce(): Promise<{ raw: string; hashed: string }> {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const raw = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    const encoded = new TextEncoder().encode(raw);
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
    const hashed = Array.from(new Uint8Array(hashBuffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
    return { raw, hashed };
}

export default function GoogleOneTap() {
    const pathname = usePathname();
    const router = useRouter();
    const initializedRef = useRef(false);
    const nonceRef = useRef<string | null>(null);

    const cancelPrompt = useCallback(() => {
        window.google?.accounts?.id?.cancel();
    }, []);

    const initialize = useCallback(async () => {
        if (!GOOGLE_CLIENT_ID || !window.google?.accounts?.id) return;
        if (pathname === "/auth" || pathname.startsWith("/auth/")) return;

        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
            cancelPrompt();
            return;
        }

        const { raw, hashed } = await generateNonce();
        nonceRef.current = raw;
        initializedRef.current = true;

        window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            nonce: hashed,
            context: "signin",
            auto_select: false,
            use_fedcm_for_prompt: true,
            itp_support: true,
            cancel_on_tap_outside: true,
            callback: async (response) => {
                const nonce = nonceRef.current;
                if (!response.credential || !nonce) return;

                const { error } = await supabase.auth.signInWithIdToken({
                    provider: "google",
                    token: response.credential,
                    nonce,
                });

                if (error) {
                    console.error("Google One Tap sign-in failed:", error);
                    return;
                }

                cancelPrompt();
                router.refresh();
                router.push("/dashboard");
            },
        });

        window.google.accounts.id.prompt();
    }, [cancelPrompt, pathname, router]);

    useEffect(() => {
        if (!GOOGLE_CLIENT_ID) return;

        if (pathname === "/auth" || pathname.startsWith("/auth/")) {
            cancelPrompt();
            return;
        }

        if (initializedRef.current) {
            initialize();
        }
    }, [cancelPrompt, initialize, pathname]);

    useEffect(() => {
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event) => {
            if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
                cancelPrompt();
            }
        });

        return () => subscription.unsubscribe();
    }, [cancelPrompt]);

    if (!GOOGLE_CLIENT_ID) return null;

    return (
        <Script
            id="google-one-tap"
            src="https://accounts.google.com/gsi/client"
            strategy="afterInteractive"
            onReady={initialize}
        />
    );
}
