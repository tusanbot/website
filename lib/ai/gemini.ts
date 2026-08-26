import { getProfileApiKey } from "@/lib/ai/server";

export type GeminiResult = { text: string; model: string };
export type GeminiOptions = { temperature?: number; maxOutputTokens?: number; timeoutMs?: number };
export type GeminiSpeechResult = { audioBase64: string; mimeType: string; model: string };

function getBaseUrl() {
  return (process.env.GEMINI_API_BASE_URL || "https://generativelanguage.googleapis.com/v1beta").replace(/\/$/, "");
}

function safeGeminiError(status: number, data: unknown) {
  const message = typeof data === "object" && data !== null && "error" in data
    ? (data as { error?: { message?: string; status?: string; code?: number } }).error
    : undefined;
  const detail = message?.message || message?.status || "";
  const error = new Error(`GEMINI_${status}`) as Error & { status?: number; detail?: string };
  error.status = status;
  error.detail = detail.slice(0, 300);
  return error;
}

async function readGeminiError(response: Response) {
  try { return await response.json(); } catch { return null; }
}

function pcm16ToWavBase64(base64: string, sampleRate = 24000) {
  const binary = Buffer.from(base64, "base64");
  const header = Buffer.alloc(44);
  header.write("RIFF", 0); header.writeUInt32LE(36 + binary.length, 4); header.write("WAVE", 8); header.write("fmt ", 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22); header.writeUInt32LE(sampleRate, 24); header.writeUInt32LE(sampleRate * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write("data", 36); header.writeUInt32LE(binary.length, 40);
  return Buffer.concat([header, binary]).toString("base64");
}

export async function generateWithGemini(profileId: string, prompt: string, model = "gemini-3.6-flash", options: GeminiOptions = {}): Promise<GeminiResult> {
  const apiKey = await getProfileApiKey(profileId);
  const requestedModel = model || "gemini-3.6-flash";
  const models = Array.from(new Set([requestedModel, "gemini-3.6-flash", "gemini-3.6-flash-preview", "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"]));
  let lastError: (Error & { status?: number; detail?: string }) | null = null;

  for (const candidate of models) {
    const response = await fetch(`${getBaseUrl()}/models/${encodeURIComponent(candidate)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { ...(options.temperature === undefined ? {} : { temperature: options.temperature }), ...(options.maxOutputTokens === undefined ? {} : { maxOutputTokens: options.maxOutputTokens }) } }),
      cache: "no-store", signal: AbortSignal.timeout(options.timeoutMs || 30000),
    });
    if (response.ok) {
      const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      const text = data.candidates?.[0]?.content?.parts?.map(part => part.text || "").join("").trim();
      if (!text) throw Object.assign(new Error("GEMINI_EMPTY"), { status: 502 });
      return { text, model: candidate };
    }

    const data = await readGeminiError(response);
    lastError = safeGeminiError(response.status, data) as Error & { status?: number; detail?: string };

    if (response.status === 401 || response.status === 403) throw Object.assign(new Error("GEMINI_AUTH"), { status: 401 });
    if (response.status === 429) throw Object.assign(new Error("GEMINI_RATE_LIMIT"), { status: 429 });
    if (response.status === 400 && /model|not found|unsupported|invalid/i.test(lastError.detail || "")) continue;
    if (response.status === 404) continue;
    break;
  }

  if (lastError) console.error("Gemini upstream error", { status: lastError.status, detail: lastError.detail });
  throw Object.assign(new Error("GEMINI_UPSTREAM"), { status: 502 });
}

export async function generateSpeechWithGemini(profileId: string, text: string, voice = "Kore", speed = 1): Promise<GeminiSpeechResult> {
  const apiKey = await getProfileApiKey(profileId);
  const model = process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts";
  const response = await fetch(`${getBaseUrl()}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: `Speak the following text naturally. Preserve the language and pronunciation. Requested playback speed: ${speed}x.\n\n${text}` }] }], generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } } }),
    cache: "no-store", signal: AbortSignal.timeout(60000),
  });
  if (response.status === 401 || response.status === 403) throw Object.assign(new Error("GEMINI_AUTH"), { status: 401 });
  if (response.status === 429) throw Object.assign(new Error("GEMINI_RATE_LIMIT"), { status: 429 });
  if (response.status === 408 || response.status === 504) throw Object.assign(new Error("GEMINI_TIMEOUT"), { status: 504 });
  if (!response.ok) throw Object.assign(new Error("GEMINI_UPSTREAM"), { status: 502 });
  const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> } }> };
  const audio = data.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data)?.inlineData;
  if (!audio?.data) throw Object.assign(new Error("GEMINI_AUDIO_EMPTY"), { status: 502 });
  const isPcm = (audio.mimeType || "").toLowerCase().includes("l16") || (audio.mimeType || "").toLowerCase().includes("pcm");
  return { audioBase64: isPcm ? pcm16ToWavBase64(audio.data) : audio.data, mimeType: isPcm ? "audio/wav" : (audio.mimeType || "audio/wav"), model };
}

export function parseGeminiJson<T>(text: string): T {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  return JSON.parse(cleaned) as T;
}
