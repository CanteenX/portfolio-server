import { ERROR_CODES } from "@admin-platform/shared-types";
import crypto from "crypto";
import type { IncomingHttpHeaders } from "http";
import mongoose, { type HydratedDocument } from "mongoose";
import { AppError } from "../../core/errors/app-error";
import { PaymentIdempotencyModel, PaymentWebhookEventModel } from "../../core/payments/payment.models";
import {
  confirmProviderPayment,
  hashRawPayload,
  initiateProviderPayment,
  listPaymentProviders,
  validateProviderPaymentForOrder,
  verifyAndNormalizeWebhook
} from "../../core/payments/payment.providers";
import type {
  ConfirmPaymentPayload,
  ConfirmPaymentResult,
  InitiatePaymentPayload,
  InitiatedPaymentSession,
  PaymentProvider,
  PaymentProviderAvailability
} from "../../core/payments/payment.types";
import { EcommerceOrderModel, type EcommerceOrderDocument } from "./ecommerce.models";

function ensureValidObjectId(id: string): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid id");
  }
}

function buildInitiationRequestHash(orderId: string, payload: InitiatePaymentPayload): string {
  return crypto.createHash("sha256").update(JSON.stringify({ orderId, payload })).digest("hex");
}

function applyPaymentResultToOrder(
  order: HydratedDocument<EcommerceOrderDocument>,
  result: ConfirmPaymentResult,
  metadata?: { idempotencyKey?: string; eventId?: string }
): void {
  order.payment = {
    ...order.payment,
    provider: result.provider,
    status: result.status,
    amountMinor: order.grandTotalMinor,
    currency: order.currency,
    providerOrderId: result.providerOrderId ?? order.payment?.providerOrderId,
    providerPaymentId: result.providerPaymentId ?? order.payment?.providerPaymentId,
    idempotencyKey: metadata?.idempotencyKey ?? order.payment?.idempotencyKey,
    lastEventId: metadata?.eventId ?? order.payment?.lastEventId,
    failureCode: result.status === "failed" ? "PAYMENT_FAILED" : undefined,
    failureMessage: result.status === "failed" ? result.message : undefined,
    succeededAt: result.status === "succeeded" ? new Date() : order.payment?.succeededAt,
    updatedAt: new Date()
  };

  if (result.status === "succeeded" && order.status === "open") {
    order.status = "paid";
  }

  if (result.status === "refunded" && ["paid", "shipped", "completed"].includes(order.status)) {
    order.status = "refunded";
  }
}

export function getPaymentProviderAvailability(): PaymentProviderAvailability[] {
  return listPaymentProviders();
}

export async function initiateOrderPayment(
  orderId: string,
  payload: InitiatePaymentPayload,
  idempotencyKey: string
): Promise<InitiatedPaymentSession> {
  ensureValidObjectId(orderId);
  if (!idempotencyKey || idempotencyKey.length < 8) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Idempotency-Key header is required");
  }

  const requestHash = buildInitiationRequestHash(orderId, payload);
  const previousRequest = (await PaymentIdempotencyModel.findOne({ key: idempotencyKey }).lean().exec()) as
    | {
        requestHash: string;
        orderId: mongoose.Types.ObjectId;
        provider: string;
        responsePayload: Record<string, unknown>;
      }
    | null;
  if (previousRequest) {
    if (
      previousRequest.requestHash !== requestHash ||
      previousRequest.orderId.toString() !== orderId ||
      previousRequest.provider !== payload.provider
    ) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Idempotency-Key already used for a different request");
    }
    return previousRequest.responsePayload as InitiatedPaymentSession;
  }

  const order = await EcommerceOrderModel.findById(orderId).exec();
  if (!order) {
    throw new AppError(404, ERROR_CODES.NOT_FOUND, "Order not found");
  }

  if (order.status !== "open") {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Only open orders can initiate payment");
  }

  const initiatedSession = await initiateProviderPayment(order, payload, idempotencyKey);
  order.payment = {
    provider: payload.provider,
    status: initiatedSession.mode === "redirect_url" ? "pending_capture" : "initiated",
    amountMinor: order.grandTotalMinor,
    currency: order.currency,
    providerOrderId: initiatedSession.providerOrderId,
    providerPaymentId: initiatedSession.providerPaymentId,
    idempotencyKey,
    updatedAt: new Date()
  };
  await order.save();

  await PaymentIdempotencyModel.create({
    key: idempotencyKey,
    provider: payload.provider,
    orderId: order._id,
    requestHash,
    responsePayload: initiatedSession
  });

  return initiatedSession;
}

