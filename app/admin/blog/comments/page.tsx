import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import CommentsAdmin from "./CommentsAdmin";

export default async function AdminBlogCommentsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth?next=/admin/blog/comments");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin" && profile?.role !== "manager") redirect("/");
  const { count } = await supabase.from("blog_comments").select("id", { count: "exact", head: true }).eq("status", "pending");
  return <CommentsAdmin initialPendingCount={count ?? 0} />;
}
