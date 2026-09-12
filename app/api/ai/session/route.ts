import { NextRequest, NextResponse } from "next/server";
import { getAiAccess } from "@/lib/ai/access";
import { createAiSession, destroyAiSession, getAiProfile, type AiCapabilityKeys } from "@/lib/ai/server";
import { checkRateLimit, rejectOversizedJsonBody } from "@/lib/security/rateLimit";

export async function GET() {
  const access = await getAiAccess();
  if (access) return NextResponse.json({ authenticated: true, source: access.source, profile: access.source === "personal" ? await getAiProfile().then(session => session?.profile ?? null) : null, model: access.model });
  return NextResponse.json({ authenticated: false, source: null, profile: null });
}

export async function POST(request: NextRequest) {
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
    return NextResponse.json({ authenticated: true, source: "personal", profile: result.profile });
  } catch (error) {
    console.error("AI session error", error);
    return NextResponse.json({ error: "ورود به پروفایل هوش مصنوعی انجام نشد." }, { status: 500 });
  }
}

export async function DELETE() {
  try { await destroyAiSession(); return NextResponse.json({ authenticated: false }); } catch { return NextResponse.json({ error: "خروج انجام نشد." }, { status: 500 }); }
}
