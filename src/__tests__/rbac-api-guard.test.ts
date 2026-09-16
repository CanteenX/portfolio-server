import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import request from "supertest";

import {
  TEST_CLIENT_CODE,
  createActor,
  createRole,
  seedMenusAndActions,
  signSuperAdmin,
  type SeededActor
} from "./helpers/rbac-fixtures";

/**
 * The access-control screens are themselves access-controlled.
 *
 * Until A-2 they were not: any admin could read and write roles, menus, action
 * types and employees, because the routes checked only `requireRole("admin")`.
 * An admin who could edit roles could grant themselves anything, which makes
 * every other permission in the system advisory.
 *
 * The grants are ordinary menu grants — `/rbac/roles`, `/rbac/employees` and
 * friends are rows in MenuMaster like any screen — so the interesting case is
 * an admin with a perfectly good role that simply does not include them.
 */

const JWT_SECRET_SUPER_ADMIN = "api_guard_super_secret";
const JWT_SECRET_ADMIN = "api_guard_admin_secret";

process.env.NODE_ENV = "test";
process.env.PORT = "0";
process.env.MONGO_URI = "placeholder";
process.env.JWT_SECRET_SUPER_ADMIN = JWT_SECRET_SUPER_ADMIN;
process.env.JWT_SECRET_ADMIN = JWT_SECRET_ADMIN;
process.env.JWT_EXPIRES_IN = "1d";
process.env.CLIENT_CODE = TEST_CLIENT_CODE;
process.env.CORS_ORIGINS = "http://localhost:3000";
process.env.TRUST_PROXY = "0";
process.env.ENABLE_SEED = "false";
process.env.RBAC_MODULE_MODE = "off";

let mongoServer: MongoMemoryReplSet;
let app: any;

let UserModel: any;
let EmployeeModel: any;
let RoleMasterModel: any;
let MenuMasterModel: any;
let ActionTypeModel: any;

let menuIds: Record<string, string>;
let actionIds: Record<string, string>;

/** Holds content grants only — nothing on the RBAC screens. */
let outsider: SeededActor;
/** Holds read on the RBAC screens, and no write. */
let auditor: SeededActor;

const RBAC_SCREENS = [
  "/rbac/roles",
  "/rbac/employees",
  "/rbac/menus",
  "/rbac/actions"
] as const;

/** Holds `edit` on branding — the A-8 delegation, and nothing else. */
let brandingEditor: SeededActor;

before(async () => {
  mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = mongoServer.getUri();
  process.env.MONGO_URI = uri;
  await mongoose.connect(uri);

  const { createApp } = await import("../app");
  app = await createApp();

  ({ UserModel } = await import("../core/auth/user.model"));
  ({ EmployeeModel } = await import("../modules/rbac/employee.model"));
  ({ RoleMasterModel } = await import("../modules/rbac/role-master.model"));
  ({ MenuMasterModel } = await import("../modules/rbac/menu-master.model"));
  ({ ActionTypeModel } = await import("../modules/rbac/action-type.model"));

  ({ menuIds, actionIds } = await seedMenusAndActions(
    { MenuMasterModel, ActionTypeModel },
    ["/portfolio/projects", "/settings/branding", ...RBAC_SCREENS],
    ["read", "write", "edit", "delete"]
  ));

  const contentOnlyRoleId = await createRole({ RoleMasterModel }, "Content Only", [
    { menuId: menuIds["/portfolio/projects"], actionTypeId: actionIds.read },
    { menuId: menuIds["/portfolio/projects"], actionTypeId: actionIds.write }
  ]);

  const auditorRoleId = await createRole(
    { RoleMasterModel },
    "RBAC Auditor",
    RBAC_SCREENS.map((screen) => ({ menuId: menuIds[screen], actionTypeId: actionIds.read }))
  );

  outsider = await createActor(
    { UserModel, EmployeeModel },
    { email: "outsider@test.local", roleId: contentOnlyRoleId, adminSecret: JWT_SECRET_ADMIN }
  );

  auditor = await createActor(
    { UserModel, EmployeeModel },
    { email: "auditor@test.local", roleId: auditorRoleId, adminSecret: JWT_SECRET_ADMIN }
  );

  const brandingRoleId = await createRole({ RoleMasterModel }, "Brand Manager", [
    { menuId: menuIds["/settings/branding"], actionTypeId: actionIds.edit }
  ]);

  brandingEditor = await createActor(
    { UserModel, EmployeeModel },
    { email: "brand@test.local", roleId: brandingRoleId, adminSecret: JWT_SECRET_ADMIN }
  );
});

