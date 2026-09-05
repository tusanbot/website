import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getAiProfile, getProfileApiKey } from "@/lib/ai/server";

type AiAccess = {
  apiKey: string;
  model: string;
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

  return {
    apiKey: await getProfileApiKey(personal.profile.id),
    model: personal.profile.model || "gemini-2.5-flash",
    rateLimitUserId: user?.id || personal.profile.id,
    source: "personal",
  };
}

export async function requireAiAccess() {
  const access = await getAiAccess();
  if (!access) throw new Error("AI_ACCESS_REQUIRED");
  return access;
}
