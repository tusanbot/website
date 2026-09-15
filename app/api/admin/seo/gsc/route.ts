import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSearchConsoleConfig, querySearchConsole } from "@/lib/google-search-console";

const DEFAULT_SITE_URL = "sc-domain:tusancn.ir";

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: "احراز هویت الزامی است" } as const;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return { ok: false, status: 403, error: "دسترسی غیرمجاز" } as const;
  return { ok: true } as const;
}

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
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  try {
    let data: { rows?: Array<{ keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number }> };
    if (configured) {
      data = await querySearchConsole(fmt(start), fmt(end), [dimension]);
    } else {
      const response = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(configuredSiteUrl)}/searchAnalytics/query`, { method: "POST", headers: { Authorization: `Bearer ${legacyToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ startDate: fmt(start), endDate: fmt(end), dimensions: [dimension], rowLimit: 250, dataState: "final" }), cache: "no-store" });
      data = await response.json();
      if (!response.ok) return NextResponse.json({ error: (data as any).error?.message || "خطا در دریافت داده Search Console" }, { status: response.status });
    }

    const rows = (data.rows || []).map(row => ({ keys: row.keys || [], clicks: row.clicks || 0, impressions: row.impressions || 0, ctr: row.ctr || 0, position: row.position || 0 }));
    const totals = rows.reduce((a, r) => ({ clicks: a.clicks + r.clicks, impressions: a.impressions + r.impressions }), { clicks: 0, impressions: 0 });
    return NextResponse.json({ rows, totals, startDate: fmt(start), endDate: fmt(end), dimension, siteUrl: configuredSiteUrl, source: configured ? "service-account" : "legacy-token" });
  } catch (error) {
    console.error("GSC request failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "ارتباط با Google Search Console برقرار نشد" }, { status: 502 });
  }
}
