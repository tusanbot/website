import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) { try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {} },
    },
  });
}

async function getUser() {
  const supabase = await getSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { supabase, user: error ? null : user };
}

export async function GET(request: NextRequest) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const requestedLimit = Number(request.nextUrl.searchParams.get("limit") || 50);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 100) : 50;
  const [{ data, error }, { count: unreadCount, error: unreadError }] = await Promise.all([
    supabase.from("notifications").select("id,type,title,message,order_id,metadata,created_at,read_at").eq("recipient_id", user.id).order("created_at", { ascending: false }).limit(limit),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("recipient_id", user.id).is("read_at", null),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (unreadError) return NextResponse.json({ error: unreadError.message }, { status: 500 });
  return NextResponse.json({ notifications: data ?? [], unreadCount: unreadCount ?? 0 });
}

export async function PATCH(request: NextRequest) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = typeof body?.id === "string" ? body.id : null;
  const all = body?.all === true;
  if (!all && !id) return NextResponse.json({ error: "Notification id is required" }, { status: 400 });
  let query = supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("recipient_id", user.id).is("read_at", null);
  if (!all) query = query.eq("id", id!);
  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
