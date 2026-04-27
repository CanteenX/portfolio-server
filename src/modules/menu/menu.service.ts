import type { MenuGroup, MenuItem } from "@admin-platform/shared-types";
import { env } from "../../config/env";
import {
  MenuGroupModel,
  MenuItemModel,
  type MenuGroupDocument,
  type MenuItemDocument,
} from "./menu.model";

function toMenuItemResponse(doc: MenuItemDocument): MenuItem {
  return {
    _id: String(doc._id),
    name: doc.name,
    slug: doc.slug,
    route: doc.route,
    icon: doc.icon,
    parentId: doc.parentId ? String(doc.parentId) : null,
    groupId: String(doc.groupId),
    order: doc.order,
    isParent: doc.isParent,
  };
}

function buildMenuTree(items: MenuItem[]): MenuItem[] {
  const map = new Map<string, MenuItem & { children: MenuItem[] }>();
  const roots: MenuItem[] = [];

  for (const item of items) {
    map.set(item._id, { ...item, children: [] });
  }

  for (const item of items) {
    const node = map.get(item._id)!;
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

class MenuService {
  private get clientCode() {
    return env.CLIENT_CODE;
  }

  async listGroupsWithMenus(): Promise<MenuGroup[]> {
    const groups = await MenuGroupModel.find({ clientCode: this.clientCode })
      .sort({ order: 1 })
      .lean<MenuGroupDocument[]>()
      .exec();

    const items = await MenuItemModel.find({ clientCode: this.clientCode })
      .sort({ order: 1 })
      .lean<MenuItemDocument[]>()
      .exec();

    const itemsByGroup = new Map<string, MenuItem[]>();
    for (const item of items) {
      const gid = String(item.groupId);
      const arr = itemsByGroup.get(gid) ?? [];
      arr.push(toMenuItemResponse(item));
      itemsByGroup.set(gid, arr);
    }

    return groups.map((g) => ({
      _id: String(g._id),
      name: g.name,
      slug: g.slug,
      order: g.order,
      isLink: g.isLink,
      route: g.route,
      icon: g.icon,
      menus: buildMenuTree(itemsByGroup.get(String(g._id)) ?? []),
    }));
  }

  // ── Group CRUD ─────────────────────────────────────────────────

  async createGroup(payload: {
    name: string;
    slug: string;
    order: number;
    isLink: boolean;
    route?: string;
    icon?: string;
  }, userId: string): Promise<MenuGroup> {
    const doc = await MenuGroupModel.create({
      clientCode: this.clientCode,
      ...payload,
      createdBy: userId,
      updatedBy: userId,
    });
    return {
      _id: String(doc._id),
      name: doc.name,
      slug: doc.slug,
      order: doc.order,
      isLink: doc.isLink,
      route: doc.route,
      icon: doc.icon,
      menus: [],
    };
  }

  async updateGroup(id: string, payload: Partial<{
    name: string;
    slug: string;
    order: number;
    isLink: boolean;
    route: string;
    icon: string;
  }>, userId: string): Promise<MenuGroup | null> {
    const doc = await MenuGroupModel.findOneAndUpdate(
      { _id: id, clientCode: this.clientCode },
      { $set: { ...payload, updatedBy: userId } },
      { new: true }
    ).lean<MenuGroupDocument>().exec();

    if (!doc) return null;

    const items = await MenuItemModel.find({ clientCode: this.clientCode, groupId: id })
      .sort({ order: 1 }).lean<MenuItemDocument[]>().exec();

    return {
      _id: String(doc._id),
      name: doc.name,
      slug: doc.slug,
      order: doc.order,
      isLink: doc.isLink,
      route: doc.route,
      icon: doc.icon,
      menus: buildMenuTree(items.map(toMenuItemResponse)),
    };
  }

  async deleteGroup(id: string): Promise<boolean> {
    const result = await MenuGroupModel.deleteOne({ _id: id, clientCode: this.clientCode }).exec();
    if (result.deletedCount > 0) {
      await MenuItemModel.deleteMany({ clientCode: this.clientCode, groupId: id }).exec();
      return true;
    }
    return false;
  }

  // ── Item CRUD ──────────────────────────────────────────────────

  async createItem(payload: {
    groupId: string;
    name: string;
    slug: string;
    route: string;
    icon: string;
    parentId?: string | null;
    order: number;
    isParent: boolean;
  }, userId: string): Promise<MenuItem> {
    const doc = await MenuItemModel.create({
      clientCode: this.clientCode,
      ...payload,
      parentId: payload.parentId ?? null,
      createdBy: userId,
      updatedBy: userId,
    });
    return toMenuItemResponse(doc.toObject() as MenuItemDocument);
  }

  async updateItem(id: string, payload: Partial<{
    name: string;
    slug: string;
    route: string;
    icon: string;
    parentId: string | null;
    order: number;
    isParent: boolean;
  }>, userId: string): Promise<MenuItem | null> {
    const doc = await MenuItemModel.findOneAndUpdate(
      { _id: id, clientCode: this.clientCode },
      { $set: { ...payload, updatedBy: userId } },
      { new: true }
    ).lean<MenuItemDocument>().exec();

    return doc ? toMenuItemResponse(doc) : null;
  }

  async deleteItem(id: string): Promise<boolean> {
    const result = await MenuItemModel.deleteOne({ _id: id, clientCode: this.clientCode }).exec();
    if (result.deletedCount > 0) {
      // Re-parent children to null (promote to top-level in group)
      await MenuItemModel.updateMany(
        { clientCode: this.clientCode, parentId: id },
        { $set: { parentId: null } }
      ).exec();
      return true;
    }
    return false;
  }

  async reorderItem(id: string, newOrder: number, userId: string): Promise<boolean> {
    const result = await MenuItemModel.updateOne(
      { _id: id, clientCode: this.clientCode },
      { $set: { order: newOrder, updatedBy: userId } }
    ).exec();
    return result.matchedCount > 0;
  }

  async reorderGroup(id: string, newOrder: number, userId: string): Promise<boolean> {
    const result = await MenuGroupModel.updateOne(
      { _id: id, clientCode: this.clientCode },
      { $set: { order: newOrder, updatedBy: userId } }
    ).exec();
    return result.matchedCount > 0;
  }
}

export const menuService = new MenuService();
