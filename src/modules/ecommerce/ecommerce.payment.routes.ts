import { ERROR_CODES } from "@admin-platform/shared-types";
import express, { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { AppError } from "../../core/errors/app-error";
import { moduleGuards } from "../../core/http/module-guards";
import { PAYMENT_PROVIDER_KEYS } from "../../core/payments/payment.types";
import {
  confirmOrderPayment,
  getPaymentProviderAvailability,
  initiateOrderPayment,
  processPaymentWebhook
} from "./ecommerce.payment.service";

const paymentRoutes = Router();
const paymentWebhookRoutes = Router();
const paymentWebhookRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 180,
  standardHeaders: true,
  legacyHeaders: false
});

const initiateSchema = z.object({
  provider: z.enum(PAYMENT_PROVIDER_KEYS),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional()
});

const confirmSchema = z.discriminatedUnion("provider", [
  z.object({
    provider: z.literal("stripe"),
    providerPaymentId: z.string().min(1).max(256).optional(),
    checkoutSessionId: z.string().min(1).max(256).optional()
  }),
  z.object({
    provider: z.literal("paypal"),
    providerOrderId: z.string().min(1).max(256)
  }),
  z.object({
    provider: z.literal("razorpay"),
    razorpayOrderId: z.string().min(1).max(256),
    razorpayPaymentId: z.string().min(1).max(256),
    razorpaySignature: z.string().min(1).max(512)
  })
]);

const providerParamSchema = z.object({
  provider: z.enum(PAYMENT_PROVIDER_KEYS)
});

paymentRoutes.get(
  "/api/v1/ecommerce/payments/providers",
  ...moduleGuards("ecommerce", "ecommerce.read"),
  (_req, res) => {
    res.json({
      providers: getPaymentProviderAvailability()
    });
  }
);

paymentRoutes.post(
  "/api/v1/ecommerce/orders/:id/payments/initiate",
  ...moduleGuards("ecommerce", "ecommerce.update"),
  async (req, res, next) => {
    try {
      const payload = initiateSchema.parse(req.body ?? {});
      const idempotencyKey = req.header("Idempotency-Key");
      if (!idempotencyKey) {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Idempotency-Key header is required");
      }

      const session = await initiateOrderPayment(req.params.id, payload, idempotencyKey);
      res.json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid payment initiate payload"));
        return;
      }
      next(error);
    }
  }
);

paymentRoutes.post(
  "/api/v1/ecommerce/orders/:id/payments/confirm",
  ...moduleGuards("ecommerce", "ecommerce.update"),
  async (req, res, next) => {
    try {
      const payload = confirmSchema.parse(req.body ?? {});
      const data = await confirmOrderPayment(req.params.id, payload);
      res.json(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid payment confirm payload"));
        return;
      }
      next(error);
    }
  }
);

paymentWebhookRoutes.post(
  "/api/v1/payments/webhooks/:provider",
  paymentWebhookRateLimiter,
  express.raw({ type: "application/json", limit: "1mb" }),
  async (req, res, next) => {
    try {
      const parsedParams = providerParamSchema.parse(req.params);
      const rawBody = Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(typeof req.body === "string" ? req.body : "");
      const result = await processPaymentWebhook(parsedParams.provider, rawBody, req.headers);
      res.status(200).json({
        received: true,
        processed: result.processed,
        eventId: result.eventId
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid payment webhook provider"));
        return;
      }
      next(error);
    }
  }
);

export { paymentRoutes, paymentWebhookRoutes };
