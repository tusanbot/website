import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { decryptApiKey } from "@/lib/ai/crypto";

type AiTool = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  provider: string;
  model: string;
  active: boolean;
  rate_limit: number;
  system_prompt: string | null;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
};

export async function getAdminAiTool(toolId: string) {
  const { data, error } = await supabaseAdmin()
    .from("ai_tools")
    .select("id,name,slug,description,provider,model,active,rate_limit,system_prompt,created_at,updated_at,last_used_at")
    .eq("id", toolId)
    .maybeSingle();
  if (error) throw new Error("AI_TOOL_LOOKUP_FAILED");
  return data as AiTool | null;
}

export async function getAdminAiToolAccess(toolId: string) {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("ai_tools")
    .select("id,name,slug,provider,model,active,rate_limit,system_prompt,encrypted_api_key")
    .eq("id", toolId)
    .maybeSingle();
  if (error || !data) throw new Error("AI_TOOL_NOT_FOUND");
  if (!data.active) throw new Error("AI_TOOL_DISABLED");
  return {
    id: data.id as string,
    name: data.name as string,
    slug: data.slug as string,
    provider: data.provider as string,
    model: data.model as string,
    rateLimit: data.rate_limit as number,
    systemPrompt: data.system_prompt as string | null,
    apiKey: decryptApiKey(data.encrypted_api_key as string),
    source: "admin_tool" as const,
  };
}

export async function markAdminAiToolUsed(toolId: string) {
  await supabaseAdmin().from("ai_tools").update({ last_used_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", toolId);
}
