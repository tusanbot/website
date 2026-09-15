import { NextResponse } from "next/server";
import { getSearchConsoleConfig, getSearchConsoleDashboard } from "@/lib/google-search-console";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const config = getSearchConsoleConfig();
  if (!config.configured) {
    return NextResponse.json({ configured: false, siteUrl: config.siteUrl }, { status: 200 });
  }

  try {
    const url = new URL(request.url);
    const days = Number(url.searchParams.get("days") || "28");
    const data = await getSearchConsoleDashboard(Number.isFinite(days) ? days : 28);
    return NextResponse.json({ configured: true, ...data });
  } catch (error) {
    console.error("Search Console dashboard error:", error);
    return NextResponse.json({ configured: true, error: "دریافت اطلاعات Google Search Console انجام نشد." }, { status: 502 });
  }
}
