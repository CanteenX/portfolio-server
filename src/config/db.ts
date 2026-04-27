import mongoose from "mongoose";
import { env } from "./env";
import { logger } from "../core/logging/logger";

let isConnected = false;

export async function connectDatabase(): Promise<void> {
  if (isConnected) {
    return;
  }

  mongoose.connection.on("error", (err) => {
    logger.error("MongoDB connection error", { error: err });
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected");
    isConnected = false;
  });

  mongoose.connection.on("reconnected", () => {
    logger.info("MongoDB reconnected");
    isConnected = true;
  });

  await mongoose.connect(env.MONGO_URI);
  isConnected = true;
}
