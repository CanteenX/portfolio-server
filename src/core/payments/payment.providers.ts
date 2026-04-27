import { ERROR_CODES } from "@admin-platform/shared-types";
import * as crc32 from "buffer-crc32";
import crypto from "crypto";
import type { IncomingHttpHeaders } from "http";
import Razorpay from "razorpay";
import Stripe from "stripe";
import { env } from "../../config/env";
import { AppError } from "../errors/app-error";
import type {
  ConfirmPaymentPayload,
  ConfirmPaymentResult,
  InitiatePaymentPayload,
  InitiatedPaymentSession,
  PaymentProvider,
  PaymentProviderAvailability,
  WebhookPaymentEvent
} from "./payment.types";

type OrderSnapshot = {
  _id: { toString(): string };
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  currency: string;
  grandTotalMinor: number;
  payment?: {
    provider?: PaymentProvider;
    providerOrderId?: string;
    providerPaymentId?: string;
  };
};

let stripeClient: Stripe | null = null;
let razorpayClient: Razorpay | null = null;
let paypalTokenCache: { token: string; expiresAtMs: number } | null = null;

function headerValue(headers: IncomingHttpHeaders, name: string): string | undefined {
  const value = headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0];
  return value;
}

function secureEqualHex(expectedHex: string, receivedHex: string): boolean {
  const expected = Buffer.from(expectedHex, "hex");
  const received = Buffer.from(receivedHex, "hex");
  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(expected, received);
}

function ensureProviderConfigured(provider: PaymentProvider): void {
  const providerState = listPaymentProviders().find((item) => item.id === provider);
  if (!providerState?.enabled) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, `${provider} is not configured`);
  }
}

function getStripeClient(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Stripe is not configured");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

function getRazorpayClient(): Razorpay {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Razorpay is not configured");
  }
  if (!razorpayClient) {
    razorpayClient = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET
    });
  }
  return razorpayClient;
}

function getPayPalBaseUrl(): string {
  return env.PAYPAL_MODE === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

async function getPayPalAccessToken(): Promise<string> {
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "PayPal is not configured");
  }

  if (paypalTokenCache && Date.now() < paypalTokenCache.expiresAtMs) {
    return paypalTokenCache.token;
  }

  const basicAuth = Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  if (!response.ok) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Failed to acquire PayPal access token");
  }

  const data = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "PayPal access token is missing");
  }

  paypalTokenCache = {
    token: data.access_token,
    expiresAtMs: Date.now() + ((data.expires_in ?? 300) - 10) * 1000
  };
  return data.access_token;
}

function amountMinorToMajor(amountMinor: number): string {
  return (amountMinor / 100).toFixed(2);
}

function fetchTimeoutOptions(timeoutMs = 15000) {
  return {
    signal: AbortSignal.timeout(timeoutMs)
  };
}

function resolveSafeRedirectUrl(candidateUrl: string | undefined, fallbackUrl: string): string {
  const targetUrl = candidateUrl ?? fallbackUrl;
  const parsed = new URL(targetUrl);
  const allowedOrigins = env.PAYMENT_ALLOWED_REDIRECT_ORIGINS.split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (!allowedOrigins.includes(parsed.origin)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, `Redirect origin is not allowed: ${parsed.origin}`);
  }

  return parsed.toString();
}

export function listPaymentProviders(): PaymentProviderAvailability[] {
  return [
    {
      id: "stripe",
      displayName: "Stripe",
      enabled: Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET)
    },
    {
      id: "paypal",
      displayName: "PayPal",
      enabled: Boolean(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET && env.PAYPAL_WEBHOOK_ID)
    },
    {
      id: "razorpay",
      displayName: "Razorpay",
      enabled: Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET && env.RAZORPAY_WEBHOOK_SECRET)
    }
  ];
}

