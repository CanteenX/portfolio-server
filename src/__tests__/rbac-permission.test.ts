import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";

import { TEST_CLIENT_CODE, createActor, createRole, seedMenusAndActions } from "./helpers/rbac-fixtures";

/**
 * The permission resolver itself.
 *
 * Tested below the HTTP layer because the properties that matter here are
 * answers, not status codes: `checkRbacPermission` deliberately returns
 * `menuFound` / `actionFound` / `hasRole` / `allowed` separately, and a route
 * collapses all four into one 403. Asserting through a route would therefore
 * confirm the collapse and nothing else — a missing seed row and a revoked
 * grant would look identical, which is precisely the confusion the split
 * return exists to prevent.
 *
 * The caching contract is the other reason. Menu and action lookups are cached
 * for a minute; grants are not, and must not be, or revoking a role would leave
 * the user working for up to a minute after being locked out.
 */

process.env.NODE_ENV = "test";
process.env.PORT = "0";
process.env.MONGO_URI = "placeholder";
process.env.JWT_SECRET_SUPER_ADMIN = "permission_test_super_secret";
process.env.JWT_SECRET_ADMIN = "permission_test_admin_secret";
process.env.JWT_EXPIRES_IN = "1d";
process.env.CLIENT_CODE = TEST_CLIENT_CODE;
process.env.CORS_ORIGINS = "http://localhost:3000";
process.env.TRUST_PROXY = "0";
process.env.ENABLE_SEED = "false";
process.env.RBAC_MODULE_MODE = "off";

let mongoServer: MongoMemoryReplSet;

let UserModel: any;
let EmployeeModel: any;
let RoleMasterModel: any;
let MenuMasterModel: any;
let ActionTypeModel: any;

let checkRbacPermission: (
  userId: string,
  menuUrl: string,
  actionCode: string
) => Promise<{ menuFound: boolean; actionFound: boolean; hasRole: boolean; allowed: boolean }>;
let invalidateRbacLookups: () => void;

let menuIds: Record<string, string>;
let actionIds: Record<string, string>;

let readerRoleId: mongoose.Types.ObjectId;
let reader: Awaited<ReturnType<typeof createActor>>;

const GRANTED_MENU = "/portfolio/projects";
const UNGRANTED_MENU = "/portfolio/team";

before(async () => {
  mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = mongoServer.getUri();
  process.env.MONGO_URI = uri;
  await mongoose.connect(uri);

  ({ UserModel } = await import("../core/auth/user.model"));
  ({ EmployeeModel } = await import("../modules/rbac/employee.model"));
  ({ RoleMasterModel } = await import("../modules/rbac/role-master.model"));
  ({ MenuMasterModel } = await import("../modules/rbac/menu-master.model"));
  ({ ActionTypeModel } = await import("../modules/rbac/action-type.model"));
  ({ checkRbacPermission, invalidateRbacLookups } = await import(
    "../core/rbac/rbac-permission.middleware"
  ));

  ({ menuIds, actionIds } = await seedMenusAndActions(
    { MenuMasterModel, ActionTypeModel },
    [GRANTED_MENU, UNGRANTED_MENU],
    ["read", "write", "edit", "delete"]
  ));

  readerRoleId = await createRole({ RoleMasterModel }, "Reader", [
    { menuId: menuIds[GRANTED_MENU], actionTypeId: actionIds.read }
  ]);

  reader = await createActor(
    { UserModel, EmployeeModel },
    { email: "reader@test.local", roleId: readerRoleId, adminSecret: "permission_test_admin_secret" }
  );
});

after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// ── Deny by default ───────────────────────────────────────────────────────────

describe("A-5: the resolver denies by default", () => {
  it("allows exactly what was granted", async () => {
    const answer = await checkRbacPermission(String(reader.userId), GRANTED_MENU, "read");
    assert.deepEqual(answer, { menuFound: true, actionFound: true, hasRole: true, allowed: true });
  });

  it("refuses an action that was not granted on a menu that was", async () => {
    const answer = await checkRbacPermission(String(reader.userId), GRANTED_MENU, "delete");
    assert.equal(answer.allowed, false);
    assert.equal(answer.hasRole, true, "the cause is the missing grant, not a missing role");
  });

  it("refuses a menu that was not granted at all", async () => {
    const answer = await checkRbacPermission(String(reader.userId), UNGRANTED_MENU, "read");
    assert.equal(answer.allowed, false);
  });

  it("reports an unseeded menu as menuFound:false, not as a permissions failure", async () => {
    // This distinction is the whole reason the return type is not a boolean.
    // "The seed has not run" and "your role lacks this" send an operator to
    // completely different places.
    const answer = await checkRbacPermission(String(reader.userId), "/never/seeded", "read");
    assert.equal(answer.menuFound, false);
    assert.equal(answer.allowed, false);
  });

  it("reports an unknown action as actionFound:false", async () => {
    const answer = await checkRbacPermission(String(reader.userId), GRANTED_MENU, "teleport");
    assert.equal(answer.actionFound, false);
    assert.equal(answer.allowed, false);
  });
});

// ── Who counts as having a role ───────────────────────────────────────────────

