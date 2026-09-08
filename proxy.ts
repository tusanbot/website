import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
    const userId = claimsData?.claims?.sub ?? null;
    const pathname = request.nextUrl.pathname;
    const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
    const isAuthRoute = pathname === "/auth" || pathname.startsWith("/auth/");
    const isMaintenanceRoute = pathname === "/maintenance";
    const isApiRoute = pathname === "/api" || pathname.startsWith("/api/");

    // Only verify that an admin route has an authenticated session here.
    // The AdminLayout performs the single role check on the server. Keeping
    // the role lookup out of the proxy avoids a duplicate profiles query on
    // every admin navigation and prevents unnecessary access-state churn.
    if (isAdminRoute && (!userId || claimsError)) {
        return NextResponse.redirect(new URL("/auth?mode=login", request.url));
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
