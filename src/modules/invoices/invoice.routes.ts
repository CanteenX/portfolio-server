import { ERROR_CODES } from "@admin-platform/shared-types";
import { Router } from "express";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { AppError } from "../../core/errors/app-error";
import { moduleGuards } from "../../core/http/module-guards";
import { CrmContactModel, CrmDealModel } from "../crm/crm.models";
import { EcommerceOrderModel } from "../ecommerce/ecommerce.models";
import { InvoiceDocumentModelRef, type InvoiceLineItem } from "./invoice.models";

const router = Router();

const invoiceWriteRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

const invoiceLineSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().int().min(1),
  unitPriceMinor: z.number().int().min(0)
});

const invoicePayloadSchema = z.object({
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  orderId: z.string().optional(),
  currency: z.string().min(3).max(3).default("USD"),
  lineItems: z.array(invoiceLineSchema).min(1).max(100),
  taxMinor: z.number().int().min(0).default(0),
  discountMinor: z.number().int().min(0).default(0),
  amountPaidMinor: z.number().int().min(0).default(0),
  dueAt: z.string().datetime().optional(),
  notes: z.string().optional()
});

const transitionPayloadSchema = z.object({
  to: z.enum(["draft", "issued", "sent", "partially_paid", "overdue", "paid", "void", "uncollectible"]),
  amountPaidMinor: z.number().int().min(0).optional()
});

function ensureValidObjectId(id: string): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid id");
  }
}

function assertInvoiceTransition(from: string, to: string): void {
  const map: Record<string, string[]> = {
    draft: ["issued", "void"],
    issued: ["sent", "void"],
    sent: ["partially_paid", "paid", "overdue"],
    partially_paid: ["paid", "overdue"],
    overdue: ["partially_paid", "paid", "uncollectible"],
    paid: [],
    void: [],
    uncollectible: []
  };
  if (!(map[from] ?? []).includes(to)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, `Invalid transition ${from} -> ${to}`);
  }
}

function buildTotals(payload: z.infer<typeof invoicePayloadSchema>) {
  const subtotalMinor = payload.lineItems.reduce(
    (total, lineItem) => total + lineItem.quantity * lineItem.unitPriceMinor,
    0
  );
  const grandTotalMinor = Math.max(0, subtotalMinor + payload.taxMinor - payload.discountMinor);
  return { subtotalMinor, grandTotalMinor };
}

router.get("/api/v1/invoices/documents", ...moduleGuards("invoices", "invoices.read"), async (_req, res, next) => {
  try {
    const items = await InvoiceDocumentModelRef.find().sort({ createdAt: -1 }).lean().exec();
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

router.post("/api/v1/invoices/documents", invoiceWriteRateLimiter, ...moduleGuards("invoices", "invoices.create"), async (req, res, next) => {
  try {
    const payload = invoicePayloadSchema.parse(req.body ?? {});
    if (payload.contactId) ensureValidObjectId(payload.contactId);
    if (payload.dealId) ensureValidObjectId(payload.dealId);
    if (payload.orderId) ensureValidObjectId(payload.orderId);
    if (payload.contactId) {
      const contact = await CrmContactModel.findById(payload.contactId).exec();
      if (!contact) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Contact not found");
      }
    }
    if (payload.dealId) {
      const deal = await CrmDealModel.findById(payload.dealId).exec();
      if (!deal) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Deal not found");
      }
    }
    if (payload.orderId) {
      const order = await EcommerceOrderModel.findById(payload.orderId).exec();
      if (!order) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Order not found");
      }
    }

    const lineItems = payload.lineItems.map((lineItem) => ({
      ...lineItem,
      lineTotalMinor: lineItem.quantity * lineItem.unitPriceMinor
    }));

    const { subtotalMinor, grandTotalMinor } = buildTotals(payload);
    if (payload.amountPaidMinor > grandTotalMinor) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "amountPaidMinor cannot exceed invoice grand total");
    }
    const created = await InvoiceDocumentModelRef.create({
      invoiceNumber: `INV-${Date.now()}`,
      status: "draft",
      contactId: payload.contactId ? new mongoose.Types.ObjectId(payload.contactId) : undefined,
      dealId: payload.dealId ? new mongoose.Types.ObjectId(payload.dealId) : undefined,
      orderId: payload.orderId ? new mongoose.Types.ObjectId(payload.orderId) : undefined,
      currency: payload.currency,
      lineItems,
      subtotalMinor,
      taxMinor: payload.taxMinor,
      discountMinor: payload.discountMinor,
      grandTotalMinor,
      amountPaidMinor: payload.amountPaidMinor,
      dueAt: payload.dueAt ? new Date(payload.dueAt) : undefined,
      notes: payload.notes ?? ""
    });

    res.status(201).json(created);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid invoice payload"));
      return;
    }
    next(error);
  }
});

