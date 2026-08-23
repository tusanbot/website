import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (isNextResponse(admin)) return admin;

  try {
    const client = supabaseAdmin();
    const [{ data: authData, error: authError }, { data: profiles, error: profilesError }, { data: orders, error: ordersError }] = await Promise.all([
      client.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      client.from("profiles").select("id, full_name, phone, national_code, role, created_at"),
      client.from("orders").select("user_id"),
    ]);

    if (authError) throw authError;
    if (profilesError) throw profilesError;
    if (ordersError) throw ordersError;

    const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
    const orderCounts: Record<string, number> = {};
    for (const order of orders ?? []) {
      if (order.user_id) orderCounts[order.user_id] = (orderCounts[order.user_id] ?? 0) + 1;
    }

    const users = (authData?.users ?? []).map((user) => {
      const profile = profileMap.get(user.id);
      return {
        id: user.id,
        email: user.email ?? null,
        full_name: profile?.full_name ?? null,
        phone: profile?.phone ?? null,
        national_code: profile?.national_code ?? null,
        role: profile?.role ?? "user",
        created_at: profile?.created_at ?? user.created_at ?? null,
        email_confirmed_at: user.email_confirmed_at ?? null,
        order_count: orderCounts[user.id] ?? 0,
        profile_completed: Boolean(profile?.full_name || profile?.phone || profile?.national_code),
      };
    }).sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error("[admin/users] failed", error);
    return NextResponse.json({ success: false, error: "خطا در دریافت کاربران." }, { status: 500 });
  }
}
