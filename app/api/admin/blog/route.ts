import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
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
  const db = supabaseAdmin();
  const [postsRes, categoriesRes, servicesRes] = await Promise.all([
    db.from("blog_posts").select("*,blog_categories(name),blog_post_services(service_id,services(id,title,slug))").order("created_at", { ascending: false }),
    db.from("blog_categories").select("id,name,slug").order("name"),
    db.from("services").select("id,title,slug").eq("is_active", true).order("title"),
  ]);
  if (postsRes.error) return NextResponse.json({ error: postsRes.error.message }, { status: 500 });
  if (categoriesRes.error) return NextResponse.json({ error: categoriesRes.error.message }, { status: 500 });
  if (servicesRes.error) return NextResponse.json({ error: servicesRes.error.message }, { status: 500 });
  return NextResponse.json({ posts: postsRes.data || [], categories: categoriesRes.data || [], services: servicesRes.data || [] });
}

export async function POST(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const slugResult = validateBlogSlug(body?.slug);
  if (slugResult.error) return NextResponse.json({ error: slugResult.error }, { status: 400 });
  const { serviceIds = [], ...post } = body;
  post.slug = slugResult.slug;
  const db = supabaseAdmin();
  const { data: duplicate, error: lookupError } = await db.from("blog_posts").select("id").eq("slug", post.slug).maybeSingle();
  if (lookupError) return NextResponse.json({ error: "بررسی یکتایی اسلاگ انجام نشد." }, { status: 500 });
  if (duplicate) return NextResponse.json({ error: "این اسلاگ قبلاً برای مقاله دیگری استفاده شده است." }, { status: 409 });
  const payload = { ...post, author_id: user.id, published_at: post.status === "published" ? (post.published_at || new Date().toISOString()) : null };
  const { data, error } = await db.from("blog_posts").insert(payload).select().single();
  if (error) return NextResponse.json({ error: isUniqueViolation(error) ? "این اسلاگ قبلاً برای مقاله دیگری استفاده شده است." : error.message }, { status: isUniqueViolation(error) ? 409 : 400 });
  if (Array.isArray(serviceIds) && serviceIds.length) await db.from("blog_post_services").insert(serviceIds.map((service_id: string) => ({ post_id: data.id, service_id })));
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
  const db = supabaseAdmin();
  const { data: duplicate, error: lookupError } = await db.from("blog_posts").select("id").eq("slug", post.slug).neq("id", id).maybeSingle();
  if (lookupError) return NextResponse.json({ error: "بررسی یکتایی اسلاگ انجام نشد." }, { status: 500 });
  if (duplicate) return NextResponse.json({ error: "این اسلاگ قبلاً برای مقاله دیگری استفاده شده است." }, { status: 409 });
  const payload = { ...post, published_at: post.status === "published" ? (post.published_at || new Date().toISOString()) : null, updated_at: new Date().toISOString() };
  const { data, error } = await db.from("blog_posts").update(payload).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: isUniqueViolation(error) ? "این اسلاگ قبلاً برای مقاله دیگری استفاده شده است." : error.message }, { status: isUniqueViolation(error) ? 409 : 400 });
  await db.from("blog_post_services").delete().eq("post_id", id);
  if (Array.isArray(serviceIds) && serviceIds.length) await db.from("blog_post_services").insert(serviceIds.map((service_id: string) => ({ post_id: id, service_id })));
  return NextResponse.json({ post: data });
}

export async function DELETE(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const { error } = await supabaseAdmin().from("blog_posts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
