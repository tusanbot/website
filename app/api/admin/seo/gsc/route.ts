import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const siteUrl = url.searchParams.get("siteUrl");
  const dimension = url.searchParams.get("dimension") === "query" ? "query" : "page";
  if (!siteUrl) return NextResponse.json({ error: "siteUrl الزامی است" }, { status: 400 });

  const token = process.env.GSC_API_TOKEN;
  if (!token) return NextResponse.json({ error: "اتصال Google Search Console پیکربندی نشده است" }, { status: 503 });

  const end = new Date();
  end.setDate(end.getDate() - 3);
  const start = new Date(end);
  start.setDate(start.getDate() - 27);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const response = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ startDate: fmt(start), endDate: fmt(end), dimensions: [dimension], rowLimit: 250, dataState: "final" }),
    cache: "no-store",
  });

  const data = await response.json();
  if (!response.ok) return NextResponse.json({ error: data.error?.message || "خطا در دریافت داده Search Console" }, { status: response.status });
  const rows = (data.rows || []).map((row: { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number }) => ({
    keys: row.keys || [],
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: row.ctr || 0,
    position: row.position || 0,
  }));
  const totals = rows.reduce((a: { clicks: number; impressions: number }, r: { clicks: number; impressions: number }) => ({ clicks: a.clicks + r.clicks, impressions: a.impressions + r.impressions }), { clicks: 0, impressions: 0 });
  return NextResponse.json({ rows, totals, startDate: fmt(start), endDate: fmt(end), dimension });
}
