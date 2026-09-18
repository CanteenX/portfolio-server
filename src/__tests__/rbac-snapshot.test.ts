import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";

import { TEST_CLIENT_CODE, createActor, createRole } from "./helpers/rbac-fixtures";

/**
 * The navigation snapshot the sidebar is built from.
 *
 * The bug this pins: the Administrator role granted 38 screens and zero group
 * headers, so the sidebar — which only renders a child under a visible parent —
 * collapsed to three empty headings with 35 screens unreachable. A folder is not
 * a screen, so no role should have to hold a grant on it to navigate into it.
 *
 * The property that must NOT regress in fixing that: making a folder visible
 * must never make it *permitted*. Ancestors go into allowedMenus only; the
 * permission map, which the client gates actions on, stays exactly the role's
 * real grants.
 */

process.env.NODE_ENV = "test";
process.env.PORT = "0";
process.env.MONGO_URI = "placeholder";
process.env.JWT_SECRET_SUPER_ADMIN = "snapshot_test_super_secret";
process.env.JWT_SECRET_ADMIN = "snapshot_test_admin_secret";
process.env.JWT_EXPIRES_IN = "1d";
process.env.CLIENT_CODE = TEST_CLIENT_CODE;
process.env.CORS_ORIGINS = "http://localhost:3000";
process.env.TRUST_PROXY = "0";
process.env.ENABLE_SEED = "false";
process.env.RBAC_MODULE_MODE = "off";

let mongoServer: MongoMemoryReplSet;
let buildRbacSnapshot: (userId: string, role: string) => Promise<{
  permissions: Record<string, string[]>;
  allowedMenus: Array<{ menuUrl: string }>;
}>;

const ids: Record<string, string> = {};
let readAction: string;

async function menu(
  MenuMasterModel: any,
  menuUrl: string,
  parent: string | null,
  isActive = true
): Promise<string> {
  const doc = await MenuMasterModel.create({
    clientCode: TEST_CLIENT_CODE,
    menuUrl,
    menuName: menuUrl,
    icon: "",
    sequence: 0,
    isRoot: parent === null,
    isParentMenu: parent === null,
    parentMenu: parent ? new mongoose.Types.ObjectId(parent) : null,
    isActive,
    createdBy: null,
    updatedBy: "test"
  });
  return String(doc._id);
}

before(async () => {
  mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = mongoServer.getUri();
  process.env.MONGO_URI = uri;
  await mongoose.connect(uri);

  const { MenuMasterModel } = await import("../modules/rbac/menu-master.model");
  const { ActionTypeModel } = await import("../modules/rbac/action-type.model");
  const { RoleMasterModel } = await import("../modules/rbac/role-master.model");
  const { UserModel } = await import("../core/auth/user.model");
  const { EmployeeModel } = await import("../modules/rbac/employee.model");
  ({ buildRbacSnapshot } = await import("../core/rbac/rbac-permission.middleware"));

  // #portfolio (folder) > /portfolio/projects (screen)
  // #archive   (folder, INACTIVE) > /archive/old (screen)
  // #settings  (folder) > /settings/users (screen, not granted)
  ids.portfolio = await menu(MenuMasterModel, "#portfolio", null);
  ids.projects = await menu(MenuMasterModel, "/portfolio/projects", ids.portfolio);
  ids.archive = await menu(MenuMasterModel, "#archive", null, false);
  ids.old = await menu(MenuMasterModel, "/archive/old", ids.archive);
  ids.settings = await menu(MenuMasterModel, "#settings", null);
  ids.users = await menu(MenuMasterModel, "/settings/users", ids.settings);

  const action = await ActionTypeModel.create({
    clientCode: TEST_CLIENT_CODE,
    actionName: "read",
    actionCode: "read",
    isActive: true
  });
  readAction = String(action._id);

  // Grants leaf screens only — no folder — exactly like the live Administrator role.
  const roleId = await createRole({ RoleMasterModel }, "LeafOnly", [
    { menuId: ids.projects, actionTypeId: readAction },
    { menuId: ids.old, actionTypeId: readAction }
  ]);
  const actor = await createActor(
    { UserModel, EmployeeModel },
    { email: "leaf@test.local", roleId, adminSecret: "snapshot_test_admin_secret" }
  );
  ids.actor = String(actor.userId);
});

after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("buildRbacSnapshot — navigation ancestors", () => {
  it("includes the folder containing a granted screen, though the role never granted it", async () => {
    const snap = await buildRbacSnapshot(ids.actor, "admin");
    const urls = snap.allowedMenus.map((m) => m.menuUrl);
    assert.ok(urls.includes("/portfolio/projects"), "the granted screen is visible");
    assert.ok(
      urls.includes("#portfolio"),
      "its folder must be visible, or the sidebar orphans the screen and it becomes unreachable"
    );
  });

  it("never grants an action on a folder it only made visible", async () => {
    const snap = await buildRbacSnapshot(ids.actor, "admin");
    assert.equal(
      snap.permissions["#portfolio"],
      undefined,
      "visibility is navigation, not permission — the folder must not appear in the permission map"
    );
    assert.deepEqual(snap.permissions["/portfolio/projects"], ["read"]);
  });

  it("does not surface a folder whose screens the role cannot reach", async () => {
    const snap = await buildRbacSnapshot(ids.actor, "admin");
    const urls = snap.allowedMenus.map((m) => m.menuUrl);
    assert.ok(!urls.includes("#settings"), "an ungranted branch stays hidden entirely");
    assert.ok(!urls.includes("/settings/users"));
  });

  it("does not resurrect an inactive folder", async () => {
    const snap = await buildRbacSnapshot(ids.actor, "admin");
    const urls = snap.allowedMenus.map((m) => m.menuUrl);
    assert.ok(
      !urls.includes("#archive"),
      "a deactivated folder must stay hidden even when a granted screen sits under it"
    );
  });
});
