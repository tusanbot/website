import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (cronSecret && authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const baseUrl = new URL(request.url).origin;
  const syncSecret = process.env.SOCIAL_SYNC_SECRET;
  if (!syncSecret) {
    return NextResponse.json({ error: "SOCIAL_SYNC_SECRET is not configured" }, { status: 500 });
  }

  const response = await fetch(`${baseUrl}/api/social/sync`, {
    method: "POST",
    headers: { "x-social-sync-secret": syncSecret },
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({ error: "Invalid sync response" }));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceRoleKey) {
    const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
    await admin.from("social_sync_logs").insert({
      success: response.ok,
      received: Number(body?.received ?? 0),
      synced: Number(body?.synced ?? 0),
      skipped: Number(body?.skipped ?? 0),
      error_message: response.ok ? null : String(body?.error ?? "Sync failed"),
      source: "vercel-cron",
    });
  }

  return NextResponse.json(body, { status: response.status });
}
