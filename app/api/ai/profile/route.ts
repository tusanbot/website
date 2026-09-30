import { NextRequest, NextResponse } from "next/server";
import { createAiSession, destroyAiSession, getAiProfile, type AiCapabilityKeys } from "@/lib/ai/server";
import { checkRateLimit, rejectOversizedJsonBody } from "@/lib/security/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}

export async function GET() {
  try {
    const session = await getAiProfile();
    return noStore(NextResponse.json({ profile: session?.profile || null }));
  } catch (error) {
    console.error("AI profile GET error", error);
    return noStore(NextResponse.json({ error: "بارگذاری پروفایل هوش مصنوعی انجام نشد." }, { status: 500 }));
  }
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
    if (!Object.keys(apiKeys).length) return noStore(NextResponse.json({ error: "حداقل یک کلید API برای متن و چت یا متن به صوت وارد کنید." }, { status: 400 }));

    const result = await createAiSession(apiKeys);
    if (!result.ok) return noStore(NextResponse.json({ error: result.message }, { status: 401 }));
    return noStore(NextResponse.json({ profile: result.profile }));
  } catch (error) {
    console.error("AI profile update error", error);
    const message = error instanceof Error ? error.message : "";
    const known = new Set([
      "خواندن پروفایل هوش مصنوعی انجام نشد.",
      "ذخیره پروفایل هوش مصنوعی انجام نشد.",
      "ساخت نشست هوش مصنوعی انجام نشد.",
    ]);
    return noStore(NextResponse.json({ error: known.has(message) ? message : "ذخیره پروفایل هوش مصنوعی انجام نشد." }, { status: 500 }));
  }
}

export async function DELETE() {
  try {
    await destroyAiSession();
    return noStore(NextResponse.json({ profile: null }));
  } catch (error) {
    console.error("AI profile delete error", error);
    return noStore(NextResponse.json({ error: "حذف پروفایل هوش مصنوعی انجام نشد." }, { status: 500 }));
  }
}
