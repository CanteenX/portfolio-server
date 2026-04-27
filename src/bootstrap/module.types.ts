import type { ModuleKey } from "@admin-platform/shared-types";
import type { RequestHandler } from "express";

export type ModuleRoute = {
  method: "get" | "post" | "put" | "patch" | "delete";
  path: string;
  moduleKey: ModuleKey;
  permission?: string;
  handler: RequestHandler;
};

export type ModuleManifest = {
  moduleKey: ModuleKey;
  routes: ModuleRoute[];
};
