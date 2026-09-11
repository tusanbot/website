import { NextResponse } from "next/server";

const MAX_PROMPT = 50000;

export async function POST(request: Request) {
  try {
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!key) return NextResponse.json({ error: "کلید API هوش مصنوعی در سرور تنظیم نشده است." }, { status: 503 });
    const body = await request.json();
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt || prompt.length > MAX_PROMPT) return NextResponse.json({ error: "متن درخواست نامعتبر یا بیش از حد طولانی است." }, { status: 400 });
    const file = body?.file && typeof body.file.data === "string" ? body.file : null;
    if (file && file.data.length > 18_000_000) return NextResponse.json({ error: "فایل برای پردازش مستقیم با AI بیش از حد بزرگ است." }, { status: 400 });

    const parts: Array<Record<string, unknown>> = [{ text: prompt }];
    if (file) parts.push({ inline_data: { mime_type: String(file.mimeType || "application/octet-stream"), data: file.data } });

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ role: "user", parts }] }),
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data?.error?.message || "خطا از سرویس هوش مصنوعی." }, { status: response.status });
    const text = data?.candidates?.[0]?.content?.parts?.filter((part: { text?: string }) => part.text).map((part: { text: string }) => part.text).join("\n") || "";
    return NextResponse.json({ text });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "خطای ناشناخته" }, { status: 500 });
  }
}
