import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
    let response = NextResponse.next({ request });
    const pathname = request.nextUrl.pathname;
    const isAdminRoute =
        pathname === "/admin" || pathname.startsWith("/admin/");
    const isAuthRoute = pathname === "/auth" || pathname.startsWith("/auth/");
    const isMaintenanceRoute = pathname === "/maintenance";
    const isApiRoute = pathname === "/api" || pathname.startsWith("/api/");

    // Authentication is only needed for protected/admin requests. The old
    // proxy called getClaims() for every normal public page, adding an
    // unnecessary Auth network round-trip to the entire site.
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet, headers) {
                    cookiesToSet.forEach(({ name, value }) => {
                        request.cookies.set(name, value);
                    });

                    response = NextResponse.next({ request });

                    cookiesToSet.forEach(({ name, value, options }) => {
                        response.cookies.set(name, value, options);
                    });

                    Object.entries(headers ?? {}).forEach(([name, value]) => {
                        response.headers.set(name, value);
                    });
                },
            },
        }
    );

    if (isAdminRoute) {
        const { data: claimsData, error: claimsError } =
            await supabase.auth.getClaims();
        const userId = claimsData?.claims?.sub ?? null;

        if (!userId || claimsError) {
            return NextResponse.redirect(
                new URL("/auth?mode=login", request.url)
            );
        }

        const { data: profile, error } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", userId)
            .maybeSingle();

        if (error || profile?.role !== "admin") {
            return NextResponse.redirect(new URL("/", request.url));
        }

        return response;
    }

    // Auth, maintenance and API routes must remain available without the
    // public maintenance check below.
    if (isMaintenanceRoute || isAuthRoute || isApiRoute) {
        return response;
    }

    // Public pages only need one lightweight settings query. We deliberately
    // avoid auth.getClaims() unless maintenance mode is actually enabled.
    const { data: settings } = await supabase
        .from("site_settings")
        .select("config")
        .limit(1)
        .maybeSingle();

    const config = settings?.config;
    const maintenance =
        config && typeof config === "object" && !Array.isArray(config)
            ? (config as Record<string, unknown>).maintenance
            : null;
    const maintenanceEnabled =
        maintenance && typeof maintenance === "object" && !Array.isArray(maintenance)
            ? (maintenance as Record<string, unknown>).enabled === true
            : false;

    if (!maintenanceEnabled) {
        return response;
    }

    // Only when maintenance is enabled do we pay the auth lookup cost to let
    // administrators bypass the maintenance page.
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub ?? null;

    if (userId) {
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", userId)
            .maybeSingle();
        if (profile?.role === "admin") {
            return response;
        }
    }

    return NextResponse.redirect(new URL("/maintenance", request.url));
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
    ],
};
