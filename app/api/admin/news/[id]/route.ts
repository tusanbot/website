import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin" && profile?.role !== "manager") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null) as { status?: string } | null;
  if (!body || !["published", "review", "draft", "archived"].includes(body.status || "")) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  const { id } = await params;
  const update: Record<string, string | null> = { status: body.status! };
  if (body.status === "published") update.published_at = new Date().toISOString();
  const { error } = await supabase.from("news_announcements").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
