import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { env } from "../../config/env";
import { logger } from "../../core/logging/logger";

export type MailEnvelope = {
  from: { name: string; address: string };
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
};

export type MailSendResult = {
  messageId: string;
  accepted: string[];
  rejected: string[];
};

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  if (env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE === "true",
      auth: env.SMTP_USER
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS ?? "" }
        : undefined,
    });
    logger.info("Mail adapter configured with SMTP transport", { host: env.SMTP_HOST });
  } else {
    transporter = nodemailer.createTransport({ jsonTransport: true });
    logger.info("Mail adapter using JSON transport (no SMTP configured — emails will be logged, not sent)");
  }

  return transporter;
}

export async function sendMail(envelope: MailEnvelope): Promise<MailSendResult> {
  const transport = getTransporter();
  const recipientCount = envelope.to.length + (envelope.cc?.length ?? 0) + (envelope.bcc?.length ?? 0);

  // Log delivery attempt (redact body/attachments)
  logger.info("Mail delivery attempt", {
    to: envelope.to,
    cc: envelope.cc,
    subject: envelope.subject,
    recipientCount,
    hasAttachments: (envelope.attachments?.length ?? 0) > 0,
  });

  try {
    const info = await transport.sendMail({
      from: `"${envelope.from.name}" <${envelope.from.address}>`,
      to: envelope.to.join(", "),
      cc: envelope.cc?.join(", "),
      bcc: envelope.bcc?.join(", "),
      subject: envelope.subject,
      html: envelope.html,
      attachments: envelope.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });

    const result: MailSendResult = {
      messageId: info.messageId ?? "",
      accepted: Array.isArray(info.accepted) ? info.accepted.map(String) : [],
      rejected: Array.isArray(info.rejected) ? info.rejected.map(String) : [],
    };

    if (!env.SMTP_HOST) {
      logger.info("Mail logged (JSON transport — no SMTP)", {
        messageId: result.messageId,
      });
    } else {
      logger.info("Mail delivered via SMTP", {
        messageId: result.messageId,
        accepted: result.accepted,
        rejected: result.rejected,
      });
    }

    if (result.rejected.length > 0) {
      logger.warn("Mail delivery partial rejection", {
        messageId: result.messageId,
        rejected: result.rejected,
      });
    }

    return result;
  } catch (err) {
    logger.error("Mail delivery failed", {
      error: err instanceof Error ? err.message : String(err),
      to: envelope.to,
      subject: envelope.subject,
    });
    throw err;
  }
}

/**
 * Inbound mail sync placeholder.
 *
 * Replace with IMAP polling (e.g. via imap-simple) or a vendor webhook
 * (SendGrid Inbound Parse, Mailgun Routes, etc.) to receive inbound mail.
 */
export async function syncInbound(): Promise<{ fetched: number }> {
  logger.info("Inbound mail sync invoked (placeholder — no IMAP/vendor configured)");
  return { fetched: 0 };
}
