import { MODULE_KEYS } from "@admin-platform/shared-types";
import type { ModuleKey } from "@admin-platform/shared-types";
import type { ActionCode } from "./rbac-permission.middleware";

/**
 * Where each legacy module lives in the menu tree.
 *
 * The 14 module routers guard themselves with `moduleGuards(moduleKey, ...)`,
 * but RBAC resolves grants BY MENU URL. Without this table there is no way to
 * ask "was this role granted the calendar module" — the two systems name the
 * same screen differently.
 *
 * Every URL here must exist as a MenuMaster row (see MENU_TREE in
 * bootstrap/seed-rbac.ts). A key present here with no seeded row denies the
 * whole module the moment RBAC_MODULE_MODE flips to "enforce" — the whatsapp
 * gap was exactly that, and it is why the exhaustiveness guard below exists.
 */
export const MODULE_MENU_URL: Record<ModuleKey, string> = {
  calendar: "/calendar",
  chat: "/chat",
  mailbox: "/mailbox",
  ecommerce: "/ecommerce",
  projects: "/projects",
  tasks: "/tasks",
  crm: "/crm",
  invoices: "/invoices",
  "support-tickets": "/support-tickets",
  "file-manager": "/file-manager",
  todo: "/todo",
  job: "/job",
  "api-management": "/api-management",
  whatsapp: "/whatsapp"
};

/**
 * Compile-time exhaustiveness guard.
 *
 * `Record<ModuleKey, string>` already refuses to compile when a new MODULE_KEYS
 * entry has no menu, which is the point: the next module cannot repeat the
 * whatsapp gap by omission. This alias makes the failure legible by naming it
 * in the error rather than reporting a bare index-signature mismatch.
 */
type EveryModuleMapped = Record<ModuleKey, string> extends typeof MODULE_MENU_URL
  ? typeof MODULE_MENU_URL extends Record<ModuleKey, string>
    ? true
    : never
  : never;
const _everyModuleMapped: EveryModuleMapped = true;
void _everyModuleMapped;

/** The menu URLs RBAC must be able to resolve before enforcement is safe. */
export const MODULE_MENU_URLS: readonly string[] = MODULE_KEYS.map((key) => MODULE_MENU_URL[key]);

/**
 * The module guards speak `read/create/update/delete/export`; RBAC's action
 * matrix speaks `read/write/edit/delete/print/mail`.
 *
 * `export -> print` rather than a seventh action type: the two mean the same
 * thing to an operator, and adding a column would need a migration plus a
 * backfill on every existing role for no behavioural gain.
 */
export const LEGACY_ACTION_TO_RBAC: Record<string, ActionCode> = {
  read: "read",
  create: "write",
  update: "edit",
  delete: "delete",
  export: "print",
  // Already-canonical codes pass through, so a call site may be written either
  // way and neither needs migrating.
  write: "write",
  edit: "edit",
  print: "print",
  mail: "mail"
};

/**
 * Turns whatever a call site passed into an RBAC action code.
 *
 * Both forms are accepted deliberately:
 *   moduleGuards("chat", "chat.read")  — the 158 existing registrations
 *   moduleGuards("chat", "read")       — what new code should write
 *
 * Deriving the action from the existing string is what makes enforcement a
 * config flip rather than a 158-site codemod, and a codemod across every
 * module router is the single largest source of risk in this change.
 *
 * Returns null when the string maps to nothing, which the caller must treat as
 * "cannot evaluate" and log — never as "allowed".
 */
export function resolveRbacAction(permission: string): ActionCode | null {
  const tail = permission.includes(".") ? permission.slice(permission.lastIndexOf(".") + 1) : permission;
  return LEGACY_ACTION_TO_RBAC[tail.toLowerCase()] ?? null;
}
