import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getAiProfile, getProfileApiKey } from "@/lib/ai/server";

type AiAccess = {
  apiKey: string;
  model: string;
  rateLimitUserId: string;
  source: "google" | "personal";
};

const SHARED_KEY = process.env.TUSAN_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
const SHARED_MODEL = process.env.TUSAN_GEMINI_MODEL || "gemini-2.5-flash";

function isGoogleUser(user: { app_metadata?: Record<string, unknown> | null }) {
  return user.app_metadata?.provider === "google";
}

export async function getAiAccess(): Promise<AiAccess | null> {
  const site = await createSupabaseServerClient();
  const { data: { user } } = await site.auth.getUser();

  // Google-authenticated site users can use the Tusan-managed Gemini credential.
  // The credential stays server-side; the user's Google OAuth token is never sent to Gemini.
  if (user && isGoogleUser(user) && SHARED_KEY) {
    return {
      apiKey: SHARED_KEY,
      model: SHARED_MODEL,
      rateLimitUserId: user.id,
      source: "google",
    };
  }

  // Users who prefer to bring their own Gemini key keep the existing AI profile flow.
  const personal = await getAiProfile();
  if (!personal) return null;

  return {
    apiKey: await getProfileApiKey(personal.profile.id),
    model: personal.profile.model || "gemini-2.5-flash",
    rateLimitUserId: personal.profile.id,
    source: "personal",
  };
}

export async function requireAiAccess() {
  const access = await getAiAccess();
  if (!access) throw new Error("AI_ACCESS_REQUIRED");
  return access;
}
