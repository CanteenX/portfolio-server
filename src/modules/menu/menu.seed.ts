import { env } from "../../config/env";
import { MenuGroupModel, MenuItemModel } from "./menu.model";

type SeedMenuItem = {
  name: string;
  slug: string;
  route: string;
  icon: string;
  isParent?: boolean;
  children?: SeedMenuItem[];
};

type SeedMenuGroup = {
  name: string;
  slug: string;
  order: number;
  isLink: boolean;
  route?: string;
  icon?: string;
  menus: SeedMenuItem[];
};

/**
 * Default sidebar structure derived from existing MODULE_DEFINITIONS
 * and static sidebar items in both frontends.
 */
const SEED_MENU_GROUPS: SeedMenuGroup[] = [
  {
    name: "Modules",
    slug: "modules",
    order: 0,
    isLink: false,
    icon: "grid",
    menus: [
      { name: "Calendar", slug: "calendar", route: "/calendar", icon: "calendar" },
      { name: "Chat", slug: "chat", route: "/chat", icon: "chat" },
      { name: "Mailbox", slug: "mailbox", route: "/mailbox", icon: "mail" },
      {
        name: "eCommerce",
        slug: "ecommerce",
        route: "/ecommerce",
        icon: "shopping-cart",
        isParent: true,
        children: [
          { name: "Products", slug: "ecommerce-products", route: "/ecommerce/products", icon: "" },
          { name: "Orders", slug: "ecommerce-orders", route: "/ecommerce/orders", icon: "" },
        ],
      },
      { name: "Projects", slug: "projects", route: "/projects", icon: "folder" },
      { name: "Tasks", slug: "tasks", route: "/tasks", icon: "check-square" },
      {
        name: "CRM",
        slug: "crm",
        route: "/crm",
        icon: "users",
        isParent: true,
        children: [
          { name: "Contacts", slug: "crm-contacts", route: "/crm/contacts", icon: "" },
          { name: "Deals", slug: "crm-deals", route: "/crm/deals", icon: "" },
          { name: "Pipelines", slug: "crm-pipelines", route: "/crm/pipelines", icon: "" },
        ],
      },
      { name: "Invoices", slug: "invoices", route: "/invoices", icon: "file-text" },
      { name: "Support Tickets", slug: "support-tickets", route: "/support-tickets", icon: "headphones" },
      { name: "File Manager", slug: "file-manager", route: "/file-manager", icon: "hard-drive" },
      { name: "ToDo", slug: "todo", route: "/todo", icon: "list" },
      {
        name: "Job",
        slug: "job",
        route: "/job",
        icon: "briefcase",
        isParent: true,
        children: [
          { name: "Job Postings", slug: "job-postings", route: "/job/postings", icon: "" },
          { name: "Applications", slug: "job-applications", route: "/job/applications", icon: "" },
        ],
      },
      { name: "API Management", slug: "api-management", route: "/api-management", icon: "code" },
    ],
  },
  {
    name: "Charts",
    slug: "charts",
    order: 1,
    isLink: false,
    icon: "bar-chart",
    menus: [
      { name: "Apex Charts", slug: "apex-charts", route: "/charts/apex", icon: "" },
      { name: "Chart.js", slug: "chartjs", route: "/charts/chartjs", icon: "" },
    ],
  },
  {
    name: "Forms",
    slug: "forms",
    order: 2,
    isLink: false,
    icon: "edit",
    menus: [
      { name: "Basic Elements", slug: "forms-basic", route: "/forms/basic", icon: "" },
      { name: "Advanced Elements", slug: "forms-advanced", route: "/forms/advanced", icon: "" },
      { name: "Validation", slug: "forms-validation", route: "/forms/validation", icon: "" },
      { name: "Rich Editor", slug: "forms-editor", route: "/forms/editor", icon: "" },
    ],
  },
  {
    name: "Maps",
    slug: "maps",
    order: 3,
    isLink: false,
    icon: "map",
    menus: [
      { name: "Google Maps", slug: "google-maps", route: "/maps/google", icon: "" },
      { name: "Vector Maps", slug: "vector-maps", route: "/maps/vector", icon: "" },
    ],
  },
  {
    name: "Pages",
    slug: "pages",
    order: 4,
    isLink: false,
    icon: "file",
    menus: [
      { name: "Profile", slug: "profile", route: "/pages/profile", icon: "" },
      { name: "Timeline", slug: "timeline", route: "/pages/timeline", icon: "" },
      { name: "Gallery", slug: "gallery", route: "/pages/gallery", icon: "" },
      { name: "Search Results", slug: "search-results", route: "/pages/search", icon: "" },
    ],
  },
  {
    name: "UI Components",
    slug: "ui-components",
    order: 5,
    isLink: false,
    icon: "layers",
    menus: [
      { name: "Alerts", slug: "ui-alerts", route: "/ui/alerts", icon: "" },
      { name: "Badges", slug: "ui-badges", route: "/ui/badges", icon: "" },
      { name: "Buttons", slug: "ui-buttons", route: "/ui/buttons", icon: "" },
      { name: "Cards", slug: "ui-cards", route: "/ui/cards", icon: "" },
      { name: "Modals", slug: "ui-modals", route: "/ui/modals", icon: "" },
      { name: "Advanced UI", slug: "ui-advanced", route: "/ui/advanced", icon: "" },
    ],
  },
];

async function seedMenuItems(
  groupId: string,
  items: SeedMenuItem[],
  clientCode: string,
  userId: string,
  parentId: string | null = null
): Promise<void> {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const doc = await MenuItemModel.create({
      clientCode,
      groupId,
      name: item.name,
      slug: item.slug,
      route: item.route,
      icon: item.icon,
      parentId,
      order: i,
      isParent: item.isParent ?? false,
      createdBy: userId,
      updatedBy: userId,
    });

    if (item.children && item.children.length > 0) {
      await seedMenuItems(groupId, item.children, clientCode, userId, String(doc._id));
    }
  }
}

/**
 * Seeds the menu collections if no groups exist for the current clientCode.
 * Called once on server startup.
 */
export async function seedMenusIfEmpty(userId = "system"): Promise<boolean> {
  const clientCode = env.CLIENT_CODE;
  const existingCount = await MenuGroupModel.countDocuments({ clientCode }).exec();

  if (existingCount > 0) {
    return false; // Already seeded
  }

  for (const group of SEED_MENU_GROUPS) {
    const groupDoc = await MenuGroupModel.create({
      clientCode,
      name: group.name,
      slug: group.slug,
      order: group.order,
      isLink: group.isLink,
      route: group.route,
      icon: group.icon,
      createdBy: userId,
      updatedBy: userId,
    });

    if (group.menus.length > 0) {
      await seedMenuItems(String(groupDoc._id), group.menus, clientCode, userId);
    }
  }

  return true;
}
