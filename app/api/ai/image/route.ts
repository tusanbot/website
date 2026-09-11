import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!key) return NextResponse.json({ error: "کلید API هوش مصنوعی در سرور تنظیم نشده است." }, { status: 503 });
    const body = await request.json();
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt || prompt.length > 12000) return NextResponse.json({ error: "پرامپت نامعتبر است." }, { status: 400 });
    const parts: Array<Record<string, unknown>> = [{ text: prompt }];
    if (body?.image?.data) parts.push({ inline_data: { mime_type: String(body.image.mimeType || "image/jpeg"), data: body.image.data } });
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent", {
      method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ["TEXT", "IMAGE"], imageConfig: { aspectRatio: body?.aspectRatio || "1:1" } } }), cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data?.error?.message || "خطا از مدل تصویر." }, { status: response.status });
    const output = data?.candidates?.[0]?.content?.parts || [];
    const image = output.find((part: { inlineData?: { data?: string; mimeType?: string }; inline_data?: { data?: string; mime_type?: string } }) => part.inlineData?.data || part.inline_data?.data);
    const text = output.filter((part: { text?: string }) => part.text).map((part: { text: string }) => part.text).join("\n");
    if (!image) return NextResponse.json({ error: text || "تصویری از مدل دریافت نشد." }, { status: 502 });
    const payload = image.inlineData || image.inline_data;
    return NextResponse.json({ url: `data:${payload.mimeType || payload.mime_type || "image/png"};base64,${payload.data}`, text });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "خطای ناشناخته" }, { status: 500 }); }
}
