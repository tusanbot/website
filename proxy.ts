import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
    ADMIN_ACCESS_CACHE_COOKIE,
    ADMIN_ACCESS_CACHE_TTL_SECONDS,
    createAdminAccessToken,
    getAdminAccessCookieOptions,
    getRequestIp,
    verifyAdminAccessToken,
} from "@/lib/admin-access-cache";

const ADMIN_ACCESS_HEADER = "x-tusan-admin-access";

type PendingCookie = {
    name: string;
    value: string;
    options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

export async function proxy(request: NextRequest) {
    const pendingCookies: PendingCookie[] = [];
    const pathname = request.nextUrl.pathname;

    if (pathname === "/admin/content-studio" || pathname.startsWith("/admin/content-studio/")) {
        return NextResponse.redirect(new URL("/content-studio", request.url));
    }

    const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

    // Public pages do not need a server-side Supabase round-trip on every request.
    // Browser authentication is handled by the Supabase client; privileged
    // routes are protected below. This removes Cloudflare -> Supabase latency
    // from the critical path for public pages such as /services and /orders.
    if (!isAdminRoute) {
        return NextResponse.next();
    }

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set(name, value);
                        pendingCookies.push({ name, value, options });
                    });
                },
            },
        }
    );

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
    const claims = claimsData?.claims as Record<string, unknown> | undefined;
    const userId = typeof claims?.sub === "string" ? claims.sub : null;
    const sessionId = typeof claims?.session_id === "string" ? claims.session_id : "";

    const requestHeaders = new Headers(request.headers);

    if (!userId || claimsError) {
        const redirect = NextResponse.redirect(new URL("/auth?mode=login", request.url));
        pendingCookies.forEach(({ name, value, options }) => redirect.cookies.set(name, value, options));
        redirect.cookies.set(ADMIN_ACCESS_CACHE_COOKIE, "", {
            ...getAdminAccessCookieOptions(0),
            expires: new Date(0),
        });
        return redirect;
    }

    const ip = getRequestIp(request);
    const cachedToken = request.cookies.get(ADMIN_ACCESS_CACHE_COOKIE)?.value;
    const cached = verifyAdminAccessToken(cachedToken, { sub: userId, sid: sessionId, ip });

    if (cached) {
        requestHeaders.set(ADMIN_ACCESS_HEADER, "1");
        const response = NextResponse.next({ request: { headers: requestHeaders } });
        pendingCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        if (cachedToken) {
            response.cookies.set(
                ADMIN_ACCESS_CACHE_COOKIE,
                cachedToken,
                getAdminAccessCookieOptions(ADMIN_ACCESS_CACHE_TTL_SECONDS)
            );
        }
        return response;
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

    if (profileError || profile?.role !== "admin") {
        const redirect = NextResponse.redirect(new URL("/", request.url));
        pendingCookies.forEach(({ name, value, options }) => redirect.cookies.set(name, value, options));
        redirect.cookies.set(ADMIN_ACCESS_CACHE_COOKIE, "", {
            ...getAdminAccessCookieOptions(0),
            expires: new Date(0),
        });
        return redirect;
    }

    requestHeaders.set(ADMIN_ACCESS_HEADER, "1");

    const token = createAdminAccessToken({
        sub: userId,
        sid: sessionId,
        ip,
        exp: Math.floor(Date.now() / 1000) + ADMIN_ACCESS_CACHE_TTL_SECONDS,
    });

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    pendingCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
    if (token) {
        response.cookies.set(ADMIN_ACCESS_CACHE_COOKIE, token, getAdminAccessCookieOptions());
    }
    return response;
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
    ],
};
