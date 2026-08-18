export type PaymentMethod = "online" | "card_to_card";
export type PaymentGatewayName = "zibal" | "zarinpal" | "manual";

export type PaymentStatus =
  | "pending"
  | "redirected"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded"
  | "awaiting_manual_verification"
  | "rejected";

export interface CreateGatewayPaymentInput {
  paymentId: string;
  orderId: string;
  amount: number;
  callbackUrl: string;
  description?: string;
  mobile?: string;
}

export interface GatewayPaymentResult {
  authority: string;
  paymentUrl: string;
}

export interface VerifyGatewayPaymentResult {
  success: boolean;
  transactionId?: string;
  raw?: unknown;
  message?: string;
}

export interface PaymentGateway {
  readonly name: PaymentGatewayName;
  createPayment(input: CreateGatewayPaymentInput): Promise<GatewayPaymentResult>;
  verifyPayment(authority: string, amount: number): Promise<VerifyGatewayPaymentResult>;
}
