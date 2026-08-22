import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/auth/requireAdmin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: NextRequest) {
    const admin = await requireAdmin(request);

    if (isNextResponse(admin)) {
        return admin;
    }

    try {
        const body = await request.json().catch(() => null);

        if (!body || typeof body !== "object" || Array.isArray(body)) {
            return NextResponse.json(
                { success: false, error: "اطلاعات درخواست نامعتبر است." },
                { status: 400 }
            );
        }

        const theme = typeof body.theme === "string" ? body.theme : null;
        const primaryColor = typeof body.primary_color === "string" ? body.primary_color : null;
        const primaryDark = typeof body.primary_dark === "string" ? body.primary_dark : null;
        const radius = typeof body.radius === "number" ? body.radius : null;

        if (!theme && !primaryColor && !primaryDark && radius === null) {
            return NextResponse.json(
                { success: false, error: "هیچ تنظیم قابل ذخیره‌ای ارسال نشده است." },
                { status: 400 }
            );
        }

        const update: Record<string, string | number> = {};

        if (theme !== null) update.theme = theme;
        if (primaryColor !== null) update.primary_color = primaryColor;
        if (primaryDark !== null) update.primary_dark = primaryDark;
        if (radius !== null) update.radius = radius;

        const { error } = await supabaseAdmin()
            .from("site_settings")
            .update(update)
            .neq("id", "00000000-0000-0000-0000-000000000000");

        if (error) {
            console.error("[admin/site-settings] update failed", {
                adminId: admin.id,
                error,
            });

            return NextResponse.json(
                { success: false, error: "ذخیره تنظیمات ناموفق بود." },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[admin/site-settings] unexpected error", {
            adminId: admin.id,
            error,
        });

        return NextResponse.json(
            { success: false, error: "خطایی هنگام ذخیره تنظیمات رخ داد." },
            { status: 500 }
        );
    }
}
