import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkRateLimit } from "@/lib/security/rateLimit";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_MULTIPART_BODY_SIZE = 6 * 1024 * 1024;
const ALLOWED = new Map([
  ["pdf", "application/pdf"],
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["png", "image/png"],
  ["webp", "image/webp"],
]);

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function extensionOf(name: string) {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

function detectMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 5 && new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-") return "application/pdf";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "image/webp";
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const contentLength = request.headers.get("content-length");
    if (contentLength) {
      const size = Number(contentLength);
      if (!Number.isFinite(size) || size < 0) return errorResponse("اندازه درخواست معتبر نیست.");
      if (size > MAX_MULTIPART_BODY_SIZE) return errorResponse("حجم درخواست بیش از حد مجاز است.", 413);
    }

    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
    if (!token) return errorResponse("احراز هویت الزامی است.", 401);

    const admin = supabaseAdmin();
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return errorResponse("نشست کاربر معتبر نیست.", 401);

    const rateLimitResponse = await checkRateLimit({
      scope: "payments:receipt-upload",
      request,
      userId: user.id,
      limit: 3,
      windowSeconds: 60,
      ipMultiplier: 2,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const formData = await request.formData();
    const paymentId = String(formData.get("paymentId") || "").trim();
    const fileValue = formData.get("file");
    if (!paymentId) return errorResponse("شناسه پرداخت معتبر نیست.");
    if (!(fileValue instanceof File)) return errorResponse("فایل رسید ارسال نشده است.");
    if (fileValue.size <= 0) return errorResponse("فایل رسید خالی است.");
    if (fileValue.size > MAX_FILE_SIZE) return errorResponse("حجم رسید بیش از ۵ مگابایت است.");

    const extension = extensionOf(fileValue.name);
    const expectedMime = ALLOWED.get(extension);
    if (!expectedMime) return errorResponse("فرمت رسید مجاز نیست.");
    if (fileValue.type !== expectedMime) return errorResponse("نوع MIME فایل مجاز نیست.");

    const bytes = new Uint8Array(await fileValue.arrayBuffer());
    const detectedMime = detectMime(bytes);
    if (detectedMime !== expectedMime) return errorResponse("محتوای واقعی فایل با نوع اعلام‌شده مطابقت ندارد.");

    const { data: payment, error: paymentError } = await admin
      .from("payments")
      .select("id,user_id,order_id,method,status,receipt_image_url")
      .eq("id", paymentId)
      .maybeSingle();

    if (paymentError || !payment) return errorResponse("پرداخت پیدا نشد.", 404);
    if (payment.user_id !== user.id) return errorResponse("دسترسی به این پرداخت مجاز نیست.", 403);
    if (payment.method !== "card_to_card") return errorResponse("برای این پرداخت امکان ارسال رسید وجود ندارد.");
    if (!["pending", "awaiting_manual_verification", "rejected"].includes(payment.status)) {
      return errorResponse("در وضعیت فعلی امکان ارسال رسید وجود ندارد.");
    }

    const safeExtension = extension === "jpeg" ? "jpg" : extension;
    const filePath = `${user.id}/${payment.order_id}/${crypto.randomUUID()}.${safeExtension}`;

    const { error: uploadError } = await admin.storage
      .from("payment-receipts")
      .upload(filePath, fileValue, { contentType: detectedMime, upsert: false });

    if (uploadError) {
      console.error("Secure payment receipt upload failed:", uploadError.message);
      return errorResponse("ارسال رسید انجام نشد.", 500);
    }

    const { error: updateError } = await admin
      .from("payments")
      .update({ receipt_image_url: filePath, status: "awaiting_manual_verification" })
      .eq("id", payment.id)
      .eq("user_id", user.id);

    if (updateError) {
      await admin.storage.from("payment-receipts").remove([filePath]);
      console.error("Payment receipt metadata update failed:", updateError.message);
      return errorResponse("ثبت رسید انجام نشد.", 500);
    }

    if (payment.receipt_image_url && payment.receipt_image_url !== filePath) {
      const { error: cleanupError } = await admin.storage
        .from("payment-receipts")
        .remove([payment.receipt_image_url]);
      if (cleanupError) console.error("Old payment receipt cleanup failed:", cleanupError.message);
    }

    return NextResponse.json({ success: true, filePath });
  } catch (error) {
    console.error("Secure payment receipt upload error:", error);
    return errorResponse("خطایی هنگام ارسال رسید رخ داد.", 500);
  }
}
