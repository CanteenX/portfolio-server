export const MODULE_KEYS = [
  "calendar",
  "chat",
  "mailbox",
  "ecommerce",
  "projects",
  "tasks",
  "crm",
  "invoices",
  "support-tickets",
  "file-manager",
  "todo",
  "job",
  "api-management",
  "whatsapp"
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export type FeatureFlags = Record<ModuleKey, boolean>;

export const MODULE_DEFINITIONS: Array<{ key: ModuleKey; label: string }> = [
  { key: "calendar", label: "Calendar" },
  { key: "chat", label: "Chat" },
  { key: "mailbox", label: "Mailbox" },
  { key: "ecommerce", label: "eCommerce" },
  { key: "projects", label: "Projects" },
  { key: "tasks", label: "Tasks" },
  { key: "crm", label: "CRM" },
  { key: "invoices", label: "Invoices" },
  { key: "support-tickets", label: "Support Tickets" },
  { key: "file-manager", label: "File Manager" },
  { key: "todo", label: "ToDo" },
  { key: "job", label: "Job" },
  { key: "api-management", label: "API Management" },
  { key: "whatsapp", label: "WhatsApp" }
];
