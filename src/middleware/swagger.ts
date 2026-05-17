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
 * Mount Swagger UI at GET /api/docs.
 *
 * We deliberately avoid swagger-ui-express's static-file middleware because it
 * issues a 301 to add a trailing slash, and Vercel re-strips trailing slashes
 * — producing an infinite redirect loop. Instead we serve a tiny HTML shell
 * that loads swagger-ui assets from a CDN, plus a sibling JSON endpoint that
 * returns the spec. Both routes share the same auth gate.
 *
 * Enabled when:
 *   - NODE_ENV !== "production"  (always available in dev/test)
 *   - OR ENABLE_API_DOCS=true    (opt-in for production)
 *
 * In production both routes accept either a Bearer JWT or HTTP Basic auth
 * with a super_admin email + password. Browsers receive a native sign-in
 * prompt via WWW-Authenticate.
 */

const BASIC_REALM = 'Basic realm="Admin API Docs", charset="UTF-8"';
const SWAGGER_UI_VERSION = "5.17.14";

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

function renderDocsHtml(): string {
  const cdn = `https://unpkg.com/swagger-ui-dist@${SWAGGER_UI_VERSION}`;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Admin Platform API Docs</title>
    <link rel="stylesheet" href="${cdn}/swagger-ui.css" />
    <style>
      body { margin: 0; background: #fafafa; }
      .swagger-ui .topbar { display: none; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="${cdn}/swagger-ui-bundle.js" crossorigin></script>
    <script src="${cdn}/swagger-ui-standalone-preset.js" crossorigin></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: "/api/docs.json",
        dom_id: "#swagger-ui",
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: "StandaloneLayout",
        requestInterceptor: function (req) {
          // Re-use the page's Basic auth credentials on Try-It-Out calls so
          // every /api/v1/* test request from the browser is authenticated
          // with the same session the user opened the docs with.
          req.credentials = "include";
          return req;
        }
      });
    </script>
  </body>
</html>`;
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

    const YAML = await import("yaml");
    const specContent = fs.readFileSync(specPath, "utf-8");
    const spec = YAML.parse(specContent);

    const gate: Array<(req: Request, res: Response, next: NextFunction) => void> = [];
    if (env.NODE_ENV === "production") {
      gate.push(docsAuth as (req: Request, res: Response, next: NextFunction) => void);
    }

    const html = renderDocsHtml();

    app.get("/api/docs", ...gate, (_req, res) => {
      // Allow loading swagger-ui assets from the CDN and inline init script.
      res.set(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data: https:; font-src 'self' https://unpkg.com data:; connect-src 'self'"
      );
      res.type("html").send(html);
    });
    app.get("/api/docs.json", ...gate, (_req, res) => {
      res.json(spec);
    });

    const mode = env.NODE_ENV === "production" ? "super_admin-only (Basic or Bearer)" : "open";
    logger.info(`Swagger UI mounted at /api/docs (${mode}, spec: ${specPath})`);
  } catch (err) {
    logger.error("Failed to mount Swagger UI", err);
  }
}
