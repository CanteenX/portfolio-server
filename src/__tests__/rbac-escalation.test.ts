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
 * The privilege-escalation regression suite.
 *
 * The hole these cover: `PUT /api/v1/rbac/employees/:id` put the actor's own id
 * in `visibleIds`, so an admin could target their own employee row, and the
 * role check only refused roles with a `createdBy` outside their subtree.
 * Seeded roles — including the fully-granted "Administrator" — carry
 * `createdBy: null`, so the guard fell through entirely and any admin could
 * assign themselves Administrator with one HTTP call.
 *
 * The fix is grant-containment, NOT a tighter authorship test: authorship would
 * make Administrator unassignable and break onboarding, which is the lockout
 * this whole track exists to avoid.
 */

const JWT_SECRET_SUPER_ADMIN = "escalation_test_super_secret";
const JWT_SECRET_ADMIN = "escalation_test_admin_secret";

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

/** Fully granted — the seeded "Administrator" equivalent, authored by nobody. */
let administratorRoleId: mongoose.Types.ObjectId;
/** A deliberately narrow role: read on one menu. */
let narrowRoleId: mongoose.Types.ObjectId;

/** Holds `narrowRole`. The attacker in every escalation case below. */
let limitedAdmin: SeededActor;
/** Holds `administratorRole`. Must keep working — this is the onboarding path. */
let fullAdmin: SeededActor;
/** Reports to limitedAdmin. */
let subordinate: SeededActor;

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

  const models = { MenuMasterModel, ActionTypeModel };
  ({ menuIds, actionIds } = await seedMenusAndActions(
    models,
    // The /rbac/* rows are here because A-2 made the access-control screens
    // grantable like any other. Without them every request below 403s on the
    // menu guard, and the escalation assertions would pass for the wrong reason.
    ["/portfolio/projects", "/portfolio/team", "/settings/users", "/rbac/employees", "/rbac/roles"],
    ["read", "write", "edit", "delete"]
  ));

  const everyGrant = Object.values(menuIds).flatMap((menuId) =>
    Object.values(actionIds).map((actionTypeId) => ({ menuId, actionTypeId }))
  );

  /** Full control of the RBAC screens, and nothing else. */
  const rbacScreenGrants = [menuIds["/rbac/employees"], menuIds["/rbac/roles"]].flatMap((menuId) =>
    Object.values(actionIds).map((actionTypeId) => ({ menuId, actionTypeId }))
  );

  administratorRoleId = await createRole(
    { RoleMasterModel },
    "Administrator",
    everyGrant,
    // createdBy: null is the crux — the seeded role belongs to nobody, which is
    // precisely why the old authorship check never fired.
    null
  );

  // Deliberately narrow on content, deliberately FULL on the RBAC screens. That
  // combination is the realistic shape of the attacker: a team lead who may
  // manage their own reports but holds almost nothing else. If the escalation
  // were merely blocked by "no access to /rbac/employees" these tests would
  // prove nothing about containment.
  narrowRoleId = await createRole({ RoleMasterModel }, "Narrow", [
    { menuId: menuIds["/portfolio/projects"], actionTypeId: actionIds.read },
    ...rbacScreenGrants
  ]);

  limitedAdmin = await createActor(
    { UserModel, EmployeeModel },
    { email: "limited@test.local", roleId: narrowRoleId, adminSecret: JWT_SECRET_ADMIN }
  );

  fullAdmin = await createActor(
    { UserModel, EmployeeModel },
    { email: "full@test.local", roleId: administratorRoleId, adminSecret: JWT_SECRET_ADMIN }
  );

  subordinate = await createActor(
    { UserModel, EmployeeModel },
    {
      email: "sub@test.local",
      roleId: narrowRoleId,
      adminSecret: JWT_SECRET_ADMIN,
      parentEmployeeId: limitedAdmin.employeeId,
      ancestorIds: [limitedAdmin.employeeId]
    }
  );
});

after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// ── The exploit ───────────────────────────────────────────────────────────────