export async function initiateProviderPayment(
  order: OrderSnapshot,
  payload: InitiatePaymentPayload,
  idempotencyKey: string
): Promise<InitiatedPaymentSession> {
  ensureProviderConfigured(payload.provider);

  if (payload.provider === "stripe") {
    const stripe = getStripeClient();
    const successUrl = resolveSafeRedirectUrl(payload.successUrl, env.PAYMENT_DEFAULT_SUCCESS_URL);
    const cancelUrl = resolveSafeRedirectUrl(payload.cancelUrl, env.PAYMENT_DEFAULT_CANCEL_URL);
    const checkoutSession = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: order.customerEmail,
        client_reference_id: order._id.toString(),
        line_items: [
          {
            price_data: {
              currency: order.currency.toLowerCase(),
              unit_amount: order.grandTotalMinor,
              product_data: {
                name: `Order ${order.orderNumber}`
              }
            },
            quantity: 1
          }
        ],
        payment_intent_data: {
          metadata: {
            orderId: order._id.toString(),
            orderNumber: order.orderNumber,
            customerEmail: order.customerEmail
          }
        },
        metadata: {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber
        }
      },
      { idempotencyKey: `stripe-${idempotencyKey}`.slice(0, 255) }
    );

    if (!checkoutSession.url) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Stripe checkout session URL is missing");
    }

    return {
      provider: "stripe",
      mode: "redirect_url",
      providerOrderId: checkoutSession.id,
      providerPaymentId: typeof checkoutSession.payment_intent === "string" ? checkoutSession.payment_intent : undefined,
      approvalUrl: checkoutSession.url,
      metadata: {
        orderNumber: order.orderNumber
      }
    };
  }

  if (payload.provider === "paypal") {
    const accessToken = await getPayPalAccessToken();
    const successUrl = resolveSafeRedirectUrl(payload.successUrl, env.PAYMENT_DEFAULT_SUCCESS_URL);
    const cancelUrl = resolveSafeRedirectUrl(payload.cancelUrl, env.PAYMENT_DEFAULT_CANCEL_URL);
    const response = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `paypal-${idempotencyKey}`.slice(0, 108)
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: order.currency.toUpperCase(),
              value: amountMinorToMajor(order.grandTotalMinor)
            },
            custom_id: order._id.toString(),
            invoice_id: order.orderNumber
          }
        ],
        application_context: {
          return_url: successUrl,
          cancel_url: cancelUrl,
          user_action: "PAY_NOW"
        }
      }),
      ...fetchTimeoutOptions()
    });

    if (!response.ok) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Failed to create PayPal order");
    }

    const data = (await response.json()) as {
      id?: string;
      links?: Array<{ rel?: string; href?: string }>;
    };
    const approvalUrl = data.links?.find((link) => link.rel === "approve")?.href;
    if (!data.id || !approvalUrl) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "PayPal order response is incomplete");
    }

    return {
      provider: "paypal",
      mode: "redirect_url",
      providerOrderId: data.id,
      approvalUrl,
      metadata: {
        orderNumber: order.orderNumber
      }
    };
  }

  const razorpay = getRazorpayClient();
  const razorpayOrder = await razorpay.orders.create({
    amount: order.grandTotalMinor,
    currency: order.currency.toUpperCase(),
    receipt: order.orderNumber.slice(0, 40),
    notes: {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber
    }
  });

  return {
    provider: "razorpay",
    mode: "razorpay_order",
    providerOrderId: razorpayOrder.id,
    keyId: env.RAZORPAY_KEY_ID ?? undefined,
    metadata: {
      orderNumber: order.orderNumber
    }
  };
}

