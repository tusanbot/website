import axios from "axios";
import type { CreateGatewayPaymentInput, GatewayPaymentResult, PaymentGateway, VerifyGatewayPaymentResult } from "./types";

const ZARINPAL_REQUEST_URL = "https://api.zarinpal.com/pg/v4/payment/request.json";
const ZARINPAL_VERIFY_URL = "https://api.zarinpal.com/pg/v4/payment/verify.json";
const ZARINPAL_START_URL = "https://www.zarinpal.com/pg/StartPay";

function getMerchantId(): string {
  const merchantId = process.env.ZARINPAL_MERCHANT_ID?.trim();
  if (!merchantId) throw new Error("ZARINPAL_MERCHANT_ID is not configured");
  return merchantId;
}

function getFixieProxy() {
  const raw = process.env.FIXIE_URL?.trim();
  if (!raw) return undefined;
  const proxy = new URL(raw);
  return {
    protocol: proxy.protocol.replace(":", ""),
    host: proxy.hostname,
    port: Number(proxy.port) || 80,
    auth: proxy.username ? { username: decodeURIComponent(proxy.username), password: decodeURIComponent(proxy.password) } : undefined,
  };
}

async function postJson(url: string, body: Record<string, unknown>) {
  const proxy = getFixieProxy();
  const response = await axios.post(url, body, {
    headers: { "Content-Type": "application/json", "User-Agent": "TusanCN/1.0 ZarinPal" },
    timeout: 15_000,
    ...(proxy ? { proxy } : {}),
    validateStatus: () => true,
  });
  if (response.status < 200 || response.status >= 300) throw new Error(`ZarinPal API HTTP ${response.status}`);
  return (response.data ?? null) as Record<string, any> | null;
}

function toRials(toman: number) {
  if (!Number.isSafeInteger(toman) || toman <= 0) throw new Error("Invalid payment amount");
  return Math.round(toman * 10);
}

export class ZarinPalGateway implements PaymentGateway {
  readonly name = "zarinpal" as const;

  async createPayment(input: CreateGatewayPaymentInput): Promise<GatewayPaymentResult> {
    const data = await postJson(ZARINPAL_REQUEST_URL, {
      merchant_id: getMerchantId(),
      amount: toRials(input.amount),
      description: input.description || `پرداخت سفارش ${input.orderId}`,
      callback_url: input.callbackUrl,
      metadata: input.mobile ? { mobile: input.mobile } : undefined,
    });

    const code = Number(data?.data?.code);
    const authority = data?.data?.authority;
    if (code !== 100 || !authority) {
      const message = data?.errors?.message || data?.data?.message || "درخواست پرداخت از زرین‌پال ایجاد نشد.";
      throw new Error(String(message));
    }

    return { authority: String(authority), paymentUrl: `${ZARINPAL_START_URL}/${encodeURIComponent(String(authority))}` };
  }

  async verifyPayment(authority: string, amount: number): Promise<VerifyGatewayPaymentResult> {
    const data = await postJson(ZARINPAL_VERIFY_URL, {
      merchant_id: getMerchantId(),
      authority,
      amount: toRials(amount),
    });

    const code = Number(data?.data?.code);
    if (code !== 100 && code !== 101) {
      return { success: false, raw: data, message: String(data?.errors?.message || "پرداخت زرین‌پال تأیید نشد.") };
    }

    return {
      success: true,
      transactionId: data?.data?.ref_id != null ? String(data.data.ref_id) : undefined,
      raw: data,
    };
  }
}

export const zarinpalGateway = new ZarinPalGateway();
