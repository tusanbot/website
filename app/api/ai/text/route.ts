import { NextRequest, NextResponse } from "next/server";
import { getProfileApiKey, requireAiProfile } from "@/lib/ai/server";
import { checkRateLimit, rejectOversizedJsonBody } from "@/lib/security/rateLimit";

export const runtime = "nodejs";
const MAX_PROMPT = 50000;

export async function POST(request: NextRequest) {
  try {
    const bodySizeError = rejectOversizedJsonBody(request, 4 * 1024 * 1024);
    if (bodySizeError) return bodySizeError;
    const rateLimitResponse = await checkRateLimit({ scope: "ai:text", request, limit: 15, windowSeconds: 60 });
    if (rateLimitResponse) return rateLimitResponse;
    const session = await requireAiProfile();
    if (session.profile.provider !== "gemini") return NextResponse.json({ error: "این ابزار فعلاً برای Gemini فعال است." }, { status: 400 });
    const apiKey = await getProfileApiKey(session.profile.id);
    const body = await request.json();
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt || prompt.length > MAX_PROMPT) return NextResponse.json({ error: "متن درخواست نامعتبر یا بیش از حد طولانی است." }, { status: 400 });
    const file = body?.file && typeof body.file.data === "string" ? body.file : null;
    const parts: Array<Record<string, unknown>> = [{ text: prompt }];
    if (file) parts.push({ inline_data: { mime_type: String(file.mimeType || "application/octet-stream"), data: file.data } });
    const base = (process.env.GEMINI_API_BASE_URL || "https://generativelanguage.googleapis.com/v1beta").replace(/\/$/, "");
    const response = await fetch(`${base}/models/gemini-2.5-flash:generateContent`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { temperature: 0.4 } }), cache: "no-store", signal: AbortSignal.timeout(120000),
    });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data?.error?.message || "درخواست به Gemini ناموفق بود." }, { status: 502 });
    const text = data?.candidates?.[0]?.content?.parts?.filter((part: { text?: string }) => part.text).map((part: { text: string }) => part.text).join("\n") || "";
    if (!text) return NextResponse.json({ error: "پاسخ متنی معتبری از مدل دریافت نشد." }, { status: 502 });
    return NextResponse.json({ text });
  } catch (error) {
    if (error instanceof Error && error.message === "AI_PROFILE_REQUIRED") return NextResponse.json({ error: "ابتدا API شخصی خود را در پروفایل هوش مصنوعی ثبت کنید." }, { status: 401 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "خطای ناشناخته" }, { status: 500 });
  }
}
