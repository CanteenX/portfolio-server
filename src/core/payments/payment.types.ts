export const PAYMENT_PROVIDER_KEYS = ["stripe", "paypal", "razorpay"] as const;

export type PaymentProvider = (typeof PAYMENT_PROVIDER_KEYS)[number];

export type PaymentProviderAvailability = {
  id: PaymentProvider;
  enabled: boolean;
  displayName: string;
};

export type InitiatePaymentPayload = {
  provider: PaymentProvider;
  successUrl?: string;
  cancelUrl?: string;
};

export type InitiatedPaymentSession = {
  provider: PaymentProvider;
  mode: "client_secret" | "redirect_url" | "razorpay_order";
  providerOrderId?: string;
  providerPaymentId?: string;
  clientSecret?: string;
  approvalUrl?: string;
  keyId?: string;
  expiresAt?: string;
  metadata?: Record<string, string>;
};

export type ConfirmPaymentPayload =
  | {
      provider: "stripe";
      providerPaymentId?: string;
      checkoutSessionId?: string;
    }
  | {
      provider: "paypal";
      providerOrderId: string;
    }
  | {
      provider: "razorpay";
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    };

export type ConfirmPaymentResult = {
  provider: PaymentProvider;
  status: "succeeded" | "pending_capture" | "failed" | "refunded";
  providerOrderId?: string;
  providerPaymentId?: string;
  message?: string;
};

export type WebhookPaymentEvent = {
  provider: PaymentProvider;
  eventId: string;
  status: "succeeded" | "failed" | "refunded" | "ignored";
  orderId?: string;
  providerOrderId?: string;
  providerPaymentId?: string;
  message?: string;
};
