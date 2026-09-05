import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanHtml(value: unknown) {
  return String(value ?? "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

function imageQueryForTitle(title: string) {
  const t = title.toLowerCase();
  if (t.includes("سایپا")) return "Saipa car";
  if (t.includes("ایران‌خودرو") || t.includes("ایران خودرو")) return "Iran Khodro car";
  if (t.includes("بهمن موتور")) return "car dealership";
  if (t.includes("خودروهای برقی")) return "electric car";
  if (t.includes("خودروهای وارداتی")) return "imported car";
  if (t.includes("تعویض پلاک") || t.includes("پلاک")) return "car license plate";
  if (t.includes("خلافی خودرو") || t.includes("پرداخت خلافی")) return "car traffic road";
  if (t.includes("لاستیک")) return "car tire";
  if (t.includes("بورس کالا")) return "stock exchange finance";
  if (t.includes("نتایج کنکور")) return "university graduation student";
  if (t.includes("کنکور") || t.includes("آزمون") || t.includes("کارت ورود")) return "university student exam";
  if (t.includes("مالیات") || t.includes("اظهارنامه") || t.includes("مؤدیان") || t.includes("فیش مالیاتی") || t.includes("صورتحساب") || t.includes("کد اقتصادی") || t.includes("حق تمبر")) return "tax accounting finance";
  if (t.includes("املاک") || t.includes("مستغلات")) return "real estate house";
  if (t.includes("تأمین اجتماعی") || t.includes("تامین اجتماعی") || t.includes("بیمه")) return "social security insurance office";
  if (t.includes("بازنشستگی") || t.includes("مستمری") || t.includes("بازماندگان") || t.includes("هدیه ازدواج")) return "retirement senior pension";
  return "office paperwork digital services";
}

function isAllowedLicense(name: string) {
  const n = name.toLowerCase().replace(/\s+/g, " ").trim();
  return n.includes("cc0") || n.includes("public domain") || (n.includes("cc by") && !n.includes("sa"));
}

async function findLicensedExternalImage(title: string) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrnamespace: "6",
    gsrsearch: imageQueryForTitle(title),
    gsrlimit: "20",
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
    iiurlwidth: "1200",
    iiextmetadatafilter: "LicenseShortName|UsageTerms|Artist|Credit|Attribution",
    origin: "*",
  });
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`, {
    headers: { "User-Agent": "TusanCN Blog Image Resolver/1.1 (https://tusancn.ir)", Accept: "application/json" },
  });
  if (!response.ok) return null;
  const data = await response.json();
  const pages = Object.values(data?.query?.pages ?? {}) as any[];
  for (const page of pages) {
    const info = page?.imageinfo?.[0];
    if (!info) continue;
    const mime = String(info.mime ?? "");
    if (!mime.startsWith("image/") || mime === "image/svg+xml") continue;
    const meta = info.extmetadata ?? {};
    const license = cleanHtml(meta.LicenseShortName?.value ?? meta.UsageTerms?.value);
    if (!isAllowedLicense(license) || Number(info.width ?? 0) < 600 || Number(info.height ?? 0) < 350) continue;
    return { url: (info.thumburl || info.url) as string, mime };
  }
  return null;
}

function storageUrl(id: string, extension = "jpg") {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/blog-images/posts/${id}.${extension}`;
}

