import type { MenuPermissionEntry } from "@admin-platform/shared-types";
import { env } from "../../config/env";
import { CustomRoleModel, type CustomRoleDocument, type StructuredPermissionDoc } from "./custom-role.model";
import { MenuItemModel } from "../../modules/menu/menu.model";

export type CustomRolePayload = {
  name: string;
  permissions: string[];
};

export type CustomRoleResponse = {
  id: string;
  name: string;
  permissions: string[];
  structuredPermissions: MenuPermissionEntry[];
};

function toResponse(doc: CustomRoleDocument): CustomRoleResponse {
  return {
    id: String(doc._id),
    name: doc.name,
    permissions: doc.permissions,
    structuredPermissions: (doc.structuredPermissions ?? []).map((sp) => ({
      menuId: sp.menuId,
      menuGroupId: sp.menuGroupId,
      read: sp.read,
      create: sp.create,
      update: sp.update,
      delete: sp.delete,
      export: sp.export,
    })),
  };
}

class CustomRoleService {
  async list(): Promise<CustomRoleResponse[]> {
    const docs = await CustomRoleModel.find({ clientCode: env.CLIENT_CODE })
      .sort({ name: 1 })
      .lean<CustomRoleDocument[]>()
      .exec();
    return docs.map(toResponse);
  }

  async getById(id: string): Promise<CustomRoleResponse | null> {
    const doc = await CustomRoleModel.findOne({ _id: id, clientCode: env.CLIENT_CODE })
      .lean<CustomRoleDocument>()
      .exec();
    return doc ? toResponse(doc) : null;
  }

  async create(payload: CustomRolePayload, userId: string): Promise<CustomRoleResponse> {
    const doc = await CustomRoleModel.create({
      clientCode: env.CLIENT_CODE,
      name: payload.name,
      permissions: payload.permissions,
      createdBy: userId,
      updatedBy: userId,
    });
    return toResponse(doc.toObject() as CustomRoleDocument);
  }

  async update(id: string, payload: CustomRolePayload, userId: string): Promise<CustomRoleResponse | null> {
    const doc = await CustomRoleModel.findOneAndUpdate(
      { _id: id, clientCode: env.CLIENT_CODE },
      {
        $set: {
          name: payload.name,
          permissions: payload.permissions,
          updatedBy: userId,
        },
      },
      { new: true }
    )
      .lean<CustomRoleDocument>()
      .exec();
    return doc ? toResponse(doc) : null;
  }

  async remove(id: string): Promise<boolean> {
    const result = await CustomRoleModel.deleteOne({ _id: id, clientCode: env.CLIENT_CODE }).exec();
    return result.deletedCount > 0;
  }

  async getPermissionsForRole(roleId: string): Promise<string[] | null> {
    const doc = await CustomRoleModel.findOne({ _id: roleId, clientCode: env.CLIENT_CODE })
      .lean<CustomRoleDocument>()
      .exec();
    return doc ? doc.permissions : null;
  }

  // ── Structured Permissions ───────────────────────────────────

  async getStructuredPermissions(roleId: string): Promise<MenuPermissionEntry[] | null> {
    const doc = await CustomRoleModel.findOne({ _id: roleId, clientCode: env.CLIENT_CODE })
      .lean<CustomRoleDocument>()
      .exec();
    if (!doc) return null;
    return (doc.structuredPermissions ?? []).map((sp) => ({
      menuId: sp.menuId,
      menuGroupId: sp.menuGroupId,
      read: sp.read,
      create: sp.create,
      update: sp.update,
      delete: sp.delete,
      export: sp.export,
    }));
  }

  async updateStructuredPermissions(
    roleId: string,
    permissions: MenuPermissionEntry[],
    userId: string
  ): Promise<CustomRoleResponse | null> {
    const sanitized: StructuredPermissionDoc[] = permissions.map((p) => ({
      menuId: p.menuId,
      menuGroupId: p.menuGroupId,
      read: Boolean(p.read),
      create: Boolean(p.create),
      update: Boolean(p.update),
      delete: Boolean(p.delete),
      export: Boolean(p.export),
    }));

    // Also regenerate flat permissions[] for backward compatibility
    const flatPermissions = await this.flattenStructuredToLegacy(sanitized);

    const doc = await CustomRoleModel.findOneAndUpdate(
      { _id: roleId, clientCode: env.CLIENT_CODE },
      {
        $set: {
          structuredPermissions: sanitized,
          permissions: flatPermissions,
          updatedBy: userId,
        },
      },
      { new: true }
    ).lean<CustomRoleDocument>().exec();

    return doc ? toResponse(doc) : null;
  }

  /**
   * Converts structured per-menu permissions into the flat
   * "module.action" string array used by requirePermission middleware.
   */
  private async flattenStructuredToLegacy(
    structured: StructuredPermissionDoc[]
  ): Promise<string[]> {
    const perms = new Set<string>();

    // Map menu slugs to module keys for backward compat
    const menuItems = await MenuItemModel.find({ clientCode: env.CLIENT_CODE })
      .lean()
      .exec();

    const slugById = new Map<string, string>();
    for (const item of menuItems) {
      slugById.set(String(item._id), item.slug);
    }

    const actionMap: Record<string, string> = {
      read: "read",
      create: "create",
      update: "update",
      delete: "delete",
      export: "export",
    };

    for (const entry of structured) {
      const id = entry.menuId ?? entry.menuGroupId;
      if (!id) continue;
      const slug = slugById.get(id) ?? id;

      for (const [key, action] of Object.entries(actionMap)) {
        if (entry[key as keyof StructuredPermissionDoc]) {
          perms.add(`${slug}.${action}`);
        }
      }
    }

    return Array.from(perms);
  }
}

export const customRoleService = new CustomRoleService();
