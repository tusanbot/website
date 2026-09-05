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

function cleanHtml(value: unknown) {
  return String(value ?? "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
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
    headers: {
      "User-Agent": "TusanCN Blog Image Resolver/1.0 (https://tusancn.ir)",
      Accept: "application/json",
    },
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
    if (!isAllowedLicense(license)) continue;
    if (Number(info.width ?? 0) < 600 || Number(info.height ?? 0) < 350) continue;
    const url = info.thumburl || info.url;
    if (!url) continue;
    return url as string;
  }
  return null;
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

  // Existing external image: return it directly so crawlers and browsers use the same asset.
  if (typeof post.featured_image === "string" && /^https?:\/\//i.test(post.featured_image) && !post.featured_image.includes("/storage/v1/object/public/blog-images/")) {
    return Response.redirect(post.featured_image, 302);
  }

  // New posts without an image get a licensed external image automatically.
  if (!post.featured_image) {
    const externalImage = await findLicensedExternalImage(post.title);
    if (externalImage) {
      await supabase.from("blog_posts").update({ featured_image: externalImage }).eq("id", post.id);
      return Response.redirect(externalImage, 302);
    }
  }

  // Keep the existing generated SVG as a final fallback if no licensed external image is found.
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
