import assert from "node:assert/strict";
import { describe, it, before, after, beforeEach } from "node:test";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";

import { TEST_CLIENT_CODE } from "./helpers/rbac-fixtures";

/**
 * The seed runs on every cold start, so "idempotent" is not a nicety here — a
 * seed that duplicates rows produces two menus with the same URL, and
 * `resolveMenuId` takes whichever one `findOne` returns. Grants attached to the
 * other become invisible, intermittently, per instance.
 *
 * The second concern is the backfill. It promotes admins holding no effective
 * grants to Administrator, which is the right default during migration and a
 * back door afterwards: it cannot distinguish "never configured" from "access
 * deliberately removed". `accessLocked` is what makes a revocation stick, and
 * these tests are the only thing standing between that flag and a future
 * refactor that quietly drops it.
 */

process.env.NODE_ENV = "test";
process.env.PORT = "0";
process.env.MONGO_URI = "placeholder";
process.env.JWT_SECRET_SUPER_ADMIN = "seed_test_super_secret";
process.env.JWT_SECRET_ADMIN = "seed_test_admin_secret";
process.env.JWT_EXPIRES_IN = "1d";
process.env.CLIENT_CODE = TEST_CLIENT_CODE;
process.env.CORS_ORIGINS = "http://localhost:3000";
process.env.TRUST_PROXY = "0";
process.env.ENABLE_SEED = "false";
process.env.RBAC_MODULE_MODE = "off";
process.env.RBAC_BACKFILL_ENABLED = "true";

let mongoServer: MongoMemoryReplSet;

let seedRbacBaseline: () => Promise<void>;
let UserModel: any;
let EmployeeModel: any;
let RoleMasterModel: any;
let MenuMasterModel: any;
let ActionTypeModel: any;
let AuditLogModel: any;

/**
 * Clears one permission, the way the admin panel does.
 *
 * `arrayFilters` rather than the positional `$`: with two dotted conditions on
 * the same array, `$` binds to whichever element satisfied the FIRST one, so
 * `permissions.menuId` + `permissions.actionTypeId` can update a row matching
 * neither pair in full.
 */
async function untick(
  roleId: mongoose.Types.ObjectId,
  target: { menuId: string; actionTypeId: string }
): Promise<void> {
  await RoleMasterModel.updateOne(
    { _id: roleId },
    { $set: { "permissions.$[p].granted": false } },
    {
      arrayFilters: [
        { "p.menuId": String(target.menuId), "p.actionTypeId": String(target.actionTypeId) }
      ]
    }
  ).exec();
}

async function createAdminUser(email: string): Promise<mongoose.Types.ObjectId> {
  const user = await UserModel.create({
    email,
    passwordHash: "$2a$10$notarealhashnotarealhashnotarealhashnotarealhashno",
    role: "admin"
  });
  return user._id;
}

before(async () => {
  mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = mongoServer.getUri();
  process.env.MONGO_URI = uri;
  await mongoose.connect(uri);

  ({ seedRbacBaseline } = await import("../bootstrap/seed-rbac"));
  ({ UserModel } = await import("../core/auth/user.model"));
  ({ EmployeeModel } = await import("../modules/rbac/employee.model"));
  ({ RoleMasterModel } = await import("../modules/rbac/role-master.model"));
  ({ MenuMasterModel } = await import("../modules/rbac/menu-master.model"));
  ({ ActionTypeModel } = await import("../modules/rbac/action-type.model"));
  ({ AuditLogModel } = await import("../core/audit/audit-log.model"));
});

after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// ── Idempotency ───────────────────────────────────────────────────────────────

