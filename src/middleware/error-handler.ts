import { ERROR_CODES } from "@admin-platform/shared-types";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../core/errors/app-error";
import { logger } from "../core/logging/logger";

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const requestId = (req as Request & { id?: string }).id;

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
      ...(requestId ? { requestId } : {}),
    });
    return;
  }

  logger.error("Unexpected server error", {
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    requestId,
    method: req.method,
    path: req.path,
  });

  res.status(500).json({
    code: ERROR_CODES.INTERNAL_ERROR,
    message: "Unexpected server error",
    ...(requestId ? { requestId } : {}),
  });
}
