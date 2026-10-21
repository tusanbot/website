import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getAiProfile, getAiCapabilityModel, getAiCapabilityProvider, getProfileApiKey, type AiCapability, type AiModelConfig, type AiProvider } from "@/lib/ai/server";

type AiAccess = {
  profileId: string;
  apiKey: string;
  model: string;
  modelConfig: AiModelConfig;
  provider: AiProvider;
  rateLimitUserId: string;
  source: "personal";
};

export async function getAiAccess(capability: AiCapability = "text"): Promise<AiAccess | null> {
  const site = await createSupabaseServerClient();
  const { data: { user } } = await site.auth.getUser();
  const personal = await getAiProfile();
  if (!personal) return null;
  const provider = await getAiCapabilityProvider(personal.profile.id, capability, personal.profile.model_config as AiModelConfig);
  const apiKey = await getProfileApiKey(personal.profile.id, capability, provider);
  const model = await getAiCapabilityModel(personal.profile.id, capability, apiKey, personal.profile.model_config);
  return { profileId: personal.profile.id, apiKey, model, provider, modelConfig: (personal.profile.model_config || {}) as AiModelConfig, rateLimitUserId: user?.id || personal.profile.id, source: "personal" };
}

export async function requireAiAccess(capability: AiCapability = "text") {
  const access = await getAiAccess(capability);
  if (!access) throw new Error("AI_ACCESS_REQUIRED");
  return access;
}
