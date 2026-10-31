import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createBlogAdminRepository } from "@/lib/data-access/blog-admin";

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
  const repository = createBlogAdminRepository();
  const commentsResult = await repository.listComments(status, search);
  if (commentsResult.error) return NextResponse.json({ error: commentsResult.error.message }, { status: 500 });
  const pendingResult = await repository.countPendingComments();
  return NextResponse.json({ comments: commentsResult.data || [], pendingCount: pendingResult.count || 0 });
}

export async function PATCH(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  const status = body.status;
  if (!id || !["pending", "approved", "rejected"].includes(status)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { data, error } = await createBlogAdminRepository().updateComment(id, status, new Date().toISOString());
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ comment: data });
}

export async function DELETE(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const { error } = await createBlogAdminRepository().deleteComment(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
