import { ERROR_CODES } from "@admin-platform/shared-types";
import { Router } from "express";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { AppError } from "../../core/errors/app-error";
import { moduleGuards } from "../../core/http/module-guards";
import { EcommerceOrderModel, EcommerceProductModel } from "./ecommerce.models";

const router = Router();

const ecommerceWriteRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

const productPayloadSchema = z.object({
  title: z.string().min(1).max(200),
  sku: z.string().min(1).max(80),
  description: z.string().max(4000).optional(),
  priceMinor: z.number().int().min(0),
  currency: z.string().min(3).max(3).default("USD"),
  stock: z.number().int().min(0).default(0),
  status: z.enum(["draft", "active", "archived"]).default("draft")
});

const orderPayloadSchema = z.object({
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  currency: z.string().min(3).max(3).default("USD"),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        qty: z.number().int().min(1)
      })
    )
    .min(1)
    .max(100),
  taxMinor: z.number().int().min(0).default(0),
  shippingMinor: z.number().int().min(0).default(0)
});

const transitionPayloadSchema = z.object({
  to: z.enum(["open", "paid", "shipped", "completed", "cancelled", "refunded"])
});

function ensureValidObjectId(id: string): void {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid id");
  }
}

function assertAllowedTransition(from: string, to: string): void {
  const allowedTransitions: Record<string, string[]> = {
    open: ["paid", "cancelled"],
    paid: ["shipped", "refunded", "cancelled"],
    shipped: ["completed", "refunded"],
    completed: [],
    cancelled: [],
    refunded: []
  };

  const allowed = allowedTransitions[from] ?? [];
  if (!allowed.includes(to)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, `Invalid transition ${from} -> ${to}`);
  }
}

router.get("/api/v1/ecommerce/products", ...moduleGuards("ecommerce", "ecommerce.read"), async (_req, res, next) => {
  try {
    const products = await EcommerceProductModel.find().sort({ createdAt: -1 }).lean().exec();
    res.json({ items: products });
  } catch (error) {
    next(error);
  }
});

router.post("/api/v1/ecommerce/products", ecommerceWriteRateLimiter, ...moduleGuards("ecommerce", "ecommerce.create"), async (req, res, next) => {
  try {
    const payload = productPayloadSchema.parse(req.body ?? {});
    const created = await EcommerceProductModel.create(payload);
    res.status(201).json(created);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid product payload"));
      return;
    }
    next(error);
  }
});

router.patch(
  "/api/v1/ecommerce/products/:id",
  ecommerceWriteRateLimiter,
  ...moduleGuards("ecommerce", "ecommerce.update"),
  async (req, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const payload = productPayloadSchema.partial().parse(req.body ?? {});
      const updated = await EcommerceProductModel.findByIdAndUpdate(req.params.id, payload, {
        new: true,
        runValidators: true
      })
        .lean()
        .exec();
      if (!updated) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Product not found");
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid product update payload"));
        return;
      }
      next(error);
    }
  }
);

