import { NextRequest, NextResponse } from "next/server";
import { getProfileApiKey, requireAiProfile } from "@/lib/ai/server";
import { checkRateLimit, rejectOversizedJsonBody } from "@/lib/security/rateLimit";

export const runtime = "nodejs";
const BASE = "https://generativelanguage.googleapis.com/v1beta";

export async function POST(request: NextRequest) {
  try {
    const bodySizeError = rejectOversizedJsonBody(request, 4 * 1024 * 1024);
    if (bodySizeError) return bodySizeError;
    const rateLimitResponse = await checkRateLimit({ scope: "ai:video", request, limit: 2, windowSeconds: 60 });
    if (rateLimitResponse) return rateLimitResponse;
    const session = await requireAiProfile();
    if (session.profile.provider !== "gemini") return NextResponse.json({ error: "این ابزار فعلاً برای Gemini فعال است." }, { status: 400 });
    const key = await getProfileApiKey(session.profile.id);
    const body = await request.json();
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt || prompt.length > 10000) return NextResponse.json({ error: "پرامپت ویدیو نامعتبر است." }, { status: 400 });
    const response = await fetch(`${BASE}/models/veo-3.1-generate-preview:predictLongRunning`, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body: JSON.stringify({ instances: [{ prompt }], parameters: { aspectRatio: body?.aspectRatio === "9:16" ? "9:16" : "16:9" } }), cache: "no-store", signal: AbortSignal.timeout(30000) });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data?.error?.message || "خطا از مدل ویدیو." }, { status: 502 });
    if (!data?.name) return NextResponse.json({ error: "شناسه عملیات تولید ویدیو دریافت نشد." }, { status: 502 });
    return NextResponse.json({ operation: data.name });
  } catch (error) {
    if (error instanceof Error && error.message === "AI_PROFILE_REQUIRED") return NextResponse.json({ error: "ابتدا API شخصی خود را در پروفایل هوش مصنوعی ثبت کنید." }, { status: 401 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "خطای ناشناخته" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = await checkRateLimit({ scope: "ai:video-status", request, limit: 20, windowSeconds: 60 });
    if (rateLimitResponse) return rateLimitResponse;
    const session = await requireAiProfile();
    if (session.profile.provider !== "gemini") return NextResponse.json({ error: "این ابزار فعلاً برای Gemini فعال است." }, { status: 400 });
    const key = await getProfileApiKey(session.profile.id);
    const operation = new URL(request.url).searchParams.get("operation");
    if (!operation || !operation.startsWith("models/")) return NextResponse.json({ error: "شناسه عملیات نامعتبر است." }, { status: 400 });
    const response = await fetch(`${BASE}/${operation}`, { headers: { "x-goog-api-key": key }, cache: "no-store", signal: AbortSignal.timeout(30000) });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data?.error?.message || "خطا در بررسی عملیات." }, { status: 502 });
    if (!data.done) return NextResponse.json({ done: false });
    if (data.error) return NextResponse.json({ done: true, error: data.error.message || "تولید ویدیو ناموفق بود." }, { status: 502 });
    const uri = data?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
    if (!uri) return NextResponse.json({ done: true, error: "آدرس فایل ویدیو دریافت نشد." }, { status: 502 });
    const video = await fetch(uri, { headers: { "x-goog-api-key": key }, cache: "no-store" });
    if (!video.ok || !video.body) return NextResponse.json({ done: true, error: "دریافت فایل ویدیو ناموفق بود." }, { status: 502 });
    return new Response(video.body, { status: 200, headers: { "Content-Type": video.headers.get("content-type") || "video/mp4", "Cache-Control": "private, max-age=60" } });
  } catch (error) {
    if (error instanceof Error && error.message === "AI_PROFILE_REQUIRED") return NextResponse.json({ error: "ابتدا API شخصی خود را در پروفایل هوش مصنوعی ثبت کنید." }, { status: 401 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "خطای ناشناخته" }, { status: 500 });
  }
}