router.patch(
  "/api/v1/invoices/documents/:id",
  invoiceWriteRateLimiter,
  ...moduleGuards("invoices", "invoices.update"),
  async (req, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const payload = invoicePayloadSchema.partial().parse(req.body ?? {});
      const existing = await InvoiceDocumentModelRef.findById(req.params.id).exec();
      if (!existing) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Invoice not found");
      }
      if (existing.status !== "draft") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Only draft invoices can be edited");
      }
      if (payload.contactId) {
        ensureValidObjectId(payload.contactId);
        const contact = await CrmContactModel.findById(payload.contactId).exec();
        if (!contact) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Contact not found");
      }
      if (payload.dealId) {
        ensureValidObjectId(payload.dealId);
        const deal = await CrmDealModel.findById(payload.dealId).exec();
        if (!deal) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Deal not found");
      }
      if (payload.orderId) {
        ensureValidObjectId(payload.orderId);
        const order = await EcommerceOrderModel.findById(payload.orderId).exec();
        if (!order) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Order not found");
      }

      const effectivePayload = {
        lineItems: payload.lineItems
          ? payload.lineItems.map((lineItem) => ({
              ...lineItem,
              lineTotalMinor: lineItem.quantity * lineItem.unitPriceMinor
            }))
          : existing.lineItems,
        taxMinor: payload.taxMinor ?? existing.taxMinor,
        discountMinor: payload.discountMinor ?? existing.discountMinor
      };

      const subtotalMinor = effectivePayload.lineItems.reduce(
        (total: number, lineItem: InvoiceLineItem) => total + lineItem.lineTotalMinor,
        0
      );
      const grandTotalMinor = Math.max(
        0,
        subtotalMinor + effectivePayload.taxMinor - effectivePayload.discountMinor
      );

      const updated = await InvoiceDocumentModelRef.findByIdAndUpdate(
        req.params.id,
        {
          ...payload,
          contactId: payload.contactId ? new mongoose.Types.ObjectId(payload.contactId) : payload.contactId,
          dealId: payload.dealId ? new mongoose.Types.ObjectId(payload.dealId) : payload.dealId,
          orderId: payload.orderId ? new mongoose.Types.ObjectId(payload.orderId) : payload.orderId,
          lineItems: effectivePayload.lineItems,
          subtotalMinor,
          grandTotalMinor,
          dueAt: payload.dueAt ? new Date(payload.dueAt) : payload.dueAt
        },
        { new: true, runValidators: true }
      )
        .lean()
        .exec();
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid invoice update payload"));
        return;
      }
      next(error);
    }
  }
);

router.post(
  "/api/v1/invoices/documents/:id/transition",
  invoiceWriteRateLimiter,
  ...moduleGuards("invoices", "invoices.update"),
  async (req, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const payload = transitionPayloadSchema.parse(req.body ?? {});
      const invoice = await InvoiceDocumentModelRef.findById(req.params.id).exec();
      if (!invoice) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Invoice not found");
      }

      assertInvoiceTransition(invoice.status, payload.to);

      if (payload.amountPaidMinor !== undefined) {
        if (payload.amountPaidMinor < invoice.amountPaidMinor) {
          throw new AppError(400, ERROR_CODES.BAD_REQUEST, "amountPaidMinor cannot decrease");
        }
        invoice.amountPaidMinor = payload.amountPaidMinor;
      }

      if (payload.to === "partially_paid") {
        if (
          payload.amountPaidMinor === undefined ||
          payload.amountPaidMinor <= 0 ||
          payload.amountPaidMinor >= invoice.grandTotalMinor
        ) {
          throw new AppError(
            400,
            ERROR_CODES.BAD_REQUEST,
            "partially_paid requires amountPaidMinor between 1 and invoice grand total - 1"
          );
        }
      }

      if (payload.to === "issued" && !invoice.issuedAt) {
        invoice.issuedAt = new Date();
      }
      if (payload.to === "sent" && !invoice.sentAt) {
        invoice.sentAt = new Date();
      }
      if (payload.to === "paid") {
        if (invoice.amountPaidMinor < invoice.grandTotalMinor) {
          throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invoice must be fully paid to mark as paid");
        }
        invoice.paidAt = new Date();
      }
      if (payload.to === "void") {
        invoice.voidedAt = new Date();
      }

      invoice.status = payload.to;
      await invoice.save();
      res.json(invoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid transition payload"));
        return;
      }
      next(error);
    }
  }
);

router.get("/api/v1/invoices/insights", ...moduleGuards("invoices", "invoices.read"), async (_req, res, next) => {
  try {
    const [draft, sent, paid, overdue] = await Promise.all([
      InvoiceDocumentModelRef.countDocuments({ status: "draft" }).exec(),
      InvoiceDocumentModelRef.countDocuments({ status: "sent" }).exec(),
      InvoiceDocumentModelRef.countDocuments({ status: "paid" }).exec(),
      InvoiceDocumentModelRef.countDocuments({ status: "overdue" }).exec()
    ]);
    res.json({
      counts: { draft, sent, paid, overdue }
    });
  } catch (error) {
    next(error);
  }
});

export const invoiceRoutes = router;
