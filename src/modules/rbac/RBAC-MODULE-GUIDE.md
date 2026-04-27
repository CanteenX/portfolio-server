# RBAC Module Implementation Guide

This guide explains how to wire a new backend module into the RBAC system so that access is controlled by menu grants and action-level permissions stored in the database.

---

## Concepts

| Concept | Model | Purpose |
|---|---|---|
| **Menu** | `MenuMaster` | A page/section the user can navigate to. Has a `menuUrl` (route path) and optional `parentMenu`. |
| **Action Type** | `ActionTypeMaster` | A granular capability: `view`, `create`, `edit`, `delete`, `export`, etc. Reused across menus. |
| **Role** | `RoleMaster` | A named permission set: an array of `{ menuId, actionTypeId, granted }` pairs. |
| **Employee** | `Employee` | Links a `User` to a `Role`. Stores `ancestorIds[]` for org-tree hierarchy. |

Access check: **user → employee → role → permissions[menuId + actionTypeId]**

---

## Step 1 — Seed a Menu record

Insert a `MenuMaster` record for the new module. This is typically done via the RBAC admin UI (`/rbac/menus`) or a one-time seed script.

```ts
await MenuMasterModel.create({
  clientCode: env.CLIENT_CODE,
  menuName: "Inventory",
  isRoot: false,
  parentMenu: warehouseSectionId,   // null if top-level
  menuUrl: "/modules/inventory",
  sequence: 10,
  icon: "Package",                  // any key from the ICON_MAP in Sidebar.jsx
  isActive: true,
  createdBy: null,
  updatedBy: "seed",
});
```

---

## Step 2 — Seed Action Type records

Action types are shared across all menus. Create them once and reuse.

```ts
const ACTION_CODES = ["view", "create", "edit", "delete", "export"];

for (const actionCode of ACTION_CODES) {
  await ActionTypeModel.updateOne(
    { clientCode: env.CLIENT_CODE, actionCode },
    { $setOnInsert: { clientCode: env.CLIENT_CODE, actionName: actionCode, actionCode, isActive: true } },
    { upsert: true }
  );
}
```

---

## Step 3 — Choose a middleware pattern

### Pattern A — `moduleGuards` (existing modules, feature-flag gated)

Use this for modules listed in `MODULE_KEYS` (the original feature-flag system).

```ts
import { moduleGuards } from "../../core/http/module-guards";

router.get(
  "/api/v1/inventory/items",
  ...moduleGuards("inventory", "inventory.read"),
  async (req, res, next) => { ... }
);
```

`moduleGuards` applies in order:
1. `authenticateJwt` — verifies JWT
2. `requireRole(["super_admin", "admin"])` — blocks non-admin tokens
3. `requireFeatureEnabled(moduleKey)` — checks feature flag in DB
4. `requirePermission(permission)` — checks legacy string permission

### Pattern B — `rbacGuards` (new RBAC-only modules)

Use this for modules controlled purely by `MenuMaster` + `ActionTypeMaster`.

```ts
import { authenticateJwt } from "../../core/auth/auth.middleware";
import { requireRole } from "../../core/rbac/role.middleware";
import { requireRbacPermission } from "../../core/rbac/rbac-permission.middleware";

// Read list — requires menu access + "view" action
router.get(
  "/api/v1/inventory/items",
  authenticateJwt,
  requireRole(["super_admin", "admin"]),
  requireRbacPermission("/modules/inventory", "view"),
  async (req, res, next) => { ... }
);

// Create — requires "create" action on the same menu
router.post(
  "/api/v1/inventory/items",
  authenticateJwt,
  requireRole(["super_admin", "admin"]),
  requireRbacPermission("/modules/inventory", "create"),
  async (req, res, next) => { ... }
);
```

---

## Step 4 — Implement `requireRbacPermission` middleware

Create `server/src/core/rbac/rbac-permission.middleware.ts`:

