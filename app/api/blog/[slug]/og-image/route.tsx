import { ImageResponse } from "next/og";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const slug = decodeURIComponent((await params).slug).normalize("NFC");
  const supabase = supabaseAdmin();

  const { data: post, error: postError } = await supabase
    .from("blog_posts")
    .select("id,title,featured_image,blog_categories(name)")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (postError) return new Response("Failed to load article", { status: 500 });
  if (!post) return new Response("Not found", { status: 404 });

  const storagePath = `${slug}.png`;
  const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/blog-images/${encodeURIComponent(storagePath)}`;

  const { data: existing } = await supabase.storage.from("blog-images").download(storagePath);
  if (existing) {
    return new Response(existing, { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" } });
  }

  const postData = post as any;
  const relation = postData.blog_categories;
  const category = Array.isArray(relation) ? relation[0]?.name : relation?.name;

  const image = new ImageResponse(
    <div
      dir="rtl"
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 72px",
        background: "linear-gradient(135deg,#087d69 0%,#09967c 55%,#0b8a86 100%)",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: "#dff5ef" }}>{category || "راهنما و آموزش"}</div>
        <div style={{ fontSize: 48, fontWeight: 900 }}>کافی نت توسن</div>
        <div style={{ fontSize: 38, fontWeight: 800, lineHeight: 1.45, maxWidth: 1050 }}>{postData.title}</div>
      </div>
      <div style={{ fontSize: 23, fontWeight: 600, color: "#e8faf6" }}>راهنمای کاربردی خدمات آنلاین و اداری</div>
    </div>,
    { width: 1200, height: 630 }
  );

  const bytes = await image.arrayBuffer();
  const { error: uploadError } = await supabase.storage.from("blog-images").upload(storagePath, bytes, {
    contentType: "image/png",
    cacheControl: "31536000",
    upsert: true,
  });

  if (uploadError) return new Response("Failed to store image", { status: 500 });

  await supabase
    .from("blog_posts")
    .update({ featured_image: publicUrl })
    .eq("id", postData.id);

  return new Response(bytes, { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" } });
}
