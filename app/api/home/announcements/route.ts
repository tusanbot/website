import { NextResponse } from "next/server";
import { createAnnouncementRepository } from "@/lib/data-access/announcements";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await createAnnouncementRepository().listPublic();
  if (error) {
    console.error("[home/announcements]", error);
    return NextResponse.json({ ok: false, error: "دریافت اطلاعیه‌ها انجام نشد." }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const items = (data || []).map((raw) => {
    const item = raw as Record<string, unknown> & { services?: unknown };
    const relation = Array.isArray(item.services) ? item.services[0] || null : item.services || null;
    return { ...item, services: relation, service: relation };
  });

  return NextResponse.json({ ok: true, items }, {
    headers: { "Cache-Control": "no-store" },
  });
}
