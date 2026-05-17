import { type Express, type NextFunction, type Request, type Response } from "express";
import fs from "node:fs";
import path from "node:path";
import { env } from "../config/env";
import { logger } from "../core/logging/logger";
import { authenticateJwt } from "../core/auth/auth.middleware";
import type { AuthenticatedRequest } from "../core/auth/auth.types";

/**
 * Mount Swagger UI at `/api/docs`.
 *
 * Enabled when:
 *   - NODE_ENV !== "production"  (always available in dev/test)
 *   - OR ENABLE_API_DOCS=true    (opt-in for production)
 *
 * In production (when ENABLE_API_DOCS=true), access is restricted to
 * super_admin users via JWT authentication. In dev/test, access is open.
 *
 * The OpenAPI spec is loaded from `docs/api/openapi.yaml` relative
 * to the project root.
 */
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

    // In production, require super_admin JWT to access docs
    if (env.NODE_ENV === "production") {
      handlers.push(authenticateJwt as (req: Request, res: Response, next: NextFunction) => void);
      handlers.push((req: Request, res: Response, next: NextFunction) => {
        const user = (req as AuthenticatedRequest).user;
        if (!user || user.role !== "super_admin") {
          res.status(403).json({ code: "FORBIDDEN", message: "API docs restricted to super_admin" });
          return;
        }
        next();
      });
    }

    app.use("/api/docs", ...handlers, swaggerUi.serve, swaggerUi.setup(spec, {
      customSiteTitle: "Admin Platform API Docs",
      customCss: ".swagger-ui .topbar { display: none }",
    }));

    const mode = env.NODE_ENV === "production" ? "super_admin-only" : "open";
    logger.info(`Swagger UI mounted at /api/docs (${mode}, spec: ${specPath})`);
  } catch (err) {
    logger.error("Failed to mount Swagger UI", err);
  }
}
