import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import AiToolsAdmin from "./AiToolsAdmin";

export default async function AdminAiToolsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth?next=/admin/ai-tools");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/");
  return <AiToolsAdmin />;
}
