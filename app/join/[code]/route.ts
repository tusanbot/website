import { NextRequest, NextResponse } from "next/server";

const PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL || "https://tusancn.ir";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;
  const normalized = decodeURIComponent(code || "").trim().toUpperCase();
  const publicOrigin = new URL(PUBLIC_SITE_URL).origin;

  if (!normalized || !/^[A-Z0-9_-]{2,100}$/.test(normalized)) {
    return NextResponse.redirect(
      new URL("/auth?mode=register&error=invalid_referral", publicOrigin)
    );
  }

  const response = NextResponse.redirect(
    new URL(
      `/auth?mode=register&ref=${encodeURIComponent(normalized)}`,
      publicOrigin
    )
  );

  response.cookies.set("tusan_referral", normalized, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return response;
}