```ts
import { ERROR_CODES } from "@admin-platform/shared-types";
import type { NextFunction, Response } from "express";
import { AppError } from "../errors/app-error";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { EmployeeModel } from "../../modules/rbac/employee.model";
import { RoleMasterModel } from "../../modules/rbac/role-master.model";
import { MenuMasterModel } from "../../modules/rbac/menu-master.model";
import { ActionTypeModel } from "../../modules/rbac/action-type.model";
import { env } from "../../config/env";
import type { EmployeeDocument } from "../../modules/rbac/employee.model";
import type { RoleMasterDocument } from "../../modules/rbac/role-master.model";
import mongoose from "mongoose";

type LeanEmployee = EmployeeDocument & { _id: mongoose.Types.ObjectId };
type LeanRole = RoleMasterDocument & { _id: mongoose.Types.ObjectId };

/**
 * Checks that the authenticated user has a specific action granted
 * on a specific menu URL via their RoleMaster permissions.
 *
 * super_admin bypasses the check unconditionally.
 */
export function requireRbacPermission(menuUrl: string, actionCode: string) {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        next(new AppError(401, ERROR_CODES.UNAUTHORIZED, "Not authenticated"));
        return;
      }

      // super_admin has unrestricted access
      if (req.user.role === "super_admin") {
        next();
        return;
      }

      const employee = await EmployeeModel.findOne({ userId: new mongoose.Types.ObjectId(req.user.id) })
        .lean()
        .exec() as unknown as LeanEmployee | null;

      if (!employee?.roleId) {
        next(new AppError(403, ERROR_CODES.FORBIDDEN, "No role assigned"));
        return;
      }

      const [menu, actionType, role] = await Promise.all([
        MenuMasterModel.findOne({ clientCode: env.CLIENT_CODE, menuUrl, isActive: true })
          .lean()
          .exec() as Promise<{ _id: mongoose.Types.ObjectId } | null>,
        ActionTypeModel.findOne({ clientCode: env.CLIENT_CODE, actionCode, isActive: true })
          .lean()
          .exec() as Promise<{ _id: mongoose.Types.ObjectId } | null>,
        RoleMasterModel.findById(employee.roleId)
          .lean()
          .exec() as unknown as LeanRole | null,
      ]);

      if (!menu || !actionType || !role) {
        next(new AppError(403, ERROR_CODES.FORBIDDEN, "Permission denied"));
        return;
      }

      const menuId = String(menu._id);
      const actionTypeId = String(actionType._id);

      const granted = role.permissions.some(
        (p) => p.granted && String(p.menuId) === menuId && String(p.actionTypeId) === actionTypeId
      );

      if (!granted) {
        next(new AppError(403, ERROR_CODES.FORBIDDEN, "Permission denied"));
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
```

> **Performance note**: If the middleware is called frequently, cache `menuId` and `actionTypeId` lookups in-process (they change only when an admin updates the DB). A simple `Map<string, string>` with a 5-minute TTL is sufficient.

---

## Step 5 — Register routes in `app.ts`

```ts
import { inventoryRoutes } from "./modules/inventory/inventory.routes";

app.use(inventoryRoutes);
```

---

## Step 6 — Frontend: guard UI elements

Use `RequirePermission` to hide buttons and sections based on the RBAC permission map stored in `session.rbacPermissions`.

```jsx
import { RequirePermission } from "../../components/common/RequirePermission";

// Show the "Create" button only if the user has "create" on this menu
<RequirePermission menu="/modules/inventory" action="create">
  <Button onClick={openCreate}>New Item</Button>
</RequirePermission>

// Show the "Delete" button only if the user has "delete"
<RequirePermission menu="/modules/inventory" action="delete" fallback={null}>
  <Button variant="destructive" onClick={() => openDelete(item)}>Delete</Button>
</RequirePermission>
```

`RequirePermission` reads `session.rbacPermissions` — a `Record<menuUrl, actionCode[]>` map returned by `GET /api/v1/auth/user/me`. `super_admin` always passes.

---

## Step 7 — Frontend: add to MenuMaster via admin UI

After deploying the new module:

1. Log in as `super_admin`
2. Go to **RBAC → Menus** (`/rbac/menus`)
3. Create a root section (if needed) or add a child menu under an existing section
4. Set `menuUrl` to the exact React route path (e.g. `/modules/inventory`)
5. Choose an icon name from the [Lucide icon set](https://lucide.dev) (the string must exist in `ICON_MAP` in `Sidebar.jsx`)
6. Go to **RBAC → Roles** (`/rbac/roles`)
7. Edit the relevant role and toggle the new menu + action checkboxes in the permission matrix
8. The sidebar will show the new menu immediately for users whose role grants it

---

## Reference: full middleware stack

```
Request
  │
  ▼
authenticateJwt          — verifies JWT, attaches req.user { id, email, role }
  │
  ▼
requireRole(["super_admin","admin"])   — blocks non-admin tokens (401/403)
  │
  ▼
requireRbacPermission(menuUrl, actionCode)
  │  super_admin → skip
  │  admin       → employee → role → permissions lookup → 403 if not granted
  ▼
Route handler
```

---

## Reference: `session.rbacPermissions` shape (frontend)

```ts
// Populated by GET /api/v1/auth/user/me, merged into AuthContext session
type RbacPermissions = Record<string, string[]>;
// Example:
{
  "/modules/inventory":  ["view", "create", "edit"],
  "/rbac/roles":         ["view"],
  "/settings/audit-log": ["view", "export"],
}
```

`super_admin` receives every menu with every action code.
`admin` receives only the menus and actions their `RoleMaster` grants.
