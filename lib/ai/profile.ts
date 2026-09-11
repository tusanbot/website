import crypto from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ENCRYPTION_VERSION = "v1";

function getEncryptionKey() {
  const secret = process.env.AI_PROFILE_ENCRYPTION_KEY;
  if (!secret) throw new Error("AI_PROFILE_ENCRYPTION_KEY is not configured");
  return crypto.createHash("sha256").update(secret).digest();
}

export function hashApiKey(apiKey: string) {
  return crypto.createHash("sha256").update(apiKey.trim()).digest("hex");
}

export function encryptApiKey(apiKey: string) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(apiKey.trim(), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [ENCRYPTION_VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(":");
}

export function decryptApiKey(payload: string) {
  const [version, ivEncoded, tagEncoded, ciphertextEncoded] = payload.split(":");
  if (version !== ENCRYPTION_VERSION || !ivEncoded || !tagEncoded || !ciphertextEncoded) throw new Error("Invalid encrypted API key");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(ivEncoded, "base64url"));
  decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextEncoded, "base64url")), decipher.final()]).toString("utf8");
}

export type AiProfile = {
  id: string;
  provider: string;
  model: string;
  created_at: string;
  last_used_at: string | null;
};

export async function getUserAiProfile(userId: string) {
  const admin = supabaseAdmin();
  const { data, error } = await admin.from("ai_profiles").select("id,provider,model,created_at,last_used_at").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data as AiProfile | null;
}

export async function upsertUserAiProfile(userId: string, provider: string, model: string, apiKey: string) {
  const admin = supabaseAdmin();
  const cleanProvider = provider.trim().toLowerCase();
  const cleanModel = model.trim();
  const cleanKey = apiKey.trim();
  if (!cleanProvider || !cleanModel || !cleanKey) throw new Error("provider, model and apiKey are required");
  const { data, error } = await admin.from("ai_profiles").upsert({
    user_id: userId,
    provider: cleanProvider,
    model: cleanModel,
    key_hash: hashApiKey(cleanKey),
    encrypted_api_key: encryptApiKey(cleanKey),
    last_used_at: new Date().toISOString(),
  }, { onConflict: "user_id" }).select("id,provider,model,created_at,last_used_at").single();
  if (error) throw error;
  return data as AiProfile;
}

export async function deleteUserAiProfile(userId: string) {
  const admin = supabaseAdmin();
  const { error } = await admin.from("ai_profiles").delete().eq("user_id", userId);
  if (error) throw error;
}

export async function getUserAiCredentials(userId: string) {
  const admin = supabaseAdmin();
  const { data, error } = await admin.from("ai_profiles").select("id,provider,model,encrypted_api_key").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { id: data.id as string, provider: data.provider as string, model: data.model as string, apiKey: decryptApiKey(data.encrypted_api_key as string) };
}
