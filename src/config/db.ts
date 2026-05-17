import mongoose from "mongoose";
import { env } from "./env";
import { logger } from "../core/logging/logger";

type MongooseCache = {
  connection: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalCache = globalThis as unknown as { __mongooseCache?: MongooseCache };
if (!globalCache.__mongooseCache) {
  globalCache.__mongooseCache = { connection: null, promise: null };
}

export async function connectDatabase(): Promise<void> {
  const cache = globalCache.__mongooseCache!;

  if (cache.connection) {
    return;
  }

  if (!cache.promise) {
    mongoose.connection.on("error", (err) => {
      logger.error("MongoDB connection error", { error: err });
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected");
      cache.connection = null;
    });

    mongoose.connection.on("reconnected", () => {
      logger.info("MongoDB reconnected");
    });

    cache.promise = mongoose
      .connect(env.MONGO_URI, {
        serverSelectionTimeoutMS: 8000,
        socketTimeoutMS: 45000,
      })
      .catch((err) => {
        cache.promise = null;
        throw err;
      });
  }

  cache.connection = await cache.promise;
}
