import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TITLE_LENGTH = 200;

const ALLOWED_EXTENSIONS = new Set(["pdf", "jpg", "jpeg", "png", "webp", "json"]);
const ALLOWED_MIME_TYPES = new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/json",
    "application/octet-stream",
]);

function badRequest(message: string, status = 400) {
    return NextResponse.json({ error: message }, { status });
}

function extensionOf(name: string) {
    const lastDot = name.lastIndexOf(".");
    return lastDot >= 0 ? name.slice(lastDot + 1).toLowerCase() : "";
}

function detectMime(bytes: Uint8Array): string | null {
    if (bytes.length >= 5 && new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-") {
        return "application/pdf";
    }

    if (
        bytes.length >= 3 &&
        bytes[0] === 0xff &&
        bytes[1] === 0xd8 &&
        bytes[2] === 0xff
    ) {
        return "image/jpeg";
    }

    if (
        bytes.length >= 8 &&
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47 &&
        bytes[4] === 0x0d &&
        bytes[5] === 0x0a &&
        bytes[6] === 0x1a &&
        bytes[7] === 0x0a
    ) {
        return "image/png";
    }

    if (
        bytes.length >= 12 &&
        bytes[0] === 0x52 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46 &&
        bytes[3] === 0x46 &&
        bytes[8] === 0x57 &&
        bytes[9] === 0x45 &&
        bytes[10] === 0x42 &&
        bytes[11] === 0x50
    ) {
        return "image/webp";
    }

    return null;
}

function isValidJson(text: string) {
    try {
        JSON.parse(text);
        return true;
    } catch {
        return false;
    }
}

async function validateContent(file: File, bytes: Uint8Array, extension: string) {
    const detectedMime = detectMime(bytes);

    if (extension === "pdf") {
        return detectedMime === "application/pdf";
    }

    if (extension === "jpg" || extension === "jpeg") {
        return detectedMime === "image/jpeg";
    }

    if (extension === "png") {
        return detectedMime === "image/png";
    }

    if (extension === "webp") {
        return detectedMime === "image/webp";
    }

    if (extension === "json") {
        if (file.type !== "application/json" && file.type !== "application/octet-stream") {
            return false;
        }
        return isValidJson(await file.text());
    }

    return false;
}

export async function POST(request: Request) {
    try {
        const authorization = request.headers.get("authorization") || "";
        const token = authorization.startsWith("Bearer ")
            ? authorization.slice(7).trim()
            : "";

        if (!token) {
            return badRequest("احراز هویت الزامی است.", 401);
        }

        const admin = supabaseAdmin();
        const {
            data: { user },
            error: authError,
        } = await admin.auth.getUser(token);

        if (authError || !user) {
            return badRequest("نشست کاربر معتبر نیست.", 401);
        }

        const formData = await request.formData();
        const orderId = String(formData.get("orderId") || "").trim();
        const title = String(formData.get("fileTitle") || "").trim();
        const fileValue = formData.get("file");

        if (!orderId) return badRequest("شناسه سفارش معتبر نیست.");
        if (!title) return badRequest("عنوان مدرک الزامی است.");
        if (title.length > MAX_TITLE_LENGTH) {
            return badRequest("عنوان مدرک بیش از حد مجاز است.");
        }
        if (!(fileValue instanceof File)) {
            return badRequest("فایل ارسال نشده است.");
        }

        if (fileValue.size <= 0) return badRequest("فایل خالی است.");
        if (fileValue.size > MAX_FILE_SIZE) {
            return badRequest("حجم فایل بیش از ۱۰ مگابایت است.");
        }

        const extension = extensionOf(fileValue.name);
        if (!ALLOWED_EXTENSIONS.has(extension)) {
            return badRequest("نوع فایل مجاز نیست.");
        }

        if (!ALLOWED_MIME_TYPES.has(fileValue.type || "application/octet-stream")) {
            return badRequest("نوع MIME فایل مجاز نیست.");
        }

        const bytes = new Uint8Array(await fileValue.arrayBuffer());
        const validContent = await validateContent(fileValue, bytes, extension);
        if (!validContent) {
            return badRequest("محتوای واقعی فایل با نوع اعلام‌شده مطابقت ندارد.");
        }

        const { data: order, error: orderError } = await admin
            .from("orders")
            .select("id,user_id")
            .eq("id", orderId)
            .maybeSingle();

        if (orderError || !order) {
            return badRequest("سفارش پیدا نشد.", 404);
        }

        const { data: profile } = await admin
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

        const isAdmin = profile?.role === "admin";
        if (order.user_id !== user.id && !isAdmin) {
            return badRequest("دسترسی به این سفارش مجاز نیست.", 403);
        }

        const safeExtension = extension === "jpeg" ? "jpg" : extension;
        const uniqueFileName = `${crypto.randomUUID()}.${safeExtension}`;
        const filePath = `${orderId}/${uniqueFileName}`;
        const detectedMime = detectMime(bytes) || "application/json";

        const { error: uploadError } = await admin.storage
            .from("order-files")
            .upload(filePath, fileValue, {
                contentType: detectedMime,
                upsert: false,
            });

        if (uploadError) {
            console.error("Secure file upload failed:", uploadError.message);
            return badRequest("ارسال فایل انجام نشد.", 500);
        }

        const { error: insertError } = await admin
            .from("order_files")
            .insert({
                order_id: orderId,
                file_title: title,
                file_name: fileValue.name,
                file_path: filePath,
                file_type: detectedMime,
                file_size: fileValue.size,
                uploaded_by: user.id,
            });

        if (insertError) {
            await admin.storage.from("order-files").remove([filePath]);
            console.error("Secure file metadata insert failed:", insertError.message);
            return badRequest("ثبت اطلاعات فایل انجام نشد.", 500);
        }

        return NextResponse.json({
            success: true,
            filePath,
        });
    } catch (error) {
        console.error("Secure order file upload error:", error);
        return badRequest("خطایی هنگام ارسال فایل رخ داد.", 500);
    }
}
