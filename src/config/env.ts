import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(7002),
  MONGO_URI: z.string().min(1),
  JWT_SECRET_SUPER_ADMIN: z.string().min(8),
  JWT_SECRET_ADMIN: z.string().min(8),
  JWT_EXPIRES_IN: z.string().default("1d"),
  CLIENT_CODE: z.string().default("default-client"),
  CORS_ORIGINS: z.string().default("http://localhost:3000,http://localhost:3001,http://localhost:5173"),
  TRUST_PROXY: z.string().default("0"),
  ENABLE_SEED: z.enum(["true", "false"]).default("false"),
  SUPER_ADMIN_SEED_PASSWORD: z.string().min(8).optional(),
  ADMIN_SEED_PASSWORD: z.string().min(8).optional(),
  API_KEY_HASH_SALT: z.string().min(16).default("replace_api_key_hash_salt"),
  PAYMENT_DEFAULT_SUCCESS_URL: z.string().url().default("http://localhost:5173/payment/success"),
  PAYMENT_DEFAULT_CANCEL_URL: z.string().url().default("http://localhost:5173/payment/cancel"),
  PAYMENT_ALLOWED_REDIRECT_ORIGINS: z.string().default("http://localhost:3000,http://localhost:3001,http://localhost:5173"),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  PAYPAL_MODE: z.enum(["sandbox", "live"]).default("sandbox"),
  PAYPAL_CLIENT_ID: z.string().min(1).optional(),
  PAYPAL_CLIENT_SECRET: z.string().min(1).optional(),
  PAYPAL_WEBHOOK_ID: z.string().min(1).optional(),
  RAZORPAY_KEY_ID: z.string().min(1).optional(),
  RAZORPAY_KEY_SECRET: z.string().min(1).optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1).optional(),
  ENABLE_API_DOCS: z.enum(["true", "false"]).default("false"),
  FILE_UPLOAD_DIR: z.string().default("uploads"),
  FILE_UPLOAD_MAX_BYTES: z.coerce.number().default(50 * 1024 * 1024),
  FILE_QUOTA_BYTES: z.coerce.number().default(500 * 1024 * 1024),
  EXPORT_MAX_ROWS: z.coerce.number().int().min(1).default(10000),
  IMPORT_MAX_ROWS: z.coerce.number().int().min(1).default(1000),
  STORAGE_BACKEND: z.enum(["local", "s3"]).default("local"),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z.enum(["true", "false"]).default("false"),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  // WhatsApp Meta API Configuration
  WHATSAPP_ACCESS_TOKEN: z.string().min(1).optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1).optional(),
  WHATSAPP_API_VERSION: z.string().default("v22.0"),
  WHATSAPP_GRAPH_BASE_URL: z.string().url().default("https://graph.facebook.com"),
  WHATSAPP_TEMPLATE_LANGUAGE: z.string().default("en"),
  WHATSAPP_WABA_ID: z.string().min(1).optional(),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().min(1).optional(),
  WHATSAPP_APP_SECRET: z.string().min(1).optional(),

  // WhatsApp Queue Processing
  WA_SEND_DELAY_MS: z.coerce.number().default(100),
  WA_BATCH_SIZE: z.coerce.number().default(20),

  // RabbitMQ Configuration
  RABBITMQ_URL: z.string().url().default("amqp://guest:guest@localhost:5672"),
  RABBITMQ_EXCHANGE: z.string().default("datasetu_exchange")
}).superRefine((data, context) => {
  if (data.JWT_SECRET_SUPER_ADMIN === data.JWT_SECRET_ADMIN) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "JWT secrets for super admin and admin must be different",
      path: ["JWT_SECRET_ADMIN"]
    });
  }

  if (data.ENABLE_SEED === "true") {
    if (!data.SUPER_ADMIN_SEED_PASSWORD) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "SUPER_ADMIN_SEED_PASSWORD is required when ENABLE_SEED=true",
        path: ["SUPER_ADMIN_SEED_PASSWORD"]
      });
    } else if (data.NODE_ENV === "production" && data.SUPER_ADMIN_SEED_PASSWORD.length < 12) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "SUPER_ADMIN_SEED_PASSWORD must be at least 12 characters in production",
        path: ["SUPER_ADMIN_SEED_PASSWORD"]
      });
    }

    if (!data.ADMIN_SEED_PASSWORD) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ADMIN_SEED_PASSWORD is required when ENABLE_SEED=true",
        path: ["ADMIN_SEED_PASSWORD"]
      });
    } else if (data.NODE_ENV === "production" && data.ADMIN_SEED_PASSWORD.length < 12) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ADMIN_SEED_PASSWORD must be at least 12 characters in production",
        path: ["ADMIN_SEED_PASSWORD"]
      });
    }
  }

  if (data.NODE_ENV === "production" && data.API_KEY_HASH_SALT === "replace_api_key_hash_salt") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "API_KEY_HASH_SALT must be explicitly set in production",
      path: ["API_KEY_HASH_SALT"]
    });
  }

  if (data.NODE_ENV === "production" && data.RABBITMQ_URL.includes("guest:guest")) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "RABBITMQ_URL must not use default guest credentials in production",
      path: ["RABBITMQ_URL"]
    });
  }

  const stripeConfigured = Boolean(data.STRIPE_SECRET_KEY || data.STRIPE_WEBHOOK_SECRET);
  if (stripeConfigured) {
    if (!data.STRIPE_SECRET_KEY) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "STRIPE_SECRET_KEY is required when Stripe is configured",
        path: ["STRIPE_SECRET_KEY"]
      });
    }
    if (!data.STRIPE_WEBHOOK_SECRET) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "STRIPE_WEBHOOK_SECRET is required when Stripe is configured",
        path: ["STRIPE_WEBHOOK_SECRET"]
      });
    }
  }

  const paypalConfigured = Boolean(data.PAYPAL_CLIENT_ID || data.PAYPAL_CLIENT_SECRET || data.PAYPAL_WEBHOOK_ID);
  if (paypalConfigured) {
    if (!data.PAYPAL_CLIENT_ID) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "PAYPAL_CLIENT_ID is required when PayPal is configured",
        path: ["PAYPAL_CLIENT_ID"]
      });
    }
    if (!data.PAYPAL_CLIENT_SECRET) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "PAYPAL_CLIENT_SECRET is required when PayPal is configured",
        path: ["PAYPAL_CLIENT_SECRET"]
      });
    }
    if (!data.PAYPAL_WEBHOOK_ID) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "PAYPAL_WEBHOOK_ID is required when PayPal is configured",
        path: ["PAYPAL_WEBHOOK_ID"]
      });
    }
  }

  const razorpayConfigured = Boolean(data.RAZORPAY_KEY_ID || data.RAZORPAY_KEY_SECRET || data.RAZORPAY_WEBHOOK_SECRET);
  if (razorpayConfigured) {
    if (!data.RAZORPAY_KEY_ID) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "RAZORPAY_KEY_ID is required when Razorpay is configured",
        path: ["RAZORPAY_KEY_ID"]
      });
    }
    if (!data.RAZORPAY_KEY_SECRET) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "RAZORPAY_KEY_SECRET is required when Razorpay is configured",
        path: ["RAZORPAY_KEY_SECRET"]
      });
    }
    if (!data.RAZORPAY_WEBHOOK_SECRET) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "RAZORPAY_WEBHOOK_SECRET is required when Razorpay is configured",
        path: ["RAZORPAY_WEBHOOK_SECRET"]
      });
    }
  }

  const whatsappConfigured = Boolean(
    data.WHATSAPP_ACCESS_TOKEN ||
    data.WHATSAPP_PHONE_NUMBER_ID ||
    data.WHATSAPP_WEBHOOK_VERIFY_TOKEN ||
    data.WHATSAPP_APP_SECRET
  );
  if (whatsappConfigured) {
    if (!data.WHATSAPP_ACCESS_TOKEN) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "WHATSAPP_ACCESS_TOKEN is required when WhatsApp is configured",
        path: ["WHATSAPP_ACCESS_TOKEN"]
      });
    }
    if (!data.WHATSAPP_PHONE_NUMBER_ID) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "WHATSAPP_PHONE_NUMBER_ID is required when WhatsApp is configured",
        path: ["WHATSAPP_PHONE_NUMBER_ID"]
      });
    }
    if (!data.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "WHATSAPP_WEBHOOK_VERIFY_TOKEN is required when WhatsApp is configured",
        path: ["WHATSAPP_WEBHOOK_VERIFY_TOKEN"]
      });
    }
    if (!data.WHATSAPP_APP_SECRET) {
      if (data.NODE_ENV === "production") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "WHATSAPP_APP_SECRET is required in production for webhook signature validation",
          path: ["WHATSAPP_APP_SECRET"]
        });
      }
    }
  }
});

export const env = envSchema.parse(process.env);