export async function confirmOrderPayment(orderId: string, payload: ConfirmPaymentPayload) {
  ensureValidObjectId(orderId);
  const order = await EcommerceOrderModel.findById(orderId).exec();
  if (!order) {
    throw new AppError(404, ERROR_CODES.NOT_FOUND, "Order not found");
  }

  const result = await confirmProviderPayment(order, payload);
  applyPaymentResultToOrder(order, result);
  await order.save();

  return {
    result,
    order
  };
}

async function saveWebhookEventIfNew(provider: PaymentProvider, eventId: string, payloadHash: string): Promise<boolean> {
  try {
    await PaymentWebhookEventModel.create({
      provider,
      eventId,
      payloadHash,
      processedAt: new Date()
    });
    return true;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      return false;
    }
    throw error;
  }
}

export async function processPaymentWebhook(
  provider: PaymentProvider,
  rawBody: Buffer,
  headers: IncomingHttpHeaders
): Promise<{ processed: boolean; eventId: string }> {
  const normalizedEvent = await verifyAndNormalizeWebhook(provider, rawBody, headers);
  const payloadHash = hashRawPayload(rawBody);
  const shouldProcess = await saveWebhookEventIfNew(provider, normalizedEvent.eventId, payloadHash);
  if (!shouldProcess) {
    return {
      processed: false,
      eventId: normalizedEvent.eventId
    };
  }

  if (normalizedEvent.status === "ignored") {
    return {
      processed: true,
      eventId: normalizedEvent.eventId
    };
  }

  let order =
    normalizedEvent.orderId && mongoose.Types.ObjectId.isValid(normalizedEvent.orderId)
      ? await EcommerceOrderModel.findById(normalizedEvent.orderId).exec()
      : null;

  if (!order && normalizedEvent.providerOrderId) {
    order = await EcommerceOrderModel.findOne({ "payment.providerOrderId": normalizedEvent.providerOrderId }).exec();
  }

  if (!order && normalizedEvent.providerPaymentId) {
    order = await EcommerceOrderModel.findOne({
      "payment.providerPaymentId": normalizedEvent.providerPaymentId
    }).exec();
  }

  if (!order) {
    return {
      processed: true,
      eventId: normalizedEvent.eventId
    };
  }

  if (normalizedEvent.status === "succeeded") {
    if (order.status !== "open" && !(order.status === "paid" && order.payment?.status === "succeeded")) {
      return {
        processed: true,
        eventId: normalizedEvent.eventId
      };
    }
    await validateProviderPaymentForOrder(order, {
      provider,
      providerOrderId: normalizedEvent.providerOrderId,
      providerPaymentId: normalizedEvent.providerPaymentId
    });
    applyPaymentResultToOrder(
      order,
      {
        provider,
        status: "succeeded",
        providerOrderId: normalizedEvent.providerOrderId,
        providerPaymentId: normalizedEvent.providerPaymentId
      },
      { eventId: normalizedEvent.eventId }
    );
  } else if (normalizedEvent.status === "failed") {
    if (order.status !== "open" || order.payment?.status === "succeeded" || order.payment?.status === "refunded") {
      return {
        processed: true,
        eventId: normalizedEvent.eventId
      };
    }
    applyPaymentResultToOrder(
      order,
      {
        provider,
        status: "failed",
        providerOrderId: normalizedEvent.providerOrderId,
        providerPaymentId: normalizedEvent.providerPaymentId,
        message: normalizedEvent.message
      },
      { eventId: normalizedEvent.eventId }
    );
  } else if (normalizedEvent.status === "refunded") {
    if (!["paid", "shipped", "completed", "refunded"].includes(order.status)) {
      return {
        processed: true,
        eventId: normalizedEvent.eventId
      };
    }
    applyPaymentResultToOrder(
      order,
      {
        provider,
        status: "refunded",
        providerOrderId: normalizedEvent.providerOrderId,
        providerPaymentId: normalizedEvent.providerPaymentId
      },
      { eventId: normalizedEvent.eventId }
    );
  }

  await order.save();
  return {
    processed: true,
    eventId: normalizedEvent.eventId
  };
}