export async function confirmProviderPayment(
  order: OrderSnapshot,
  payload: ConfirmPaymentPayload
): Promise<ConfirmPaymentResult> {
  ensureProviderConfigured(payload.provider);

  if (payload.provider === "stripe") {
    if (order.payment?.provider && order.payment.provider !== "stripe") {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Order is not linked to Stripe");
    }
    const stripe = getStripeClient();
    const checkoutSessionId = payload.checkoutSessionId ?? order.payment?.providerOrderId;
    if (!checkoutSessionId && !payload.providerPaymentId && !order.payment?.providerPaymentId) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Stripe checkout reference is missing");
    }

    let providerPaymentId = payload.providerPaymentId ?? order.payment?.providerPaymentId;

    if (checkoutSessionId) {
      const checkoutSession = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
        expand: ["payment_intent"]
      });
      if (checkoutSession.client_reference_id !== order._id.toString()) {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Stripe checkout session is not linked to this order");
      }
      if (typeof checkoutSession.payment_intent === "string") {
        providerPaymentId = checkoutSession.payment_intent;
      } else if (checkoutSession.payment_intent?.id) {
        providerPaymentId = checkoutSession.payment_intent.id;
      }
    }

    if (!providerPaymentId) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "providerPaymentId is required for Stripe confirmation");
    }
    const intent = await stripe.paymentIntents.retrieve(providerPaymentId);
    if (intent.metadata.orderId !== order._id.toString()) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Stripe payment does not belong to this order");
    }
    if (intent.amount !== order.grandTotalMinor || intent.currency !== order.currency.toLowerCase()) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Stripe payment amount or currency mismatch");
    }

    if (intent.status === "succeeded") {
      return {
        provider: "stripe",
        status: "succeeded",
        providerPaymentId: intent.id,
        providerOrderId: checkoutSessionId
      };
    }

    if (intent.status === "processing" || intent.status === "requires_capture") {
      return {
        provider: "stripe",
        status: "pending_capture",
        providerPaymentId: intent.id,
        providerOrderId: checkoutSessionId,
        message: "Stripe payment is still processing"
      };
    }

    return {
      provider: "stripe",
      status: "failed",
      providerPaymentId: intent.id,
      providerOrderId: checkoutSessionId,
      message: `Stripe payment status is ${intent.status}`
    };
  }

  if (payload.provider === "paypal") {
    if (order.payment?.provider && order.payment.provider !== "paypal") {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Order is not linked to PayPal");
    }
    if (order.payment?.providerOrderId && order.payment.providerOrderId !== payload.providerOrderId) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "PayPal order id does not match initiated order");
    }

    const accessToken = await getPayPalAccessToken();
    const captureResponse = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders/${payload.providerOrderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      ...fetchTimeoutOptions()
    });

    if (!captureResponse.ok) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Failed to capture PayPal payment");
    }

    const captureData = (await captureResponse.json()) as {
      status?: string;
      purchase_units?: Array<{
        custom_id?: string;
        amount?: { currency_code?: string; value?: string };
        payments?: {
          captures?: Array<{ id?: string; status?: string; amount?: { currency_code?: string; value?: string } }>;
        };
      }>;
    };
    const capture = captureData.purchase_units?.[0]?.payments?.captures?.[0];
    const purchaseUnit = captureData.purchase_units?.[0];
    if (!purchaseUnit?.custom_id) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "PayPal custom_id is missing in capture response");
    }
    if (purchaseUnit.custom_id !== order._id.toString()) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "PayPal payment does not belong to this order");
    }
    const captureCurrency = capture?.amount?.currency_code ?? purchaseUnit?.amount?.currency_code;
    const captureValue = capture?.amount?.value ?? purchaseUnit?.amount?.value;
    if (!captureCurrency || !captureValue) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "PayPal amount or currency is missing in capture response");
    }
    if (
      captureCurrency.toUpperCase() !== order.currency.toUpperCase() ||
      Number.parseInt((Number.parseFloat(captureValue) * 100).toFixed(0), 10) !== order.grandTotalMinor
    ) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "PayPal payment amount or currency mismatch");
    }

    if (capture?.status === "COMPLETED") {
      return {
        provider: "paypal",
        status: "succeeded",
        providerOrderId: payload.providerOrderId,
        providerPaymentId: capture.id
      };
    }

    if (capture?.status === "PENDING" || captureData.status === "PAYER_ACTION_REQUIRED") {
      return {
        provider: "paypal",
        status: "pending_capture",
        providerOrderId: payload.providerOrderId,
        providerPaymentId: capture?.id,
        message: "PayPal payment is pending"
      };
    }

    return {
      provider: "paypal",
      status: "failed",
      providerOrderId: payload.providerOrderId,
      providerPaymentId: capture?.id,
      message: `PayPal capture status is ${capture?.status ?? captureData.status ?? "UNKNOWN"}`
    };
  }

  if (!env.RAZORPAY_KEY_SECRET) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Razorpay is not configured");
  }
  if (order.payment?.provider && order.payment.provider !== "razorpay") {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Order is not linked to Razorpay");
  }
  if (order.payment?.providerOrderId && order.payment.providerOrderId !== payload.razorpayOrderId) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Razorpay order id does not match initiated order");
  }

  const expected = crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(`${payload.razorpayOrderId}|${payload.razorpayPaymentId}`)
    .digest("hex");

  if (!secureEqualHex(expected, payload.razorpaySignature)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid Razorpay signature");
  }

  const razorpay = getRazorpayClient();
  const payment = (await razorpay.payments.fetch(payload.razorpayPaymentId)) as {
    id: string;
    order_id: string;
    status: string;
    amount?: number;
    currency?: string;
    notes?: { orderId?: string };
  };

  if (payment.order_id !== payload.razorpayOrderId) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Razorpay order id mismatch");
  }
  if (payment.notes?.orderId && payment.notes.orderId !== order._id.toString()) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Razorpay payment does not belong to this order");
  }
  if (
    payment.amount !== undefined &&
    payment.currency &&
    (payment.amount !== order.grandTotalMinor || payment.currency.toUpperCase() !== order.currency.toUpperCase())
  ) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Razorpay payment amount or currency mismatch");
  }

  if (payment.status === "captured") {
    return {
      provider: "razorpay",
      status: "succeeded",
      providerOrderId: payment.order_id,
      providerPaymentId: payment.id
    };
  }

  if (payment.status === "authorized") {
    return {
      provider: "razorpay",
      status: "pending_capture",
      providerOrderId: payment.order_id,
      providerPaymentId: payment.id,
      message: "Razorpay payment is authorized but not captured"
    };
  }

  return {
    provider: "razorpay",
    status: "failed",
    providerOrderId: payment.order_id,
    providerPaymentId: payment.id,
    message: `Razorpay payment status is ${payment.status}`
  };
}

