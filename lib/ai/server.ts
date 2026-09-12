import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createSessionToken, decryptApiKey, encryptApiKey, hashApiKey, hashSessionToken } from "@/lib/ai/crypto";

export const AI_SESSION_COOKIE = "tusan_ai_session";
const SESSION_DAYS = 30;
const DEFAULT_TEXT_MODEL = "gemini-3.6-flash";
const DEPRECATED_TEXT_MODELS = new Set(["gemini-2.5-flash"]);

export type AiCapability = "text" | "image" | "video" | "music" | "tts";
export type GeminiModel = { name?: string; supportedGenerationMethods?: string[] };
export type AiModelConfig = {
  text?: string;
  image?: string;
  video?: string;
  music?: string;
  tts?: string;
  available?: Array<{ name: string; methods: string[] }>;
  checkedAt?: string;
};

const PREFERRED_TEXT_MODELS = ["gemini-3.6-flash", "gemini-3.6-flash-preview", "gemini-2.5-flash-lite", "gemini-2.0-flash"];
const PREFERRED_IMAGE_MODELS = ["gemini-3.1-flash-image", "gemini-3-pro-image-preview", "gemini-2.5-flash-image"];
const PREFERRED_VIDEO_MODELS = ["veo-3.1-generate-preview", "veo-3.1-generate"];
const PREFERRED_MUSIC_MODELS = ["lyria-3.5", "lyria-3.0"];
const PREFERRED_TTS_MODELS = ["gemini-2.5-flash-preview-tts", "gemini-2.5-pro-preview-tts"];

function getGeminiBaseUrl() {
  return (process.env.GEMINI_API_BASE_URL || "https://generativelanguage.googleapis.com/v1beta").replace(/\/$/, "");
}

function normalizeModels(models: GeminiModel[]) {
  return models
    .map((model) => ({ name: model.name?.replace(/^models\//, ""), methods: model.supportedGenerationMethods || [] }))
    .filter((model): model is { name: string; methods: string[] } => Boolean(model.name));
}

function pickModel(available: Array<{ name: string; methods: string[] }>, capability: AiCapability) {
  const method = capability === "video" ? "predictLongRunning" : "generateContent";
  const candidates = available.filter((item) => item.methods.includes(method));
  const preferred = capability === "text" ? PREFERRED_TEXT_MODELS
    : capability === "image" ? PREFERRED_IMAGE_MODELS
      : capability === "video" ? PREFERRED_VIDEO_MODELS
        : capability === "music" ? PREFERRED_MUSIC_MODELS
          : PREFERRED_TTS_MODELS;
  return preferred.find((name) => candidates.some((item) => item.name === name))
    || candidates.find((item) => capability === "text" && /flash/i.test(item.name))?.name
    || candidates[0]?.name;
}

export async function discoverGeminiModels(apiKey: string) {
  const key = apiKey.trim();
  const response = await fetch(`${getGeminiBaseUrl()}/models`, {
    method: "GET",
    headers: { "x-goog-api-key": key },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error("GEMINI_AUTH");
    if (response.status === 429) throw new Error("GEMINI_RATE_LIMIT");
    throw new Error("GEMINI_MODELS_UNAVAILABLE");
  }
  const data = await response.json() as { models?: GeminiModel[] };
  const available = normalizeModels(data.models || []);
  return {
    available,
    config: {
      text: pickModel(available, "text"),
      image: pickModel(available, "image"),
      video: pickModel(available, "video"),
      music: pickModel(available, "music"),
      tts: pickModel(available, "tts"),
      available,
      checkedAt: new Date().toISOString(),
    } satisfies AiModelConfig,
  };
}

export async function validateGeminiKey(apiKey: string) {
  const key = apiKey.trim();
  if (!key) return { ok: false as const, message: "کلید API را وارد کنید." };
  try {
    const discovered = await discoverGeminiModels(key);
    if (!discovered.config.text) return { ok: false as const, message: "این کلید به هیچ مدل متنی Gemini دارای قابلیت تولید محتوا دسترسی ندارد." };
    return { ok: true as const, model: discovered.config.text, modelConfig: discovered.config };
  } catch (error) {
    if (error instanceof Error && error.message === "GEMINI_AUTH") return { ok: false as const, message: "کلید Gemini معتبر نیست یا دسترسی لازم را ندارد." };
    if (error instanceof Error && error.message === "GEMINI_RATE_LIMIT") return { ok: false as const, message: "محدودیت درخواست Gemini فعال است؛ کمی بعد دوباره تلاش کنید." };
    return { ok: false as const, message: "اعتبارسنجی کلید Gemini انجام نشد." };
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

  const payload = {
    key_hash: keyHash,
    encrypted_api_key: encrypted,
    provider: "gemini",
    model: validation.model,
    model_config: validation.modelConfig,
    last_used_at: now,
  };

  if (userId) {
    const { data: existing } = await db.from("ai_profiles").select("id").eq("user_id", userId).maybeSingle();
    if (existing?.id) {
      const { data, error } = await db.from("ai_profiles").update(payload).eq("id", existing.id).select("id,provider,model,model_config,created_at,last_used_at").single();
      if (error || !data) throw new Error("ذخیره پروفایل هوش مصنوعی انجام نشد.");
      profile = data;
    } else {
      const { data, error } = await db.from("ai_profiles").insert({ user_id: userId, ...payload }).select("id,provider,model,model_config,created_at,last_used_at").single();
      if (error || !data) throw new Error("ذخیره پروفایل هوش مصنوعی انجام نشد.");
      profile = data;
    }
  } else {
    const { data, error } = await db.from("ai_profiles").upsert(payload, { onConflict: "key_hash" }).select("id,provider,model,model_config,created_at,last_used_at").single();
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
  const { data } = await db.from("ai_sessions").select("id,ai_profile_id,expires_at,ai_profiles(id,user_id,provider,model,model_config,created_at,last_used_at)").eq("token_hash", hashSessionToken(token)).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (!data) return null;
  const profile = Array.isArray(data.ai_profiles) ? data.ai_profiles[0] : data.ai_profiles;
  if (!profile) return null;
  const siteUserId = await getSiteUserId();
  if (profile.user_id && profile.user_id !== siteUserId) return null;
  if (!profile.user_id && siteUserId) return null;

  if (profile.provider === "gemini" && DEPRECATED_TEXT_MODELS.has(profile.model)) {
    profile.model = DEFAULT_TEXT_MODEL;
    const currentConfig = (profile.model_config || {}) as AiModelConfig;
    profile.model_config = { ...currentConfig, text: DEFAULT_TEXT_MODEL };
    await db.from("ai_profiles").update({ model: DEFAULT_TEXT_MODEL, model_config: profile.model_config, last_used_at: new Date().toISOString() }).eq("id", profile.id);
  }

  return { sessionId: data.id, profile };
}

export async function getAiCapabilityModel(profileId: string, capability: AiCapability, apiKey: string, existingConfig?: AiModelConfig | null) {
  const config = existingConfig || {};
  const current = config[capability];
  if (current) return current;
  const discovered = await discoverGeminiModels(apiKey);
  const model = discovered.config[capability];
  if (!model) throw new Error(`GEMINI_${capability.toUpperCase()}_MODEL_UNAVAILABLE`);
  await supabaseAdmin().from("ai_profiles").update({ model_config: discovered.config, last_used_at: new Date().toISOString() }).eq("id", profileId);
  return model;
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
