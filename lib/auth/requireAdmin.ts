import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export type AdminUser = {
    id: string;
    email?: string;
};

function getSupabaseConfig() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
        throw new Error("Supabase authentication configuration is incomplete");
    }

    return { url, anonKey };
}

/**
 * Requires a valid Supabase access token and an admin profile.
 * The service-role key is never exposed to the client.
 */
export async function requireAdmin(
    request: NextRequest
): Promise<AdminUser | NextResponse> {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
        return NextResponse.json(
            { success: false, error: "احراز هویت لازم است." },
            { status: 401 }
        );
    }

    const token = authorization.slice("Bearer ".length).trim();

    if (!token) {
        return NextResponse.json(
            { success: false, error: "احراز هویت لازم است." },
            { status: 401 }
        );
    }

    try {
        const { url, anonKey } = getSupabaseConfig();

        const authClient = createClient(url, anonKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        });

        const { data, error } = await authClient.auth.getUser(token);

        if (error || !data.user) {
            return NextResponse.json(
                { success: false, error: "نشست کاربر معتبر نیست." },
                { status: 401 }
            );
        }

        const { data: profile, error: profileError } = await authClient
            .from("profiles")
            .select("role")
            .eq("id", data.user.id)
            .maybeSingle();

        if (profileError) {
            console.error("[auth/requireAdmin] profile lookup failed", profileError);
            return NextResponse.json(
                { success: false, error: "خطا در بررسی سطح دسترسی." },
                { status: 500 }
            );
        }

        if (profile?.role !== "admin") {
            return NextResponse.json(
                { success: false, error: "دسترسی غیرمجاز است." },
                { status: 403 }
            );
        }

        return {
            id: data.user.id,
            email: data.user.email,
        };
    } catch (error) {
        console.error("[auth/requireAdmin] unexpected error", error);
        return NextResponse.json(
            { success: false, error: "خطا در احراز هویت." },
            { status: 500 }
        );
    }
}

export function isNextResponse(
    value: AdminUser | NextResponse
): value is NextResponse {
    return value instanceof NextResponse;
}
