import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const DEFAULT_SITE_URL = "sc-domain:tusancn.ir";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "احراز هویت الزامی است" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const url = new URL(request.url);
  const requestedSiteUrl = url.searchParams.get("siteUrl") || DEFAULT_SITE_URL;
  const configuredSiteUrl = process.env.GSC_SITE_URL || DEFAULT_SITE_URL;

  // Do not allow an admin endpoint to proxy arbitrary Search Console properties.
  if (requestedSiteUrl !== configuredSiteUrl) {
    return NextResponse.json({ error: "Property انتخاب‌شده برای این سایت مجاز نیست" }, { status: 400 });
  }

  const dimension = url.searchParams.get("dimension") === "query" ? "query" : "page";
  const token = process.env.GSC_API_TOKEN;

  if (!token) {
    return NextResponse.json({ error: "اتصال Google Search Console پیکربندی نشده است" }, { status: 503 });
  }

  const end = new Date();
  end.setDate(end.getDate() - 3);
  const start = new Date(end);
  start.setDate(start.getDate() - 27);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  try {
    const response = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(configuredSiteUrl)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: fmt(start),
          endDate: fmt(end),
          dimensions: [dimension],
          rowLimit: 250,
          dataState: "final",
        }),
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || "خطا در دریافت داده Search Console" },
        { status: response.status }
      );
    }

    const rows = (data.rows || []).map(
      (row: {
        keys?: string[];
        clicks?: number;
        impressions?: number;
        ctr?: number;
        position?: number;
      }) => ({
        keys: row.keys || [],
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      })
    );

    const totals = rows.reduce(
      (a: { clicks: number; impressions: number }, r: { clicks: number; impressions: number }) => ({
        clicks: a.clicks + r.clicks,
        impressions: a.impressions + r.impressions,
      }),
      { clicks: 0, impressions: 0 }
    );

    return NextResponse.json({
      rows,
      totals,
      startDate: fmt(start),
      endDate: fmt(end),
      dimension,
      siteUrl: configuredSiteUrl,
    });
  } catch (error) {
    console.error("GSC request failed:", error);
    return NextResponse.json({ error: "ارتباط با Google Search Console برقرار نشد" }, { status: 502 });
  }
}