describe("A-5: the RBAC seed is idempotent", () => {
  it("creates no duplicate rows across repeated runs", async () => {
    await seedRbacBaseline();

    const menusAfterFirst = await MenuMasterModel.countDocuments({ clientCode: TEST_CLIENT_CODE });
    const actionsAfterFirst = await ActionTypeModel.countDocuments({ clientCode: TEST_CLIENT_CODE });
    assert.ok(menusAfterFirst > 0, "the seed must actually create menus");
    assert.ok(actionsAfterFirst > 0);

    await seedRbacBaseline();
    await seedRbacBaseline();

    assert.equal(
      await MenuMasterModel.countDocuments({ clientCode: TEST_CLIENT_CODE }),
      menusAfterFirst
    );
    assert.equal(
      await ActionTypeModel.countDocuments({ clientCode: TEST_CLIENT_CODE }),
      actionsAfterFirst
    );
  });

  it("leaves exactly one row per menu URL", async () => {
    // Duplicates would not fail any count assertion above if the seed created
    // two on the first run, so check the shape directly.
    const duplicates = await MenuMasterModel.aggregate([
      { $match: { clientCode: TEST_CLIENT_CODE } },
      { $group: { _id: "$menuUrl", n: { $sum: 1 } } },
      { $match: { n: { $gt: 1 } } }
    ]);

    assert.deepEqual(duplicates, [], "a duplicated menu URL makes grants resolve at random");
  });

  it("seeds the legal menu but grants it to nobody", async () => {
    // B-6. The screen is super-admin-only, and the mechanism for that is the
    // absence of a grant — requireRbacPermission bypasses for super_admin and
    // for nobody else. So the menu must exist (or the guard cannot resolve it
    // and even the owner gets a 403) while Administrator must not hold a single
    // permission row against it.
    const legal = await MenuMasterModel.findOne({
      clientCode: TEST_CLIENT_CODE,
      menuUrl: "/portfolio/legal"
    })
      .lean()
      .exec();
    assert.ok(legal, "the guard resolves menus by URL — an unseeded row 403s for everyone");

    const role = await RoleMasterModel.findOne({
      clientCode: TEST_CLIENT_CODE,
      roleName: "Administrator"
    })
      .lean()
      .exec();

    const granted = role.permissions.filter(
      (p: { menuId: string }) => String(p.menuId) === String(legal._id)
    );
    assert.deepEqual(granted, [], "a delegated legal grant defeats the whole point of the reservation");
  });

  it("preserves an operator's edits to a seeded row", async () => {
    const menu = await MenuMasterModel.findOne({ clientCode: TEST_CLIENT_CODE, isRoot: false })
      .lean()
      .exec();

    await MenuMasterModel.updateOne(
      { _id: menu._id },
      { $set: { menuName: "Renamed By Operator", sequence: 42 } }
    ).exec();

    await seedRbacBaseline();

    const after = await MenuMasterModel.findById(menu._id).lean().exec();
    assert.equal(after.menuName, "Renamed By Operator", "a redeploy must not undo a rename");
    assert.equal(after.sequence, 42);
  });

  it("leaves an unticked Administrator permission unticked", async () => {
    // What "the seed only adds" has to mean in practice. The admin panel writes
    // an explicit `granted: false` row when a box is cleared — it does not drop
    // the row — so an untick is a fact the seed can see and must respect.
    //
    // A row deleted outright is a different matter: nothing distinguishes it
    // from a pair the role has never been offered, which is exactly what a
    // newly seeded menu looks like. The seed re-grants those by design, and the
    // test below depends on it.
    const role = await RoleMasterModel.findOne({
      clientCode: TEST_CLIENT_CODE,
      roleName: "Administrator"
    })
      .lean()
      .exec();

    const target = role.permissions[role.permissions.length - 1];
    await untick(role._id, target);

    await seedRbacBaseline();

    const after = await RoleMasterModel.findById(role._id).lean().exec();
    const entry = after.permissions.find(
      (p: any) =>
        String(p.menuId) === String(target.menuId) &&
        String(p.actionTypeId) === String(target.actionTypeId)
    );

    assert.equal(entry.granted, false, "the seed re-granted a permission the owner removed");
  });

  it("does not resurrect an unticked permission as a second granted entry", async () => {
    // The failure mode `$addToSet` produced: the unticked row stays, a granted
    // duplicate appears beside it, and the permission check finds the latter.
    const role = await RoleMasterModel.findOne({
      clientCode: TEST_CLIENT_CODE,
      roleName: "Administrator"
    })
      .lean()
      .exec();

    const target = role.permissions[0];
    await untick(role._id, target);

    await seedRbacBaseline();

    const after = await RoleMasterModel.findById(role._id).lean().exec();
    const entries = after.permissions.filter(
      (p: any) =>
        String(p.menuId) === String(target.menuId) &&
        String(p.actionTypeId) === String(target.actionTypeId)
    );

    assert.equal(entries.length, 1, "the seed duplicated a permission row");
    assert.equal(entries[0].granted, false, "an unticked permission must stay unticked");
  });

  it("still grants a genuinely new menu to Administrator", async () => {
    // The behaviour the additive pass exists for: a screen added in a release
    // must not require hand-granting before anyone can reach it.
    const role = await RoleMasterModel.findOne({
      clientCode: TEST_CLIENT_CODE,
      roleName: "Administrator"
    })
      .lean()
      .exec();

    const before = role.permissions.length;
    const menu = await MenuMasterModel.findOne({ clientCode: TEST_CLIENT_CODE, isRoot: false })
      .lean()
      .exec();

    await RoleMasterModel.updateOne(
      { _id: role._id },
      {
        $pull: {
          permissions: { menuId: String(menu._id) }
        }
      }
    ).exec();

    const trimmed = await RoleMasterModel.findById(role._id).lean().exec();
    assert.ok(trimmed.permissions.length < before, "fixture failed to remove the menu's grants");

    await seedRbacBaseline();

    const after = await RoleMasterModel.findById(role._id).lean().exec();
    assert.equal(after.permissions.length, before, "a re-seeded menu must regain its grants");
  });
});