function fallbackSvg(title: string, category?: string) {
  const safeTitle = title.replace(/[&<>\"']/g, "").slice(0, 180);
  const safeCategory = String(category || "راهنما و آموزش").replace(/[&<>\"']/g, "");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#087d69"/><stop offset="0.55" stop-color="#09967c"/><stop offset="1" stop-color="#0b8a86"/></linearGradient></defs><rect width="1200" height="630" fill="url(#g)"/><text x="1100" y="105" text-anchor="end" font-size="28" font-weight="700" fill="#dff5ef" font-family="Tahoma,Arial,sans-serif">${safeCategory}</text><text x="1100" y="180" text-anchor="end" font-size="48" font-weight="900" fill="#fff" font-family="Tahoma,Arial,sans-serif">کافی نت توسن</text><text x="1100" y="290" text-anchor="end" font-size="40" fill="#fff" font-family="Tahoma,Arial,sans-serif">${safeTitle}</text></svg>`;
}

async function persistExternalImage(supabase: ReturnType<typeof supabaseAdmin>, postId: string, title: string) {
  const external = await findLicensedExternalImage(title);
  if (!external) return null;
  try {
    const response = await fetch(external.url, { headers: { "User-Agent": "TusanCN Blog Image Proxy/1.1" } });
    const contentType = response.headers.get("content-type") || external.mime || "image/jpeg";
    if (!response.ok || !contentType.startsWith("image/") || contentType === "image/svg+xml") return null;
    const bytes = await response.arrayBuffer();
    const extension = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
    const path = `posts/${postId}.${extension}`;
    const { error } = await supabase.storage.from("blog-images").upload(path, bytes, {
      contentType,
      cacheControl: "31536000",
      upsert: true,
    });
    if (error) return null;
    const publicUrl = storageUrl(postId, extension);
    await supabase.from("blog_posts").update({ featured_image: publicUrl }).eq("id", postId);
    return { bytes, contentType, publicUrl };
  } catch {
    return null;
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
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

  const currentImage = typeof post.featured_image === "string" ? post.featured_image : "";
  const isLegacyGenerated = /\/posts\/[^/]+\.svg(?:$|\?)/i.test(currentImage);
  const forceRefresh = new URL(request.url).searchParams.get("refresh") === "1";
  const categoryRelation = (post as any).blog_categories;
  const category = Array.isArray(categoryRelation) ? categoryRelation[0]?.name : categoryRelation?.name;

  // Existing legacy SVG covers are upgraded to real, license-safe, topic-relevant photos.
  if (isLegacyGenerated || forceRefresh) {
    const upgraded = await persistExternalImage(supabase, post.id, post.title);
    if (upgraded) {
      return new Response(upgraded.bytes, {
        headers: { "Content-Type": upgraded.contentType, "Cache-Control": "public, max-age=31536000, immutable" },
      });
    }
  }

  // Prefer the currently persisted raster image.
  if (currentImage && !isLegacyGenerated && /^https?:\/\//i.test(currentImage)) {
    try {
      const response = await fetch(currentImage, { headers: { "User-Agent": "TusanCN Blog Image Proxy/1.1" } });
      if (response.ok) return new Response(await response.arrayBuffer(), {
        headers: { "Content-Type": response.headers.get("content-type") || "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable" },
      });
    } catch {}
  }

  const extensions = ["jpg", "png", "webp"];
  for (const extension of extensions) {
    const path = `posts/${post.id}.${extension}`;
    const { data: existing } = await supabase.storage.from("blog-images").download(path);
    if (existing) {
      const contentType = extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "image/jpeg";
      const publicUrl = storageUrl(post.id, extension);
      if (post.featured_image !== publicUrl) await supabase.from("blog_posts").update({ featured_image: publicUrl }).eq("id", post.id);
      return new Response(existing, { headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000, immutable" } });
    }
  }

  const bytes = new TextEncoder().encode(fallbackSvg(post.title, category));
  const path = `posts/${post.id}.svg`;
  const { error: uploadError } = await supabase.storage.from("blog-images").upload(path, bytes, {
    contentType: "image/svg+xml",
    cacheControl: "31536000",
    upsert: true,
  });
  if (uploadError) return new Response(`Failed to store image: ${uploadError.message}`, { status: 500 });
  const publicUrl = storageUrl(post.id, "svg");
  await supabase.from("blog_posts").update({ featured_image: publicUrl }).eq("id", post.id);
  return new Response(bytes, { headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=31536000, immutable" } });
}
