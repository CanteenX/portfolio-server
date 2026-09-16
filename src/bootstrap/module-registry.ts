import type { Application, RequestHandler } from "express";
import { moduleGuards } from "../core/http/module-guards";
import type { ModuleManifest, ModuleRoute } from "./module.types";

/**
 * Delegates to `moduleGuards` rather than assembling its own chain.
 *
 * This used to build the chain by hand and stopped at `requirePermission` —
 * meaning it omitted `rbacModuleGuard`. That left the 70 generic CRUD routes
 * registered here (14 modules × 5) outside RBAC entirely: after A-4 flipped to
 * enforce, GET /api/v1/chat/conversations would be grant-checked while
 * GET /api/v1/chat/items would not, and an ungranted admin could still list and
 * delete a module's records through the generic path.
 *
 * Two chains for the same modules is the bug. There is now one.
 */
function guardChain(route: ModuleRoute, permission: string): RequestHandler[] {
  return moduleGuards(route.moduleKey, permission) as RequestHandler[];
}

export function registerModuleRoutes(app: Application, manifests: ModuleManifest[]): void {
  manifests.forEach((manifest) => {
    manifest.routes.forEach((route) => {
      // Kept as a hard failure at boot: a route registered without a
      // permission string cannot have its RBAC action resolved, and
      // rbacModuleGuard treats an unresolvable action as "allow and log".
      // Starting up with such a route would be a silent hole.
      const { permission } = route;
      if (!permission) {
        throw new Error(`Missing permission metadata for route ${route.method.toUpperCase()} ${route.path}`);
      }
      app[route.method](route.path, ...guardChain(route, permission), route.handler);
    });
  });
}