router.delete(
  "/api/v1/ecommerce/products/:id",
  ecommerceWriteRateLimiter,
  ...moduleGuards("ecommerce", "ecommerce.delete"),
  async (req, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const deleted = await EcommerceProductModel.findByIdAndDelete(req.params.id).lean().exec();
      if (!deleted) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Product not found");
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

router.get("/api/v1/ecommerce/orders", ...moduleGuards("ecommerce", "ecommerce.read"), async (_req, res, next) => {
  try {
    const orders = await EcommerceOrderModel.find().sort({ createdAt: -1 }).lean().exec();
    res.json({ items: orders });
  } catch (error) {
    next(error);
  }
});

router.post("/api/v1/ecommerce/orders", ecommerceWriteRateLimiter, ...moduleGuards("ecommerce", "ecommerce.create"), async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const payload = orderPayloadSchema.parse(req.body ?? {});
    let createdOrder: unknown = null;

    await session.withTransaction(async () => {
      const lineItems: Array<{
        productId: mongoose.Types.ObjectId;
        title: string;
        sku: string;
        qty: number;
        unitPriceMinor: number;
        lineTotalMinor: number;
      }> = [];

      let subtotalMinor = 0;
      for (const item of payload.items) {
        ensureValidObjectId(item.productId);

        const decrementedProduct = await EcommerceProductModel.findOneAndUpdate(
          { _id: item.productId, stock: { $gte: item.qty } },
          { $inc: { stock: -item.qty } },
          { new: true, session }
        ).exec();

        if (!decrementedProduct) {
          throw new AppError(
            400,
            ERROR_CODES.BAD_REQUEST,
            "Insufficient stock or missing product while creating order"
          );
        }

        const lineTotalMinor = decrementedProduct.priceMinor * item.qty;
        subtotalMinor += lineTotalMinor;
        lineItems.push({
          productId: decrementedProduct._id,
          title: decrementedProduct.title,
          sku: decrementedProduct.sku,
          qty: item.qty,
          unitPriceMinor: decrementedProduct.priceMinor,
          lineTotalMinor
        });
      }

      const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const created = await EcommerceOrderModel.create(
        [
          {
            orderNumber,
            customerName: payload.customerName,
            customerEmail: payload.customerEmail,
            status: "open",
            currency: payload.currency,
            lineItems,
            subtotalMinor,
            taxMinor: payload.taxMinor,
            shippingMinor: payload.shippingMinor,
            grandTotalMinor: subtotalMinor + payload.taxMinor + payload.shippingMinor,
            stockReverted: false,
            payment: {
              status: "none",
              amountMinor: subtotalMinor + payload.taxMinor + payload.shippingMinor,
              currency: payload.currency,
              updatedAt: new Date()
            }
          }
        ],
        { session }
      );
      [createdOrder] = created;
    });

    res.status(201).json(createdOrder);
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid order payload"));
      return;
    }
    next(error);
  } finally {
    await session.endSession();
  }
});

router.post(
  "/api/v1/ecommerce/orders/:id/transition",
  ecommerceWriteRateLimiter,
  ...moduleGuards("ecommerce", "ecommerce.update"),
  async (req, res, next) => {
    const session = await mongoose.startSession();
    try {
      ensureValidObjectId(req.params.id);
      const { to } = transitionPayloadSchema.parse(req.body ?? {});
      let updatedOrder: unknown = null;

      await session.withTransaction(async () => {
        const order = await EcommerceOrderModel.findById(req.params.id).session(session).exec();
        if (!order) {
          throw new AppError(404, ERROR_CODES.NOT_FOUND, "Order not found");
        }

        assertAllowedTransition(order.status, to);

        if ((to === "cancelled" || to === "refunded") && !order.stockReverted) {
          for (const lineItem of order.lineItems) {
            const stockRestoreResult = await EcommerceProductModel.updateOne(
              { _id: lineItem.productId },
              { $inc: { stock: lineItem.qty } },
              { session }
            ).exec();
            if (stockRestoreResult.matchedCount !== 1) {
              throw new AppError(
                404,
                ERROR_CODES.NOT_FOUND,
                "Could not restore stock because linked product was not found"
              );
            }
          }
          order.stockReverted = true;
        }

        order.status = to;
        await order.save({ session });
        updatedOrder = order.toObject();
      });

      res.json(updatedOrder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid transition payload"));
        return;
      }
      next(error);
    } finally {
      await session.endSession();
    }
  }
);

router.get("/api/v1/ecommerce/insights", ...moduleGuards("ecommerce", "ecommerce.read"), async (_req, res, next) => {
  try {
    const [productCount, orderCount, paidOrders] = await Promise.all([
      EcommerceProductModel.countDocuments().exec(),
      EcommerceOrderModel.countDocuments().exec(),
      EcommerceOrderModel.countDocuments({ status: "paid" }).exec()
    ]);

    res.json({
      counts: {
        products: productCount,
        orders: orderCount,
        paidOrders
      }
    });
  } catch (error) {
    next(error);
  }
});

export const ecommerceRoutes = router;
