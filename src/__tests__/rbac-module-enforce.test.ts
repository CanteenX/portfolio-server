import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import request from "supertest";

import { MODULE_KEYS } from "@admin-platform/shared-types";
// module-menu-map is pure data with no env dependency, so it is safe to import
// at the top. `seed-rbac` is NOT: it pulls in config/env, which parses
// process.env at module-evaluation time — i.e. before the assignments below
// run — so every token would be signed with the secret from the developer's
// .env file and authentication would 401 before any assertion was reached. It
// is imported inside `before()` for that reason.
import { MODULE_MENU_URL, resolveRbacAction } from "../core/rbac/module-menu-map";
import { TEST_CLIENT_CODE, createActor, createRole, seedMenusAndActions, type SeededActor } from "./helpers/rbac-fixtures";

/**
 * The A-4 gate: proof that flipping RBAC_MODULE_MODE to "enforce" is safe.
 *
 * A-4 turns 158 route registrations from a rubber stamp into real grant checks,
 * across all 14 modules at once. The failure mode is not subtle — it is every
 * non-super-admin losing a module simultaneously — and the two ways it happens
 * are both silent until the flip:
 *
 *   1. A module has no MenuMaster row, so the lookup finds nothing and denies.
 *      This is exactly what the whatsapp gap was.
 *   2. The feature-flag guard gets reordered behind the RBAC guard, changing a
 *      disabled module's answer from FEATURE_DISABLED to FORBIDDEN.
 *
 * Both are asserted below against the real seed data rather than a fixture, so
 * the next module added cannot reintroduce either by omission.
 *
 * Everything here runs with RBAC_MODULE_MODE=enforce. Testing the enforce path
 * in shadow mode would assert nothing: shadow always calls next().
 */

const JWT_SECRET_SUPER_ADMIN = "enforce_test_super_secret";
const JWT_SECRET_ADMIN = "enforce_test_admin_secret";

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
process.env.RBAC_MODULE_MODE = "enforce";

let mongoServer: MongoMemoryReplSet;
let app: any;

let UserModel: any;
let EmployeeModel: any;
let RoleMasterModel: any;
let MenuMasterModel: any;
let ActionTypeModel: any;

let menuIds: Record<string, string>;
let actionIds: Record<string, string>;
let MENU_TREE: any[];

/** Granted read+write on /chat only. Everything else must deny. */
let chatOnlyAdmin: SeededActor;
/** Has an employee row but no role at all — the "never onboarded" case. */
let rolelessAdmin: SeededActor;

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
  ({ MENU_TREE } = await import("../bootstrap/seed-rbac"));

  // Seeded from the real map, not a hand-written list: a module added without a
  // menu must fail here rather than in production.
  ({ menuIds, actionIds } = await seedMenusAndActions(
    { MenuMasterModel, ActionTypeModel },
    MODULE_KEYS.map((key) => MODULE_MENU_URL[key]),
    ["read", "write", "edit", "delete", "print", "mail"]
  ));

  const chatGrants = [
    { menuId: menuIds["/chat"], actionTypeId: actionIds.read },
    { menuId: menuIds["/chat"], actionTypeId: actionIds.write }
  ];
  const chatRoleId = await createRole({ RoleMasterModel }, "Chat Only", chatGrants, null);

  chatOnlyAdmin = await createActor(
    { UserModel, EmployeeModel },
    { email: "chat-only@test.local", roleId: chatRoleId, adminSecret: JWT_SECRET_ADMIN }
  );

  rolelessAdmin = await createActor(
    { UserModel, EmployeeModel },
    { email: "no-role@test.local", roleId: null, adminSecret: JWT_SECRET_ADMIN }
  );
});

after(async () => {
  await mongoose.disconnect();
  await mongoServer?.stop();
});

describe("A-4: every module can resolve its menu", () => {
  it("maps all 14 module keys to a menu URL", () => {
    for (const key of MODULE_KEYS) {
      assert.ok(MODULE_MENU_URL[key], `module "${key}" has no menu URL — enforcement would 403 it entirely`);
    }
    assert.equal(Object.keys(MODULE_MENU_URL).length, MODULE_KEYS.length);
  });

  it("has a seeded MenuMaster row for every mapped module URL", () => {
    // The whatsapp gap in one assertion. MENU_TREE is what production seeds, so
    // a mapped module missing from it is a guaranteed outage on the flip day.
    const seededUrls = new Set(MENU_TREE.flatMap((group: any) => (group.children ?? []).map((child: any) => child.menuUrl)));

    const missing = MODULE_KEYS.map((key) => MODULE_MENU_URL[key]).filter((url) => !seededUrls.has(url));

    assert.deepEqual(missing, [], `these module menus are not in the RBAC seed: ${missing.join(", ")}`);
  });

  it("resolves every legacy action spelling the module routes actually use", () => {
    // The 158 registrations pass module-prefixed strings like "chat.read".
    // A tail that maps to null is logged and ALLOWED, so an unmapped verb is a
    // silent hole in enforcement rather than a visible failure.
    for (const legacy of ["read", "create", "update", "delete", "export"]) {
      assert.ok(resolveRbacAction(`chat.${legacy}`), `"${legacy}" does not map to an RBAC action`);
    }
    assert.equal(resolveRbacAction("chat.read"), "read");
    assert.equal(resolveRbacAction("chat.create"), "write");
    assert.equal(resolveRbacAction("chat.update"), "edit");
    assert.equal(resolveRbacAction("chat.export"), "print");
    assert.equal(resolveRbacAction("chat.nonsense"), null);
  });
});

