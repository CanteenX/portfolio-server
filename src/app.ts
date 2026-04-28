import cors from "cors";
import express from "express";
import helmet from "helmet";
import { registerModuleRoutes } from "./bootstrap/module-registry";
import { env } from "./config/env";
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
import { portfolioContactsRoutes } from "./modules/portfolio/portfolio-contacts.routes";

export async function createApp() {
  const app = express();
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
  app.use(helmet());
  app.use(
    cors({
      origin: allowedOrigins.length > 0 ? allowedOrigins : true
    })
  );

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
  app.use(portfolioContactsRoutes);

  registerModuleRoutes(app, moduleManifests);

  app.use(errorHandler);

  return app;
}
