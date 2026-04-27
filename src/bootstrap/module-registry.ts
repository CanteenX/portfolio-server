import type { Application, RequestHandler } from "express";
import { authenticateJwt } from "../core/auth/auth.middleware";
import { requireFeatureEnabled } from "../core/feature-flags/feature.middleware";
import { requirePermission } from "../core/rbac/permission.middleware";
import { requireRole } from "../core/rbac/role.middleware";
import type { ModuleManifest, ModuleRoute } from "./module.types";

function guardChain(route: ModuleRoute): RequestHandler[] {
  return [
    authenticateJwt,
    requireRole(["super_admin", "admin"]),
    requireFeatureEnabled(route.moduleKey),
    requirePermission(route.permission)
  ];
}

export function registerModuleRoutes(app: Application, manifests: ModuleManifest[]): void {
  manifests.forEach((manifest) => {
    manifest.routes.forEach((route) => {
      if (!route.permission) {
        throw new Error(`Missing permission metadata for route ${route.method.toUpperCase()} ${route.path}`);
      }
      app[route.method](route.path, ...guardChain(route), route.handler);
    });
  });
}
