import mongoose, { Schema } from "mongoose";
import type { PaymentProvider } from "./payment.types";

type PaymentIdempotencyDocument = {
  key: string;
  provider: PaymentProvider;
  orderId: mongoose.Types.ObjectId;
  requestHash: string;
  responsePayload: Record<string, unknown>;
};

const paymentIdempotencySchema = new Schema<PaymentIdempotencyDocument>(
  {
    key: { type: String, required: true, unique: true, index: true },
    provider: { type: String, enum: ["stripe", "paypal", "razorpay"], required: true },
    orderId: { type: Schema.Types.ObjectId, required: true, ref: "EcommerceOrder" },
    requestHash: { type: String, required: true },
    responsePayload: { type: Schema.Types.Mixed, required: true }
  },
  { timestamps: true }
);

export const PaymentIdempotencyModel =
  mongoose.models.PaymentIdempotency ??
  mongoose.model<PaymentIdempotencyDocument>("PaymentIdempotency", paymentIdempotencySchema);

type PaymentWebhookEventDocument = {
  provider: PaymentProvider;
  eventId: string;
  payloadHash: string;
  processedAt: Date;
};

const paymentWebhookEventSchema = new Schema<PaymentWebhookEventDocument>(
  {
    provider: { type: String, enum: ["stripe", "paypal", "razorpay"], required: true },
    eventId: { type: String, required: true },
    payloadHash: { type: String, required: true },
    processedAt: { type: Date, required: true, default: () => new Date() }
  },
  { timestamps: true }
);

paymentWebhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });

export const PaymentWebhookEventModel =
  mongoose.models.PaymentWebhookEvent ??
  mongoose.model<PaymentWebhookEventDocument>("PaymentWebhookEvent", paymentWebhookEventSchema);
