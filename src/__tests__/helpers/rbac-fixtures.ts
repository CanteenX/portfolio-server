import mongoose from "mongoose";
import jwt from "jsonwebtoken";

/**
 * Fixtures for the RBAC suites.
 *
 * The one rule that matters here: a token's `sub` MUST be a real ObjectId
 * string belonging to a real User row. `loadRoleFor()` starts with
 * `mongoose.Types.ObjectId.isValid(userId)` and returns null when it fails, so
 * a token signed with `sub: "a-001"` resolves to "no role" no matter what the
 * database says. A deny test written that way passes whether or not the code
 * under test is correct, which is worse than having no test.
 */

export const TEST_CLIENT_CODE = "rbac-test";

export type SeededActor = {
  userId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  roleId: mongoose.Types.ObjectId | null;
  email: string;
  token: string;
};

type Models = {
  UserModel: mongoose.Model<any>;
  EmployeeModel: mongoose.Model<any>;
  RoleMasterModel: mongoose.Model<any>;
  MenuMasterModel: mongoose.Model<any>;
  ActionTypeModel: mongoose.Model<any>;
};

export function signAdmin(userId: mongoose.Types.ObjectId, email: string, secret: string): string {
  return jwt.sign({ sub: String(userId), email, role: "admin" }, secret, { expiresIn: "1h" });
}

export function signSuperAdmin(email: string, secret: string): string {
  return jwt.sign(
    { sub: String(new mongoose.Types.ObjectId()), email, role: "super_admin" },
    secret,
    { expiresIn: "1h" }
  );
}

/** Creates the menu + action rows grants are expressed against. */
export async function seedMenusAndActions(
  models: Pick<Models, "MenuMasterModel" | "ActionTypeModel">,
  menuUrls: string[],
  actionCodes: string[]
): Promise<{ menuIds: Record<string, string>; actionIds: Record<string, string> }> {
  const menuIds: Record<string, string> = {};
  const actionIds: Record<string, string> = {};

  for (const [index, menuUrl] of menuUrls.entries()) {
    const doc = await models.MenuMasterModel.create({
      clientCode: TEST_CLIENT_CODE,
      menuUrl,
      menuName: menuUrl,
      icon: "",
      sequence: index,
      isRoot: false,
      isParentMenu: false,
      parentMenu: null,
      isActive: true,
      createdBy: null,
      updatedBy: "test"
    });
    menuIds[menuUrl] = String(doc._id);
  }

  for (const actionCode of actionCodes) {
    const doc = await models.ActionTypeModel.create({
      clientCode: TEST_CLIENT_CODE,
      actionName: actionCode,
      actionCode,
      isActive: true
    });
    actionIds[actionCode] = String(doc._id);
  }

  return { menuIds, actionIds };
}

/** Builds a role granting exactly the given `menuId:actionId` pairs. */
export async function createRole(
  models: Pick<Models, "RoleMasterModel">,
  roleName: string,
  grants: Array<{ menuId: string; actionTypeId: string }>,
  createdBy: string | null = null
): Promise<mongoose.Types.ObjectId> {
  const doc = await models.RoleMasterModel.create({
    clientCode: TEST_CLIENT_CODE,
    roleName,
    permissions: grants.map((g) => ({ ...g, granted: true })),
    isActive: true,
    createdBy,
    updatedBy: "test"
  });
  return doc._id;
}

/** Creates a User + Employee pair and the token that authenticates as them. */
export async function createActor(
  models: Pick<Models, "UserModel" | "EmployeeModel">,
  options: {
    email: string;
    roleId: mongoose.Types.ObjectId | null;
    adminSecret: string;
    parentEmployeeId?: mongoose.Types.ObjectId | null;
    ancestorIds?: mongoose.Types.ObjectId[];
  }
): Promise<SeededActor> {
  const user = await models.UserModel.create({
    email: options.email,
    passwordHash: "$2a$10$notarealhashnotarealhashnotarealhashnotarealhashno",
    role: "admin"
  });

  const employee = await models.EmployeeModel.create({
    clientCode: TEST_CLIENT_CODE,
    userId: user._id,
    employeeName: options.email.split("@")[0],
    emailOffice: options.email,
    department: "",
    contact: "",
    roleId: options.roleId,
    parentEmployeeId: options.parentEmployeeId ?? null,
    ancestorIds: options.ancestorIds ?? [],
    isActive: true,
    createdBy: null,
    updatedBy: "test"
  });

  return {
    userId: user._id,
    employeeId: employee._id,
    roleId: options.roleId,
    email: options.email,
    token: signAdmin(user._id, options.email, options.adminSecret)
  };
}
