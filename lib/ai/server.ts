import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createSessionToken, decryptApiKey, encryptApiKey, hashApiKey, hashSessionToken } from "@/lib/ai/crypto";

export const AI_SESSION_COOKIE = "tusan_ai_session";
const SESSION_DAYS = 30;
const PREFERRED_MODELS = ["gemini-3.6-flash", "gemini-3.6-flash-preview", "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"];

type GeminiModel = { name?: string; supportedGenerationMethods?: string[] };

export async function validateGeminiKey(apiKey: string) {
  const key = apiKey.trim();
  if (!key) return { ok: false as const, message: "کلید API را وارد کنید." };
  try {
    const base = (process.env.GEMINI_API_BASE_URL || "https://generativelanguage.googleapis.com/v1beta").replace(/\/$/, "");
    const response = await fetch(`${base}/models`, { method: "GET", headers: { "x-goog-api-key": key }, cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) return { ok: false as const, message: "کلید Gemini معتبر نیست یا دسترسی لازم را ندارد." };
      if (response.status === 429) return { ok: false as const, message: "محدودیت درخواست Gemini فعال است؛ کمی بعد دوباره تلاش کنید." };
      return { ok: false as const, message: "اعتبارسنجی کلید Gemini انجام نشد." };
    }
    const data = await response.json() as { models?: GeminiModel[] };
    const available = (data.models || [])
      .map((model) => ({ name: model.name?.replace(/^models\//, ""), methods: model.supportedGenerationMethods || [] }))
      .filter((model): model is { name: string; methods: string[] } => Boolean(model.name) && model.methods.includes("generateContent"));
    const model = PREFERRED_MODELS.find((name) => available.some((item) => item.name === name)) || available.find((item) => /flash/i.test(item.name))?.name || available[0]?.name;
    if (!model) return { ok: false as const, message: "این کلید به هیچ مدل Gemini دارای قابلیت تولید محتوا دسترسی ندارد." };
    return { ok: true as const, model };
  } catch {
    return { ok: false as const, message: "اتصال به Gemini برقرار نشد؛ اتصال اینترنت یا درگاه AI را بررسی کنید." };
  }
}

async function getSiteUserId() {
  const site = await createSupabaseServerClient();
  const { data: { user } } = await site.auth.getUser();
  return user?.id || null;
}

export async function createAiSession(apiKey: string) {
  const validation = await validateGeminiKey(apiKey);
  if (!validation.ok) return validation;
  const db = supabaseAdmin();
  const userId = await getSiteUserId();
  const keyHash = hashApiKey(apiKey);
  const encrypted = encryptApiKey(apiKey);
  const now = new Date().toISOString();
  let profile;

  if (userId) {
    const { data: existing } = await db.from("ai_profiles").select("id").eq("user_id", userId).maybeSingle();
    if (existing?.id) {
      const { data, error } = await db.from("ai_profiles").update({ key_hash: keyHash, encrypted_api_key: encrypted, provider: "gemini", model: validation.model, last_used_at: now }).eq("id", existing.id).select("id,provider,model,created_at,last_used_at").single();
      if (error || !data) throw new Error("ذخیره پروفایل هوش مصنوعی انجام نشد.");
      profile = data;
    } else {
      const { data, error } = await db.from("ai_profiles").insert({ user_id: userId, key_hash: keyHash, encrypted_api_key: encrypted, provider: "gemini", model: validation.model, last_used_at: now }).select("id,provider,model,created_at,last_used_at").single();
      if (error || !data) throw new Error("ذخیره پروفایل هوش مصنوعی انجام نشد.");
      profile = data;
    }
  } else {
    const { data, error } = await db.from("ai_profiles").upsert({ key_hash: keyHash, encrypted_api_key: encrypted, provider: "gemini", model: validation.model, last_used_at: now }, { onConflict: "key_hash" }).select("id,provider,model,created_at,last_used_at").single();
    if (error || !data) throw new Error("ذخیره پروفایل هوش مصنوعی انجام نشد.");
    profile = data;
  }

  const rawToken = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  const { error: sessionError } = await db.from("ai_sessions").insert({ ai_profile_id: profile.id, token_hash: hashSessionToken(rawToken), expires_at: expiresAt.toISOString(), last_used_at: now });
  if (sessionError) throw new Error("ساخت نشست هوش مصنوعی انجام نشد.");
  const jar = await cookies();
  jar.set(AI_SESSION_COOKIE, rawToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt });
  return { ok: true as const, profile };
}

export async function getAiProfile() {
  const jar = await cookies();
  const token = jar.get(AI_SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = supabaseAdmin();
  const { data } = await db.from("ai_sessions").select("id,ai_profile_id,expires_at,ai_profiles(id,user_id,provider,model,created_at,last_used_at)").eq("token_hash", hashSessionToken(token)).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (!data) return null;
  const profile = Array.isArray(data.ai_profiles) ? data.ai_profiles[0] : data.ai_profiles;
  if (!profile) return null;
  const siteUserId = await getSiteUserId();
  if (profile.user_id && profile.user_id !== siteUserId) return null;
  if (!profile.user_id && siteUserId) return null;
  return { sessionId: data.id, profile };
}

export async function requireAiProfile() {
  const session = await getAiProfile();
  if (!session) throw new Error("AI_PROFILE_REQUIRED");
  return session;
}

export async function getProfileApiKey(profileId: string) {
  const db = supabaseAdmin();
  const { data, error } = await db.from("ai_profiles").select("encrypted_api_key").eq("id", profileId).single();
  if (error || !data) throw new Error("AI profile not found");
  return decryptApiKey(data.encrypted_api_key);
}

export async function destroyAiSession() {
  const jar = await cookies();
  const token = jar.get(AI_SESSION_COOKIE)?.value;
  if (token) await supabaseAdmin().from("ai_sessions").delete().eq("token_hash", hashSessionToken(token));
  jar.set(AI_SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}