const ZIBAL_API = "https://gateway.zibal.ir/v1";
function merchant(): string { const value = process.env.ZIBAL_MERCHANT; if (!value) throw new Error("ZIBAL_MERCHANT is not configured"); return value; }
async function requestJson(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const response = await fetch(`${ZIBAL_API}/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ merchant: merchant(), ...body }), cache: "no-store" });
    const data = await response.json().catch((): null => null) as Record<string, unknown> | null;
    if (!response.ok || !data) throw new Error("ارتباط با درگاه زیبال ناموفق بود.");
    return data;
}
export async function requestZibalPayment(input: { amount: number; callbackUrl: string; description: string; orderId: string }) {
    const data = await requestJson("request", { amount: Math.round(input.amount), callbackUrl: input.callbackUrl, description: input.description, orderId: input.orderId });
    const trackId = Number(data.trackId);
    if (!Number.isSafeInteger(trackId) || trackId <= 0) throw new Error(typeof data.message === "string" ? data.message : "درگاه زیبال شناسه پرداخت معتبر برنگرداند.");
    return { trackId, raw: data };
}
export async function verifyZibalPayment(trackId: number) {
    const data = await requestJson("verify", { trackId });
    return { success: Number(data.result) === 100, result: Number(data.result), message: typeof data.message === "string" ? data.message : "", amount: Number(data.amount), referenceNumber: data.refNumber == null ? null : String(data.refNumber), raw: data };
}
export function zibalStartUrl(trackId: number) { return `https://gateway.zibal.ir/start/${encodeURIComponent(String(trackId))}`; }
