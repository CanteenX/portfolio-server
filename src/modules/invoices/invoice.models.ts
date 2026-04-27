import mongoose, { Schema } from "mongoose";

export type InvoiceLineItem = {
  description: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
};

const invoiceLineItemSchema = new Schema<InvoiceLineItem>(
  {
    description: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPriceMinor: { type: Number, required: true, min: 0 },
    lineTotalMinor: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

export type InvoiceDocumentModel = {
  invoiceNumber: string;
  status:
    | "draft"
    | "issued"
    | "sent"
    | "partially_paid"
    | "overdue"
    | "paid"
    | "void"
    | "uncollectible";
  contactId?: mongoose.Types.ObjectId;
  dealId?: mongoose.Types.ObjectId;
  orderId?: mongoose.Types.ObjectId;
  currency: string;
  lineItems: InvoiceLineItem[];
  subtotalMinor: number;
  taxMinor: number;
  discountMinor: number;
  grandTotalMinor: number;
  amountPaidMinor: number;
  dueAt?: Date;
  issuedAt?: Date;
  sentAt?: Date;
  paidAt?: Date;
  voidedAt?: Date;
  notes?: string;
};

const invoiceSchema = new Schema<InvoiceDocumentModel>(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ["draft", "issued", "sent", "partially_paid", "overdue", "paid", "void", "uncollectible"],
      default: "draft"
    },
    contactId: { type: Schema.Types.ObjectId, ref: "CrmContact" },
    dealId: { type: Schema.Types.ObjectId, ref: "CrmDeal" },
    orderId: { type: Schema.Types.ObjectId, ref: "EcommerceOrder" },
    currency: { type: String, required: true, default: "USD" },
    lineItems: { type: [invoiceLineItemSchema], required: true, default: [] },
    subtotalMinor: { type: Number, required: true, min: 0, default: 0 },
    taxMinor: { type: Number, required: true, min: 0, default: 0 },
    discountMinor: { type: Number, required: true, min: 0, default: 0 },
    grandTotalMinor: { type: Number, required: true, min: 0, default: 0 },
    amountPaidMinor: { type: Number, required: true, min: 0, default: 0 },
    dueAt: { type: Date },
    issuedAt: { type: Date },
    sentAt: { type: Date },
    paidAt: { type: Date },
    voidedAt: { type: Date },
    notes: { type: String, default: "" }
  },
  { timestamps: true }
);

invoiceSchema.index({ status: 1, dueAt: 1 });

export const InvoiceDocumentModelRef =
  mongoose.models.InvoiceDocument ??
  mongoose.model<InvoiceDocumentModel>("InvoiceDocument", invoiceSchema);
