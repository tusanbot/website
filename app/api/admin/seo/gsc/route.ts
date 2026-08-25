import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const siteUrl = url.searchParams.get("siteUrl");
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
    body: JSON.stringify({ startDate: fmt(start), endDate: fmt(end), dimensions: ["page"], rowLimit: 100 }),
    cache: "no-store",
  });

  const data = await response.json();
  if (!response.ok) return NextResponse.json({ error: data.error?.message || "خطا در دریافت داده Search Console" }, { status: response.status });
  return NextResponse.json({ rows: data.rows || [] });
}
