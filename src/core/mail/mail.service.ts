import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { env } from "../../config/env";
import { logger } from "../logging/logger";

/**
 * Outbound transactional mail.
 *
 * Deliberately tiny: one transport, one send, and a hard rule that a mail
 * failure never propagates to the caller. The first user of this is the
 * new-lead notification, where losing the email is bad and losing the lead
 * because the email failed would be much worse.
 */

let cachedTransport: Transporter | null = null;
let warnedUnconfigured = false;

/** True when enough SMTP settings exist to attempt a send. */
export function isMailConfigured(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

function transport(): Transporter | null {
  if (!isMailConfigured()) {
    // Once per process, not once per send: an unconfigured environment would
    // otherwise fill the log with the same line on every submission.
    if (!warnedUnconfigured) {
      logger.warn("SMTP is not configured — transactional mail is disabled");
      warnedUnconfigured = true;
    }
    return null;
  }

  if (!cachedTransport) {
    cachedTransport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE === "true",
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS }
    });
  }

  return cachedTransport;
}

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
};

/**
 * Sends a message, reporting success as a boolean rather than by throwing.
 *
 * Callers are expected to `await` this before responding — NOT to fire it and
 * return. On a serverless function nothing keeps the invocation alive once the
 * response completes, so a send started after `res.json()` can be frozen
 * mid-flight and silently lost. Awaiting costs the caller a few hundred
 * milliseconds and makes delivery actually observable.
 */
export async function sendMail(message: MailMessage): Promise<boolean> {
  const mailer = transport();
  if (!mailer) return false;

  try {
    await mailer.sendMail({
      from: env.SMTP_FROM || env.SMTP_USER,
      to: message.to,
      subject: message.subject,
      text: message.text,
      ...(message.replyTo ? { replyTo: message.replyTo } : {})
    });
    return true;
  } catch (error) {
    logger.error("Failed to send mail", { subject: message.subject, error });
    return false;
  }
}
