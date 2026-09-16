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
  type SeededActor
} from "./helpers/rbac-fixtures";

/**
 * Grant-containment, stated directly.
 *
 * `rbac-escalation.test.ts` proves the attack is closed. This suite pins the
 * rule that replaced the broken one, including the boundary the attack never
 * exercises: an EQUAL set must be allowed. If containment were implemented as a
 * strict subset, an admin could not clone their own role for a deputy — a
 * plausible "safer" reading that would quietly break delegation, and one no
 * escalation test would catch, because refusing too much never looks like a
 * security bug.
 *
 * It also pins the negative: authorship is irrelevant. The old check consulted
 * `createdBy` and skipped itself when it was null, which is exactly how every
 * seeded role slipped through.
 */

const JWT_SECRET_SUPER_ADMIN = "subset_test_super_secret";
const JWT_SECRET_ADMIN = "subset_test_admin_secret";

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

let assertPermissionsWithinCeiling: (
  actorGrants: Set<string>,
  next: Array<{ menuId: string; actionTypeId: string; granted: boolean }>
) => void;

let menuIds: Record<string, string>;
let actionIds: Record<string, string>;

/** Read+write on two menus. The ceiling every case below is measured against. */
let deputyRoleId: mongoose.Types.ObjectId;
let deputy: SeededActor;

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
  ({ assertPermissionsWithinCeiling } = await import("../modules/rbac/rbac.routes"));

  ({ menuIds, actionIds } = await seedMenusAndActions(
    { MenuMasterModel, ActionTypeModel },
    ["/portfolio/projects", "/portfolio/team", "/rbac/roles", "/rbac/employees"],
    ["read", "write", "edit", "delete"]
  ));

  const rbacScreenGrants = [menuIds["/rbac/roles"], menuIds["/rbac/employees"]].flatMap((menuId) =>
    Object.values(actionIds).map((actionTypeId) => ({ menuId, actionTypeId }))
  );

  deputyRoleId = await createRole({ RoleMasterModel }, "Deputy", [
    { menuId: menuIds["/portfolio/projects"], actionTypeId: actionIds.read },
    { menuId: menuIds["/portfolio/projects"], actionTypeId: actionIds.write },
    ...rbacScreenGrants
  ]);

  deputy = await createActor(
    { UserModel, EmployeeModel },
    { email: "deputy@test.local", roleId: deputyRoleId, adminSecret: JWT_SECRET_ADMIN }
  );
});

after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// ── The rule, in isolation ────────────────────────────────────────────────────

describe("A-5: containment predicate", () => {
  const A = "menu-a";
  const B = "menu-b";
  const read = "action-read";
  const write = "action-write";

  const ceiling = new Set([`${A}:${read}`, `${A}:${write}`, `${B}:${read}`]);

  it("allows a strict subset", () => {
    assert.doesNotThrow(() =>
      assertPermissionsWithinCeiling(ceiling, [{ menuId: A, actionTypeId: read, granted: true }])
    );
  });

  it("allows an EQUAL set — cloning your own role must stay possible", () => {
    assert.doesNotThrow(() =>
      assertPermissionsWithinCeiling(ceiling, [
        { menuId: A, actionTypeId: read, granted: true },
        { menuId: A, actionTypeId: write, granted: true },
        { menuId: B, actionTypeId: read, granted: true }
      ])
    );
  });

  it("refuses a single permission beyond the ceiling", () => {
    assert.throws(
      () =>
        assertPermissionsWithinCeiling(ceiling, [
          { menuId: A, actionTypeId: read, granted: true },
          { menuId: B, actionTypeId: write, granted: true }
        ]),
      /exceeding your current access level/i
    );
  });

  it("ignores ungranted rows — an unticked box is not a grant", () => {
    // The admin panel posts the full matrix, most of it granted:false. Treating
    // those as requests would make saving any role impossible.
    assert.doesNotThrow(() =>
      assertPermissionsWithinCeiling(ceiling, [
        { menuId: B, actionTypeId: write, granted: false },
        { menuId: A, actionTypeId: read, granted: true }
      ])
    );
  });

  it("treats an empty ceiling as permitting nothing", () => {
    assert.throws(() =>
      assertPermissionsWithinCeiling(new Set(), [
        { menuId: A, actionTypeId: read, granted: true }
      ])
    );
  });
});

// ── The rule over HTTP ────────────────────────────────────────────────────────

describe("A-5: containment holds when saving roles", () => {
  it("lets an admin create a role identical to their own", async () => {
    const res = await request(app)
      .post("/api/v1/rbac/roles")
      .set("Authorization", `Bearer ${deputy.token}`)
      .send({
        roleName: "Deputy Clone",
        permissions: [
          { menuId: menuIds["/portfolio/projects"], actionTypeId: actionIds.read, granted: true },
          { menuId: menuIds["/portfolio/projects"], actionTypeId: actionIds.write, granted: true }
        ]
      });

    assert.equal(res.status, 201, JSON.stringify(res.body));
  });

  it("refuses a role granting a menu the author cannot reach", async () => {
    const res = await request(app)
      .post("/api/v1/rbac/roles")
      .set("Authorization", `Bearer ${deputy.token}`)
      .send({
        roleName: "Overreach",
        permissions: [
          { menuId: menuIds["/portfolio/team"], actionTypeId: actionIds.read, granted: true }
        ]
      });

    assert.equal(res.status, 403);
    const saved = await RoleMasterModel.findOne({ roleName: "Overreach" }).lean().exec();
    assert.equal(saved, null, "a refused role must not be written");
  });

  it("refuses an action the author lacks on a menu they do hold", async () => {
    // The subtle one: the menu is granted, the action is not. A containment
    // check keyed on menu alone would wave this through.
    const res = await request(app)
      .post("/api/v1/rbac/roles")
      .set("Authorization", `Bearer ${deputy.token}`)
      .send({
        roleName: "Sneaky Delete",
        permissions: [
          { menuId: menuIds["/portfolio/projects"], actionTypeId: actionIds.delete, granted: true }
        ]
      });

    assert.equal(res.status, 403);
  });

  it("does not consult authorship — a role created by nobody is assignable when contained", async () => {
    const orphanRoleId = await createRole(
      { RoleMasterModel },
      "Authored By Nobody",
      [{ menuId: menuIds["/portfolio/projects"], actionTypeId: actionIds.read }],
      null
    );

    const hire = await createActor(
      { UserModel, EmployeeModel },
      {
        email: "contained-hire@test.local",
        roleId: null,
        adminSecret: JWT_SECRET_ADMIN,
        parentEmployeeId: deputy.employeeId,
        ancestorIds: [deputy.employeeId]
      }
    );

    const res = await request(app)
      .put(`/api/v1/rbac/employees/${hire.employeeId}`)
      .set("Authorization", `Bearer ${deputy.token}`)
      .send({ roleId: String(orphanRoleId) });

    assert.equal(res.status, 200, JSON.stringify(res.body));
  });
});
