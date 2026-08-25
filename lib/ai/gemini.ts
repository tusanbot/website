import { getProfileApiKey } from "@/lib/ai/server";

export type GeminiResult = { text: string; model: string };
export type GeminiOptions = { temperature?: number; maxOutputTokens?: number; timeoutMs?: number };
export type GeminiSpeechResult = { audioBase64: string; mimeType: string; model: string };

function getBaseUrl() {
  return (process.env.GEMINI_API_BASE_URL || "https://generativelanguage.googleapis.com/v1beta").replace(/\/$/, "");
}

export async function generateWithGemini(profileId: string, prompt: string, model = "gemini-2.5-flash", options: GeminiOptions = {}): Promise<GeminiResult> {
  const apiKey = await getProfileApiKey(profileId);
  const response = await fetch(`${getBaseUrl()}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { ...(options.temperature === undefined ? {} : { temperature: options.temperature }), ...(options.maxOutputTokens === undefined ? {} : { maxOutputTokens: options.maxOutputTokens }) } }),
    cache: "no-store", signal: AbortSignal.timeout(options.timeoutMs || 30000),
  });
  if (response.status === 401 || response.status === 403) throw Object.assign(new Error("GEMINI_AUTH"), { status: 401 });
  if (response.status === 429) throw Object.assign(new Error("GEMINI_RATE_LIMIT"), { status: 429 });
  if (!response.ok) throw Object.assign(new Error("GEMINI_UPSTREAM"), { status: 502 });
  const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = data.candidates?.[0]?.content?.parts?.map(part => part.text || "").join("").trim();
  if (!text) throw Object.assign(new Error("GEMINI_EMPTY"), { status: 502 });
  return { text, model };
}

export async function generateSpeechWithGemini(profileId: string, text: string, voice = "Kore", speed = 1): Promise<GeminiSpeechResult> {
  const apiKey = await getProfileApiKey(profileId);
  const model = process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts";
  const response = await fetch(`${getBaseUrl()}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: `Speak the following text naturally. Preserve the language and pronunciation. Requested playback speed: ${speed}x.\n\n${text}` }] }],
      generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
    }),
    cache: "no-store", signal: AbortSignal.timeout(60000),
  });
  if (response.status === 401 || response.status === 403) throw Object.assign(new Error("GEMINI_AUTH"), { status: 401 });
  if (response.status === 429) throw Object.assign(new Error("GEMINI_RATE_LIMIT"), { status: 429 });
  if (response.status === 408 || response.status === 504) throw Object.assign(new Error("GEMINI_TIMEOUT"), { status: 504 });
  if (!response.ok) throw Object.assign(new Error("GEMINI_UPSTREAM"), { status: 502 });
  const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> } }> };
  const audio = data.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data)?.inlineData;
  if (!audio?.data) throw Object.assign(new Error("GEMINI_AUDIO_EMPTY"), { status: 502 });
  return { audioBase64: audio.data, mimeType: audio.mimeType || "audio/wav", model };
}

export function parseGeminiJson<T>(text: string): T {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  return JSON.parse(cleaned) as T;
}
