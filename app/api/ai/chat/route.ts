import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserAiCredentials } from "@/lib/ai/profile";

export const runtime = "nodejs";

const MAX_MESSAGES = 30;
const MAX_TEXT_LENGTH = 12000;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "برای استفاده از هوش مصنوعی وارد حساب شوید." }, { status: 401 });

    const credentials = await getUserAiCredentials(user.id);
    if (!credentials) return NextResponse.json({ error: "ابتدا API خود را در پروفایل هوش مصنوعی ثبت کنید." }, { status: 400 });
    if (credentials.provider !== "gemini" && credentials.provider !== "google") {
      return NextResponse.json({ error: `ارائه‌دهنده «${credentials.provider}» هنوز در این نسخه فعال نشده است.` }, { status: 400 });
    }

    const body = await request.json();
    const messages = Array.isArray(body.messages) ? body.messages.slice(-MAX_MESSAGES) : [];
    if (!messages.length) return NextResponse.json({ error: "پیامی برای ارسال وجود ندارد." }, { status: 400 });

    const contents = messages.map((message: { role?: string; content?: string }) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: String(message.content ?? "").slice(0, MAX_TEXT_LENGTH) }],
    })).filter((message: { parts: { text: string }[] }) => message.parts[0].text.trim());

    if (!contents.length) return NextResponse.json({ error: "متن پیام خالی است." }, { status: 400 });

    const model = credentials.model || "gemini-3.8-flash";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": credentials.apiKey },
      body: JSON.stringify({ contents, generationConfig: { temperature: 0.7 } }),
      cache: "no-store",
    });

    const payload = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      console.error("Gemini request failed", { status: upstream.status, error: payload?.error?.status || payload?.error?.message });
      return NextResponse.json({ error: "درخواست به سرویس هوش مصنوعی ناموفق بود. API Key، مدل و دسترسی آن را بررسی کنید." }, { status: 502 });
    }

    const text = payload?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("") || "";
    if (!text) return NextResponse.json({ error: "پاسخ متنی معتبری از مدل دریافت نشد." }, { status: 502 });

    return NextResponse.json({ text, model });
  } catch (error) {
    console.error("AI chat failed", error);
    const message = error instanceof Error && error.message.includes("AI_PROFILE_ENCRYPTION_KEY")
      ? "تنظیمات امنیتی سرور برای خواندن امن API Key کامل نشده است."
      : "خطایی هنگام پردازش درخواست هوش مصنوعی رخ داد.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