describe("A-1: privilege escalation is closed", () => {
  it("refuses an admin assigning themselves the fully-granted Administrator role", async () => {
    const res = await request(app)
      .put(`/api/v1/rbac/employees/${limitedAdmin.employeeId}`)
      .set("Authorization", `Bearer ${limitedAdmin.token}`)
      .send({ roleId: String(administratorRoleId) });

    assert.equal(res.status, 403);

    const after = await EmployeeModel.findById(limitedAdmin.employeeId).lean().exec();
    assert.equal(
      String(after.roleId),
      String(narrowRoleId),
      "the attacker's role must be unchanged on disk, not merely rejected in the response"
    );
  });

  it("refuses an admin granting a subordinate more than the admin holds", async () => {
    const res = await request(app)
      .put(`/api/v1/rbac/employees/${subordinate.employeeId}`)
      .set("Authorization", `Bearer ${limitedAdmin.token}`)
      .send({ roleId: String(administratorRoleId) });

    assert.equal(res.status, 403);

    const after = await EmployeeModel.findById(subordinate.employeeId).lean().exec();
    assert.equal(String(after.roleId), String(narrowRoleId));
  });

  it("refuses self-assignment at create time too", async () => {
    const res = await request(app)
      .post("/api/v1/rbac/employees")
      .set("Authorization", `Bearer ${limitedAdmin.token}`)
      .send({
        employeeName: "Smuggled",
        emailOffice: "smuggled@test.local",
        password: "correct-horse-battery",
        roleId: String(administratorRoleId)
      });

    assert.equal(res.status, 403);
    const created = await EmployeeModel.findOne({ emailOffice: "smuggled@test.local" }).lean().exec();
    assert.equal(created, null, "no employee should exist after a refused create");
  });

  it("refuses an admin editing the role they are themselves assigned", async () => {
    const res = await request(app)
      .put(`/api/v1/rbac/roles/${narrowRoleId}`)
      .set("Authorization", `Bearer ${limitedAdmin.token}`)
      .send({
        permissions: [
          { menuId: menuIds["/portfolio/projects"], actionTypeId: actionIds.read, granted: true }
        ]
      });

    assert.equal(res.status, 403);
  });

  it("refuses changing one's own office email — it cascades to the login address", async () => {
    const res = await request(app)
      .put(`/api/v1/rbac/employees/${limitedAdmin.employeeId}`)
      .set("Authorization", `Bearer ${limitedAdmin.token}`)
      .send({ emailOffice: "attacker-controlled@test.local" });

    assert.equal(res.status, 403);

    const user = await UserModel.findById(limitedAdmin.userId).lean().exec();
    assert.equal(user.email, "limited@test.local");
  });
});

// ── What must keep working ────────────────────────────────────────────────────

