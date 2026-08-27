import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const slugs = Array.isArray(body?.slugs) ? body.slugs.map(String).filter(Boolean) : [];

    revalidateTag("services", "max");
    revalidatePath("/services");

    for (const slug of slugs) {
      const decoded = decodeURIComponent(slug);
      revalidateTag(`service:${decoded}`, "max");
      revalidatePath(`/services/${encodeURIComponent(decoded)}`);
    }

    return NextResponse.json({ ok: true, revalidated: slugs });
  } catch (error) {
    console.error("service cache revalidation failed", error);
    return NextResponse.json({ error: "Cache revalidation failed" }, { status: 500 });
  }
}
