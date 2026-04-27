import { type NextFunction, type Request, type Response } from "express";
import { logger } from "../core/logging/logger";

/**
 * Logs every request with method, path, status code, and duration.
 * Skips health checks to reduce noise.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // Skip health endpoint to avoid log flooding from monitors
  if (req.path === "/api/v1/system/health") {
    next();
    return;
  }

  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const meta = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: duration,
      requestId: (req as Request & { id?: string }).id,
    };

    if (res.statusCode >= 500) {
      logger.error("request completed", meta);
    } else if (res.statusCode >= 400) {
      logger.warn("request completed", meta);
    } else {
      logger.info("request completed", meta);
    }
  });

  next();
}
