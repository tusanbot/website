import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createBlogAdminRepository } from "@/lib/data-access/blog-admin";
import { validateBlogSlug } from "@/lib/blog/slug-validation";

function isUniqueViolation(error: { code?: string; message?: string } | null) {
  return error?.code === "23505" || /duplicate key|unique constraint/i.test(error?.message || "");
}

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return profile?.role === "admin" || profile?.role === "manager" ? user : null;
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const repository = createBlogAdminRepository();
  const result = await repository.listAdminData();
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ posts: result.posts, categories: result.categories, services: result.services });
}

export async function POST(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const slugResult = validateBlogSlug(body?.slug);
  if (slugResult.error) return NextResponse.json({ error: slugResult.error }, { status: 400 });
  const { serviceIds = [], ...post } = body;
  post.slug = slugResult.slug;
  const repository = createBlogAdminRepository();
  const duplicateResult = await repository.findDuplicateSlug(post.slug);
  if (duplicateResult.error) return NextResponse.json({ error: "بررسی یکتایی اسلاگ انجام نشد." }, { status: 500 });
  if (duplicateResult.data) return NextResponse.json({ error: "این اسلاگ قبلاً برای مقاله دیگری استفاده شده است." }, { status: 409 });
  const payload = { ...post, author_id: user.id, published_at: post.status === "published" ? (post.published_at || new Date().toISOString()) : null };
  const { data, error } = await repository.insertPost(payload);
  if (error) return NextResponse.json({ error: isUniqueViolation(error) ? "این اسلاگ قبلاً برای مقاله دیگری استفاده شده است." : error.message }, { status: isUniqueViolation(error) ? 409 : 400 });
  if (Array.isArray(serviceIds) && serviceIds.length) await repository.insertPostServices(serviceIds.map((service_id: string) => ({ post_id: String(data?.id), service_id })));
  return NextResponse.json({ post: data });
}

export async function PUT(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const { id, serviceIds = [], ...post } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const slugResult = validateBlogSlug(post?.slug);
  if (slugResult.error) return NextResponse.json({ error: slugResult.error }, { status: 400 });
  post.slug = slugResult.slug;
  const repository = createBlogAdminRepository();
  const duplicateResult = await repository.findDuplicateSlug(post.slug, id);
  if (duplicateResult.error) return NextResponse.json({ error: "بررسی یکتایی اسلاگ انجام نشد." }, { status: 500 });
  if (duplicateResult.data) return NextResponse.json({ error: "این اسلاگ قبلاً برای مقاله دیگری استفاده شده است." }, { status: 409 });
  const payload = { ...post, published_at: post.status === "published" ? (post.published_at || new Date().toISOString()) : null, updated_at: new Date().toISOString() };
  const { data, error } = await repository.updatePost(id, payload);
  if (error) return NextResponse.json({ error: isUniqueViolation(error) ? "این اسلاگ قبلاً برای مقاله دیگری استفاده شده است." : error.message }, { status: isUniqueViolation(error) ? 409 : 400 });
  await repository.deletePostServices(id);
  if (Array.isArray(serviceIds) && serviceIds.length) await repository.insertPostServices(serviceIds.map((service_id: string) => ({ post_id: id, service_id })));
  return NextResponse.json({ post: data });
}

export async function DELETE(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const { error } = await createBlogAdminRepository().deletePost(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
