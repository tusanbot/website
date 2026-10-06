export type XaiTextResult = { text: string; model: string };
export type XaiSpeechResult = { audioBase64: string; mimeType: string; model: string };

const BASE_URL = (process.env.XAI_API_BASE_URL || "https://api.x.ai/v1").replace(/\\/$/, "");
const DEFAULT_TEXT_MODEL = "grok-4.7";
const DEFAULT_TTS_MODEL = "grok-voice";

function errorFor(status: number, detail = "") {
  const error = new Error(`XAI_${status}`) as Error & { status?: number; detail?: string };
  error.status = status; error.detail = detail.slice(0, 300); return error;
}

async function readError(response: Response) {
  try { return await response.json(); } catch { return null; }
}

export async function discoverXaiModels(apiKey: string) {
  const response = await fetch(`${BASE_URL}/models`, {
    headers: { Authorization: `Bearer ${apiKey.trim()}`, Accept: "application/json" },
    cache: "no-store", signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    const payload = await readError(response) as { error?: { message?: string } } | null;
    throw errorFor(response.status, payload?.error?.message || "");
  }
  const data = await response.json() as { data?: Array<{ id?: string }> };
  const models = (data.data || []).map(x => x.id).filter((x): x is string => Boolean(x));
  const text = models.find(x => x === DEFAULT_TEXT_MODEL) || models.find(x => /^grok-4/i.test(x)) || models[0];
  return { available: models, text: text || DEFAULT_TEXT_MODEL, tts: DEFAULT_TTS_MODEL };
}

export async function validateXaiKey(apiKey: string, capability: "text" | "tts" = "text") {
  if (!apiKey.trim()) return { ok: false as const, message: "کلید xAI را وارد کنید." };
  try {
    const discovered = await discoverXaiModels(apiKey);
    return { ok: true as const, model: capability === "tts" ? discovered.tts : discovered.text, modelConfig: discovered };
  } catch (error) {
    const status = (error as { status?: number })?.status;
    if (status === 401 || status === 403) return { ok: false as const, message: "کلید xAI معتبر نیست یا دسترسی لازم را ندارد." };
    if (status === 429) return { ok: false as const, message: "محدودیت درخواست xAI فعال است؛ کمی بعد دوباره تلاش کنید." };
    return { ok: false as const, message: "اعتبارسنجی کلید xAI انجام نشد." };
  }
}

export async function generateWithXaiApiKey(apiKey: string, prompt: string, model = DEFAULT_TEXT_MODEL, options: { temperature?: number; maxOutputTokens?: number; timeoutMs?: number } = {}): Promise<XaiTextResult> {
  const response = await fetch(`${BASE_URL}/responses`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model || DEFAULT_TEXT_MODEL,
      input: prompt,
      ...(options.temperature === undefined ? {} : { temperature: options.temperature }),
      ...(options.maxOutputTokens === undefined ? {} : { max_output_tokens: options.maxOutputTokens }),
    }),
    cache: "no-store", signal: AbortSignal.timeout(options.timeoutMs || 30000),
  });
  const payload = await response.json().catch(() => null) as { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }>; error?: { message?: string } } | null;
  if (!response.ok) throw errorFor(response.status, payload?.error?.message || "");
  const text = payload?.output_text || payload?.output?.flatMap(x => x.content || []).map(x => x.text || "").join("").trim();
  if (!text) throw errorFor(502, "empty response");
  return { text, model: model || DEFAULT_TEXT_MODEL };
}

export async function generateSpeechWithXaiApiKey(apiKey: string, text: string, voice = "eve", speed = 1, language = "auto"): Promise<XaiSpeechResult> {
  const response = await fetch(`${BASE_URL}/tts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      text, voice_id: voice, language,
      speed: Math.min(1.5, Math.max(0.7, speed)),
      output_format: { codec: "mp3", sample_rate: 24000, bit_rate: 128000 },
    }),
    cache: "no-store", signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) {
    const payload = await readError(response) as { error?: { message?: string } } | null;
    throw errorFor(response.status, payload?.error?.message || "");
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return { audioBase64: buffer.toString("base64"), mimeType: response.headers.get("content-type") || "audio/mpeg", model: DEFAULT_TTS_MODEL };
}