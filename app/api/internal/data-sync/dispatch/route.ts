import { NextResponse } from "next/server";
import { applyMariaDbSyncEvent, checkMariaDbSyncConnection } from "@/lib/data-access/mysql-sync-consumer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type OutboxEvent = {
  id: number;
  event_id: string;
  source_database: string;
  schema_name: string;
  table_name: string;
  record_key: Record<string, unknown>;
  operation: "insert" | "update" | "delete";
  row_data: Record<string, unknown>;
  source_txid: number;
  created_at: string;
  attempts: number;
};

export async function POST(request: Request) {
  const dispatchSecret = process.env.DATA_SYNC_DISPATCH_SECRET;
  if (!dispatchSecret || dispatchSecret.length < 32 ||
      !process.env.MYSQL_HOST || !process.env.MYSQL_USER ||
      !process.env.MYSQL_PASSWORD || process.env.MYSQL_DATABASE !== "tusancni_test") {
    return NextResponse.json({ error: "Test database dispatcher is not configured safely." }, { status: 503 });
  }

  if (request.headers.get("authorization") !== `Bearer ${dispatchSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await checkMariaDbSyncConnection();
  } catch {
    return NextResponse.json({ error: "Could not connect to the configured test database." }, { status: 503 });
  }

  const workerId = crypto.randomUUID();
  const db = supabaseAdmin();
  const claimed = await db.rpc("claim_data_sync_outbox", {
    p_worker_id: workerId,
    p_limit: 20,
  });

  if (claimed.error) {
    await db.rpc("release_data_sync_dispatch", { p_worker_id: workerId });
    return NextResponse.json({ error: "Could not claim sync events." }, { status: 500 });
  }

  const events = (claimed.data || []) as OutboxEvent[];
  let delivered = 0;
  let failed = 0;
  const failures: Array<{ event_id: string; error: string }> = [];

  try {
    for (const event of events) {
      try {
        await applyMariaDbSyncEvent(event);
        const marked = await db.from("data_sync_outbox")
          .update({ processed_at: new Date().toISOString(), locked_at: null, locked_by: null, last_error: null })
          .eq("id", event.id)
          .eq("locked_by", workerId)
          .select("id")
          .maybeSingle();
        if (marked.error || !marked.data) {
          throw new Error("MariaDB committed the event, but queue acknowledgement failed or the lease was lost; retry is safe because event receipts are idempotent.");
        }
        delivered++;
      } catch (error) {
        failed++;
        const message = (error instanceof Error ? error.message : String(error)).slice(0, 2000);
        const delaySeconds = Math.min(6 * 60 * 60, 15 * (2 ** Math.min(Math.max(event.attempts, 1), 10)));
        const retryAt = new Date(Date.now() + delaySeconds * 1000).toISOString();
        const queued = await db.from("data_sync_outbox")
          .update({ locked_at: null, locked_by: null, next_attempt_at: retryAt, last_error: message })
          .eq("id", event.id)
          .eq("locked_by", workerId);
        failures.push({
          event_id: event.event_id,
          error: queued.error ? "Delivery failed and retry metadata could not be saved." : message,
        });
      }
    }
  } finally {
    await db.rpc("release_data_sync_dispatch", { p_worker_id: workerId });
  }

  return NextResponse.json({
    ok: failed === 0,
    destination: "tusancni_test",
    claimed: events.length,
    delivered,
    failed,
    failures,
  }, { status: failed ? 207 : 200 });
}
