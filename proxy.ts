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

export async function proxy(request: NextRequest) {
    let response = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet, headers) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                    response = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
                    Object.entries(headers ?? {}).forEach(([name, value]) => response.headers.set(name, value));
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

    if (isAdminRoute && (!userId || claimsError)) {
        response.cookies.set(ADMIN_ACCESS_CACHE_COOKIE, "", {
            ...getAdminAccessCookieOptions(0),
            expires: new Date(0),
        });
        return NextResponse.redirect(new URL("/auth?mode=login", request.url), { headers: response.headers });
    }

    if (isAdminRoute && userId && sessionId) {
        const ip = getRequestIp(request);
        const cached = verifyAdminAccessToken(request.cookies.get(ADMIN_ACCESS_CACHE_COOKIE)?.value, {
            sub: userId,
            sid: sessionId,
            ip,
        });

        if (cached) {
            const headers = new Headers(request.headers);
            headers.set(ADMIN_ACCESS_HEADER, "1");
            response = NextResponse.next({ request: { headers } });
            response.cookies.set(ADMIN_ACCESS_CACHE_COOKIE, request.cookies.get(ADMIN_ACCESS_CACHE_COOKIE)!.value, {
                ...getAdminAccessCookieOptions(ADMIN_ACCESS_CACHE_TTL_SECONDS),
            });
        } else {
            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", userId)
                .maybeSingle();

            if (profileError || profile?.role !== "admin") {
                response.cookies.set(ADMIN_ACCESS_CACHE_COOKIE, "", {
                    ...getAdminAccessCookieOptions(0),
                    expires: new Date(0),
                });
                return NextResponse.redirect(new URL("/", request.url), { headers: response.headers });
            }

            const token = createAdminAccessToken({
                sub: userId,
                sid: sessionId,
                ip,
                exp: Math.floor(Date.now() / 1000) + ADMIN_ACCESS_CACHE_TTL_SECONDS,
            });

            const headers = new Headers(request.headers);
            headers.set(ADMIN_ACCESS_HEADER, "1");
            response = NextResponse.next({ request: { headers } });
            if (token) {
                response.cookies.set(ADMIN_ACCESS_CACHE_COOKIE, token, getAdminAccessCookieOptions());
            }
        }
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
