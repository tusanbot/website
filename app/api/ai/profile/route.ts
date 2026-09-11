import { NextRequest, NextResponse } from "next/server";
import { createAiSession, destroyAiSession, getAiProfile } from "@/lib/ai/server";
import { checkRateLimit, rejectOversizedJsonBody } from "@/lib/security/rateLimit";

export const runtime = "nodejs";

export async function GET() {
  const session = await getAiProfile();
  if (!session) return NextResponse.json({ profile: null });
  return NextResponse.json({ profile: session.profile });
}

export async function PUT(request: NextRequest) {
  try {
    const bodySizeError = rejectOversizedJsonBody(request, 4 * 1024);
    if (bodySizeError) return bodySizeError;
    const rateLimitResponse = await checkRateLimit({ scope: "ai:session", request, limit: 5, windowSeconds: 600 });
    if (rateLimitResponse) return rateLimitResponse;
    const body = await request.json() as { apiKey?: unknown };
    if (typeof body.apiKey !== "string" || body.apiKey.trim().length < 20) return NextResponse.json({ error: "کلید API معتبر وارد کنید." }, { status: 400 });
    const result = await createAiSession(body.apiKey);
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
