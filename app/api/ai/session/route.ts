import { NextResponse } from "next/server";
import { createAiSession, destroyAiSession, getAiProfile } from "@/lib/ai/server";

export async function GET() {
  const session = await getAiProfile();
  return NextResponse.json({ authenticated: Boolean(session), profile: session?.profile ?? null });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { apiKey?: unknown };
    if (typeof body.apiKey !== "string" || body.apiKey.trim().length < 20) return NextResponse.json({ error: "کلید API معتبر وارد کنید." }, { status: 400 });
    const result = await createAiSession(body.apiKey);
    if (!result.ok) return NextResponse.json({ error: result.message }, { status: 401 });
    return NextResponse.json({ authenticated: true, profile: result.profile });
  } catch (error) {
    console.error("AI session error", error);
    return NextResponse.json({ error: "ورود به پروفایل هوش مصنوعی انجام نشد." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await destroyAiSession();
    return NextResponse.json({ authenticated: false });
  } catch {
    return NextResponse.json({ error: "خروج انجام نشد." }, { status: 500 });
  }
}
