import mongoose from "mongoose";
import type { Store, ClientRateLimitInfo, Options } from "express-rate-limit";
import { logger } from "../logging/logger";

/**
 * A rate-limit store backed by MongoDB.
 *
 * express-rate-limit's default MemoryStore counts per process. This API is one
 * Vercel serverless function that scales out to many concurrent execution
 * environments and loses memory on every cold start, so the default store only
 * throttles requests that happen to land on the same warm instance — trivially
 * bypassed by issuing requests concurrently. That makes the login limiter
 * decorative, which is the one that matters.
 *
 * Mongo is used rather than Redis because it is already a hard dependency here;
 * adding Redis would mean new infrastructure for one feature. The cost is one
 * findOneAndUpdate per limited request, which is why this store is applied only
 * to the endpoints where bypass actually hurts (auth, public submission) rather
 * than to every limiter in the codebase.
 */

type RateLimitDoc = {
  _id: string;
  count: number;
  expiresAt: Date;
};

const COLLECTION = "ratelimits";

let indexReady: Promise<void> | null = null;

/**
 * TTL index, so expired windows are reaped by Mongo instead of accumulating.
 * Created once per process, lazily — at module load the connection may not be
 * open yet on a cold start.
 */
function ensureIndex(): Promise<void> {
  if (!indexReady) {
    indexReady = mongoose.connection
      .collection(COLLECTION)
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
      .then(() => undefined)
      .catch((error) => {
        // A missing index means stale documents linger; it must not take the
        // endpoint down, so log and carry on.
        logger.warn("Could not create rate-limit TTL index", { error });
        indexReady = null;
      });
  }
  return indexReady;
}

export class MongoRateLimitStore implements Store {
  private windowMs = 60_000;
  private readonly keyPrefix: string;

  constructor(prefix: string) {
    this.keyPrefix = prefix;
  }

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  private key(key: string): string {
    return `${this.keyPrefix}:${key}`;
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    await ensureIndex();
    const now = Date.now();
    const collection = mongoose.connection.collection<RateLimitDoc>(COLLECTION);

    // One round trip: reset the window if it has passed, otherwise add to it.
    // A read-then-write would let two concurrent requests both see the old
    // count, which is the exact race this store exists to close.
    const existing = await collection.findOneAndUpdate(
      { _id: this.key(key), expiresAt: { $gt: new Date(now) } },
      { $inc: { count: 1 } },
      { returnDocument: "after" }
    );

    if (existing) {
      return { totalHits: existing.count, resetTime: existing.expiresAt };
    }

    const resetTime = new Date(now + this.windowMs);
    await collection.updateOne(
      { _id: this.key(key) },
      { $set: { count: 1, expiresAt: resetTime } },
      { upsert: true }
    );
    return { totalHits: 1, resetTime };
  }

  async decrement(key: string): Promise<void> {
    await mongoose.connection
      .collection<RateLimitDoc>(COLLECTION)
      .updateOne({ _id: this.key(key), count: { $gt: 0 } }, { $inc: { count: -1 } });
  }

  async resetKey(key: string): Promise<void> {
    await mongoose.connection
      .collection<RateLimitDoc>(COLLECTION)
      .deleteOne({ _id: this.key(key) });
  }
}

/**
 * Returns a shared store, or undefined to fall back to the in-memory default.
 *
 * On a long-running process the memory store is correct and cheaper, so the
 * database round trip is only paid where it buys something.
 */
export function sharedRateLimitStore(prefix: string): Store | undefined {
  if (process.env.VERCEL !== "1") return undefined;
  return new MongoRateLimitStore(prefix);
}
