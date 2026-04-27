/**
 * Migration: MenuGroup + MenuItem → MenuMaster
 *
 * Mapping strategy (2-level MenuMaster from 3-level legacy data):
 *
 * Legacy structure:               MenuMaster result:
 * ─────────────────               ──────────────────────────────────
 * MenuGroup                    →  Root MenuMaster (isRoot: true, placeholder menuUrl)
 * └─ MenuItem (standalone)     →  Child MenuMaster under the group root
 * └─ MenuItem (isParent: true) →  Separate root MenuMaster (its own collapsible section)
 *    └─ MenuItem (child)       →  Child MenuMaster under the isParent root
 *
 * Run:  npx ts-node -r tsconfig-paths/register src/bootstrap/migrate-menu-to-menumaster.ts
 */

import mongoose from "mongoose";
import { env } from "../config/env";
import { MenuGroupModel, MenuItemModel } from "../modules/menu/menu.model";
import type { MenuGroupDocument, MenuItemDocument } from "../modules/menu/menu.model";
import { MenuMasterModel } from "../modules/rbac/menu-master.model";

// ── Icon name mapping: legacy kebab/word → Lucide PascalCase ──────────────────

const ICON_MAP: Record<string, string> = {
  // Group icons
  grid: "LayoutDashboard",
  "bar-chart": "BarChart3",
  edit: "FileEdit",
  map: "Map",
  file: "FileText",
  layers: "Layers",
  // Item icons
  calendar: "CalendarDays",
  chat: "MessageSquare",
  mail: "Mail",
  "shopping-cart": "ShoppingCart",
  folder: "FolderKanban",
  "check-square": "CheckSquare",
  users: "Users",
  "file-text": "FileText",
  headphones: "Headphones",
  "hard-drive": "HardDrive",
  list: "ListChecks",
  briefcase: "Briefcase",
  code: "KeyRound",
  // fallback
  "": "Layers",
};

function resolveIcon(raw: string): string {
  return ICON_MAP[raw] ?? "Layers";
}

type LeanGroup = MenuGroupDocument & { _id: mongoose.Types.ObjectId };
type LeanItem = MenuItemDocument & { _id: mongoose.Types.ObjectId };

async function run(): Promise<void> {
  await mongoose.connect(env.MONGO_URI);
  console.log("Connected to MongoDB");

  const clientCode = env.CLIENT_CODE;

  // ── 1. Fetch existing data ────────────────────────────────────────────────

  const groups = await MenuGroupModel.find({ clientCode })
    .sort({ order: 1 })
    .lean()
    .exec() as unknown as LeanGroup[];

  const items = await MenuItemModel.find({ clientCode })
    .sort({ order: 1 })
    .lean()
    .exec() as unknown as LeanItem[];

  console.log(`Found ${groups.length} groups, ${items.length} items`);

  // ── 2. Create root MenuMaster for every MenuGroup ─────────────────────────

  const groupIdToMenuMasterId = new Map<string, mongoose.Types.ObjectId>();

  for (const group of groups) {
    // Groups are section headers — use a non-navigable placeholder URL
    const menuUrl = `/group/${group.slug}`;

    const doc = await MenuMasterModel.findOneAndUpdate(
      { clientCode, menuUrl },
      {
        $set: {
          menuName: group.name,
          isRoot: true,
          parentMenu: null,
          menuUrl,
          sequence: group.order,
          icon: resolveIcon(group.icon ?? ""),
          isActive: true,
          updatedBy: "migration",
        },
        $setOnInsert: { createdBy: null },
      },
      { upsert: true, new: true }
    ).exec();

    groupIdToMenuMasterId.set(String(group._id), doc!._id as mongoose.Types.ObjectId);
    console.log(`  Group: "${group.name}" → MenuMaster ${doc!._id} (${menuUrl})`);
  }

  // ── 3. First pass: create root MenuMasters for isParent items ─────────────
  //      (they become independent collapsible sections, NOT under a group)

  const itemIdToMenuMasterId = new Map<string, mongoose.Types.ObjectId>();

  const parentItems = items.filter((i) => i.isParent && !i.parentId);

  for (const item of parentItems) {
    const doc = await MenuMasterModel.findOneAndUpdate(
      { clientCode, menuUrl: item.route },
      {
        $set: {
          menuName: item.name,
          isRoot: true,
          parentMenu: null,
          menuUrl: item.route,
          sequence: item.order,
          icon: resolveIcon(item.icon),
          isActive: true,
          updatedBy: "migration",
        },
        $setOnInsert: { createdBy: null },
      },
      { upsert: true, new: true }
    ).exec();

    itemIdToMenuMasterId.set(String(item._id), doc!._id as mongoose.Types.ObjectId);
    console.log(`  Parent item: "${item.name}" → Root MenuMaster ${doc!._id} (${item.route})`);
  }

  // ── 4. Second pass: standalone items (parentId: null, isParent: false) ────
  //      go under their group root

  const standaloneItems = items.filter((i) => !i.isParent && !i.parentId);

  for (const item of standaloneItems) {
    const groupMasterId = groupIdToMenuMasterId.get(String(item.groupId));
    if (!groupMasterId) {
      console.warn(`  SKIP "${item.name}": group ${item.groupId} not found`);
      continue;
    }

    const doc = await MenuMasterModel.findOneAndUpdate(
      { clientCode, menuUrl: item.route },
      {
        $set: {
          menuName: item.name,
          isRoot: false,
          parentMenu: groupMasterId,
          menuUrl: item.route,
          sequence: item.order,
          icon: resolveIcon(item.icon),
          isActive: true,
          updatedBy: "migration",
        },
        $setOnInsert: { createdBy: null },
      },
      { upsert: true, new: true }
    ).exec();

    itemIdToMenuMasterId.set(String(item._id), doc!._id as mongoose.Types.ObjectId);
    console.log(`  Standalone: "${item.name}" → child of group "${item.groupId}" (${item.route})`);
  }

  // ── 5. Third pass: child items (parentId → isParent item) ─────────────────

  const childItems = items.filter((i) => i.parentId !== null);

  for (const item of childItems) {
    const parentMasterId = item.parentId
      ? itemIdToMenuMasterId.get(String(item.parentId))
      : undefined;

    if (!parentMasterId) {
      console.warn(`  SKIP child "${item.name}": parent ${String(item.parentId)} not yet mapped`);
      continue;
    }

    const doc = await MenuMasterModel.findOneAndUpdate(
      { clientCode, menuUrl: item.route },
      {
        $set: {
          menuName: item.name,
          isRoot: false,
          parentMenu: parentMasterId,
          menuUrl: item.route,
          sequence: item.order,
          icon: resolveIcon(item.icon),
          isActive: true,
          updatedBy: "migration",
        },
        $setOnInsert: { createdBy: null },
      },
      { upsert: true, new: true }
    ).exec();

    console.log(`  Child: "${item.name}" → under "${String(item.parentId)}" (${item.route})`);
    if (doc) itemIdToMenuMasterId.set(String(item._id), doc._id as mongoose.Types.ObjectId);
  }

  // ── 6. Summary ─────────────────────────────────────────────────────────────

  const total = await MenuMasterModel.countDocuments({ clientCode }).exec();
  console.log(`\nDone. MenuMaster total for "${clientCode}": ${total} records.`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