// ── The backfill and the lock ─────────────────────────────────────────────────

describe("A-5: accessLocked survives a seed run", () => {
  beforeEach(async () => {
    await EmployeeModel.deleteMany({ emailOffice: /locked|unlocked/ }).exec();
    await UserModel.deleteMany({ email: /locked|unlocked/ }).exec();
  });

  it("promotes an admin who has no effective grants", async () => {
    const userId = await createAdminUser("unlocked-admin@test.local");

    await seedRbacBaseline();

    const employee = await EmployeeModel.findOne({ userId }).lean().exec();
    assert.ok(employee, "an admin user with no employee row should get one");
    assert.ok(employee.roleId, "and a role, or enforcement locks them out entirely");
  });

  it("refuses to re-promote an access-locked admin", async () => {
    const userId = await createAdminUser("locked-admin@test.local");
    await seedRbacBaseline();

    // Somebody strips their access on purpose.
    await EmployeeModel.updateOne(
      { userId },
      { $set: { roleId: null, accessLocked: true } }
    ).exec();

    await seedRbacBaseline();

    const employee = await EmployeeModel.findOne({ userId }).lean().exec();
    assert.equal(
      employee.roleId,
      null,
      "the seed handed back access that was deliberately removed"
    );
  });

  it("locks access when an employee is deactivated, so a redeploy cannot revive it", async () => {
    const userId = await createAdminUser("locked-leaver@test.local");
    await seedRbacBaseline();

    // What PUT /employees/:id/status now writes.
    await EmployeeModel.updateOne(
      { userId },
      { $set: { isActive: false, accessLocked: true, roleId: null } }
    ).exec();

    await seedRbacBaseline();

    const employee = await EmployeeModel.findOne({ userId }).lean().exec();
    assert.equal(employee.isActive, false);
    assert.equal(employee.roleId, null);
  });

  it("records a promotion in the audit log, not just in stdout", async () => {
    const userId = await createAdminUser("unlocked-audited@test.local");
    await seedRbacBaseline();

    const employee = await EmployeeModel.findOne({ userId }).lean().exec();
    await EmployeeModel.updateOne({ _id: employee._id }, { $set: { roleId: null } }).exec();

    await seedRbacBaseline();

    const entry = await AuditLogModel.findOne({
      action: "rbac.employee.seed_promoted",
      entityId: String(employee._id)
    })
      .lean()
      .exec();

    assert.ok(entry, "a seed-time grant of full access must be traceable after the fact");
    assert.equal(entry.before.roleId, null);
  });
});
