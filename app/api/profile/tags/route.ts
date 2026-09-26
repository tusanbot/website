import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ tags: [] }, { status: 401 });
    }

    const db = supabaseAdmin();
    const { data, error } = await db
      .from("member_tag_assignments")
      .select("tag_id,assigned_at,expires_at,source,member_tags(id,name,slug,color,is_active)")
      .eq("user_id", user.id)
      .order("assigned_at", { ascending: false });

    if (error) throw error;

    const now = Date.now();
    const tags = (data || [])
      .map((assignment: any) => {
        const tag = assignment.member_tags;
        if (!tag || !tag.is_active) return null;
        if (assignment.expires_at && new Date(assignment.expires_at).getTime() < now) return null;

        return {
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
          color: tag.color || null,
          assigned_at: assignment.assigned_at,
          expires_at: assignment.expires_at,
          source: assignment.source || null,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ tags });
  } catch (error) {
    console.error("[profile/tags]", error);
    return NextResponse.json({ tags: [], error: "دریافت تگ‌های حساب انجام نشد." }, { status: 500 });
  }
}