describe("A-5: role resolution", () => {
  it("treats a non-ObjectId subject as role-less rather than throwing", async () => {
    // Tokens predating the employee model carry subjects like "a-001". They
    // must resolve to "no role", not to a 500 — and no test may rely on this
    // path to produce its denials.
    const answer = await checkRbacPermission("a-001", GRANTED_MENU, "read");
    assert.equal(answer.hasRole, false);
    assert.equal(answer.allowed, false);
  });

  it("treats a user with no employee record as role-less", async () => {
    const answer = await checkRbacPermission(String(new mongoose.Types.ObjectId()), GRANTED_MENU, "read");
    assert.equal(answer.hasRole, false);
  });

  it("treats an employee with no role as role-less", async () => {
    const orphan = await createActor(
      { UserModel, EmployeeModel },
      { email: "no-role@test.local", roleId: null, adminSecret: "permission_test_admin_secret" }
    );

    const answer = await checkRbacPermission(String(orphan.userId), GRANTED_MENU, "read");
    assert.equal(answer.hasRole, false);
  });

  it("revokes access the moment the employee is deactivated", async () => {
    const leaver = await createActor(
      { UserModel, EmployeeModel },
      { email: "leaver@test.local", roleId: readerRoleId, adminSecret: "permission_test_admin_secret" }
    );

    assert.equal((await checkRbacPermission(String(leaver.userId), GRANTED_MENU, "read")).allowed, true);

    await EmployeeModel.updateOne({ _id: leaver.employeeId }, { $set: { isActive: false } }).exec();

    const answer = await checkRbacPermission(String(leaver.userId), GRANTED_MENU, "read");
    assert.equal(answer.hasRole, false, "a deactivated employee must lose access immediately");
    assert.equal(answer.allowed, false);
  });

  it("revokes access the moment the role is deactivated", async () => {
    const retiredRoleId = await createRole({ RoleMasterModel }, "Retired", [
      { menuId: menuIds[GRANTED_MENU], actionTypeId: actionIds.read }
    ]);
    const holder = await createActor(
      { UserModel, EmployeeModel },
      { email: "holder@test.local", roleId: retiredRoleId, adminSecret: "permission_test_admin_secret" }
    );

    assert.equal((await checkRbacPermission(String(holder.userId), GRANTED_MENU, "read")).allowed, true);

    await RoleMasterModel.updateOne({ _id: retiredRoleId }, { $set: { isActive: false } }).exec();

    assert.equal((await checkRbacPermission(String(holder.userId), GRANTED_MENU, "read")).hasRole, false);
  });
});

// ── The caching contract ──────────────────────────────────────────────────────

describe("A-5: grants are never cached", () => {
  it("honours a revoked grant on the very next call", async () => {
    // The property that makes the menu/action cache acceptable. If grants were
    // cached too, a revoked role would keep working for up to a minute on every
    // instance that had already seen the user — the one failure mode nobody
    // would notice until it mattered.
    const revokeeRoleId = await createRole({ RoleMasterModel }, "Revokee", [
      { menuId: menuIds[GRANTED_MENU], actionTypeId: actionIds.read }
    ]);
    const revokee = await createActor(
      { UserModel, EmployeeModel },
      { email: "revokee@test.local", roleId: revokeeRoleId, adminSecret: "permission_test_admin_secret" }
    );

    assert.equal((await checkRbacPermission(String(revokee.userId), GRANTED_MENU, "read")).allowed, true);

    await RoleMasterModel.updateOne({ _id: revokeeRoleId }, { $set: { permissions: [] } }).exec();

    assert.equal(
      (await checkRbacPermission(String(revokee.userId), GRANTED_MENU, "read")).allowed,
      false,
      "a revoked grant must take effect on the next request, not after the lookup TTL"
    );
  });

  it("picks up a newly granted permission without waiting", async () => {
    const climberRoleId = await createRole({ RoleMasterModel }, "Climber", []);
    const climber = await createActor(
      { UserModel, EmployeeModel },
      { email: "climber@test.local", roleId: climberRoleId, adminSecret: "permission_test_admin_secret" }
    );

    assert.equal((await checkRbacPermission(String(climber.userId), GRANTED_MENU, "read")).allowed, false);

    await RoleMasterModel.updateOne(
      { _id: climberRoleId },
      {
        $set: {
          permissions: [
            { menuId: menuIds[GRANTED_MENU], actionTypeId: actionIds.read, granted: true }
          ]
        }
      }
    ).exec();

    assert.equal((await checkRbacPermission(String(climber.userId), GRANTED_MENU, "read")).allowed, true);
  });
});

describe("A-5: menu lookups are cached, and invalidation clears them", () => {
  it("keeps answering menuFound:false until the cache is invalidated", async () => {
    const LATE_MENU = "/portfolio/added-late";

    // Prime the negative entry.
    assert.equal((await checkRbacPermission(String(reader.userId), LATE_MENU, "read")).menuFound, false);

    await MenuMasterModel.create({
      clientCode: TEST_CLIENT_CODE,
      menuUrl: LATE_MENU,
      menuName: LATE_MENU,
      icon: "",
      sequence: 99,
      isRoot: false,
      isParentMenu: false,
      parentMenu: null,
      isActive: true,
      createdBy: null,
      updatedBy: "test"
    });

    assert.equal(
      (await checkRbacPermission(String(reader.userId), LATE_MENU, "read")).menuFound,
      false,
      "the miss is cached — this is why seeding a menu needs a minute before it resolves"
    );

    invalidateRbacLookups();

    assert.equal(
      (await checkRbacPermission(String(reader.userId), LATE_MENU, "read")).menuFound,
      true,
      "invalidation must clear the negative entry, or an in-process seed could never take effect"
    );
  });
});
