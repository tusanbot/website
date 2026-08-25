import { getProfileApiKey } from "@/lib/ai/server";

export type GeminiResult = { text: string; model: string };

/** Server-only Gemini gateway. GEMINI_API_BASE_URL can point to an approved, authorized gateway. */
export async function generateWithGemini(profileId: string, prompt: string, model = "gemini-2.5-flash"): Promise<GeminiResult> {
  const apiKey = await getProfileApiKey(profileId);
  const base = (process.env.GEMINI_API_BASE_URL || "https://generativelanguage.googleapis.com/v1beta").replace(/\/$/, "");
  const response = await fetch(`${base}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] }),
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  if (response.status === 401 || response.status === 403) throw Object.assign(new Error("GEMINI_AUTH"), { status: 401 });
  if (response.status === 429) throw Object.assign(new Error("GEMINI_RATE_LIMIT"), { status: 429 });
  if (!response.ok) throw Object.assign(new Error("GEMINI_UPSTREAM"), { status: 502 });
  const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = data.candidates?.[0]?.content?.parts?.map(part => part.text || "").join("").trim();
  if (!text) throw Object.assign(new Error("GEMINI_EMPTY"), { status: 502 });
  return { text, model };
}

export function parseGeminiJson<T>(text: string): T {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  return JSON.parse(cleaned) as T;
}
