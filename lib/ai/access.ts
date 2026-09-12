import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getAiProfile, getAiCapabilityModel, getProfileApiKey, type AiModelConfig } from "@/lib/ai/server";

type AiAccess = {
  profileId: string;
  apiKey: string;
  model: string;
  modelConfig: AiModelConfig;
  rateLimitUserId: string;
  source: "personal";
};

/**
 * Public AI tools always use the end user's Gemini credential.
 * Google OAuth is only the site's identity/authentication layer; it never
 * becomes a Gemini credential and must never fall back to a Tusan-owned key.
 */
export async function getAiAccess(): Promise<AiAccess | null> {
  const site = await createSupabaseServerClient();
  const { data: { user } } = await site.auth.getUser();

  const personal = await getAiProfile();
  if (!personal) return null;

  const apiKey = await getProfileApiKey(personal.profile.id);
  const model = await getAiCapabilityModel(personal.profile.id, "text", apiKey, personal.profile.model_config);

  return {
    profileId: personal.profile.id,
    apiKey,
    model,
    modelConfig: (personal.profile.model_config || {}) as AiModelConfig,
    rateLimitUserId: user?.id || personal.profile.id,
    source: "personal",
  };
}

export async function requireAiAccess() {
  const access = await getAiAccess();
  if (!access) throw new Error("AI_ACCESS_REQUIRED");
  return access;
}
