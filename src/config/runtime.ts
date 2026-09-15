import fs from "node:fs";

/**
 * Runtime detection.
 *
 * Vercel runs this codebase as a single serverless function, where the
 * filesystem is read-only apart from an ephemeral /tmp that is NOT shared
 * between invocations. Anything that writes to disk (multer diskStorage,
 * `mkdirSync`) either throws at cold start or silently loses data on the next
 * request, so every such call site is gated on IS_SERVERLESS.
 *
 * VERCEL is set to "1" by the platform in both build and runtime.
 */
export const IS_SERVERLESS = process.env.VERCEL === "1";

/** True when the process owns a port and can safely do boot-time work (seeds). */
export const IS_LONG_RUNNING = !IS_SERVERLESS;

/**
 * Creates a local upload directory, or does nothing where the filesystem is
 * read-only and uploads go to object storage instead.
 *
 * Route modules call this at import time. An unguarded mkdirSync there throws
 * during module evaluation, which fails the entire function rather than the one
 * route, so every request returns FUNCTION_INVOCATION_FAILED.
 */
export function ensureLocalDir(dir: string): void {
  if (IS_SERVERLESS) return;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