after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("A-5: the RBAC API requires RBAC grants", () => {
  for (const path of ["/api/v1/rbac/roles", "/api/v1/rbac/employees", "/api/v1/rbac/menus", "/api/v1/rbac/actions"]) {
    it(`refuses GET ${path} to an admin without the grant`, async () => {
      const res = await request(app)
        .get(path)
        .set("Authorization", `Bearer ${outsider.token}`);

      assert.equal(res.status, 403, `${path} was readable without a grant`);
    });
  }

  it("refuses role creation to a read-only auditor", async () => {
    const res = await request(app)
      .post("/api/v1/rbac/roles")
      .set("Authorization", `Bearer ${auditor.token}`)
      .send({ roleName: "Invented", permissions: [] });

    assert.equal(res.status, 403);
    assert.equal(await RoleMasterModel.countDocuments({ roleName: "Invented" }), 0);
  });

  it("refuses menu creation to a read-only auditor — menus are the grant surface itself", async () => {
    // A menu row is what a grant points at. An admin who can add one can invent
    // a screen, grant themselves everything on it, and the containment check
    // has nothing to push back with.
    const res = await request(app)
      .post("/api/v1/rbac/menus")
      .set("Authorization", `Bearer ${auditor.token}`)
      .send({ menuName: "Backdoor", menuUrl: "/backdoor", sequence: 1 });

    assert.equal(res.status, 403);
    assert.equal(await MenuMasterModel.countDocuments({ menuUrl: "/backdoor" }), 0);
  });

  it("lets the auditor read what they were granted", async () => {
    const res = await request(app)
      .get("/api/v1/rbac/roles")
      .set("Authorization", `Bearer ${auditor.token}`);

    assert.equal(res.status, 200);
  });

  it("still lets a super admin through", async () => {
    const res = await request(app)
      .get("/api/v1/rbac/roles")
      .set("Authorization", `Bearer ${signSuperAdmin("sa@test.local", JWT_SECRET_SUPER_ADMIN)}`);

    assert.equal(res.status, 200);
  });

  it("rejects an unauthenticated caller before any permission work", async () => {
    const res = await request(app).get("/api/v1/rbac/roles");
    assert.equal(res.status, 401);
  });
});

// ── A-8 delegation ────────────────────────────────────────────────────────────

describe("A-8: the delegable settings are reachable by grant", () => {
  it("lets a granted admin update branding", async () => {
    // The point of A-8. Before it, changing a logo required the one super
    // admin, so it was not a permission question at all — it was a queue.
    const res = await request(app)
      .put("/api/v1/system/branding")
      .set("Authorization", `Bearer ${brandingEditor.token}`)
      .send({ companyName: "Granted Co", logoUrl: "", primaryColor: "#123456" });

    assert.equal(res.status, 200, JSON.stringify(res.body));
  });

  it("still refuses an admin whose role omits branding", async () => {
    const res = await request(app)
      .put("/api/v1/system/branding")
      .set("Authorization", `Bearer ${outsider.token}`)
      .send({ companyName: "Not Allowed", logoUrl: "", primaryColor: "#000000" });

    assert.equal(res.status, 403);
  });

  it("does not let a branding grant reach system settings", async () => {
    // Delegating one settings screen must not delegate the section. Timezone
    // and currency stay super-admin-only.
    const res = await request(app)
      .put("/api/v1/system/settings")
      .set("Authorization", `Bearer ${brandingEditor.token}`)
      .send({ timezone: "UTC", defaultCurrency: "USD", locale: "en" });

    assert.equal(res.status, 403);
  });

  it("does not let a branding grant read the audit log", async () => {
    const res = await request(app)
      .get("/api/v1/system/audit-log")
      .set("Authorization", `Bearer ${brandingEditor.token}`);

    assert.equal(res.status, 403);
  });
});
