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

                // member_tag_assignments references profiles(id), so make sure
                // the profile exists before assigning the referral tag.
                const { error: profileError } = await adminDb
                    .from("profiles")
                    .upsert({ id: user.id }, { onConflict: "id" });

                if (profileError) throw profileError;

                const { data: link, error: linkError } = await adminDb.from("tag_referral_links")
                    .select("id,tag_id,is_active,expires_at,assignment_duration_days")
                    .eq("code", referralCode)
                    .eq("is_active", true)
                    .maybeSingle();

                if (linkError) throw linkError;

                if (link && (!link.expires_at || new Date(link.expires_at) >= new Date())) {
                    const assignmentExpiresAt = link.assignment_duration_days ? new Date(Date.now() + Number(link.assignment_duration_days) * 86400000) : (link.expires_at ? new Date(link.expires_at) : null);
                    const { error: assignmentError } = await adminDb.from("member_tag_assignments").upsert({
                        tag_id: link.tag_id,
                        user_id: user.id,
                        source: "referral",
                        referral_link_id: link.id,
                        expires_at: assignmentExpiresAt?.toISOString() || null,
                    }, { onConflict: "tag_id,user_id" });

                    if (assignmentError) throw assignmentError;
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
