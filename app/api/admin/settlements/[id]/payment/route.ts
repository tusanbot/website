import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED = new Map([
  ["application/pdf", "pdf"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) return bad("احراز هویت الزامی است.", 401);

  const admin = supabaseAdmin();
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return bad("نشست کاربر معتبر نیست.", 401);

  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return bad("دسترسی غیرمجاز.", 403);

  const { id } = await context.params;
  const formData = await request.formData();
  const reference = String(formData.get("paymentReference") || "").trim();
  const paidAt = String(formData.get("paymentPaidAt") || "").trim();
  const paymentNote = String(formData.get("paymentNote") || "").trim();
  const adminNote = String(formData.get("adminNote") || "").trim();
  const fileValue = formData.get("receipt");

  if (!reference) return bad("شماره پیگیری پرداخت الزامی است.");
  if (reference.length > 200) return bad("شماره پیگیری بیش از حد مجاز است.");
  if (!paidAt) return bad("تاریخ پرداخت الزامی است.");
  const paidDate = new Date(paidAt);
  if (Number.isNaN(paidDate.getTime())) return bad("تاریخ پرداخت معتبر نیست.");

  const { data: settlement, error: settlementError } = await admin
    .from("staff_settlements")
    .select("id,status,net_amount")
    .eq("id", id)
    .maybeSingle();
  if (settlementError || !settlement) return bad("درخواست تسویه پیدا نشد.", 404);
  if (settlement.status !== "processing") return bad("فقط تسویه در حال پرداخت قابل ثبت پرداخت نهایی است.", 409);

  let receiptPath: string | null = null;
  if (fileValue instanceof File && fileValue.size > 0) {
    if (fileValue.size > MAX_FILE_SIZE) return bad("حجم رسید بیش از ۵ مگابایت است.", 413);
    const extension = ALLOWED.get(fileValue.type);
    if (!extension) return bad("فرمت رسید مجاز نیست.");
    receiptPath = `settlements/${id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await admin.storage
      .from("payment-receipts")
      .upload(receiptPath, fileValue, { contentType: fileValue.type, upsert: false });
    if (uploadError) {
      console.error("Settlement receipt upload failed:", uploadError.message);
      return bad("آپلود رسید پرداخت انجام نشد.", 500);
    }
  }

  const { data, error } = await admin.rpc("admin_update_staff_settlement", {
    p_settlement_id: id,
    p_action: "paid",
    p_note: adminNote || null,
    p_payment_amount: Number(settlement.net_amount),
    p_payment_reference: reference,
    p_payment_paid_at: paidDate.toISOString(),
    p_payment_receipt_path: receiptPath,
    p_payment_note: paymentNote || null,
  });

  if (error) {
    if (receiptPath) await admin.storage.from("payment-receipts").remove([receiptPath]);
    console.error("Settlement final payment failed:", error.message);
    return bad(error.message, 400);
  }

  return NextResponse.json({ success: true, settlement: data });
}
