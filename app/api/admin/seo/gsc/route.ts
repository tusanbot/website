import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSearchConsoleConfig, querySearchConsole } from "@/lib/google-search-console";

const DEFAULT_SITE_URL = "sc-domain:tusancn.ir";
type GscRow = { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number };

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: "احراز هویت الزامی است" } as const;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return { ok: false, status: 403, error: "دسترسی غیرمجاز" } as const;
  return { ok: true } as const;
}

const aggregate = (rows: GscRow[] = []) => {
  const clicks = rows.reduce((s, r) => s + Number(r.clicks || 0), 0);
  const impressions = rows.reduce((s, r) => s + Number(r.impressions || 0), 0);
  const ctr = impressions ? clicks / impressions : 0;
  const positionWeight = rows.reduce((s, r) => s + Number(r.position || 0) * Number(r.impressions || 0), 0);
  return { clicks, impressions, ctr, position: impressions ? positionWeight / impressions : 0 };
};

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(request.url);
  const requestedSiteUrl = url.searchParams.get("siteUrl") || DEFAULT_SITE_URL;
  const configuredSiteUrl = getSearchConsoleConfig().siteUrl;
  if (requestedSiteUrl !== configuredSiteUrl && requestedSiteUrl !== DEFAULT_SITE_URL) {
    return NextResponse.json({ error: "Property انتخاب‌شده برای این سایت مجاز نیست" }, { status: 400 });
  }

  const dimension = url.searchParams.get("dimension") === "query" ? "query" : "page";
  const configured = getSearchConsoleConfig().configured;
  const legacyToken = process.env.GSC_API_TOKEN;
  if (!configured && !legacyToken) return NextResponse.json({ error: "اتصال Google Search Console پیکربندی نشده است" }, { status: 503 });

  const end = new Date(); end.setUTCDate(end.getUTCDate() - 3);
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - 27);
  const previousEnd = new Date(start); previousEnd.setUTCDate(previousEnd.getUTCDate() - 1);
  const previousStart = new Date(previousEnd); previousStart.setUTCDate(previousStart.getUTCDate() - 27);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  try {
    let data: { rows?: GscRow[] };
    let trend: { rows?: GscRow[] };
    let totalsData: { rows?: GscRow[] };
    let previousData: { rows?: GscRow[] };

    if (configured) {
      [data, trend, totalsData, previousData] = await Promise.all([
        querySearchConsole(fmt(start), fmt(end), [dimension]),
        querySearchConsole(fmt(start), fmt(end), ["date"]),
        querySearchConsole(fmt(start), fmt(end), []),
        querySearchConsole(fmt(previousStart), fmt(previousEnd), []),
      ]);
    } else {
      const query = async (from: Date, to: Date, dims: string[]) => {
        const response = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(configuredSiteUrl)}/searchAnalytics/query`, {
          method: "POST",
          headers: { Authorization: `Bearer ${legacyToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ startDate: fmt(from), endDate: fmt(to), dimensions: dims, rowLimit: 250, dataState: "final" }),
          cache: "no-store",
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body?.error?.message || "خطا در دریافت داده Search Console");
        return body as { rows?: GscRow[] };
      };
      [data, trend, totalsData, previousData] = await Promise.all([
        query(start, end, [dimension]), query(start, end, ["date"]), query(start, end, []), query(previousStart, previousEnd, []),
      ]);
    }

    const rows = (data.rows || []).map(row => ({ keys: row.keys || [], clicks: row.clicks || 0, impressions: row.impressions || 0, ctr: row.ctr || 0, position: row.position || 0 }));
    const metrics = aggregate(totalsData.rows);
    const previousMetrics = aggregate(previousData.rows);
    const trendRows = (trend.rows || []).map(row => ({
      date: row.keys?.[0] || "—",
      clicks: Number(row.clicks || 0),
      impressions: Number(row.impressions || 0),
    }));

    return NextResponse.json({
      rows,
      totals: { clicks: metrics.clicks, impressions: metrics.impressions },
      metrics,
      previousMetrics,
      trend: trendRows,
      startDate: fmt(start),
      endDate: fmt(end),
      previousStartDate: fmt(previousStart),
      previousEndDate: fmt(previousEnd),
      dimension,
      siteUrl: configuredSiteUrl,
      source: configured ? "service-account" : "legacy-token",
    });
  } catch (error) {
    console.error("GSC request failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "ارتباط با Google Search Console برقرار نشد" }, { status: 502 });
  }
}
