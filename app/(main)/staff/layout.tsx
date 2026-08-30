import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function StaffLayout({ children }: { children: ReactNode }) {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/auth?mode=login");

    const { data: assignments, error } = await supabase
        .from("staff_role_assignments")
        .select("status, staff_roles(code)")
        .eq("user_id", user.id)
        .eq("status", "approved");

    if (error) redirect("/dashboard");
    const roles = (assignments || []).map((item: any) => item.staff_roles?.code);
    if (!roles.includes("order_manager") && !roles.includes("support_operator") && !roles.includes("admin")) {
        redirect("/dashboard");
    }

    return children;
}
