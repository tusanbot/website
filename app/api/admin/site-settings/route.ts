import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const { error } = await supabase
            .from("site_settings")
            .update({
                theme: body.theme,
                primary_color: body.primary_color,
                primary_dark: body.primary_dark,
                radius: body.radius,
            })
            .neq("id", "00000000-0000-0000-0000-000000000000");

        if (error) {
            return NextResponse.json(
                { success: false, error },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json(
            { success: false, error: String(e) },
            { status: 500 }
        );
    }
}