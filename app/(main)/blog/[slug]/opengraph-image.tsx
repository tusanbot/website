import { createSupabaseServerClient } from "@/lib/supabaseServer";

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&apos;");
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function OpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = decodeURIComponent((await params).slug).normalize("NFC");
  const supabase = createSupabaseServerClient();
  const { data: post } = await supabase
    .from("blog_posts")
    .select("title,blog_categories(name)")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  const categoryRelation = post?.blog_categories;
  const categoryName = Array.isArray(categoryRelation)
    ? categoryRelation[0]?.name
    : categoryRelation?.name;
  const title = escapeXml(post?.title || "مقاله وبلاگ کافی نت توسن");
  const category = escapeXml(categoryName || "راهنما و آموزش");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#087d69"/><stop offset="55%" stop-color="#09967c"/><stop offset="100%" stop-color="#0b8a86"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" rx="42" fill="url(#bg)"/>
  <circle cx="1080" cy="80" r="210" fill="#ffffff" fill-opacity="0.08"/>
  <circle cx="80" cy="600" r="250" fill="#ffffff" fill-opacity="0.06"/>
  <rect x="72" y="72" width="1056" height="486" rx="34" fill="#ffffff" fill-opacity="0.10" stroke="#ffffff" stroke-opacity="0.18"/>
  <text x="1050" y="145" direction="rtl" text-anchor="end" font-family="Vazirmatn, Noto Sans Arabic, Arial, sans-serif" font-size="28" font-weight="700" fill="#dff5ef">${category}</text>
  <text x="1050" y="235" direction="rtl" text-anchor="end" font-family="Vazirmatn, Noto Sans Arabic, Arial, sans-serif" font-size="48" font-weight="900" fill="#ffffff">کافی نت توسن</text>
  <foreignObject x="145" y="285" width="910" height="190">
    <div xmlns="http://www.w3.org/1999/xhtml" dir="rtl" style="font-family:Vazirmatn,Arial,sans-serif;color:#fff;font-size:38px;font-weight:900;line-height:1.5;text-align:right;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical">${title}</div>
  </foreignObject>
  <text x="1050" y="520" direction="rtl" text-anchor="end" font-family="Vazirmatn, Noto Sans Arabic, Arial, sans-serif" font-size="24" font-weight="600" fill="#e8faf6">راهنمای کاربردی خدمات آنلاین و اداری</text>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400"
    }
  });
}
