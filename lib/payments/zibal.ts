import axios from "axios";
import type { CreateGatewayPaymentInput, GatewayPaymentResult, PaymentGateway, VerifyGatewayPaymentResult } from "./types";

const ZIBAL_REQUEST_URL = "https://gateway.zibal.ir/v1/request";
const ZIBAL_START_URL = "https://gateway.zibal.ir/start";
const ZIBAL_VERIFY_URL = "https://gateway.zibal.ir/v1/verify";

function getMerchant(): string {
  const merchant = process.env.ZIBAL_MERCHANT;
  if (!merchant) throw new Error("ZIBAL_MERCHANT is not configured");
  return merchant;
}

function getFixieProxy() {
  const raw = process.env.FIXIE_URL?.trim();
  if (!raw) return undefined;

  const proxy = new URL(raw);
  return {
    protocol: proxy.protocol.replace(":", ""),
    host: proxy.hostname,
    port: Number(proxy.port) || 80,
    auth: proxy.username
      ? {
          username: decodeURIComponent(proxy.username),
          password: decodeURIComponent(proxy.password),
        }
      : undefined,
  };
}

async function postJson(
  url: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const proxy = getFixieProxy();
  const response = await axios.post(url, body, {
    headers: { "Content-Type": "application/json" },
    timeout: 15_000,
    ...(proxy ? { proxy } : {}),
    validateStatus: () => true,
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Zibal API HTTP ${response.status}`);
  }

  return (response.data ?? null) as Record<string, unknown> | null;
}

export class ZibalGateway implements PaymentGateway {
  readonly name = "zibal" as const;

  async createPayment(input: CreateGatewayPaymentInput): Promise<GatewayPaymentResult> {
    const data = await postJson(ZIBAL_REQUEST_URL, {
      merchant: getMerchant(),
      amount: Math.round(input.amount),
      callbackUrl: input.callbackUrl,
      orderId: input.orderId,
      description: input.description,
      mobile: input.mobile,
    });

    const trackId = data?.trackId;
    if (!trackId || Number(data?.result) !== 100) {
      throw new Error(
        typeof data?.message === "string"
          ? data.message
          : "درخواست پرداخت از زیبال ایجاد نشد.",
      );
    }

    return {
      authority: String(trackId),
      paymentUrl: `${ZIBAL_START_URL}/${encodeURIComponent(String(trackId))}`,
    };
  }

  async verifyPayment(
    authority: string,
    amount: number,
  ): Promise<VerifyGatewayPaymentResult> {
    const data = await postJson(ZIBAL_VERIFY_URL, {
      merchant: getMerchant(),
      trackId: authority,
    });

    if (Number(data?.result) !== 100) {
      return {
        success: false,
        raw: data,
        message:
          typeof data?.message === "string"
            ? data.message
            : "پرداخت زیبال تأیید نشد.",
      };
    }

    if (data?.amount != null && Number(data.amount) !== Math.round(amount)) {
      return {
        success: false,
        raw: data,
        message: "مبلغ پرداخت‌شده با مبلغ سفارش مطابقت ندارد.",
      };
    }

    return {
      success: true,
      transactionId:
        data?.refNumber != null ? String(data.refNumber) : undefined,
      raw: data,
    };
  }
}

export const zibalGateway = new ZibalGateway();