describe("A-4: enforcement denies and allows by grant", () => {
  it("allows a granted module through", async () => {
    const response = await request(app)
      .get("/api/v1/chat/conversations")
      .set("Authorization", `Bearer ${chatOnlyAdmin.token}`);

    // Asserting only `!== 403` would pass on a 401, which is how a broken
    // fixture reads as a green allow-test. The status must be a success.
    assert.ok(
      response.status >= 200 && response.status < 300,
      `granted admin got ${response.status}: ${JSON.stringify(response.body)}`
    );
  });

  it("denies a module the role was never granted", async () => {
    const response = await request(app)
      .get("/api/v1/calendar/events")
      .set("Authorization", `Bearer ${chatOnlyAdmin.token}`);

    assert.equal(response.status, 403);
  });

  it("denies a write on a module granted only read", async () => {
    const readOnlyRoleId = await createRole(
      { RoleMasterModel },
      "Calendar Read Only",
      [{ menuId: menuIds["/calendar"], actionTypeId: actionIds.read }],
      null
    );
    const reader = await createActor(
      { UserModel, EmployeeModel },
      { email: `cal-reader-${Date.now()}@test.local`, roleId: readOnlyRoleId, adminSecret: JWT_SECRET_ADMIN }
    );

    const read = await request(app)
      .get("/api/v1/calendar/events")
      .set("Authorization", `Bearer ${reader.token}`);
    assert.ok(read.status >= 200 && read.status < 300, `read was granted but got ${read.status}`);

    const write = await request(app)
      .post("/api/v1/calendar/events")
      .set("Authorization", `Bearer ${reader.token}`)
      .send({ title: "x", startDate: new Date().toISOString(), endDate: new Date(Date.now() + 1000).toISOString() });
    assert.equal(write.status, 403, "write was not granted but was allowed");
  });

  it("also covers the generic /items routes, not just the bespoke ones", async () => {
    // These 70 routes (14 modules × 5) are registered through
    // bootstrap/module-registry.ts, which assembled its own guard chain and
    // omitted rbacModuleGuard. Without this assertion, enforcement looked
    // complete while every module's generic CRUD path stayed wide open to any
    // authenticated admin.
    const response = await request(app)
      .get("/api/v1/calendar/items")
      .set("Authorization", `Bearer ${chatOnlyAdmin.token}`);

    assert.equal(response.status, 403, "the generic resource route bypassed RBAC");
  });

  it("tells an admin with no role why, rather than returning a bare 403", async () => {
    const response = await request(app)
      .get("/api/v1/chat/conversations")
      .set("Authorization", `Bearer ${rolelessAdmin.token}`);

    assert.equal(response.status, 403);
    // "Forbidden" sends someone to the wrong place — they go looking for a
    // missing permission when the real answer is that nobody onboarded them.
    assert.match(String(response.body?.message ?? ""), /permission/i);
  });
});

describe("A-4: guard ordering is preserved (BLOCKER-2)", () => {
  it("still answers FEATURE_DISABLED, not FORBIDDEN, for a disabled module", async () => {
    // requireFeatureEnabled must stay AHEAD of the RBAC guard. If the RBAC
    // check runs first, this ungranted admin gets FORBIDDEN and anyone
    // debugging a switched-off module is sent chasing a permissions problem
    // that does not exist. Same status code, wrong diagnosis.
    const { FeatureConfigModel } = await import("../core/feature-flags/feature-config.model");
    // Everything except ecommerce stays enabled, so this cannot disturb the
    // assertions above no matter what order the suites run in.
    await FeatureConfigModel.updateOne(
      { clientCode: TEST_CLIENT_CODE },
      { $set: { enabledModules: MODULE_KEYS.filter((key) => key !== "ecommerce"), updatedBy: "test" } },
      { upsert: true }
    );

    const response = await request(app)
      .get("/api/v1/ecommerce/products")
      .set("Authorization", `Bearer ${chatOnlyAdmin.token}`);

    assert.equal(response.status, 403);
    assert.equal(
      response.body?.code,
      "FEATURE_DISABLED",
      `expected FEATURE_DISABLED but got ${response.body?.code} — the RBAC guard has been moved ahead of requireFeatureEnabled`
    );
  });
});
