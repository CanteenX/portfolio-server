import crypto from "node:crypto";
import { type NextFunction, type Request, type Response } from "express";

/**
 * Assigns a unique request ID to every incoming request.
 *
 * - Trusts an incoming `X-Request-Id` header if present (from load balancer / gateway).
 * - Otherwise generates a UUIDv4.
 * - Attaches to `req.id` and echoes back in the `X-Request-Id` response header.
 */
export function requestId(req: Request, _res: Response, next: NextFunction): void {
  const id =
    (typeof req.headers["x-request-id"] === "string" && req.headers["x-request-id"]) ||
    crypto.randomUUID();
  (req as Request & { id: string }).id = id;
  _res.setHeader("X-Request-Id", id);
  next();
}
