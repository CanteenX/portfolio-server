import type { RoleKey } from "@admin-platform/shared-types";
import type { Request } from "express";

export type AuthUser = {
  id: string;
  email: string;
  role: RoleKey;
};

export type AuthenticatedRequest = Request & {
  user?: AuthUser;
};
