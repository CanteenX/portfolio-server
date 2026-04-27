import mongoose, { Schema } from "mongoose";

export type EcommerceProductDocument = {
  title: string;
  sku: string;
  description?: string;
  priceMinor: number;
  currency: string;
  stock: number;
  status: "draft" | "active" | "archived";
};

const ecommerceProductSchema = new Schema<EcommerceProductDocument>(
  {
    title: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: "" },
    priceMinor: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: "USD" },
    stock: { type: Number, required: true, min: 0, default: 0 },
    status: { type: String, enum: ["draft", "active", "archived"], default: "draft" }
  },
  { timestamps: true }
);

export const EcommerceProductModel =
  mongoose.models.EcommerceProduct ??
  mongoose.model<EcommerceProductDocument>("EcommerceProduct", ecommerceProductSchema);

export type EcommerceOrderLine = {
  productId: mongoose.Types.ObjectId;
  title: string;
  sku: string;
  qty: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
};

export type EcommerceOrderDocument = {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: "open" | "paid" | "shipped" | "completed" | "cancelled" | "refunded";
  currency: string;
  lineItems: EcommerceOrderLine[];
  subtotalMinor: number;
  taxMinor: number;
  shippingMinor: number;
  grandTotalMinor: number;
  stockReverted: boolean;
  payment: {
    provider?: "stripe" | "paypal" | "razorpay";
    status: "none" | "initiated" | "pending_capture" | "succeeded" | "failed" | "refunded";
    amountMinor: number;
    currency: string;
    providerOrderId?: string;
    providerPaymentId?: string;
    idempotencyKey?: string;
    lastEventId?: string;
    failureCode?: string;
    failureMessage?: string;
    succeededAt?: Date;
    updatedAt?: Date;
  };
};

const ecommerceOrderLineSchema = new Schema<EcommerceOrderLine>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "EcommerceProduct", required: true },
    title: { type: String, required: true },
    sku: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    unitPriceMinor: { type: Number, required: true, min: 0 },
    lineTotalMinor: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const ecommerceOrderSchema = new Schema<EcommerceOrderDocument>(
  {
    orderNumber: { type: String, required: true, unique: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true, lowercase: true },
    status: {
      type: String,
      enum: ["open", "paid", "shipped", "completed", "cancelled", "refunded"],
      default: "open"
    },
    currency: { type: String, required: true, default: "USD" },
    lineItems: { type: [ecommerceOrderLineSchema], required: true, default: [] },
    subtotalMinor: { type: Number, required: true, min: 0, default: 0 },
    taxMinor: { type: Number, required: true, min: 0, default: 0 },
    shippingMinor: { type: Number, required: true, min: 0, default: 0 },
    grandTotalMinor: { type: Number, required: true, min: 0, default: 0 },
    stockReverted: { type: Boolean, default: false },
    payment: {
      provider: { type: String, enum: ["stripe", "paypal", "razorpay"] },
      status: {
        type: String,
        enum: ["none", "initiated", "pending_capture", "succeeded", "failed", "refunded"],
        default: "none"
      },
      amountMinor: { type: Number, required: true, min: 0, default: 0 },
      currency: { type: String, required: true, default: "USD" },
      providerOrderId: { type: String },
      providerPaymentId: { type: String },
      idempotencyKey: { type: String },
      lastEventId: { type: String },
      failureCode: { type: String },
      failureMessage: { type: String },
      succeededAt: { type: Date },
      updatedAt: { type: Date }
    }
  },
  { timestamps: true }
);

ecommerceOrderSchema.index({ status: 1, createdAt: -1 });
ecommerceOrderSchema.index({ "payment.providerOrderId": 1 });
ecommerceOrderSchema.index({ "payment.providerPaymentId": 1 });

export const EcommerceOrderModel =
  mongoose.models.EcommerceOrder ??
  mongoose.model<EcommerceOrderDocument>("EcommerceOrder", ecommerceOrderSchema);
