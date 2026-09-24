import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const next = requestUrl.searchParams.get("next") ?? "/dashboard";
    const referralCode = requestUrl.searchParams.get("ref")?.trim().toUpperCase() || "";

    const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

    if (!code) {
        return NextResponse.redirect(new URL("/auth?mode=login&error=auth_callback", request.url));
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
        console.error("Supabase auth callback failed:", error.message);
        return NextResponse.redirect(new URL("/auth?mode=login&error=auth_callback", request.url));
    }

    if (referralCode) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            try {
                const adminDb = supabaseAdmin();
                const { data: link } = await adminDb.from("tag_referral_links")
                    .select("id,tag_id,is_active,expires_at")
                    .eq("code", referralCode)
                    .eq("is_active", true)
                    .maybeSingle();
                if (link && (!link.expires_at || new Date(link.expires_at) >= new Date())) {
                    await adminDb.from("member_tag_assignments").upsert({
                        tag_id: link.tag_id,
                        user_id: user.id,
                        source: "referral",
                        referral_link_id: link.id,
                    }, { onConflict: "tag_id,user_id" });
                }
            } catch (claimError) {
                console.error("Referral tag claim failed:", claimError);
            }
        }
    }

    const response = NextResponse.redirect(new URL(safeNext, request.url));
    response.cookies.delete("tusan_referral");
    return response;
}
