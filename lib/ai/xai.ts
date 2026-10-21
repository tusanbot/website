export type XaiTextResult = { text: string; model: string };
export type XaiSpeechResult = { audioBase64: string; mimeType: string; model: string };

const BASE_URL = (process.env.XAI_API_BASE_URL || "https://api.x.ai/v1").replace(/\/$/, "");
const DEFAULT_TEXT_MODEL = "grok-2-latest";

function errorFor(status: number, detail = "") {
  const error = new Error(`XAI_${status}`) as Error & { status?: number; detail?: string };
  error.status = status; error.detail = detail.slice(0, 300); return error;
}

async function readError(response: Response) {
  try { return await response.json(); } catch { return null; }
}

export async function discoverXaiModels(apiKey: string) {
  try {
    const response = await fetch(`${BASE_URL}/models`, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey.trim()}`, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      const payload = await readError(response) as { error?: { message?: string } } | null;
      throw errorFor(response.status, payload?.error?.message || `HTTP ${response.status}`);
    }
    const data = await response.json() as { data?: Array<{ id?: string }> };
    const models = (data.data || []).map(x => x.id).filter((x): x is string => Boolean(x));
    const text = models.find(x => x === DEFAULT_TEXT_MODEL) || models.find(x => /^grok/i.test(x)) || DEFAULT_TEXT_MODEL;
    return { available: models, text, tts: "grok-voice" };
  } catch (error) {
    if ((error as { status?: number })?.status) throw error;
    return { available: [DEFAULT_TEXT_MODEL], text: DEFAULT_TEXT_MODEL, tts: "grok-voice" };
  }
}

export async function validateXaiKey(apiKey: string, capability: "text" | "tts" = "text") {
  if (!apiKey.trim()) return { ok: false as const, message: "کلید xAI را وارد کنید." };
  try {
    const discovered = await discoverXaiModels(apiKey);
    return { ok: true as const, model: capability === "tts" ? discovered.tts : discovered.text, modelConfig: discovered };
  } catch (error) {
    const status = (error as { status?: number })?.status;
    const detail = (error as { detail?: string })?.detail || "";
    if (status === 401) return { ok: false as const, message: "کلید xAI معتبر نیست یا منقضی شده است." };
    if (status === 403) return { ok: false as const, message: "کلید xAI معتبر است اما دسترسی لازم برای مدل انتخاب‌شده را ندارد." };
    if (status === 429) return { ok: false as const, message: "محدودیت درخواست xAI فعال است؛ کمی بعد دوباره تلاش کنید." };
    return { ok: false as const, message: detail ? `اعتبارسنجی کلید xAI انجام نشد: ${detail}` : "اعتبارسنجی کلید xAI انجام نشد." };
  }
}

export async function generateWithXaiApiKey(apiKey: string, prompt: string, model = DEFAULT_TEXT_MODEL, options: { temperature?: number; maxOutputTokens?: number; timeoutMs?: number } = {}): Promise<XaiTextResult> {
  const chosenModel = model || DEFAULT_TEXT_MODEL;
  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey.trim()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: chosenModel,
      messages: [{ role: "user", content: prompt }],
      temperature: options.temperature ?? 0.7,
      ...(options.maxOutputTokens ? { max_tokens: options.maxOutputTokens } : {}),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(options.timeoutMs || 30000),
  });
  const payload = await response.json().catch(() => null) as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } } | null;
  if (!response.ok) throw errorFor(response.status, payload?.error?.message || "");
  const text = payload?.choices?.[0]?.message?.content?.trim();
  if (!text) throw errorFor(502, "empty response");
  return { text, model: chosenModel };
}

export async function generateSpeechWithXaiApiKey(apiKey: string, text: string, voice = "eve", speed = 1, language = "auto"): Promise<XaiSpeechResult> {
  const response = await fetch(`${BASE_URL}/audio/speech`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey.trim()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "tts-1",
      input: text,
      voice,
      speed: Math.min(1.5, Math.max(0.7, speed)),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) {
    const payload = await readError(response) as { error?: { message?: string } } | null;
    throw errorFor(response.status, payload?.error?.message || "");
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return { audioBase64: buffer.toString("base64"), mimeType: response.headers.get("content-type") || "audio/mpeg", model: "tts-1" };
}
