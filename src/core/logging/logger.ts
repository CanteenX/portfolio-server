import pino from "pino";
import { env } from "../../config/env";

/**
 * Structured logger backed by pino.
 *
 * - Development: pretty-printed to stdout via pino-pretty
 * - Production:  newline-delimited JSON (pipe to your log aggregator)
 * - Test:        silent to keep test output clean
 */
const pinoInstance = pino({
  level: env.NODE_ENV === "test" ? "silent" : "info",
  redact: {
    paths: [
      // Auth fields
      "password",
      "token",
      "authorization",
      "req.headers.authorization",
      "cookie",
      "req.headers.cookie",
      // Payment fields
      "stripeSecretKey",
      "paypalClientSecret",
      "razorpayKeySecret",
      "webhookSecret",
      "cardNumber",
      "cvv",
      "creditCard",
      // SMTP credentials
      "smtpPass",
    ],
    censor: "[REDACTED]",
  },
  ...(env.NODE_ENV === "development"
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:HH:MM:ss" },
        },
      }
    : {}),
});

/**
 * Application logger.
 *
 * Keeps the same `{ info, error, warn, debug }` surface so existing
 * call-sites continue to work. New code can use the full pino API
 * via `logger.child({ module: "chat" })` etc.
 */
export const logger = {
  info: (message: string, meta?: unknown) =>
    meta !== undefined
      ? pinoInstance.info(typeof meta === "object" && meta !== null ? meta : { data: meta }, message)
      : pinoInstance.info(message),

  error: (message: string, meta?: unknown) =>
    meta !== undefined
      ? pinoInstance.error(typeof meta === "object" && meta !== null ? meta : { data: meta }, message)
      : pinoInstance.error(message),

  warn: (message: string, meta?: unknown) =>
    meta !== undefined
      ? pinoInstance.warn(typeof meta === "object" && meta !== null ? meta : { data: meta }, message)
      : pinoInstance.warn(message),

  debug: (message: string, meta?: unknown) =>
    meta !== undefined
      ? pinoInstance.debug(typeof meta === "object" && meta !== null ? meta : { data: meta }, message)
      : pinoInstance.debug(message),

  /** Create a child logger with bound context fields. */
  child: (bindings: Record<string, unknown>) => pinoInstance.child(bindings),

  /** Raw pino instance for advanced usage. */
  pino: pinoInstance,
};
