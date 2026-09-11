import { NextRequest, NextResponse } from "next/server";
import { getProfileApiKey, requireAiProfile } from "@/lib/ai/server";
import { checkRateLimit, rejectOversizedJsonBody } from "@/lib/security/rateLimit";

export const runtime = "nodejs";
const MAX_MESSAGES = 30;
const MAX_TEXT_LENGTH = 12000;

export async function POST(request: NextRequest) {
  try {
    const bodySizeError = rejectOversizedJsonBody(request, 256 * 1024);
    if (bodySizeError) return bodySizeError;
    const rateLimitResponse = await checkRateLimit({ scope: "ai:chat", request, limit: 30, windowSeconds: 60 });
    if (rateLimitResponse) return rateLimitResponse;

    let session;
    try { session = await requireAiProfile(); }
    catch (error) {
      if (error instanceof Error && error.message === "AI_PROFILE_REQUIRED") return NextResponse.json({ error: "ابتدا API شخصی خود را در پروفایل هوش مصنوعی ثبت کنید." }, { status: 401 });
      throw error;
    }

    if (session.profile.provider !== "gemini") return NextResponse.json({ error: "این ابزار فعلاً برای Gemini فعال است." }, { status: 400 });
    const apiKey = await getProfileApiKey(session.profile.id);
    const body = await request.json() as { messages?: unknown };
    const messages = Array.isArray(body.messages) ? body.messages.slice(-MAX_MESSAGES) : [];
    if (!messages.length) return NextResponse.json({ error: "پیامی برای ارسال وجود ندارد." }, { status: 400 });

    const contents = messages.map((message) => {
      const item = message as { role?: unknown; content?: unknown };
      return { role: item.role === "assistant" ? "model" : "user", parts: [{ text: String(item.content ?? "").slice(0, MAX_TEXT_LENGTH) }] };
    }).filter((message) => message.parts[0].text.trim());
    if (!contents.length) return NextResponse.json({ error: "متن پیام خالی است." }, { status: 400 });

    const base = (process.env.GEMINI_API_BASE_URL || "https://generativelanguage.googleapis.com/v1beta").replace(/\/$/, "");
    const endpoint = `${base}/models/${encodeURIComponent(session.profile.model)}:generateContent`;
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({ contents, generationConfig: { temperature: 0.7 } }),
      cache: "no-store",
      signal: AbortSignal.timeout(120000),
    });
    const payload = await upstream.json().catch(() => null) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; error?: { status?: string; message?: string } } | null;
    if (!upstream.ok) {
      console.error("Gemini request failed", { status: upstream.status, error: payload?.error?.status || payload?.error?.message });
      return NextResponse.json({ error: "درخواست به Gemini ناموفق بود. API Key یا مدل انتخابی را بررسی کنید." }, { status: 502 });
    }
    const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
    if (!text) return NextResponse.json({ error: "پاسخ متنی معتبری از مدل دریافت نشد." }, { status: 502 });
    return NextResponse.json({ text, model: session.profile.model });
  } catch (error) {
    console.error("AI chat failed", error);
    return NextResponse.json({ error: "خطایی هنگام پردازش درخواست هوش مصنوعی رخ داد." }, { status: 500 });
  }
}
