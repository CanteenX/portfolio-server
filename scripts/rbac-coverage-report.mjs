/**
 * Answers the only question that matters before RBAC_MODULE_MODE=enforce:
 * who loses access the moment it flips?
 *
 * Reports three things, in the order they can hurt you:
 *   1. module menus with no MenuMaster row   — denies EVERYONE, including
 *      roles that look fully granted, because a grant on a missing menu
 *      cannot be expressed at all
 *   2. employees with no role or zero grants — denied on their next request
 *   3. per-role module coverage              — which of the 14 each role holds
 *
 * Read-only. Safe against production.
 *
 *   node scripts/rbac-coverage-report.mjs
 */
import "dotenv/config";
import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI;
const CLIENT_CODE = process.env.CLIENT_CODE || "default-client";

if (!MONGO_URI) {
  console.error("MONGO_URI is unset — nothing to report against.");
  process.exit(1);
}

// Duplicated from src/core/rbac/module-menu-map.ts rather than imported: this
// script runs as plain node against a deployed database, with no TypeScript
// build step available. The typecheck guard on that file is what keeps the two
// from drifting silently when a fifteenth module appears.
const MODULE_MENU_URL = {
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

await mongoose.connect(MONGO_URI);
const db = mongoose.connection.db;

const menus = await db
  .collection("menumasters")
  .find({ clientCode: CLIENT_CODE })
  .project({ _id: 1, menuUrl: 1, isActive: 1 })
  .toArray();

const actions = await db
  .collection("actiontypes")
  .find({ clientCode: CLIENT_CODE })
  .project({ _id: 1, actionCode: 1, isActive: 1 })
  .toArray();

const roles = await db
  .collection("rolemasters")
  .find({ clientCode: CLIENT_CODE })
  .project({ _id: 1, roleName: 1, permissions: 1, isActive: 1 })
  .toArray();

const employees = await db
  .collection("employees")
  .find({ clientCode: CLIENT_CODE })
  .project({ _id: 1, employeeName: 1, emailOffice: 1, roleId: 1, isActive: 1 })
  .toArray();

const menuByUrl = new Map(menus.map((m) => [m.menuUrl, m]));
const actionById = new Map(actions.map((a) => [String(a._id), a.actionCode]));
const roleById = new Map(roles.map((r) => [String(r._id), r]));

let problems = 0;

// ── 1. Missing or inactive module menus ───────────────────────────────────────

console.log("\n=== Module menu rows ===");
const missingMenus = [];
for (const [moduleKey, menuUrl] of Object.entries(MODULE_MENU_URL)) {
  const menu = menuByUrl.get(menuUrl);
  if (!menu) {
    missingMenus.push(`${moduleKey} (${menuUrl}) — MISSING`);
  } else if (!menu.isActive) {
    missingMenus.push(`${moduleKey} (${menuUrl}) — INACTIVE`);
  }
}
if (missingMenus.length === 0) {
  console.log(`ok   all ${Object.keys(MODULE_MENU_URL).length} module menus present and active`);
} else {
  problems += missingMenus.length;
  console.log("FAIL these modules would deny every non-super-admin at enforce:");
  for (const line of missingMenus) console.log(`     ${line}`);
  console.log("     Fix: run the RBAC seed, then wait 60s for the lookup cache to expire.");
}

const inactiveActions = actions.filter((a) => !a.isActive).map((a) => a.actionCode);
if (inactiveActions.length > 0) {
  problems += inactiveActions.length;
  console.log(`FAIL inactive action types (grants using them never resolve): ${inactiveActions.join(", ")}`);
}

// ── 2. Employees who would be denied ─────────────────────────────────────────

console.log("\n=== Employees at risk ===");
const grantCountByRole = new Map();
for (const role of roles) {
  grantCountByRole.set(String(role._id), (role.permissions ?? []).filter((p) => p.granted).length);
}

const atRisk = [];
for (const employee of employees) {
  if (!employee.isActive) continue;
  const roleId = employee.roleId ? String(employee.roleId) : null;
  if (!roleId) {
    atRisk.push(`${employee.emailOffice} — NO ROLE`);
    continue;
  }
  const role = roleById.get(roleId);
  if (!role) {
    atRisk.push(`${employee.emailOffice} — role ${roleId} does not exist`);
  } else if (!role.isActive) {
    atRisk.push(`${employee.emailOffice} — role "${role.roleName}" is inactive`);
  } else if ((grantCountByRole.get(roleId) ?? 0) === 0) {
    atRisk.push(`${employee.emailOffice} — role "${role.roleName}" grants nothing`);
  }
}

if (atRisk.length === 0) {
  console.log(`ok   all ${employees.filter((e) => e.isActive).length} active employees hold a granting role`);
} else {
  problems += atRisk.length;
  console.log("FAIL these accounts are denied on their next request at enforce:");
  for (const line of atRisk) console.log(`     ${line}`);
}

// ── 3. Per-role module coverage ──────────────────────────────────────────────

console.log("\n=== Per-role module coverage ===");
const moduleEntries = Object.entries(MODULE_MENU_URL);

for (const role of roles) {
  const granted = new Set(
    (role.permissions ?? [])
      .filter((p) => p.granted)
      .map((p) => `${String(p.menuId)}:${actionById.get(String(p.actionTypeId)) ?? "?"}`)
  );

  const held = [];
  const absent = [];
  for (const [moduleKey, menuUrl] of moduleEntries) {
    const menu = menuByUrl.get(menuUrl);
    if (!menu) {
      absent.push(`${moduleKey}(no menu)`);
      continue;
    }
    const codes = [...actionById.values()].filter((code) =>
      granted.has(`${String(menu._id)}:${code}`)
    );
    if (codes.length > 0) held.push(`${moduleKey}[${codes.join(",")}]`);
    else absent.push(moduleKey);
  }

  const assigned = employees.filter(
    (e) => e.roleId && String(e.roleId) === String(role._id)
  ).length;

  console.log(
    `\n${role.roleName}${role.isActive ? "" : " (INACTIVE)"} — ${assigned} employee(s), ` +
      `${held.length}/${moduleEntries.length} modules`
  );
  if (held.length > 0) console.log(`  has: ${held.join(" ")}`);
  if (absent.length > 0) console.log(`  missing: ${absent.join(" ")}`);
}

console.log(
  problems === 0
    ? "\nSUMMARY: no blockers found. Soak in shadow mode, then flip when rbac.shadow_deny stays at zero."
    : `\nSUMMARY: ${problems} blocker(s). Do NOT set RBAC_MODULE_MODE=enforce yet.`
);

await mongoose.disconnect();
process.exit(problems === 0 ? 0 : 1);