export async function validateProviderPaymentForOrder(
  order: OrderSnapshot,
  refs: {
    provider: PaymentProvider;
    providerOrderId?: string;
    providerPaymentId?: string;
  }
): Promise<void> {
  if (refs.provider === "stripe") {
    const providerPaymentId = refs.providerPaymentId ?? order.payment?.providerPaymentId;
    if (!providerPaymentId) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Stripe payment reference is missing");
    }
    const stripe = getStripeClient();
    const intent = await stripe.paymentIntents.retrieve(providerPaymentId);
    if (intent.metadata.orderId !== order._id.toString()) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Stripe payment does not belong to this order");
    }
    if (intent.amount !== order.grandTotalMinor || intent.currency !== order.currency.toLowerCase()) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Stripe payment amount or currency mismatch");
    }
    return;
  }

  if (refs.provider === "paypal") {
    const providerOrderId = refs.providerOrderId ?? order.payment?.providerOrderId;
    if (!providerOrderId) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "PayPal order reference is missing");
    }
    const accessToken = await getPayPalAccessToken();
    const paypalOrderResponse = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders/${providerOrderId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      ...fetchTimeoutOptions()
    });
    if (!paypalOrderResponse.ok) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Failed to verify PayPal order");
    }

    const paypalOrder = (await paypalOrderResponse.json()) as {
      purchase_units?: Array<{ custom_id?: string; amount?: { currency_code?: string; value?: string } }>;
    };
    const purchaseUnit = paypalOrder.purchase_units?.[0];
    const amount = purchaseUnit?.amount;
    if (!purchaseUnit?.custom_id || !amount?.currency_code || !amount.value) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "PayPal verification payload is incomplete");
    }
    if (purchaseUnit.custom_id !== order._id.toString()) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "PayPal payment does not belong to this order");
    }
    if (
      amount.currency_code.toUpperCase() !== order.currency.toUpperCase() ||
      Number.parseInt((Number.parseFloat(amount.value) * 100).toFixed(0), 10) !== order.grandTotalMinor
    ) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "PayPal payment amount or currency mismatch");
    }
    return;
  }

  const providerPaymentId = refs.providerPaymentId ?? order.payment?.providerPaymentId;
  if (!providerPaymentId) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Razorpay payment reference is missing");
  }
  const razorpay = getRazorpayClient();
  const payment = (await razorpay.payments.fetch(providerPaymentId)) as {
    order_id: string;
    amount?: number;
    currency?: string;
    notes?: { orderId?: string };
  };
  if (refs.providerOrderId && payment.order_id !== refs.providerOrderId) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Razorpay order id mismatch");
  }
  if (payment.notes?.orderId && payment.notes.orderId !== order._id.toString()) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Razorpay payment does not belong to this order");
  }
  if (
    payment.amount !== undefined &&
    payment.currency &&
    (payment.amount !== order.grandTotalMinor || payment.currency.toUpperCase() !== order.currency.toUpperCase())
  ) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Razorpay payment amount or currency mismatch");
  }
}

