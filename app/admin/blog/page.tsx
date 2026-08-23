import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import BlogAdmin from "./BlogAdmin";

export default async function AdminBlogPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth?next=/admin/blog");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin" && profile?.role !== "manager") redirect("/");
  const { data: services } = await supabase.from("services").select("id,title,slug").eq("is_active", true).order("title");
  return <BlogAdmin services={services ?? []} />;
}
