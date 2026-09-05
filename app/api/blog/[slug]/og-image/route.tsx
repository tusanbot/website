import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapTitle(title: string, max = 34) {
  const words = title.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

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

  // Use the UUID as the storage key. Supabase Storage rejects non-ASCII keys
  // in this environment, while the public URL remains stable and cacheable.
  const storagePath = `posts/${post.id}.svg`;
  const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/blog-images/${storagePath}`;

  const { data: existing } = await supabase.storage.from("blog-images").download(storagePath);
  if (existing) {
    await supabase.from("blog_posts").update({ featured_image: publicUrl }).eq("id", post.id);
    return new Response(existing, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  const postData = post as any;
  const relation = postData.blog_categories;
  const category = Array.isArray(relation) ? relation[0]?.name : relation?.name;
  const lines = wrapTitle(postData.title);
  const titleSvg = lines
    .map((line, index) => `<text x="1100" y="${255 + index * 72}" text-anchor="end" class="title">${escapeXml(line)}</text>`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#087d69"/><stop offset="0.55" stop-color="#09967c"/><stop offset="1" stop-color="#0b8a86"/></linearGradient></defs><rect width="1200" height="630" fill="url(#g)"/><circle cx="1050" cy="90" r="180" fill="#ffffff" fill-opacity="0.08"/><circle cx="120" cy="570" r="240" fill="#ffffff" fill-opacity="0.06"/><g fill="#dff5ef" font-family="Tahoma, Arial, sans-serif"><text x="1100" y="105" text-anchor="end" font-size="28" font-weight="700">${escapeXml(category || "راهنما و آموزش")}</text><text x="1100" y="170" text-anchor="end" font-size="48" font-weight="900" fill="#ffffff">کافی نت توسن</text>${titleSvg}<text x="1100" y="570" text-anchor="end" font-size="23" font-weight="600">راهنمای کاربردی خدمات آنلاین و اداری</text></g></svg>`;
  const bytes = new TextEncoder().encode(svg);

  const { error: uploadError } = await supabase.storage.from("blog-images").upload(storagePath, bytes, {
    contentType: "image/svg+xml",
    cacheControl: "31536000",
    upsert: true,
  });

  if (uploadError) return new Response(`Failed to store image: ${uploadError.message}`, { status: 500 });

  await supabase.from("blog_posts").update({ featured_image: publicUrl }).eq("id", postData.id);

  return new Response(bytes, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
