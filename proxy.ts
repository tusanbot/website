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
    const pathname = request.nextUrl.pathname;
    const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
    const isAuthRoute = pathname === "/auth" || pathname.startsWith("/auth/");
    const isMaintenanceRoute = pathname === "/maintenance";
    const isApiRoute = pathname === "/api" || pathname.startsWith("/api/");

    let requestHeaders = new Headers(request.headers);
    let adminAccessGranted = false;
    let cacheCookie: { value: string; options: ReturnType<typeof getAdminAccessCookieOptions> } | null = null;
    let clearCacheCookie = false;

    if (isAdminRoute && (!userId || claimsError)) {
        clearCacheCookie = true;
        const redirect = NextResponse.redirect(new URL("/auth?mode=login", request.url));
        pendingCookies.forEach(({ name, value, options }) => redirect.cookies.set(name, value, options));
        redirect.cookies.set(ADMIN_ACCESS_CACHE_COOKIE, "", {
            ...getAdminAccessCookieOptions(0),
            expires: new Date(0),
        });
        return redirect;
    }

    if (isAdminRoute && userId && sessionId) {
        const ip = getRequestIp(request);
        const cachedToken = request.cookies.get(ADMIN_ACCESS_CACHE_COOKIE)?.value;
        const cached = verifyAdminAccessToken(cachedToken, { sub: userId, sid: sessionId, ip });

        if (cached) {
            adminAccessGranted = true;
            cacheCookie = cachedToken
                ? { value: cachedToken, options: getAdminAccessCookieOptions(ADMIN_ACCESS_CACHE_TTL_SECONDS) }
                : null;
        } else {
            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", userId)
                .maybeSingle();

            if (profileError || profile?.role !== "admin") {
                clearCacheCookie = true;
                const redirect = NextResponse.redirect(new URL("/", request.url));
                pendingCookies.forEach(({ name, value, options }) => redirect.cookies.set(name, value, options));
                redirect.cookies.set(ADMIN_ACCESS_CACHE_COOKIE, "", {
                    ...getAdminAccessCookieOptions(0),
                    expires: new Date(0),
                });
                return redirect;
            }

            adminAccessGranted = true;
            const token = createAdminAccessToken({
                sub: userId,
                sid: sessionId,
                ip,
                exp: Math.floor(Date.now() / 1000) + ADMIN_ACCESS_CACHE_TTL_SECONDS,
            });
            if (token) {
                cacheCookie = { value: token, options: getAdminAccessCookieOptions() };
            }
        }

        requestHeaders.set(ADMIN_ACCESS_HEADER, adminAccessGranted ? "1" : "0");
    }

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    pendingCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));

    if (cacheCookie) {
        response.cookies.set(ADMIN_ACCESS_CACHE_COOKIE, cacheCookie.value, cacheCookie.options);
    } else if (clearCacheCookie) {
        response.cookies.set(ADMIN_ACCESS_CACHE_COOKIE, "", {
            ...getAdminAccessCookieOptions(0),
            expires: new Date(0),
        });
    }

    if (!isMaintenanceRoute && !isAuthRoute && !isApiRoute && !isAdminRoute) {
        const { data: settings } = await supabase
            .from("site_settings")
            .select("config")
            .limit(1)
            .maybeSingle();

        const config = settings?.config;
        const maintenance = config && typeof config === "object" && !Array.isArray(config)
            ? (config as Record<string, unknown>).maintenance
            : null;
        const maintenanceEnabled = maintenance && typeof maintenance === "object" && !Array.isArray(maintenance)
            ? (maintenance as Record<string, unknown>).enabled === true
            : false;

        if (maintenanceEnabled) return NextResponse.redirect(new URL("/maintenance", request.url));
    }

    return response;
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
    ],
};
