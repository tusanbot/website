import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;
  const normalized = decodeURIComponent(code || "").trim().toUpperCase();
  if (!normalized || !/^[A-Z0-9_-]{2,100}$/.test(normalized)) {
    return NextResponse.redirect(new URL("/auth?mode=register&error=invalid_referral", request.url));
  }
  const response = NextResponse.redirect(new URL(`/auth?mode=register&ref=${encodeURIComponent(normalized)}`, request.url));
  response.cookies.set("tusan_referral", normalized, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return response;
}
