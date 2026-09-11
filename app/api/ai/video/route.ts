import { NextResponse } from "next/server";

const BASE = "https://generativelanguage.googleapis.com/v1beta";

export async function POST(request: Request) {
  try {
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!key) return NextResponse.json({ error: "کلید API هوش مصنوعی در سرور تنظیم نشده است." }, { status: 503 });
    const body = await request.json();
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt || prompt.length > 10000) return NextResponse.json({ error: "پرامپت ویدیو نامعتبر است." }, { status: 400 });
    const response = await fetch(`${BASE}/models/veo-3.1-generate-preview:predictLongRunning`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ instances: [{ prompt }], parameters: { aspectRatio: body?.aspectRatio === "9:16" ? "9:16" : "16:9" } }), cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data?.error?.message || "خطا از مدل ویدیو." }, { status: response.status });
    if (!data?.name) return NextResponse.json({ error: "شناسه عملیات تولید ویدیو دریافت نشد." }, { status: 502 });
    return NextResponse.json({ operation: data.name });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "خطای ناشناخته" }, { status: 500 }); }
}

export async function GET(request: Request) {
  try {
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!key) return NextResponse.json({ error: "کلید API هوش مصنوعی در سرور تنظیم نشده است." }, { status: 503 });
    const operation = new URL(request.url).searchParams.get("operation");
    if (!operation || !operation.startsWith("models/")) return NextResponse.json({ error: "شناسه عملیات نامعتبر است." }, { status: 400 });
    const response = await fetch(`${BASE}/${operation}`, { headers: { "x-goog-api-key": key }, cache: "no-store" });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data?.error?.message || "خطا در بررسی عملیات." }, { status: response.status });
    if (!data.done) return NextResponse.json({ done: false });
    if (data.error) return NextResponse.json({ done: true, error: data.error.message || "تولید ویدیو ناموفق بود." }, { status: 502 });
    const uri = data?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
    if (!uri) return NextResponse.json({ done: true, error: "آدرس فایل ویدیو دریافت نشد." }, { status: 502 });
    const video = await fetch(uri, { headers: { "x-goog-api-key": key }, cache: "no-store" });
    if (!video.ok) return NextResponse.json({ done: true, error: "دریافت فایل ویدیو ناموفق بود." }, { status: 502 });
    const bytes = Buffer.from(await video.arrayBuffer());
    return new NextResponse(bytes, { status: 200, headers: { "Content-Type": "video/mp4", "Cache-Control": "private, max-age=60" } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "خطای ناشناخته" }, { status: 500 }); }
}
