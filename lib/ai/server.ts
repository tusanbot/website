import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createSessionToken, decryptApiKey, encryptApiKey, hashApiKey, hashSessionToken } from "@/lib/ai/crypto";
import { discoverXaiModels, validateXaiKey } from "@/lib/ai/xai";

export const AI_SESSION_COOKIE = "tusan_ai_session";
const SESSION_DAYS = 30;
const DEFAULT_TEXT_MODEL = "gemini-3.6-flash";
const DEPRECATED_TEXT_MODELS = new Set(["gemini-2.5-flash"]);
export type AiCapability = "text" | "image" | "video" | "music" | "tts";
export type AiProvider = "gemini" | "xai";
export type GeminiModel = { name?: string; supportedGenerationMethods?: string[] };
export type AiModelConfig = { text?: string; image?: string; video?: string; music?: string; tts?: string; textProvider?: AiProvider; ttsProvider?: AiProvider; available?: Array<{ name: string; methods: string[] }>; checkedAt?: string };
export type AiCapabilityKeys = Partial<Record<AiCapability, string>>;
const PREFERRED_TEXT_MODELS = ["gemini-3.6-flash", "gemini-3.6-flash-preview", "gemini-2.5-flash-lite", "gemini-2.0-flash"];
const PREFERRED_IMAGE_MODELS = ["gemini-3.1-flash-image", "gemini-3-pro-image-preview", "gemini-2.5-flash-image"];
const PREFERRED_VIDEO_MODELS = ["veo-3.1-generate-preview", "veo-3.1-generate"];
const PREFERRED_MUSIC_MODELS = ["lyria-3.5", "lyria-3.0"];
const PREFERRED_TTS_MODELS = ["gemini-3.8-flash-tts", "gemini-2.5-flash-preview-tts", "gemini-2.5-pro-preview-tts"];
function getGeminiBaseUrl() { return (process.env.GEMINI_API_BASE_URL || "https://generativelanguage.googleapis.com/v1beta").replace(/\/$/, ""); }
function normalizeModels(models: GeminiModel[]) { return models.map((model) => ({ name: model.name?.replace(/^models\//, ""), methods: model.supportedGenerationMethods || [] })).filter((model): model is { name: string; methods: string[] } => Boolean(model.name)); }
function pickModel(available: Array<{ name: string; methods: string[] }>, capability: AiCapability) {
  const method = capability === "video" ? "predictLongRunning" : "generateContent";
  const candidates = available.filter((item) => item.methods.includes(method));
  const preferred = capability === "text" ? PREFERRED_TEXT_MODELS : capability === "image" ? PREFERRED_IMAGE_MODELS : capability === "video" ? PREFERRED_VIDEO_MODELS : capability === "music" ? PREFERRED_MUSIC_MODELS : PREFERRED_TTS_MODELS;
  return preferred.find((name) => candidates.some((item) => item.name === name)) || candidates.find((item) => capability === "text" && /flash/i.test(item.name))?.name || candidates[0]?.name;
}
export async function discoverGeminiModels(apiKey: string) {
  const baseUrl = getGeminiBaseUrl();
  let response: Response;
  try {
    response = await fetch(baseUrl + "/models", {
      method: "GET",
      headers: { "x-goog-api-key": apiKey.trim(), Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "network error";
    console.error("Gemini model discovery request failed", { baseUrl, detail });
    throw new Error("GEMINI_NETWORK");
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: { message?: string; status?: string } } | null;
    const detail = payload?.error?.message || payload?.error?.status || ("HTTP " + response.status);
    console.error("Gemini model discovery failed", { baseUrl, status: response.status, detail });
    if (response.status === 401 || response.status === 403) throw new Error("GEMINI_AUTH");
    if (response.status === 429) throw new Error("GEMINI_RATE_LIMIT");
    throw new Error("GEMINI_MODELS_UNAVAILABLE");
  }
  const data = await response.json() as { models?: GeminiModel[] };
  const available = normalizeModels(data.models || []);
  return { available, config: { text: pickModel(available, "text"), image: pickModel(available, "image"), video: pickModel(available, "video"), music: pickModel(available, "music"), tts: pickModel(available, "tts"), available, checkedAt: new Date().toISOString() } satisfies AiModelConfig };
}
export async function validateGeminiKey(apiKey: string, capability: AiCapability = "text") {
  if (!apiKey.trim()) return { ok: false as const, message: "کلید API را وارد کنید." };
  try {
    const discovered = await discoverGeminiModels(apiKey);
    const model = discovered.config[capability];
    if (!model) {
      const capabilityName = capability === "tts" ? "متن به صوت" : capability === "text" ? "متن و چت" : capability;
      return { ok: false as const, message: `این کلید به مدل فعال برای قابلیت ${capabilityName} دسترسی ندارد.` };
    }
    return { ok: true as const, model, modelConfig: discovered.config };
  } catch (error) {
    if (error instanceof Error && error.message === "GEMINI_AUTH") return { ok: false as const, message: "کلید Gemini معتبر نیست یا دسترسی لازم را ندارد." };
    if (error instanceof Error && error.message === "GEMINI_RATE_LIMIT") return { ok: false as const, message: "محدودیت درخواست Gemini فعال است؛ کمی بعد دوباره تلاش کنید." };
    if (error instanceof Error && error.message === "GEMINI_NETWORK") return { ok: false as const, message: "ارتباط سرور توسن با سرویس Gemini برقرار نشد. اتصال اینترنت سرور یا تنظیمات GEMINI_API_BASE_URL را بررسی کنید." };
    if (error instanceof Error && error.message === "GEMINI_MODELS_UNAVAILABLE") return { ok: false as const, message: "فهرست مدل‌های Gemini از سمت Google دریافت نشد. تنظیمات API یا دسترسی کلید را بررسی کنید." };
    console.error("Gemini key validation failed", error);
    return { ok: false as const, message: "اعتبارسنجی کلید Gemini انجام نشد." };
  }
}

async function getSiteUserId() {
  const site = await createSupabaseServerClient();
  const { data, error } = await site.auth.getClaims();
  if (error) {
    console.error("AI profile auth claims lookup failed", error);
    return null;
  }
  const sub = data?.claims?.sub;
  return typeof sub === "string" ? sub : null;
}

const keyColumn: Record<AiCapability, string> = { text: "text_encrypted_api_key", image: "image_encrypted_api_key", video: "video_encrypted_api_key", music: "music_encrypted_api_key", tts: "tts_encrypted_api_key" };
const xaiKeyColumn: Partial<Record<AiCapability, string>> = { text: "xai_text_encrypted_api_key", tts: "xai_tts_encrypted_api_key" };
function providerFor(config: AiModelConfig | null | undefined, profileProvider: string, capability: AiCapability): AiProvider { const selected = capability === "tts" ? config?.ttsProvider : capability === "text" ? config?.textProvider : undefined; return selected === "xai" ? "xai" : selected === "gemini" ? "gemini" : profileProvider === "xai" ? "xai" : "gemini"; }
function columnFor(provider: AiProvider, capability: AiCapability) { return provider === "xai" ? xaiKeyColumn[capability] : keyColumn[capability]; }
function capabilityPayload(keys: AiCapabilityKeys, providers?: Partial<Record<AiCapability, AiProvider>>) { const payload: Record<string, string> = {}; for (const capability of Object.keys(keyColumn) as AiCapability[]) { const value = keys[capability]?.trim(); if (!value) continue; const column = columnFor(providers?.[capability] || "gemini", capability); if (column) payload[column] = encryptApiKey(value); } return payload; }


async function getExistingAiProfile() {
  try {
    return await getAiProfile();
  } catch (error) {
    console.error("AI existing profile lookup failed", error);
    return null;
  }
}

export async function createAiSession(input: string | AiCapabilityKeys | { keys: AiCapabilityKeys; providers?: Partial<Record<AiCapability, AiProvider>> }) {
  const incomingKeys: AiCapabilityKeys = typeof input === "string" ? { text: input } : "keys" in input ? input.keys : Object.fromEntries(Object.entries(input).filter(([, value]) => typeof value === "string" && value.trim())) as AiCapabilityKeys;
  const providers: Partial<Record<AiCapability, AiProvider>> = typeof input === "object" && "keys" in input ? (input.providers || {}) : {};

  const existing = await getExistingAiProfile();
  const keys: AiCapabilityKeys = { ...incomingKeys };
  for (const capability of ["text", "image", "video", "music", "tts"] as const) {
    if (keys[capability] || !existing?.profile.id) continue;
    try { const desiredProvider = providers[capability] || providerFor(existing.profile.model_config as AiModelConfig, existing.profile.provider, capability); keys[capability] = await getProfileApiKey(existing.profile.id, capability, desiredProvider); } catch { /* capability is not configured */ }
  }

  const incomingCapabilities = new Set(Object.keys(incomingKeys) as AiCapability[]);
  const validationEntries = await Promise.all(
    [...incomingCapabilities].map(async (capability) => {
      const key = keys[capability];
      const provider = providers[capability] || providerFor(existing?.profile.model_config as AiModelConfig, existing?.profile.provider || "gemini", capability);
      return [capability, provider === "xai" ? await validateXaiKey(key!, capability === "tts" ? "tts" : "text") : await validateGeminiKey(key!, capability)] as const;
    })
  );
  const invalidResult = validationEntries.find(([, result]) => !result.ok)?.[1];
  if (invalidResult && !invalidResult.ok) return { ok: false as const, message: invalidResult.message };
  if (!Object.keys(keys).length) return { ok: false as const, message: "حداقل یک کلید API برای متن و چت یا متن به صوت وارد کنید." };

  const existingConfig = existing?.profile.model_config ? (existing.profile.model_config as AiModelConfig) : {};
  const modelConfig: AiModelConfig = { ...existingConfig };
  for (const [capability, result] of validationEntries) if (result.ok) { modelConfig[capability] = result.model; const provider = providers[capability] || providerFor(existingConfig, existing?.profile.provider || "gemini", capability); if (capability === "text") modelConfig.textProvider = provider; if (capability === "tts") modelConfig.ttsProvider = provider; }

  const primaryKey = keys.text || keys.tts;
  if (!primaryKey) return { ok: false as const, message: "حداقل یک کلید API برای متن و چت یا متن به صوت وارد کنید." };

  const db = supabaseAdmin();
  const userId = await getSiteUserId();
  const now = new Date().toISOString();
  const payload = {
    key_hash: hashApiKey(primaryKey),
    encrypted_api_key: encryptApiKey(primaryKey),
    provider: modelConfig.textProvider || "gemini",
    model: modelConfig.text || modelConfig.tts || DEFAULT_TEXT_MODEL,
    model_config: modelConfig,
    ...capabilityPayload(keys, providers),
    last_used_at: now,
  };

  let profile;
  if (userId) {
    const { data: current, error: currentError } = await db.from("ai_profiles").select("id").eq("user_id", userId).maybeSingle();
    if (currentError) throw new Error("خواندن پروفایل هوش مصنوعی انجام نشد.");
    if (current?.id) {
      const { data, error } = await db.from("ai_profiles").update(payload).eq("id", current.id).select("id,provider,model,model_config,created_at,last_used_at").single();
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
  const { data, error } = await db.from("ai_sessions").select("id,ai_profile_id,expires_at,ai_profiles(id,user_id,provider,model,model_config,created_at,last_used_at)").eq("token_hash", hashSessionToken(token)).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (error) {
    console.error("AI profile session lookup failed", error);
    throw new Error("AI_PROFILE_LOOKUP_FAILED");
  }
  if (!data) return null;
  const profile = Array.isArray(data.ai_profiles) ? data.ai_profiles[0] : data.ai_profiles;
  if (!profile) return null;
  // The AI session is an independent bearer session. Do not require a second
  // Supabase Auth lookup just to read it; a stale main-auth cookie must not
  // prevent the user from opening the AI profile page.
  if (profile.provider === "gemini" && DEPRECATED_TEXT_MODELS.has(profile.model)) {
    profile.model = DEFAULT_TEXT_MODEL;
    const currentConfig = (profile.model_config || {}) as AiModelConfig;
    profile.model_config = { ...currentConfig, text: DEFAULT_TEXT_MODEL };
    await db.from("ai_profiles").update({ model: DEFAULT_TEXT_MODEL, model_config: profile.model_config, last_used_at: new Date().toISOString() }).eq("id", profile.id);
  }
  return { sessionId: data.id, profile };
}

export async function getAiCapabilityProvider(profileId: string, capability: AiCapability, config?: AiModelConfig | null) {
  const session = await getAiProfile();
  return providerFor(config || session?.profile.model_config as AiModelConfig, session?.profile.provider || "gemini", capability);
}
export async function getAiCapabilityModel(profileId: string, capability: AiCapability, apiKey: string, existingConfig?: AiModelConfig | null) {
  const config = existingConfig || {};
  const provider = providerFor(config, "gemini", capability);
  const current = config[capability];
  if (current) return current;
  if (provider === "xai") {
    const discovered = await discoverXaiModels(apiKey);
    const model = capability === "tts" ? discovered.tts : discovered.text;
    await supabaseAdmin().from("ai_profiles").update({ model_config: { ...config, [capability]: model, textProvider: capability === "text" ? "xai" : config.textProvider, ttsProvider: capability === "tts" ? "xai" : config.ttsProvider, checkedAt: new Date().toISOString() }, last_used_at: new Date().toISOString() }).eq("id", profileId);
    return model;
  }
  const discovered = await discoverGeminiModels(apiKey);
  const model = discovered.config[capability];
  if (!model) throw new Error(`GEMINI_${capability.toUpperCase()}_MODEL_UNAVAILABLE`);
  await supabaseAdmin().from("ai_profiles").update({ model_config: { ...config, [capability]: model, available: discovered.config.available, checkedAt: discovered.config.checkedAt }, last_used_at: new Date().toISOString() }).eq("id", profileId);
  return model;
}
export async function requireAiProfile() { const session = await getAiProfile(); if (!session) throw new Error("AI_PROFILE_REQUIRED"); return session; }
export async function getProfileApiKey(profileId: string, capability: AiCapability = "text", provider?: AiProvider) {
  const db = supabaseAdmin();
  const { data, error } = await db.from("ai_profiles").select("*").eq("id", profileId).single();
  if (error || !data) throw new Error("AI profile not found");
  const record = data as unknown as Record<string, string | null | undefined>;
  const config = (record.model_config || {}) as AiModelConfig;
  const selectedProvider: AiProvider = provider ?? providerFor(config, (record.provider as AiProvider) || "gemini", capability);
  const selectedColumn = columnFor(selectedProvider, capability);
  const capabilityKey = selectedColumn ? record[selectedColumn] : null;
  if (capabilityKey) return decryptApiKey(capabilityKey);
  const legacyKey = record.encrypted_api_key;
  if (legacyKey && (capability === "text" || Boolean(config[capability]))) return decryptApiKey(legacyKey);
  throw new Error("AI API key not configured");
}
export async function destroyAiSession() {
  const jar = await cookies();
  const token = jar.get(AI_SESSION_COOKIE)?.value;
  if (token) await supabaseAdmin().from("ai_sessions").delete().eq("token_hash", hashSessionToken(token));
  jar.set(AI_SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}