describe("A-1: legitimate administration still works", () => {
  it("lets an admin edit their own name, department and contact", async () => {
    const res = await request(app)
      .put(`/api/v1/rbac/employees/${limitedAdmin.employeeId}`)
      .set("Authorization", `Bearer ${limitedAdmin.token}`)
      .send({ employeeName: "Limited Renamed", department: "Ops", contact: "555" });

    assert.equal(res.status, 200);
    const after = await EmployeeModel.findById(limitedAdmin.employeeId).lean().exec();
    assert.equal(after.employeeName, "Limited Renamed");
    assert.equal(String(after.roleId), String(narrowRoleId));
  });

  it("lets a resubmitted form carry an unchanged roleId for self", async () => {
    // The admin panel posts the whole object back. Refusing a no-op would make
    // editing your own phone number impossible.
    const res = await request(app)
      .put(`/api/v1/rbac/employees/${limitedAdmin.employeeId}`)
      .set("Authorization", `Bearer ${limitedAdmin.token}`)
      .send({ employeeName: "Limited Renamed", roleId: String(narrowRoleId) });

    assert.equal(res.status, 200);
  });

  it("lets a fully-granted admin assign Administrator to a subordinate", async () => {
    // The case a tightened authorship check would have broken: `Administrator`
    // has createdBy: null, so "only roles you authored" would refuse it and
    // leave the owner unable to onboard anyone.
    const newHire = await createActor(
      { UserModel, EmployeeModel },
      {
        email: "newhire@test.local",
        roleId: null,
        adminSecret: JWT_SECRET_ADMIN,
        parentEmployeeId: fullAdmin.employeeId,
        ancestorIds: [fullAdmin.employeeId]
      }
    );

    const res = await request(app)
      .put(`/api/v1/rbac/employees/${newHire.employeeId}`)
      .set("Authorization", `Bearer ${fullAdmin.token}`)
      .send({ roleId: String(administratorRoleId) });

    assert.equal(res.status, 200);
    const after = await EmployeeModel.findById(newHire.employeeId).lean().exec();
    assert.equal(String(after.roleId), String(administratorRoleId));
  });

  it("lets a fully-granted admin assign a narrower role to a subordinate", async () => {
    const newHire = await createActor(
      { UserModel, EmployeeModel },
      {
        email: "newhire2@test.local",
        roleId: null,
        adminSecret: JWT_SECRET_ADMIN,
        parentEmployeeId: fullAdmin.employeeId,
        ancestorIds: [fullAdmin.employeeId]
      }
    );

    const res = await request(app)
      .put(`/api/v1/rbac/employees/${newHire.employeeId}`)
      .set("Authorization", `Bearer ${fullAdmin.token}`)
      .send({ roleId: String(narrowRoleId) });

    assert.equal(res.status, 200);
  });

  it("super_admin is unaffected", async () => {
    const res = await request(app)
      .put(`/api/v1/rbac/employees/${limitedAdmin.employeeId}`)
      .set("Authorization", `Bearer ${signSuperAdmin("sa@test.local", JWT_SECRET_SUPER_ADMIN)}`)
      .send({ roleId: String(administratorRoleId) });

    assert.equal(res.status, 200);

    // Put it back so later assertions about the attacker still hold.
    await EmployeeModel.updateOne(
      { _id: limitedAdmin.employeeId },
      { $set: { roleId: narrowRoleId } }
    ).exec();
  });
});

// ── Diagnosability ────────────────────────────────────────────────────────────

describe("A-1: failures explain themselves", () => {
  it("tells a role-less admin what to do instead of returning a bare 403", async () => {
    const orphan = await createActor(
      { UserModel, EmployeeModel },
      { email: "orphan@test.local", roleId: null, adminSecret: JWT_SECRET_ADMIN }
    );

    const res = await request(app)
      .put(`/api/v1/rbac/employees/${orphan.employeeId}`)
      .set("Authorization", `Bearer ${orphan.token}`)
      .send({ roleId: String(narrowRoleId) });

    assert.equal(res.status, 403);
    assert.match(String(res.body.message ?? ""), /super admin/i);
  });

  it("audit-logs a successful role assignment with before and after", async () => {
    const { AuditLogModel } = await import("../core/audit/audit-log.model");
    const newHire = await createActor(
      { UserModel, EmployeeModel },
      {
        email: "audited@test.local",
        roleId: null,
        adminSecret: JWT_SECRET_ADMIN,
        parentEmployeeId: fullAdmin.employeeId,
        ancestorIds: [fullAdmin.employeeId]
      }
    );

    await request(app)
      .put(`/api/v1/rbac/employees/${newHire.employeeId}`)
      .set("Authorization", `Bearer ${fullAdmin.token}`)
      .send({ roleId: String(narrowRoleId) })
      .expect(200);

    const entry = await AuditLogModel.findOne({
      action: "rbac.employee.role_assigned",
      entityId: String(newHire.employeeId)
    })
      .lean()
      .exec();

    assert.ok(entry, "a role change must leave an audit trail");
    assert.equal(entry.after.roleId, String(narrowRoleId));
    assert.equal(entry.before.roleId, null);
  });
});
