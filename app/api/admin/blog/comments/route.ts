import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return profile?.role === "admin" || profile?.role === "manager" ? user : null;
}

export async function GET(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "all";
  const search = url.searchParams.get("search")?.trim() || "";
  const db = supabaseAdmin();
  let query = db.from("blog_comments").select("id,post_id,user_id,content,status,created_at,updated_at,author_name,blog_posts!inner(id,title,slug)").order("created_at", { ascending: false });
  if (["pending", "approved", "rejected"].includes(status)) query = query.eq("status", status);
  if (search) query = query.or(`content.ilike.%${search}%,author_name.ilike.%${search}%`);
  const { data, error } = await query.limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { count: pendingCount } = await db.from("blog_comments").select("id", { count: "exact", head: true }).eq("status", "pending");
  return NextResponse.json({ comments: data || [], pendingCount: pendingCount || 0 });
}

export async function PATCH(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  const status = body.status;
  if (!id || !["pending", "approved", "rejected"].includes(status)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { data, error } = await supabaseAdmin().from("blog_comments").update({ status, updated_at: new Date().toISOString() }).eq("id", id).select("id,status,updated_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ comment: data });
}

export async function DELETE(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const { error } = await supabaseAdmin().from("blog_comments").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
