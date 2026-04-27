import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { createApp } from "./app";
import { seedBaseline } from "./bootstrap/seed";
import { connectDatabase } from "./config/db";
import { env } from "./config/env";
import { logger } from "./core/logging/logger";
import { seedMenusIfEmpty } from "./modules/menu/menu.seed";

async function bootstrap() {
  await connectDatabase();
  if (env.ENABLE_SEED === "true") {
    await seedBaseline();
  }

  const seeded = await seedMenusIfEmpty();
  if (seeded) {
    logger.info("Seeded default menu structure");
  }

  const app = await createApp();
  const httpServer = createServer(app);

  // Initialize Socket.IO for real-time features (WhatsApp Inbox)
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGINS.split(",").map((item) => item.trim()),
      credentials: true,
    },
  });

  // Make io available to routes
  app.set("io", io);

  // Socket.IO connection handler
  io.on("connection", (socket) => {
    logger.debug("[Socket.IO] Client connected", { socketId: socket.id });

    // WhatsApp Inbox room join
    socket.on("join_whatsapp_inbox", () => {
      socket.join("whatsapp_inbox_admin");
      logger.debug("[Socket.IO] Client joined whatsapp_inbox_admin room", { socketId: socket.id });
    });

    socket.on("disconnect", () => {
      logger.debug("[Socket.IO] Client disconnected", { socketId: socket.id });
    });
  });

  httpServer.listen(env.PORT, () => {
    logger.info(`admin-backend listening on port ${env.PORT}`);
    logger.info("[Socket.IO] Real-time server ready");
  });
}

bootstrap().catch((error) => {
  logger.error("Failed to bootstrap backend", error);
  process.exit(1);
});