async function verifyPayPalWebhook(rawBody: Buffer, headers: IncomingHttpHeaders): Promise<Record<string, unknown>> {
  if (!env.PAYPAL_WEBHOOK_ID) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "PayPal webhook id is not configured");
  }

  const transmissionId = headerValue(headers, "paypal-transmission-id");
  const transmissionTime = headerValue(headers, "paypal-transmission-time");
  const transmissionSignature = headerValue(headers, "paypal-transmission-sig");
  const authAlgo = headerValue(headers, "paypal-auth-algo");
  const certUrl = headerValue(headers, "paypal-cert-url");

  if (!transmissionId || !transmissionTime || !transmissionSignature || !authAlgo || !certUrl) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Missing PayPal webhook signature headers");
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody.toString("utf-8")) as Record<string, unknown>;
  } catch {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid PayPal webhook payload");
  }
  const accessToken = await getPayPalAccessToken();
  const verifyResponse = await fetch(`${getPayPalBaseUrl()}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      transmission_id: transmissionId,
      transmission_time: transmissionTime,
      cert_url: certUrl,
      auth_algo: authAlgo,
      transmission_sig: transmissionSignature,
      webhook_id: env.PAYPAL_WEBHOOK_ID,
      webhook_event: event
    }),
    ...fetchTimeoutOptions()
  });

  if (!verifyResponse.ok) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "PayPal webhook verification failed");
  }

  const verifyData = (await verifyResponse.json()) as { verification_status?: string };
  if (verifyData.verification_status !== "SUCCESS") {
    throw new AppError(401, ERROR_CODES.UNAUTHORIZED, "Invalid PayPal webhook signature");
  }

  return event;
}

function resolveRazorpayWebhookEventId(rawEvent: Record<string, unknown>, headers: IncomingHttpHeaders): string {
  const fromHeader = headerValue(headers, "x-razorpay-event-id");
  if (fromHeader) return fromHeader;
  const paymentEntity = (rawEvent.payload as { payment?: { entity?: { id?: string } } } | undefined)?.payment?.entity;
  const eventType = typeof rawEvent.event === "string" ? rawEvent.event : "unknown";
  return `${eventType}:${paymentEntity?.id ?? crypto.createHash("sha256").update(JSON.stringify(rawEvent)).digest("hex")}`;
}

export async function verifyAndNormalizeWebhook(
  provider: PaymentProvider,
  rawBody: Buffer,
  headers: IncomingHttpHeaders
): Promise<WebhookPaymentEvent> {
  ensureProviderConfigured(provider);

  if (provider === "stripe") {
    const signature = headerValue(headers, "stripe-signature");
    if (!signature || !env.STRIPE_WEBHOOK_SECRET) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Missing Stripe signature header");
    }

    const stripe = getStripeClient();
    const event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      return {
        provider,
        eventId: event.id,
        status: "succeeded",
        orderId: session.client_reference_id ?? undefined,
        providerOrderId: session.id,
        providerPaymentId: typeof session.payment_intent === "string" ? session.payment_intent : undefined
      };
    }

    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object as Stripe.PaymentIntent;
      return {
        provider,
        eventId: event.id,
        status: "succeeded",
        orderId: intent.metadata.orderId,
        providerPaymentId: intent.id
      };
    }

    if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object as Stripe.PaymentIntent;
      return {
        provider,
        eventId: event.id,
        status: "failed",
        orderId: intent.metadata.orderId,
        providerPaymentId: intent.id
      };
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      return {
        provider,
        eventId: event.id,
        status: "refunded",
        providerPaymentId: typeof charge.payment_intent === "string" ? charge.payment_intent : undefined
      };
    }

    return {
      provider,
      eventId: event.id,
      status: "ignored"
    };
  }

  if (provider === "paypal") {
    const paypalEvent = await verifyPayPalWebhook(rawBody, headers);
    const eventType = paypalEvent.event_type as string | undefined;
    const eventId =
      (paypalEvent.id as string | undefined) ??
      `${headerValue(headers, "paypal-transmission-id") ?? "paypal"}:${headerValue(headers, "paypal-transmission-time") ?? "unknown"}`;
    const resource = (paypalEvent.resource as Record<string, unknown> | undefined) ?? {};
    const relatedIds = (resource.supplementary_data as { related_ids?: Record<string, string> } | undefined)?.related_ids;

    if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
      return {
        provider,
        eventId,
        status: "succeeded",
        orderId: (resource.custom_id as string | undefined) ?? undefined,
        providerOrderId: relatedIds?.order_id,
        providerPaymentId: resource.id as string | undefined
      };
    }

    if (eventType === "PAYMENT.CAPTURE.DENIED" || eventType === "PAYMENT.CAPTURE.DECLINED") {
      return {
        provider,
        eventId,
        status: "failed",
        orderId: (resource.custom_id as string | undefined) ?? undefined,
        providerOrderId: relatedIds?.order_id,
        providerPaymentId: resource.id as string | undefined
      };
    }

    if (eventType === "PAYMENT.CAPTURE.REFUNDED") {
      return {
        provider,
        eventId,
        status: "refunded",
        orderId: (resource.custom_id as string | undefined) ?? undefined,
        providerOrderId: relatedIds?.order_id,
        providerPaymentId: resource.id as string | undefined
      };
    }

    return {
      provider,
      eventId,
      status: "ignored"
    };
  }

  const signature = headerValue(headers, "x-razorpay-signature");
  if (!signature || !env.RAZORPAY_WEBHOOK_SECRET) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Missing Razorpay webhook signature");
  }

  const expected = crypto.createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex");
  if (!secureEqualHex(expected, signature)) {
    throw new AppError(401, ERROR_CODES.UNAUTHORIZED, "Invalid Razorpay webhook signature");
  }

  let razorEvent: Record<string, unknown>;
  try {
    razorEvent = JSON.parse(rawBody.toString("utf-8")) as Record<string, unknown>;
  } catch {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid Razorpay webhook payload");
  }
  const eventType = razorEvent.event as string | undefined;
  const eventId = resolveRazorpayWebhookEventId(razorEvent, headers);
  const paymentEntity = (
    razorEvent.payload as { payment?: { entity?: Record<string, unknown> } } | undefined
  )?.payment?.entity;
  const refundEntity = (
    razorEvent.payload as { refund?: { entity?: Record<string, unknown> } } | undefined
  )?.refund?.entity;

  if (eventType === "payment.captured") {
    return {
      provider,
      eventId,
      status: "succeeded",
      orderId: (paymentEntity?.notes as { orderId?: string } | undefined)?.orderId,
      providerOrderId: paymentEntity?.order_id as string | undefined,
      providerPaymentId: paymentEntity?.id as string | undefined
    };
  }

  if (eventType === "payment.failed") {
    return {
      provider,
      eventId,
      status: "failed",
      orderId: (paymentEntity?.notes as { orderId?: string } | undefined)?.orderId,
      providerOrderId: paymentEntity?.order_id as string | undefined,
      providerPaymentId: paymentEntity?.id as string | undefined
    };
  }

  if (eventType === "refund.processed") {
    return {
      provider,
      eventId,
      status: "refunded",
      providerPaymentId: refundEntity?.payment_id as string | undefined
    };
  }

  return {
    provider,
    eventId,
    status: "ignored"
  };
}

export function hashRawPayload(rawBody: Buffer): string {
  const digest = crypto.createHash("sha256").update(rawBody).digest("hex");
  const crc = crc32.unsigned(rawBody).toString();
  return `${digest}:${crc}`;
}
