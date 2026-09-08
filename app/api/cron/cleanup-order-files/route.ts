import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RETENTION_DAYS = 7;
const MAX_ORDERS_PER_RUN = 100;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = supabaseAdmin();
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: orders, error: ordersError } = await admin
    .from("orders")
    .select("id,completed_at")
    .eq("status", "completed")
    .not("completed_at", "is", null)
    .lte("completed_at", cutoff)
    .order("completed_at", { ascending: true })
    .limit(MAX_ORDERS_PER_RUN);

  if (ordersError) {
    console.error("Order file cleanup: order query failed", ordersError.message);
    return NextResponse.json({ error: "Failed to query completed orders" }, { status: 500 });
  }

  let deletedFiles = 0;
  let failedFiles = 0;
  let processedOrders = 0;

  for (const order of orders ?? []) {
    const { data: files, error: filesError } = await admin
      .from("order_files")
      .select("id,file_path")
      .eq("order_id", order.id)
      .is("deleted_at", null);

    if (filesError) {
      console.error("Order file cleanup: file query failed", order.id, filesError.message);
      continue;
    }

    if (!files?.length) continue;
    processedOrders += 1;

    for (const file of files) {
      if (!file.file_path) {
        await admin.from("order_files").update({ deleted_at: new Date().toISOString() }).eq("id", file.id);
        deletedFiles += 1;
        continue;
      }

      const { error: storageError } = await admin.storage.from("order-files").remove([file.file_path]);
      if (storageError) {
        failedFiles += 1;
        console.error("Order file cleanup: storage delete failed", file.id, storageError.message);
        continue;
      }

      const { error: metadataError } = await admin
        .from("order_files")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", file.id)
        .is("deleted_at", null);

      if (metadataError) {
        failedFiles += 1;
        console.error("Order file cleanup: metadata update failed", file.id, metadataError.message);
      } else {
        deletedFiles += 1;
      }
    }
  }

  return NextResponse.json({
    success: true,
    retentionDays: RETENTION_DAYS,
    cutoff,
    eligibleOrders: orders?.length ?? 0,
    processedOrders,
    deletedFiles,
    failedFiles,
  });
}
