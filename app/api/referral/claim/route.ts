import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "نشست کاربر معتبر نیست." }, { status: 401 });

    const body = await request.json().catch(() => ({})) as { code?: string };
    const metadataReferral = String(user.user_metadata?.referral_code || "").trim().toUpperCase();
    const code = String(body.code || metadataReferral).trim().toUpperCase();
    if (!code) return NextResponse.json({ error: "کد دعوت مشخص نشده است." }, { status: 400 });

    const db = supabaseAdmin();

    // member_tag_assignments.user_id references profiles(id). Some auth flows
    // can create the Supabase user before the profile row exists, so ensure
    // the profile exists before attempting the tag assignment.
    const { error: profileError } = await db
      .from("profiles")
      .upsert({ id: user.id }, { onConflict: "id" });
    if (profileError) throw profileError;

    const { data: link, error } = await db.from("tag_referral_links")
      .select("id,tag_id,code,is_active,expires_at,assignment_duration_days")
      .eq("code", code)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw error;
    if (!link || (link.expires_at && new Date(link.expires_at) < new Date())) {
      return NextResponse.json({ error: "لینک دعوت معتبر یا فعال نیست." }, { status: 404 });
    }

    const assignmentExpiresAt = link.assignment_duration_days ? new Date(Date.now() + Number(link.assignment_duration_days) * 86400000) : (link.expires_at ? new Date(link.expires_at) : null);
    const { data: tag, error: tagError } = await db.from("member_tags").select("id,name,is_active").eq("id", link.tag_id).maybeSingle();
    if (tagError) throw tagError;
    if (!tag?.is_active) return NextResponse.json({ error: "تگ این دعوت دیگر فعال نیست." }, { status: 404 });

    const { data: existing, error: existingError } = await db.from("member_tag_assignments")
      .select("id,expires_at")
      .eq("user_id", user.id)
      .eq("tag_id", tag.id)
      .maybeSingle();
    if (existingError) throw existingError;

    if (!existing) {
      const { error: insertError } = await db.from("member_tag_assignments").insert({
        tag_id: tag.id,
        user_id: user.id,
        source: "referral",
        referral_link_id: link.id,
        expires_at: assignmentExpiresAt?.toISOString() || null,
        assigned_at: new Date().toISOString(),
      });
      if (insertError) throw insertError;
    }

    return NextResponse.json({ success: true, tag: { id: tag.id, name: tag.name } });
  } catch (error) {
    console.error("[referral/claim]", error);
    return NextResponse.json({ success: false, error: "اعمال دعوت انجام نشد." }, { status: 500 });
  }
}
