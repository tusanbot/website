import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = supabaseAdmin();
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await context.params;
  const { data: settlement, error } = await admin
    .from("staff_settlements")
    .select("payment_receipt_path")
    .eq("id", id)
    .maybeSingle();
  if (error || !settlement?.payment_receipt_path) return NextResponse.json({ error: "Receipt not found" }, { status: 404 });

  const { data: signed, error: signedError } = await admin.storage
    .from("payment-receipts")
    .createSignedUrl(settlement.payment_receipt_path, 600);
  if (signedError || !signed?.signedUrl) return NextResponse.json({ error: "Could not create receipt URL" }, { status: 500 });
  return NextResponse.redirect(signed.signedUrl);
}
