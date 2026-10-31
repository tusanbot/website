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

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const { data, error } = await createAnnouncementRepository().findById(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "اطلاعیه موردنظر پیدا نشد." }, { status: 404 });
  return NextResponse.json({ announcement: data }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 400 });
  }

  const values = body as Record<string, unknown>;
  if (Object.keys(values).length === 1 && typeof values.is_active === "boolean") {
    const { error } = await createAnnouncementRepository().setActive(id, values.is_active);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  const announcementType = values.type;
  if (typeof values.title !== "string" || !values.title.trim() ||
      (announcementType !== "registration" && announcementType !== "announcement")) {
    return NextResponse.json({ error: "عنوان یا نوع اطلاعیه معتبر نیست." }, { status: 400 });
  }

  const priority = Number(values.priority ?? 0);
  if (!Number.isFinite(priority)) return NextResponse.json({ error: "اولویت معتبر نیست." }, { status: 400 });

  const payload: Partial<AnnouncementPayload> & { updated_at: string } = {
    title: values.title.trim(),
    type: announcementType as AnnouncementPayload["type"],
    summary: typeof values.summary === "string" ? values.summary : null,
    content: typeof values.content === "string" ? values.content : null,
    start_at: typeof values.start_at === "string" && values.start_at ? values.start_at : null,
    end_at: typeof values.end_at === "string" && values.end_at ? values.end_at : null,
    documents: Array.isArray(values.documents) ? values.documents.filter((item): item is string => typeof item === "string") : [],
    is_active: typeof values.is_active === "boolean" ? values.is_active : true,
    is_extendable: typeof values.is_extendable === "boolean" ? values.is_extendable : false,
    extended_end_at: typeof values.extended_end_at === "string" && values.extended_end_at ? values.extended_end_at : null,
    button_label: typeof values.button_label === "string" && values.button_label.trim() ? values.button_label.trim() : "ثبت‌نام",
    service_id: typeof values.service_id === "string" && values.service_id ? values.service_id : null,
    priority,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await createAnnouncementRepository().update(id, payload);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "اطلاعیه موردنظر پیدا نشد." }, { status: 404 });
  return NextResponse.json({ announcement: data });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const { error } = await createAnnouncementRepository().remove(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
