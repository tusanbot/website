import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

async function getAdmin(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  const client = createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData } = await client.auth.getUser();
  if (!userData.user) return null;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return null;
  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: profile } = await admin.from("profiles").select("role").eq("id", userData.user.id).maybeSingle();
  return profile?.role === "admin" ? admin : null;
}

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdmin(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    const { data, error } = await admin.from("social_sync_logs").select("id,success,received,synced,skipped,error_message,source,created_at").order("created_at", { ascending: false }).limit(10);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ logs: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "خطای ناشناخته" }, { status: 500 });
  }
}
