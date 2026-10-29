import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "edge";
export const dynamic = "force-dynamic";

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

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const dispatchSecret = process.env.DATA_SYNC_DISPATCH_SECRET;
  const bridgeUrl = process.env.MYSQL_SYNC_BRIDGE_URL;
  const bridgeToken = process.env.MYSQL_SYNC_BRIDGE_TOKEN;
  if (!dispatchSecret || !bridgeUrl || !bridgeToken) {
    return NextResponse.json({ error: "Data sync dispatcher is not configured." }, { status: 503 });
  }

  if (request.headers.get("authorization") !== `Bearer ${dispatchSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isHttpsUrl(bridgeUrl)) {
    return NextResponse.json({ error: "MYSQL_SYNC_BRIDGE_URL must be an HTTPS URL." }, { status: 503 });
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
        const response = await fetch(bridgeUrl, {
          method: "POST",
          headers: {
            authorization: `Bearer ${bridgeToken}`,
            "content-type": "application/json",
            "idempotency-key": event.event_id,
          },
          signal: AbortSignal.timeout(12_000),
          body: JSON.stringify({
            event_id: event.event_id,
            source_outbox_id: event.id,
            source_database: event.source_database,
            schema_name: event.schema_name,
            table_name: event.table_name,
            record_key: event.record_key,
            operation: event.operation,
            row_data: event.row_data,
            source_txid: event.source_txid,
            created_at: event.created_at,
          }),
        });

        if (!response.ok) {
          const body = (await response.text()).slice(0, 1500);
          throw new Error(`Bridge returned HTTP ${response.status}: ${body || "no response body"}`);
        }

        let acknowledgement: { event_id?: string } = {};
        try {
          acknowledgement = await response.json() as { event_id?: string };
        } catch {
          throw new Error("Bridge response was not valid JSON.");
        }
        if (acknowledgement.event_id !== event.event_id) {
          throw new Error("Bridge acknowledgement event_id did not match.");
        }

        const marked = await db.from("data_sync_outbox")
          .update({ processed_at: new Date().toISOString(), locked_at: null, locked_by: null, last_error: null })
          .eq("id", event.id)
          .eq("locked_by", workerId)
          .select("id")
          .maybeSingle();
        if (marked.error || !marked.data) throw new Error("Bridge accepted event, but queue acknowledgement failed or the lease was lost; retry will rely on bridge idempotency.");

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
    claimed: events.length,
    delivered,
    failed,
    failures,
  }, { status: failed ? 207 : 200 });
}
