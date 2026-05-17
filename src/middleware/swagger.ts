import { type Express, type NextFunction, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import { env } from "../config/env";
import { logger } from "../core/logging/logger";
import { authenticateJwt } from "../core/auth/auth.middleware";
import type { AuthenticatedRequest } from "../core/auth/auth.types";
import { UserModel } from "../core/auth/user.model";

/**
 * Mount Swagger UI at `/api/docs`.
 *
 * Enabled when:
 *   - NODE_ENV !== "production"  (always available in dev/test)
 *   - OR ENABLE_API_DOCS=true    (opt-in for production)
 *
 * In production, access is restricted to super_admin users. The route accepts
 * either a Bearer JWT (programmatic clients) or HTTP Basic auth (browser
 * sign-in prompt). The OpenAPI spec is loaded from `docs/api/openapi.yaml`.
 */

const BASIC_REALM = 'Basic realm="Admin API Docs", charset="UTF-8"';

function requireBasic(res: Response, message: string): void {
  res.set("WWW-Authenticate", BASIC_REALM);
  res.status(401).json({ code: "UNAUTHORIZED", message });
}

async function docsAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;

  if (!header) {
    requireBasic(res, "Authentication required");
    return;
  }

  if (header.startsWith("Bearer ")) {
    authenticateJwt(req as AuthenticatedRequest, res, () => {
      const user = (req as AuthenticatedRequest).user;
      if (!user || user.role !== "super_admin") {
        res.status(403).json({ code: "FORBIDDEN", message: "API docs restricted to super_admin" });
        return;
      }
      next();
    });
    return;
  }

  if (header.startsWith("Basic ")) {
    try {
      const decoded = Buffer.from(header.slice(6), "base64").toString("utf-8");
      const sep = decoded.indexOf(":");
      const email = sep === -1 ? decoded : decoded.slice(0, sep);
      const password = sep === -1 ? "" : decoded.slice(sep + 1);

      if (!email || !password) {
        requireBasic(res, "Invalid credentials");
        return;
      }

      const user = await UserModel.findOne({ email }).exec();
      if (!user) {
        requireBasic(res, "Invalid credentials");
        return;
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid || user.role !== "super_admin") {
        requireBasic(res, "Invalid credentials");
        return;
      }

      next();
    } catch {
      requireBasic(res, "Invalid credentials");
    }
    return;
  }

  requireBasic(res, "Use Basic auth or Bearer token");
}

export async function mountSwagger(app: Express): Promise<void> {
  const enabled =
    env.NODE_ENV !== "production" || env.ENABLE_API_DOCS === "true";

  if (!enabled) {
    return;
  }

  try {
    const cwd = process.cwd();
    const candidates = [
      path.resolve(cwd, "docs/api/openapi.yaml"),
      path.resolve(cwd, "../docs/api/openapi.yaml"),
      path.resolve(cwd, "../../docs/api/openapi.yaml"),
    ];

    const specPath = candidates.find((p) => fs.existsSync(p));
    if (!specPath) {
      logger.info("Swagger UI skipped: openapi.yaml not found");
      return;
    }

    const [YAML, swaggerUi] = await Promise.all([
      import("yaml"),
      import("swagger-ui-express"),
    ]);

    const specContent = fs.readFileSync(specPath, "utf-8");
    const spec = YAML.parse(specContent);

    const handlers: Array<(req: Request, res: Response, next: NextFunction) => void> = [];

    if (env.NODE_ENV === "production") {
      handlers.push(docsAuth as (req: Request, res: Response, next: NextFunction) => void);
    }

    app.use("/api/docs", ...handlers, swaggerUi.serve, swaggerUi.setup(spec, {
      customSiteTitle: "Admin Platform API Docs",
      customCss: ".swagger-ui .topbar { display: none }",
    }));

    const mode = env.NODE_ENV === "production" ? "super_admin-only (Basic or Bearer)" : "open";
    logger.info(`Swagger UI mounted at /api/docs (${mode}, spec: ${specPath})`);
  } catch (err) {
    logger.error("Failed to mount Swagger UI", err);
  }
}
