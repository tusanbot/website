import { ImageResponse } from "next/og";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "تصویر مقاله وبلاگ کافی نت توسن";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = decodeURIComponent((await params).slug).normalize("NFC");
  const supabase = createSupabaseServerClient();
  const { data: post } = await supabase
    .from("blog_posts")
    .select("title,blog_categories(name)")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  const relation = post?.blog_categories;
  const category = Array.isArray(relation) ? relation[0]?.name : relation?.name;
  const title = post?.title || "مقاله وبلاگ کافی نت توسن";

  return new ImageResponse(
    (
      <div
        dir="rtl"
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "linear-gradient(135deg,#087d69 0%,#09967c 55%,#0b8a86 100%)",
          color: "white",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: "#dff5ef" }}>{category || "راهنما و آموزش"}</div>
          <div style={{ fontSize: 52, fontWeight: 900 }}>کافی نت توسن</div>
          <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.45, maxWidth: 1000 }}>{title}</div>
        </div>
        <div style={{ fontSize: 25, fontWeight: 600, color: "#e8faf6" }}>راهنمای کاربردی خدمات آنلاین و اداری</div>
      </div>
    ),
    { ...size }
  );
}
