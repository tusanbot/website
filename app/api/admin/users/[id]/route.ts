import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RouteContext = { params: Promise<{ id: string }> };

function bad(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function GET(request: NextRequest, context: RouteContext) {
  const admin = await requireAdmin(request);
  if (isNextResponse(admin)) return admin;
  const { id } = await context.params;

  try {
    const client = supabaseAdmin();
    const [{ data: authResult, error: authError }, { data: profile, error: profileError }, { data: tags, error: tagsError }, { data: assignments, error: assignmentsError }] = await Promise.all([
      client.auth.admin.getUserById(id),
      client.from("profiles").select("id,full_name,phone,national_code,birth_date,address,avatar_url,role,created_at,updated_at,theme_config").eq("id", id).maybeSingle(),
      client.from("member_tags").select("id,name,slug,color,is_active").order("name"),
      client.from("member_tag_assignments").select("id,tag_id,assigned_at,expires_at,source,referral_link_id").eq("user_id", id),
    ]);

    if (authError) throw authError;
    if (profileError) throw profileError;
    if (tagsError) throw tagsError;
    if (assignmentsError) throw assignmentsError;
    if (!authResult?.user) return bad("کاربر پیدا نشد.", 404);

    return NextResponse.json({
      success: true,
      user: {
        id: authResult.user.id,
        email: authResult.user.email ?? null,
        phone: authResult.user.phone ?? profile?.phone ?? null,
        email_confirmed_at: authResult.user.email_confirmed_at ?? null,
        phone_confirmed_at: authResult.user.phone_confirmed_at ?? null,
        last_sign_in_at: authResult.user.last_sign_in_at ?? null,
        created_at: authResult.user.created_at ?? profile?.created_at ?? null,
        profile: profile ?? { id, role: "user" },
        assignments: assignments ?? [],
      },
      tags: tags ?? [],
    });
  } catch (error) {
    console.error("[admin/users/:id] GET failed", error);
    return NextResponse.json({ success: false, error: "خطا در دریافت اطلاعات کاربر." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const admin = await requireAdmin(request);
  if (isNextResponse(admin)) return admin;
  const { id } = await context.params;

  try {
    const body = await request.json();
    const client = supabaseAdmin();

    const { data: target, error: targetError } = await client.auth.admin.getUserById(id);
    if (targetError) throw targetError;
    if (!target?.user) return bad("کاربر پیدا نشد.", 404);

    const profilePatch = body.profile ?? {};
    const allowedProfile = ["full_name", "phone", "national_code", "birth_date", "address", "avatar_url", "role", "theme_config"];
    const cleanProfile: Record<string, unknown> = {};
    for (const key of allowedProfile) {
      if (Object.prototype.hasOwnProperty.call(profilePatch, key)) cleanProfile[key] = profilePatch[key] === "" ? null : profilePatch[key];
    }

    if (cleanProfile.role !== undefined && !["user", "admin"].includes(String(cleanProfile.role))) {
      return bad("نقش حساب نامعتبر است.");
    }

    if (Object.keys(cleanProfile).length) {
      const { error } = await client.from("profiles").update(cleanProfile).eq("id", id);
      if (error) throw error;
    }

    const authPatch: Record<string, unknown> = {};
    if (Object.prototype.hasOwnProperty.call(body, "email")) {
      const email = String(body.email ?? "").trim().toLowerCase();
      if (!email) return bad("ایمیل نمی‌تواند خالی باشد.");
      authPatch.email = email;
      if (body.email_confirm === true) authPatch.email_confirm = true;
    }
    if (Object.prototype.hasOwnProperty.call(body, "password")) {
      const password = String(body.password ?? "");
      if (password.length < 8) return bad("رمز عبور باید حداقل ۸ کاراکتر باشد.");
      authPatch.password = password;
    }
    if (Object.prototype.hasOwnProperty.call(body, "phone")) {
      const phone = String(body.phone ?? "").trim();
      authPatch.phone = phone || null;
      if (body.phone_confirm === true && phone) authPatch.phone_confirm = true;
    }

    if (Object.keys(authPatch).length) {
      const { error } = await client.auth.admin.updateUserById(id, authPatch as never);
      if (error) throw error;
      if (Object.prototype.hasOwnProperty.call(body, "phone")) {
        const { error: phoneProfileError } = await client.from("profiles").update({ phone: authPatch.phone }).eq("id", id);
        if (phoneProfileError) throw phoneProfileError;
      }
    }

    if (Array.isArray(body.add_tag_ids) || Array.isArray(body.remove_tag_ids)) {
      const addTagIds = [...new Set((body.add_tag_ids ?? []).filter((x: unknown): x is string => typeof x === "string" && x.length > 0))];
      const removeTagIds = [...new Set((body.remove_tag_ids ?? []).filter((x: unknown): x is string => typeof x === "string" && x.length > 0))];

      if (removeTagIds.length) {
        const { error } = await client.from("member_tag_assignments").delete().eq("user_id", id).in("tag_id", removeTagIds);
        if (error) throw error;
      }
      if (addTagIds.length) {
        const rows = addTagIds.map((tag_id) => ({ user_id: id, tag_id, source: "admin" }));
        const { error } = await client.from("member_tag_assignments").upsert(rows, { onConflict: "user_id,tag_id" });
        if (error) {
          const fallback = await client.from("member_tag_assignments").insert(rows);
          if (fallback.error) throw error;
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin/users/:id] PATCH failed", error);
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ success: false, error: message || "ذخیره تغییرات کاربر انجام نشد." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const admin = await requireAdmin(request);
  if (isNextResponse(admin)) return admin;
  const { id } = await context.params;

  if (id === admin.id) return bad("نمی‌توانید حساب مدیریتی خودتان را حذف کنید.", 400);

  try {
    const body = await request.json().catch(() => ({}));
    if (body.confirmation !== "DELETE") return bad("برای حذف کاربر باید تأیید حذف ارسال شود.");

    const client = supabaseAdmin();
    const { data: target, error: targetError } = await client.auth.admin.getUserById(id);
    if (targetError) throw targetError;
    if (!target?.user) return bad("کاربر پیدا نشد.", 404);

    const { error } = await client.auth.admin.deleteUser(id);
    if (error) {
      return NextResponse.json({
        success: false,
        error: "حذف کامل کاربر به دلیل وجود سوابق وابسته انجام نشد. سوابق مالی/تاریخی کاربر باید حفظ شوند.",
        detail: error.message,
      }, { status: 409 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin/users/:id] DELETE failed", error);
    return NextResponse.json({ success: false, error: "حذف کاربر انجام نشد." }, { status: 500 });
  }
}
