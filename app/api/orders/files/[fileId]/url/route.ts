import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Context = { params: Promise<{ fileId: string }> };

export async function GET(_request: Request, context: Context) {
  const { fileId } = await context.params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "احراز هویت لازم است." }, { status: 401 });

  const admin = supabaseAdmin();
  const { data: file, error: fileError } = await admin
    .from("order_files")
    .select("id,order_id,file_path")
    .eq("id", fileId)
    .maybeSingle();
  if (fileError || !file) return NextResponse.json({ error: "فایل پیدا نشد." }, { status: 404 });

  const { data: authorizedFiles, error: authError } = await supabase.rpc("get_order_files_for_current_user", { p_order_id: file.order_id });
  if (authError || !(authorizedFiles ?? []).some((item: { id: string }) => item.id === file.id)) {
    return NextResponse.json({ error: "دسترسی به این فایل مجاز نیست." }, { status: 403 });
  }

  const { data, error } = await admin.storage.from("order-files").createSignedUrl(file.file_path, 300);
  if (error || !data?.signedUrl) return NextResponse.json({ error: "امکان دریافت فایل وجود ندارد." }, { status: 500 });
  return NextResponse.json({ signedUrl: data.signedUrl, expiresIn: 300 });
}
