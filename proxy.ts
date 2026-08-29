import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
    let response = NextResponse.next({ request });
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return request.cookies.getAll(); },
                setAll(cookiesToSet, headers) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                    response = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
                    Object.entries(headers ?? {}).forEach(([name, value]) => response.headers.set(name, value));
                },
            },
        }
    );

    const pathname = request.nextUrl.pathname;
    const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
    const isDashboardRoute = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
    const isManagerRoute = pathname === "/manager" || pathname.startsWith("/manager/");
    const isOperatorRoute = pathname === "/operator" || pathname.startsWith("/operator/");
    const needsAuth = isAdminRoute || isDashboardRoute || isManagerRoute || isOperatorRoute;

    if (!needsAuth) return response;

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub ?? null;

    if (!userId || claimsError) {
        return NextResponse.redirect(new URL("/auth?mode=login", request.url));
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

    if (profileError) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    if (isAdminRoute) {
        if (profile?.role !== "admin") return NextResponse.redirect(new URL("/dashboard", request.url));
        return response;
    }

    if (profile?.role === "admin") {
        if (isManagerRoute || isOperatorRoute) return NextResponse.redirect(new URL("/admin", request.url));
        return response;
    }

    if (isDashboardRoute) return response;

    const { data: assignments, error: assignmentError } = await supabase
        .from("staff_role_assignments")
        .select("staff_roles(code)")
        .eq("user_id", userId)
        .eq("status", "approved");

    if (assignmentError) return NextResponse.redirect(new URL("/dashboard", request.url));

    const codes = (assignments ?? []).flatMap((assignment: any) => {
        const role = assignment.staff_roles;
        return Array.isArray(role) ? role.map((item: any) => item.code) : role?.code ? [role.code] : [];
    });

    if (isManagerRoute && !codes.includes("order_manager")) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    if (isOperatorRoute && !codes.includes("support_operator")) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return response;
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
    ],
};
