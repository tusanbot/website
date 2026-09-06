import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanHtml(value: unknown) {
  return String(value ?? "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

function topicForTitle(title: string) {
  const t = title.toLowerCase();
  if (t.includes("سایپا")) return "car";
  if (t.includes("ایران‌خودرو") || t.includes("ایران خودرو")) return "car";
  if (t.includes("بهمن موتور")) return "car";
  if (t.includes("خودروهای برقی")) return "electric-car";
  if (t.includes("خودروهای وارداتی")) return "imported-car";
  if (t.includes("تعویض پلاک") || t.includes("پلاک")) return "license-plate";
  if (t.includes("خلافی خودرو") || t.includes("پرداخت خلافی")) return "traffic";
  if (t.includes("لاستیک")) return "tire";
  if (t.includes("بورس کالا")) return "finance";
  if (t.includes("نتایج کنکور")) return "results";
  if (t.includes("کنکور") || t.includes("آزمون") || t.includes("کارت ورود")) return "exam";
  if (t.includes("مالیات") || t.includes("اظهارنامه") || t.includes("مؤدیان") || t.includes("فیش مالیاتی") || t.includes("صورتحساب") || t.includes("کد اقتصادی") || t.includes("حق تمبر")) return "tax";
  if (t.includes("املاک") || t.includes("مستغلات")) return "real-estate";
  if (t.includes("تأمین اجتماعی") || t.includes("تامین اجتماعی") || t.includes("بیمه")) return "insurance";
  if (t.includes("بازنشستگی") || t.includes("مستمری") || t.includes("بازماندگان") || t.includes("هدیه ازدواج")) return "pension";
  if (t.includes("دانشگاه") || t.includes("دانشجو")) return "student";
  return "digital-services";
}

function imageQueryForTitle(title: string) {
  switch (topicForTitle(title)) {
    case "car": return ["Iran Khodro Samand", "Saipa car Iran", "Iranian car dealership"];
    case "electric-car": return ["electric car charging", "electric vehicle charging station"];
    case "imported-car": return ["car import port", "car dealership"];
    case "license-plate": return ["Iran license plate", "car license plate"];
    case "traffic": return ["traffic road car", "road traffic"];
    case "tire": return ["car tire", "automobile tire"];
    case "finance": return ["stock exchange finance", "financial market"];
    case "results": return ["university graduation students", "student results education"];
    case "exam": return ["university exam student", "student examination"];
    case "tax": return ["tax accounting documents", "tax office paperwork"];
    case "real-estate": return ["real estate house", "property documents"];
    case "insurance": return ["social security office", "insurance documents"];
    case "pension": return ["senior pension retirement", "retirement documents"];
    case "student": return ["university student", "student desk"];
    default: return ["digital government services", "office paperwork"];
  }
}

function isAllowedLicense(name: string) {
  const n = name.toLowerCase().replace(/\s+/g, " ").trim();
  return n.includes("cc0") || n.includes("public domain");
}

async function findLicensedExternalImage(title: string, postId: string) {
  const queries = imageQueryForTitle(title);
  const offset = Number.parseInt(postId.replace(/-/g, "").slice(0, 6), 16) || 0;

  for (let queryIndex = 0; queryIndex < queries.length; queryIndex++) {
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      generator: "search",
      gsrnamespace: "6",
      gsrsearch: queries[queryIndex],
      gsrlimit: "20",
      prop: "imageinfo",
      iiprop: "url|size|mime|extmetadata",
      iiurlwidth: "1200",
      iiextmetadatafilter: "LicenseShortName|UsageTerms|Artist|Credit|Attribution",
      origin: "*",
    });

    try {
      const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`, {
        headers: { "User-Agent": "TusanCN Blog Image Resolver/2.0 (https://tusancn.ir)", Accept: "application/json" },
      });
      if (!response.ok) continue;
      const data = await response.json();
      const pages = Object.values(data?.query?.pages ?? {}) as any[];
      const candidates = pages.filter((page) => {
        const info = page?.imageinfo?.[0];
        if (!info) return false;
        const mime = String(info.mime ?? "");
        const meta = info.extmetadata ?? {};
        const license = cleanHtml(meta.LicenseShortName?.value ?? meta.UsageTerms?.value);
        return mime.startsWith("image/") && mime !== "image/svg+xml" && isAllowedLicense(license) && Number(info.width ?? 0) >= 600 && Number(info.height ?? 0) >= 350;
      });
      if (candidates.length) {
        const index = (offset + queryIndex) % candidates.length;
        const info = candidates[index].imageinfo[0];
        return { url: (info.thumburl || info.url) as string, mime: String(info.mime) };
      }
    } catch {}
  }

  return null;
}

function storageUrl(id: string, extension = "jpg") {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/blog-images/posts/${id}.${extension}`;
}

function escapeXml(value: string) {
  return value.replace(/[&<>\"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&apos;" })[char] || char);
}

function illustrationSvg(title: string, category: string | undefined) {
  const topic = topicForTitle(title);
  const safeTitle = escapeXml(title).slice(0, 170);
  const safeCategory = escapeXml(category || "راهنما و آموزش");
  const palettes: Record<string, [string, string]> = {
    car: ["#0b7f70", "#e9f7f4"],
    "electric-car": ["#147a63", "#eaf8f1"],
    "imported-car": ["#1b6d85", "#eaf6fa"],
    "license-plate": ["#466b8a", "#edf4f9"],
    traffic: ["#7b6244", "#faf4ea"],
    tire: ["#4d5964", "#eef1f3"],
    finance: ["#426b58", "#edf7f1"],
    results: ["#6c5a88", "#f3eff9"],
    exam: ["#3d6780", "#edf5f8"],
    tax: ["#7b5e3b", "#faf3e8"],
    "real-estate": ["#56715d", "#eff6ef"],
    insurance: ["#386b78", "#edf7f8"],
    pension: ["#80644b", "#faf4ec"],
    student: ["#555d86", "#f0f1fa"],
    "digital-services": ["#087d69", "#e8f6f2"],
  };
  const [primary, light] = palettes[topic] || palettes["digital-services"];

  const icon = (() => {
    switch (topic) {
      case "car":
      case "electric-car":
      case "imported-car":
      case "traffic":
        return `<g transform="translate(690 165)"><rect x="45" y="95" width="330" height="125" rx="35" fill="${primary}"/><path d="M95 95l55-72h125l65 72" fill="none" stroke="${primary}" stroke-width="24" stroke-linejoin="round"/><circle cx="120" cy="225" r="34" fill="#fff"/><circle cx="300" cy="225" r="34" fill="#fff"/><circle cx="120" cy="225" r="14" fill="${primary}"/><circle cx="300" cy="225" r="14" fill="${primary}"/><rect x="168" y="120" width="96" height="48" rx="8" fill="${light}"/>${topic === "electric-car" ? `<path d="M214 126l-22 36h24l-12 32 34-44h-24z" fill="${primary}"/>` : ""}</g>`;
      case "license-plate":
        return `<g transform="translate(700 175)"><rect width="340" height="150" rx="18" fill="#fff" stroke="${primary}" stroke-width="12"/><rect x="20" y="25" width="38" height="100" rx="5" fill="${primary}"/><circle cx="39" cy="50" r="7" fill="#fff"/><circle cx="39" cy="75" r="7" fill="#fff"/><circle cx="39" cy="100" r="7" fill="#fff"/><text x="190" y="98" text-anchor="middle" font-size="54" font-family="Tahoma,Arial" font-weight="900" fill="${primary}">IR 12</text></g>`;
      case "tire":
        return `<g transform="translate(760 140)"><circle cx="150" cy="150" r="125" fill="#26323a"/><circle cx="150" cy="150" r="68" fill="${light}"/><circle cx="150" cy="150" r="35" fill="${primary}"/><path d="M65 65l28 28m114-28l-28 28M65 235l28-28m114 28l-28-28" stroke="#fff" stroke-width="18" stroke-linecap="round"/></g>`;
      case "finance":
        return `<g transform="translate(700 130)"><rect x="0" y="185" width="330" height="28" rx="14" fill="${primary}"/><rect x="35" y="100" width="48" height="85" rx="8" fill="${primary}"/><rect x="115" y="55" width="48" height="130" rx="8" fill="${primary}"/><rect x="195" y="82" width="48" height="103" rx="8" fill="${primary}"/><path d="M20 80l90-45 80 27 105-55" fill="none" stroke="#d9a84f" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/><path d="M280 7l15 0-4 15" fill="none" stroke="#d9a84f" stroke-width="12"/></g>`;
      case "results":
      case "exam":
      case "student":
        return `<g transform="translate(720 115)"><rect x="40" y="35" width="270" height="300" rx="20" fill="#fff" stroke="${primary}" stroke-width="12"/><path d="M105 35v-20h140v20" fill="none" stroke="${primary}" stroke-width="12"/><rect x="80" y="95" width="190" height="18" rx="9" fill="${light}"/><rect x="80" y="140" width="150" height="18" rx="9" fill="${light}"/><rect x="80" y="185" width="180" height="18" rx="9" fill="${light}"/><circle cx="225" cy="265" r="45" fill="${primary}"/><path d="M205 265l15 15 29-34" fill="none" stroke="#fff" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/></g>`;
      case "tax":
        return `<g transform="translate(700 120)"><rect x="35" y="25" width="275" height="315" rx="22" fill="#fff" stroke="${primary}" stroke-width="12"/><rect x="78" y="78" width="190" height="28" rx="8" fill="${light}"/><rect x="78" y="135" width="135" height="20" rx="8" fill="${light}"/><rect x="78" y="178" width="170" height="20" rx="8" fill="${light}"/><rect x="78" y="221" width="110" height="20" rx="8" fill="${light}"/><circle cx="252" cy="275" r="45" fill="${primary}"/><text x="252" y="293" text-anchor="middle" font-size="45" font-family="Tahoma" font-weight="900" fill="#fff">٪</text></g>`;
      case "real-estate":
        return `<g transform="translate(700 105)"><path d="M30 165L175 45l145 120v170H30z" fill="#fff" stroke="${primary}" stroke-width="12"/><path d="M175 45v290M30 165h290" stroke="${primary}" stroke-width="12"/><rect x="135" y="225" width="80" height="110" rx="8" fill="${primary}"/><path d="M82 190h55v55H82zm130 0h55v55h-55z" fill="${light}" stroke="${primary}" stroke-width="9"/></g>`;
      case "insurance":
        return `<g transform="translate(720 125)"><path d="M160 20l130 48v95c0 85-55 130-130 165-75-35-130-80-130-165V68z" fill="#fff" stroke="${primary}" stroke-width="12"/><path d="M160 100v105m-52-52h105" stroke="${primary}" stroke-width="22" stroke-linecap="round"/></g>`;
      case "pension":
        return `<g transform="translate(715 125)"><circle cx="150" cy="105" r="65" fill="${light}" stroke="${primary}" stroke-width="12"/><path d="M85 220c15-65 115-65 130 0" fill="${light}" stroke="${primary}" stroke-width="12"/><rect x="55" y="240" width="190" height="42" rx="21" fill="${primary}"/><path d="M275 110c40 30 40 90 0 120" fill="none" stroke="${primary}" stroke-width="15" stroke-linecap="round"/></g>`;
      default:
        return `<g transform="translate(700 130)"><rect x="30" y="35" width="300" height="220" rx="30" fill="#fff" stroke="${primary}" stroke-width="12"/><rect x="65" y="78" width="230" height="24" rx="12" fill="${light}"/><rect x="65" y="125" width="165" height="24" rx="12" fill="${light}"/><circle cx="255" cy="195" r="42" fill="${primary}"/><path d="M235 195l14 14 29-34" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/></g>`;
    }
  })();

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${primary}"/><stop offset="1" stop-color="#0b8a86"/></linearGradient></defs><rect width="1200" height="630" fill="#f8fbfa"/><rect x="0" y="0" width="1200" height="630" fill="url(#bg)"/><circle cx="1050" cy="90" r="180" fill="#fff" opacity=".08"/><circle cx="860" cy="550" r="260" fill="#fff" opacity=".06"/><rect x="70" y="70" width="1060" height="490" rx="36" fill="#fff" opacity=".97"/><text x="1020" y="125" text-anchor="end" font-size="25" font-weight="700" fill="${primary}" font-family="Tahoma,Arial,sans-serif">${safeCategory}</text><text x="1020" y="180" text-anchor="end" font-size="42" font-weight="900" fill="#172a27" font-family="Tahoma,Arial,sans-serif">کافی نت توسن</text>${icon}<text x="120" y="295" text-anchor="start" font-size="31" font-weight="800" fill="#243b37" font-family="Tahoma,Arial,sans-serif">${safeTitle}</text><rect x="120" y="350" width="430" height="10" rx="5" fill="${primary}" opacity=".22"/><rect x="120" y="382" width="330" height="10" rx="5" fill="${primary}" opacity=".14"/><text x="120" y="480" font-size="24" font-weight="700" fill="${primary}" font-family="Tahoma,Arial,sans-serif">راهنمای خدمات و امور اینترنتی</text></svg>`;
}

async function persistExternalImage(supabase: ReturnType<typeof supabaseAdmin>, postId: string, title: string) {
  const external = await findLicensedExternalImage(title, postId);
  if (!external) return null;
  try {
    const response = await fetch(external.url, { headers: { "User-Agent": "TusanCN Blog Image Proxy/2.0" } });
    const contentType = response.headers.get("content-type") || external.mime || "image/jpeg";
    if (!response.ok || !contentType.startsWith("image/") || contentType === "image/svg+xml") return null;
    const bytes = await response.arrayBuffer();
    const extension = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
    const path = `posts/${postId}.${extension}`;
    const { error } = await supabase.storage.from("blog-images").upload(path, bytes, { contentType, cacheControl: "31536000", upsert: true });
    if (error) return null;
    const publicUrl = storageUrl(postId, extension);
    await supabase.from("blog_posts").update({ featured_image: publicUrl }).eq("id", postId);
    return { bytes, contentType, publicUrl };
  } catch {
    return null;
  }
}

async function persistIllustration(supabase: ReturnType<typeof supabaseAdmin>, postId: string, title: string, category?: string) {
  const bytes = new TextEncoder().encode(illustrationSvg(title, category));
  const path = `posts/${postId}.svg`;
  const { error } = await supabase.storage.from("blog-images").upload(path, bytes, { contentType: "image/svg+xml", cacheControl: "31536000", upsert: true });
  if (error) return null;
  const publicUrl = storageUrl(postId, "svg");
  await supabase.from("blog_posts").update({ featured_image: publicUrl }).eq("id", postId);
  return { bytes, contentType: "image/svg+xml", publicUrl };
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
  const isApiPlaceholder = /^\/api\/blog\/.*\/og-image(?:\?.*)?$/i.test(currentImage);
  const forceRefresh = new URL(request.url).searchParams.get("refresh") === "1";
  const categoryRelation = (post as any).blog_categories;
  const category = Array.isArray(categoryRelation) ? categoryRelation[0]?.name : categoryRelation?.name;

  // Every refresh regenerates a deterministic, topic-specific illustration. This avoids
  // unrelated/repeated stock photos while keeping all artwork self-hosted and license-free.
  if (forceRefresh || isLegacyGenerated || isApiPlaceholder) {
    const illustration = await persistIllustration(supabase, post.id, post.title, category);
    if (illustration) {
      return new Response(illustration.bytes, { headers: { "Content-Type": illustration.contentType, "Cache-Control": "public, max-age=31536000, immutable" } });
    }
  }

  if (currentImage && !isLegacyGenerated && !isApiPlaceholder && /^https?:\/\//i.test(currentImage)) {
    try {
      const response = await fetch(currentImage, { headers: { "User-Agent": "TusanCN Blog Image Proxy/2.0" } });
      if (response.ok) return new Response(await response.arrayBuffer(), { headers: { "Content-Type": response.headers.get("content-type") || "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable" } });
    } catch {}
  }

  const extensions = ["jpg", "png", "webp", "svg"];
  for (const extension of extensions) {
    const path = `posts/${post.id}.${extension}`;
    const { data: existing } = await supabase.storage.from("blog-images").download(path);
    if (existing) {
      const contentType = extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : extension === "svg" ? "image/svg+xml" : "image/jpeg";
      const publicUrl = storageUrl(post.id, extension);
      if (post.featured_image !== publicUrl) await supabase.from("blog_posts").update({ featured_image: publicUrl }).eq("id", post.id);
      return new Response(existing, { headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000, immutable" } });
    }
  }

  const illustration = await persistIllustration(supabase, post.id, post.title, category);
  if (!illustration) return new Response("Failed to store image", { status: 500 });
  return new Response(illustration.bytes, { headers: { "Content-Type": illustration.contentType, "Cache-Control": "public, max-age=31536000, immutable" } });
}
