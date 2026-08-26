import { NextResponse } from "next/server";

const SITE = "sc-domain:tusancn.ir";
const INSPECTION_URL = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";

type InspectionRequest = { url?: string };

export async function POST(request: Request) {
  const token = process.env.GSC_API_TOKEN;
  if (!token) return NextResponse.json({ error: "اتصال Google Search Console پیکربندی نشده است" }, { status: 503 });

  let body: InspectionRequest;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 }); }
  const url = body.url?.trim();
  if (!url) return NextResponse.json({ error: "URL الزامی است" }, { status: 400 });

  let parsed: URL;
  try { parsed = new URL(url); } catch { return NextResponse.json({ error: "URL نامعتبر است" }, { status: 400 }); }
  if (parsed.origin !== "https://www.tusancn.ir") return NextResponse.json({ error: "فقط URLهای دامنه tusancn.ir قابل بررسی هستند" }, { status: 400 });

  try {
    const response = await fetch(INSPECTION_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ inspectionUrl: url, siteUrl: SITE }),
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data.error?.message || "خطا در URL Inspection" }, { status: response.status });

    const result = data.inspectionResult || {};
    const index = result.indexStatusResult || {};
    const mobile = result.mobileUsabilityResult || {};
    const rich = result.richResultsResult || {};
    return NextResponse.json({
      inspectedUrl: url,
      inspectionResultLink: result.inspectionResultLink || null,
      indexStatus: {
        verdict: index.verdict || null,
        coverageState: index.coverageState || null,
        indexingState: index.indexingState || null,
        lastCrawlTime: index.lastCrawlTime || null,
        pageFetchState: index.pageFetchState || null,
        googleCanonical: index.googleCanonical || null,
        userCanonical: index.userCanonical || null,
        robotsTxtState: index.robotsTxtState || null,
        crawledAs: index.crawledAs || null,
      },
      mobileUsability: { verdict: mobile.verdict || null, issues: mobile.issues || [] },
      richResults: { verdict: rich.verdict || null, detectedItems: rich.detectedItems || [] },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "خطا در بررسی URL" }, { status: 502 });
  }
}
