import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createAnnouncementRepository, type AnnouncementPayload } from "@/lib/data-access/announcements";

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return profile?.role === "admin" ? user : null;
}

function parsePayload(body: Record<string, unknown>): AnnouncementPayload | null {
  if (typeof body.title !== "string" || !body.title.trim()) return null;
  if (body.type !== "registration" && body.type !== "announcement") return null;
  const priority = Number(body.priority ?? 0);
  if (!Number.isFinite(priority)) return null;

  return {
    title: body.title.trim(),
    type: body.type,
    summary: typeof body.summary === "string" ? body.summary : null,
    content: typeof body.content === "string" ? body.content : null,
    start_at: typeof body.start_at === "string" && body.start_at ? body.start_at : null,
    end_at: typeof body.end_at === "string" && body.end_at ? body.end_at : null,
    documents: Array.isArray(body.documents) ? body.documents.filter((item): item is string => typeof item === "string") : [],
    is_active: typeof body.is_active === "boolean" ? body.is_active : true,
    is_extendable: typeof body.is_extendable === "boolean" ? body.is_extendable : false,
    extended_end_at: typeof body.extended_end_at === "string" && body.extended_end_at ? body.extended_end_at : null,
    button_label: typeof body.button_label === "string" && body.button_label.trim() ? body.button_label.trim() : "ثبت‌نام",
    service_id: typeof body.service_id === "string" && body.service_id ? body.service_id : null,
    priority,
  };
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await createAnnouncementRepository().listAdmin();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ announcements: data || [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 400 });
  }
  const payload = parsePayload(body as Record<string, unknown>);
  if (!payload) return NextResponse.json({ error: "عنوان، نوع یا اولویت اطلاعیه معتبر نیست." }, { status: 400 });

  const { data, error } = await createAnnouncementRepository().create(payload);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ announcement: data }, { status: 201 });
}
