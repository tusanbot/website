import { NextRequest, NextResponse } from "next/server";
import { createAiSession, destroyAiSession, getAiProfile, type AiCapabilityKeys } from "@/lib/ai/server";
import { checkRateLimit, rejectOversizedJsonBody } from "@/lib/security/rateLimit";

export const runtime = "nodejs";

export async function GET() {
  const session = await getAiProfile();
  if (!session) return NextResponse.json({ profile: null });
  return NextResponse.json({ profile: session.profile });
}

export async function PUT(request: NextRequest) {
  try {
    const bodySizeError = rejectOversizedJsonBody(request, 16 * 1024);
    if (bodySizeError) return bodySizeError;
    const rateLimitResponse = await checkRateLimit({ scope: "ai:session", request, limit: 10, windowSeconds: 600 });
    if (rateLimitResponse) return rateLimitResponse;
    const body = await request.json() as { apiKey?: unknown; apiKeys?: unknown };
    const apiKeys: AiCapabilityKeys = {};
    if (body.apiKeys && typeof body.apiKeys === "object" && !Array.isArray(body.apiKeys)) {
      for (const capability of ["text", "image", "video", "music", "tts"] as const) {
        const value = (body.apiKeys as Record<string, unknown>)[capability];
        if (typeof value === "string" && value.trim().length >= 20) apiKeys[capability] = value.trim();
      }
    }
    if (typeof body.apiKey === "string" && body.apiKey.trim().length >= 20 && !apiKeys.text) apiKeys.text = body.apiKey.trim();
    if (!Object.keys(apiKeys).length) return NextResponse.json({ error: "حداقل یک کلید API معتبر وارد کنید." }, { status: 400 });
    const result = await createAiSession(apiKeys);
    if (!result.ok) return NextResponse.json({ error: result.message }, { status: 401 });
    return NextResponse.json({ profile: result.profile });
  } catch (error) {
    console.error("AI profile update error", error);
    return NextResponse.json({ error: "ذخیره پروفایل هوش مصنوعی انجام نشد." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await destroyAiSession();
    return NextResponse.json({ profile: null });
  } catch (error) {
    console.error("AI profile delete error", error);
    return NextResponse.json({ error: "حذف پروفایل هوش مصنوعی انجام نشد." }, { status: 500 });
  }
}
