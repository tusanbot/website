import { NextResponse } from "next/server";

const SITE = "sc-domain:tusancn.ir";
const ORIGIN = "https://www.tusancn.ir";

type GscRow = { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number };

const dateFmt = (d: Date) => d.toISOString().slice(0, 10);

async function gscQuery(token: string, dimensions: string[], startDate: string, endDate: string) {
  const response = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ startDate, endDate, dimensions, rowLimit: 250, dataState: "final" }),
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "خطا در دریافت داده Search Console");
  return (data.rows || []) as GscRow[];
}

function severity(score: number) {
  if (score >= 90) return "excellent";
  if (score >= 75) return "good";
  if (score >= 55) return "warning";
  return "critical";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = process.env.GSC_API_TOKEN;
  if (!token) return NextResponse.json({ error: "اتصال Google Search Console پیکربندی نشده است" }, { status: 503 });

  const end = new Date();
  end.setDate(end.getDate() - 3);
  const start = new Date(end);
  start.setDate(start.getDate() - 27);
  const previousEnd = new Date(start);
  previousEnd.setDate(previousEnd.getDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - 27);

  try {
    const [current, previous] = await Promise.all([
      gscQuery(token, ["page"], dateFmt(start), dateFmt(end)),
      gscQuery(token, ["page"], dateFmt(previousStart), dateFmt(previousEnd)),
    ]);

    const currentClicks = current.reduce((n, r) => n + (r.clicks || 0), 0);
    const currentImpressions = current.reduce((n, r) => n + (r.impressions || 0), 0);
    const previousClicks = previous.reduce((n, r) => n + (r.clicks || 0), 0);
    const previousImpressions = previous.reduce((n, r) => n + (r.impressions || 0), 0);
    const avgPosition = current.length ? current.reduce((n, r) => n + (r.position || 0), 0) / current.length : 0;
    const avgCtr = current.length ? current.reduce((n, r) => n + (r.ctr || 0), 0) / current.length : 0;

    const alerts: Array<{ type: string; severity: string; title: string; detail: string; value?: number }> = [];
    const clickDrop = previousClicks > 0 ? (previousClicks - currentClicks) / previousClicks : 0;
    const impressionDrop = previousImpressions > 0 ? (previousImpressions - currentImpressions) / previousImpressions : 0;
    if (clickDrop >= 0.3) alerts.push({ type: "performance", severity: "critical", title: "افت شدید کلیک", detail: `کلیک‌ها نسبت به دوره قبل حدود ${(clickDrop * 100).toFixed(0)}٪ کاهش داشته‌اند.`, value: clickDrop });
    else if (clickDrop >= 0.15) alerts.push({ type: "performance", severity: "warning", title: "کاهش کلیک", detail: `کلیک‌ها نسبت به دوره قبل حدود ${(clickDrop * 100).toFixed(0)}٪ کاهش داشته‌اند.`, value: clickDrop });
    if (impressionDrop >= 0.3) alerts.push({ type: "visibility", severity: "critical", title: "افت شدید نمایش", detail: `Impression نسبت به دوره قبل حدود ${(impressionDrop * 100).toFixed(0)}٪ کاهش داشته است.`, value: impressionDrop });
    else if (impressionDrop >= 0.15) alerts.push({ type: "visibility", severity: "warning", title: "کاهش نمایش", detail: `Impression نسبت به دوره قبل حدود ${(impressionDrop * 100).toFixed(0)}٪ کاهش داشته است.`, value: impressionDrop });

    const opportunities = current
      .filter(r => (r.position || 99) >= 4 && (r.position || 99) <= 20 && (r.impressions || 0) > 0)
      .sort((a, b) => (b.impressions || 0) - (a.impressions || 0)).slice(0, 10);
    if (opportunities.length) alerts.push({ type: "opportunity", severity: "info", title: "فرصت‌های رتبه ۴ تا ۲۰", detail: `${opportunities.length} صفحه با نمایش واقعی در محدوده قابل بهبود پیدا شد.` });

    const sitemapUrls: string[] = [];
    const sitemapResponse = await fetch(`${ORIGIN}/sitemap.xml`, { cache: "no-store" });
    if (sitemapResponse.ok) {
      const xml = await sitemapResponse.text();
      for (const match of xml.matchAll(/<loc>(.*?)<\/loc>/g)) sitemapUrls.push(match[1].trim());
    } else {
      alerts.push({ type: "sitemap", severity: "critical", title: "Sitemap در دسترس نیست", detail: `sitemap.xml با وضعیت HTTP ${sitemapResponse.status} پاسخ داد.` });
    }

    const checked = sitemapUrls.slice(0, 30);
    const brokenUrls: Array<{ url: string; status: number }> = [];
    const statuses = await Promise.all(checked.map(async (target) => {
      try {
        const response = await fetch(target, { method: "HEAD", redirect: "follow", cache: "no-store" });
        return { url: target, status: response.status };
      } catch { return { url: target, status: 0 }; }
    }));
    statuses.forEach(item => { if (item.status === 0 || item.status >= 400) brokenUrls.push(item); });
    if (brokenUrls.length) alerts.push({ type: "broken_url", severity: "critical", title: "URL خراب در Sitemap", detail: `${brokenUrls.length} URL از URLهای بررسی‌شده پاسخ موفق دریافت نکرد.` });

    const penalty = alerts.reduce((n, a) => n + (a.severity === "critical" ? 25 : a.severity === "warning" ? 10 : 0), 0);
    const score = Math.max(0, 100 - penalty);
    return NextResponse.json({
      site: SITE,
      score,
      status: severity(score),
      generatedAt: new Date().toISOString(),
      period: { startDate: dateFmt(start), endDate: dateFmt(end), previousStartDate: dateFmt(previousStart), previousEndDate: dateFmt(previousEnd) },
      metrics: { clicks: currentClicks, impressions: currentImpressions, ctr: avgCtr, position: avgPosition, previousClicks, previousImpressions },
      checks: { sitemapUrls: sitemapUrls.length, checkedUrls: checked.length, brokenUrls },
      opportunities,
      alerts,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "خطا در پایش سلامت SEO" }, { status: 502 });
  }
}
