import cors from "cors";
import express from "express";
import helmet from "helmet";
import path from "node:path";
import { registerModuleRoutes } from "./bootstrap/module-registry";
import { env } from "./config/env";
import { IS_SERVERLESS } from "./config/runtime";
import { isSupabaseConfigured } from "./core/storage/file-store";
import { logger } from "./core/logging/logger";
import { errorHandler } from "./middleware/error-handler";
import { requestId } from "./middleware/request-id";
import { requestLogger } from "./middleware/request-logger";
import { mountSwagger } from "./middleware/swagger";
import { apiManagementRoutes } from "./modules/api-management/api-management.routes";
import { calendarRoutes } from "./modules/calendar/calendar.routes";
import { chatRoutes } from "./modules/chat/chat.routes";
import { crmRoutes } from "./modules/crm/crm.routes";
import { paymentRoutes, paymentWebhookRoutes } from "./modules/ecommerce/ecommerce.payment.routes";
import { ecommerceRoutes } from "./modules/ecommerce/ecommerce.routes";
import { fileManagerRoutes } from "./modules/file-manager/file-manager.routes";
import { jobRoutes } from "./modules/job/job.routes";
import { mailboxRoutes } from "./modules/mailbox/mailbox.routes";
import { authRoutes } from "./modules/system/auth.routes";
import { healthRoutes } from "./modules/health/health.routes";
import { invoiceRoutes } from "./modules/invoices/invoice.routes";
import { moduleManifests } from "./modules/module-manifests";
import { projectRoutes } from "./modules/projects/projects.routes";
import { supportTicketRoutes } from "./modules/support-tickets/support-tickets.routes";
import { menuRoutes } from "./modules/menu/menu.routes";
import { systemRoutes } from "./modules/system/system.routes";
import { taskRoutes } from "./modules/tasks/tasks.routes";
import { todoRoutes } from "./modules/todo/todo.routes";
import { whatsappWebhookRoutes } from "./modules/whatsapp/webhook.routes";
import { campaignRoutes } from "./modules/whatsapp/campaign.routes";
import { bulkMessagingRoutes } from "./modules/whatsapp/bulk-messaging.routes";
import { templateRoutes } from "./modules/whatsapp/template.routes";
import { triggerRoutes } from "./modules/whatsapp/trigger.routes";
import { inboxRoutes } from "./modules/whatsapp/inbox.routes";
import { rbacRoutes } from "./modules/rbac/rbac.routes";
import { portfolioProjectsRoutes } from "./modules/portfolio/portfolio-projects.routes";
import { portfolioTeamRoutes } from "./modules/portfolio/portfolio-team.routes";
import { portfolioSettingsRoutes } from "./modules/portfolio/portfolio-settings.routes";
import { portfolioServicesRoutes } from "./modules/portfolio/portfolio-services.routes";
import { portfolioSocialProofRoutes } from "./modules/portfolio/portfolio-social-proof.routes";
import { portfolioLegalRoutes } from "./modules/portfolio/portfolio-legal.routes";
import { portfolioFaqRoutes } from "./modules/portfolio/portfolio-faq.routes";
import { portfolioPostsRoutes } from "./modules/portfolio/portfolio-posts.routes";
import { portfolioContactsRoutes } from "./modules/portfolio/portfolio-contacts.routes";
import { portfolioMastersRoutes } from "./modules/portfolio/portfolio-masters.routes";
import { seoRoutes } from "./modules/seo/seo-meta.routes";

export async function createApp() {
  const app = express();

  // Uploads are the one feature that cannot work on a read-only filesystem, so
  // say so loudly at cold start rather than letting the first admin upload be
  // the thing that discovers it.
  if (IS_SERVERLESS) {
    // Socket.IO is wired only in src/main.ts, which is the long-running entry
    // point and is NOT what Vercel builds (scripts/build-vercel.mjs bundles
    // api-src/entry.ts). Every emit site guards with `if (io)`, so real-time
    // push degrades to a silent no-op here rather than an error. Say so, so it
    // is not diagnosed as a client bug.
    logger.warn(
      "Socket.IO is not available on the serverless entry point — real-time push " +
        "(WhatsApp inbox) is inert. Clients must poll."
    );
  }

  if (IS_SERVERLESS && !isSupabaseConfigured()) {
    logger.warn(
      "No object storage configured — image uploads will fail. Set SUPABASE_URL " +
        "and SUPABASE_SERVICE_ROLE_KEY (the serverless filesystem is read-only)."
    );
  }

  const allowedOrigins = env.CORS_ORIGINS.split(",").map((item) => item.trim());
  let trustProxyValue: boolean | number = false;
  if (env.TRUST_PROXY === "true") {
    trustProxyValue = true;
  } else if (env.TRUST_PROXY === "false") {
    trustProxyValue = false;
  } else {
    const parsedValue = Number.parseInt(env.TRUST_PROXY, 10);
    trustProxyValue = Number.isNaN(parsedValue) ? false : parsedValue;
  }

  app.set("trust proxy", trustProxyValue);

  app.use(requestId);
  app.use(requestLogger);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin: allowedOrigins.length > 0 ? allowedOrigins : true,
      credentials: true
    })
  );

  // Serve uploaded portfolio images publicly
  app.use("/uploads", express.static(path.join(process.cwd(), env.FILE_UPLOAD_DIR)));

  // Webhooks need raw body for signature verification.
  app.use(paymentWebhookRoutes);
  app.use(whatsappWebhookRoutes);
  app.use(express.json({ limit: "256kb" }));

  await mountSwagger(app);

  app.use(healthRoutes);
  app.use(authRoutes);
  app.use(systemRoutes);
  app.use(menuRoutes);
  app.use(ecommerceRoutes);
  app.use(paymentRoutes);
  app.use(crmRoutes);
  app.use(invoiceRoutes);
  app.use(apiManagementRoutes);
  app.use(supportTicketRoutes);
  app.use(fileManagerRoutes);
  app.use(chatRoutes);
  app.use(mailboxRoutes);
  app.use(projectRoutes);
  app.use(taskRoutes);
  app.use(calendarRoutes);
  app.use(todoRoutes);
  app.use(jobRoutes);
  app.use(campaignRoutes);
  app.use(bulkMessagingRoutes);
  app.use(templateRoutes);
  app.use(triggerRoutes);
  app.use(inboxRoutes);
  app.use(rbacRoutes);
  app.use(portfolioProjectsRoutes);
  app.use(portfolioTeamRoutes);
  app.use(portfolioSettingsRoutes);
  app.use(portfolioServicesRoutes);
  app.use(portfolioSocialProofRoutes);
  app.use(portfolioLegalRoutes);
  app.use(portfolioFaqRoutes);
  app.use(portfolioPostsRoutes);
  app.use(portfolioContactsRoutes);
  app.use(portfolioMastersRoutes);
  app.use(seoRoutes);

  registerModuleRoutes(app, moduleManifests);

  app.use(errorHandler);

  return app;
}
