import { ERROR_CODES } from "@admin-platform/shared-types";
import type { NextFunction, Response } from "express";
import { AppError } from "../errors/app-error";
import type { AuthenticatedRequest } from "./auth.types";
import { verifyToken } from "./jwt";

export function authenticateJwt(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next(new AppError(401, ERROR_CODES.UNAUTHORIZED, "Missing bearer token"));
    return;
  }

  const token = authHeader.slice("Bearer ".length);
  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role
    };
    next();
  } catch {
    next(new AppError(401, ERROR_CODES.UNAUTHORIZED, "Invalid token"));
  }
}
