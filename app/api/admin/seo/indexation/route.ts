import { NextResponse } from "next/server";

const SITE = "sc-domain:tusancn.ir";
const ORIGIN = "https://www.tusancn.ir";
const MAX_SITEMAP_URLS = 500;

type GscRow = { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number };

const dateFmt = (d: Date) => d.toISOString().slice(0, 10);

async function gscPages(token: string, startDate: string, endDate: string) {
  const response = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ startDate, endDate, dimensions: ["page"], rowLimit: MAX_SITEMAP_URLS, dataState: "final" }),
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "خطا در دریافت داده Search Console");
  return (data.rows || []) as GscRow[];
}

async function readSitemap(url: string, seen = new Set<string>()): Promise<string[]> {
  if (seen.has(url) || seen.size >= 20) return [];
  seen.add(url);
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Sitemap با وضعیت HTTP ${response.status} در دسترس نیست.`);
  const xml = await response.text();
  const locs = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map(m => m[1].trim());
  if (/<sitemapindex[\s>]/i.test(xml)) {
    const nested = await Promise.all(locs.slice(0, 20).map(item => readSitemap(item, seen)));
    return [...new Set(nested.flat())].slice(0, MAX_SITEMAP_URLS);
  }
  return [...new Set(locs)].slice(0, MAX_SITEMAP_URLS);
}

export async function GET() {
  const token = process.env.GSC_API_TOKEN;
  if (!token) return NextResponse.json({ error: "اتصال Google Search Console پیکربندی نشده است" }, { status: 503 });

  try {
    const end = new Date();
    end.setDate(end.getDate() - 3);
    const start = new Date(end);
    start.setDate(start.getDate() - 27);

    const [sitemapUrls, rows] = await Promise.all([
      readSitemap(`${ORIGIN}/sitemap.xml`),
      gscPages(token, dateFmt(start), dateFmt(end)),
    ]);

    const gsc = new Map<string, GscRow>();
    rows.forEach(row => { const page = row.keys?.[0]; if (page) gsc.set(page.replace(/\/$/, ""), row); });

    const normalized = sitemapUrls.map(url => url.replace(/\/$/, ""));
    const sitemapSet = new Set(normalized);
    const visible = normalized.filter(url => gsc.has(url));
    const noData = normalized.filter(url => !gsc.has(url));
    const dataOutsideSitemap = [...gsc.keys()].filter(url => !sitemapSet.has(url));

    const opportunities = visible
      .map(url => ({ url, clicks: gsc.get(url)?.clicks || 0, impressions: gsc.get(url)?.impressions || 0, ctr: gsc.get(url)?.ctr || 0, position: gsc.get(url)?.position || 0 }))
      .filter(item => item.impressions > 0 && item.position >= 4 && item.position <= 20)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 25);

    const highImpressionLowCtr = visible
      .map(url => ({ url, clicks: gsc.get(url)?.clicks || 0, impressions: gsc.get(url)?.impressions || 0, ctr: gsc.get(url)?.ctr || 0, position: gsc.get(url)?.position || 0 }))
      .filter(item => item.impressions >= 3 && item.ctr < 0.03)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 25);

    const coverage = sitemapUrls.length ? Math.round((visible.length / sitemapUrls.length) * 100) : 0;
    return NextResponse.json({
      site: SITE,
      generatedAt: new Date().toISOString(),
      period: { startDate: dateFmt(start), endDate: dateFmt(end) },
      summary: { sitemapUrls: sitemapUrls.length, urlsWithGscData: visible.length, urlsWithoutGscData: noData.length, gscUrlsOutsideSitemap: dataOutsideSitemap.length, performanceCoveragePercent: coverage },
      noPerformanceData: noData.slice(0, 100),
      outsideSitemap: dataOutsideSitemap.slice(0, 100),
      opportunities,
      highImpressionLowCtr,
      limitations: ["نداشتن داده عملکرد GSC به‌تنهایی اثبات نمی‌کند URL ایندکس نشده است.", "برای وضعیت قطعی Indexing باید از URL Inspection در Search Console استفاده شود."],
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "خطا در تحلیل وضعیت ایندکس و Sitemap" }, { status: 502 });
  }
}
