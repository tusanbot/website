import { NextRequest, NextResponse } from "next/server";
import { getProfileApiKey, requireAiProfile } from "@/lib/ai/server";
import { checkRateLimit, rejectOversizedJsonBody } from "@/lib/security/rateLimit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const bodySizeError = rejectOversizedJsonBody(request, 4 * 1024 * 1024);
    if (bodySizeError) return bodySizeError;
    const rateLimitResponse = await checkRateLimit({ scope: "ai:image", request, limit: 6, windowSeconds: 60 });
    if (rateLimitResponse) return rateLimitResponse;
    const session = await requireAiProfile();
    if (session.profile.provider !== "gemini") return NextResponse.json({ error: "این ابزار فعلاً برای Gemini فعال است." }, { status: 400 });
    const key = await getProfileApiKey(session.profile.id);
    const body = await request.json();
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt || prompt.length > 12000) return NextResponse.json({ error: "پرامپت نامعتبر است." }, { status: 400 });
    const parts: Array<Record<string, unknown>> = [{ text: prompt }];
    if (body?.image?.data) parts.push({ inline_data: { mime_type: String(body.image.mimeType || "image/jpeg"), data: body.image.data } });
    const base = (process.env.GEMINI_API_BASE_URL || "https://generativelanguage.googleapis.com/v1beta").replace(/\/$/, "");
    const response = await fetch(`${base}/models/gemini-2.5-flash-image:generateContent`, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ["TEXT", "IMAGE"], imageConfig: { aspectRatio: body?.aspectRatio || "1:1" } } }), cache: "no-store", signal: AbortSignal.timeout(120000) });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data?.error?.message || "خطا از مدل تصویر." }, { status: 502 });
    const output = data?.candidates?.[0]?.content?.parts || [];
    const image = output.find((part: { inlineData?: { data?: string; mimeType?: string }; inline_data?: { data?: string; mime_type?: string } }) => part.inlineData?.data || part.inline_data?.data);
    const text = output.filter((part: { text?: string }) => part.text).map((part: { text: string }) => part.text).join("\n");
    if (!image) return NextResponse.json({ error: text || "تصویری از مدل دریافت نشد." }, { status: 502 });
    const payload = image.inlineData || image.inline_data;
    return NextResponse.json({ url: `data:${payload.mimeType || payload.mime_type || "image/png"};base64,${payload.data}`, text });
  } catch (error) {
    if (error instanceof Error && error.message === "AI_PROFILE_REQUIRED") return NextResponse.json({ error: "ابتدا API شخصی خود را در پروفایل هوش مصنوعی ثبت کنید." }, { status: 401 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "خطای ناشناخته" }, { status: 500 });
  }
}
