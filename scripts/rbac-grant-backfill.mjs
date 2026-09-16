/**
 * Widens in-use roles so that switching RBAC_MODULE_MODE to "enforce" does not
 * revoke access people already had.
 *
 * Before enforcement, the 14 module routes accepted any admin: `requirePermission`
 * granted every admin every module. Nobody ever had a reason to tick those boxes
 * on a role, so almost every role grants nothing for them. Flipping to enforce
 * without this backfill denies working screens en masse — the lockout the whole
 * staged rollout exists to avoid.
 *
 * Deliberately BROAD (decision D-A5): every in-use role gets all 14 module menus,
 * and the narrowing happens later as an explicit, reviewed decision. The tighter
 * alternative — grant only what shadow logs observed — silently drops any screen
 * used monthly rather than weekly, and the failure surfaces as a 403 weeks after
 * anyone connects it to this change.
 *
 * Safety properties:
 *   - `--dry-run` is the DEFAULT. Writing requires `--apply`.
 *   - `$addToSet` only. This script can add a grant; it has no path that removes
 *     one, so an owner's deliberate restriction elsewhere survives it.
 *   - Idempotent. Re-running after a successful run changes nothing.
 *   - Only roles with at least one active employee are touched. Dormant roles
 *     are left narrow.
 *
 *   node scripts/rbac-grant-backfill.mjs              # dry run, prints the diff
 *   node scripts/rbac-grant-backfill.mjs --apply      # after human review
 */
import "dotenv/config";
import mongoose from "mongoose";

const APPLY = process.argv.includes("--apply");
const MONGO_URI = process.env.MONGO_URI;
const CLIENT_CODE = process.env.CLIENT_CODE || "default-client";

if (!MONGO_URI) {
  console.error("MONGO_URI is unset.");
  process.exit(1);
}

/** The 14 legacy modules — the menus A-4 will start enforcing. */
const MODULE_MENU_URLS = [
  "/calendar",
  "/chat",
  "/mailbox",
  "/ecommerce",
  "/projects",
  "/tasks",
  "/crm",
  "/invoices",
  "/support-tickets",
  "/file-manager",
  "/todo",
  "/job",
  "/api-management",
  "/whatsapp"
];

/**
 * A-2 made the access-control screens grantable too. They are included here for
 * the same reason as the modules: they were reachable by any admin yesterday,
 * so an in-use role that loses them is a regression, not a tightening.
 */
const RBAC_SCREEN_URLS = ["/rbac/menus", "/rbac/actions", "/rbac/roles", "/rbac/employees", "/rbac/tasks"];

/**
 * CMS screens added after the original backfill was written.
 *
 * Deliberately NOT included below. These screens never existed before, so no
 * role can regress by lacking them — granting them wholesale would hand every
 * in-use role the ability to edit what the business sells, which is a widening
 * nobody asked for. They are listed only so the omission is visibly a choice.
 */
const DELIBERATELY_NOT_BACKFILLED = ["/portfolio/services", "/portfolio/social-proof"];
void DELIBERATELY_NOT_BACKFILLED;

const TARGET_URLS = [...MODULE_MENU_URLS, ...RBAC_SCREEN_URLS];

await mongoose.connect(MONGO_URI);
const db = mongoose.connection.db;

const menus = await db
  .collection("menumasters")
  .find({ clientCode: CLIENT_CODE, menuUrl: { $in: TARGET_URLS }, isActive: true })
  .project({ _id: 1, menuUrl: 1 })
  .toArray();

const foundUrls = new Set(menus.map((m) => m.menuUrl));
const missing = TARGET_URLS.filter((url) => !foundUrls.has(url));
if (missing.length > 0) {
  console.error(
    `Refusing to run: ${missing.length} menu row(s) are missing or inactive:\n  ${missing.join("\n  ")}\n` +
      "Run the RBAC seed first — backfilling around a missing menu bakes in the gap."
  );
  await mongoose.disconnect();
  process.exit(1);
}

const actions = await db
  .collection("actiontypes")
  .find({ clientCode: CLIENT_CODE, isActive: true })
  .project({ _id: 1, actionCode: 1 })
  .toArray();

if (actions.length === 0) {
  console.error("No active action types. Run the RBAC seed first.");
  await mongoose.disconnect();
  process.exit(1);
}

const roles = await db
  .collection("rolemasters")
  .find({ clientCode: CLIENT_CODE, isActive: true })
  .project({ _id: 1, roleName: 1, permissions: 1 })
  .toArray();

const activeEmployees = await db
  .collection("employees")
  .find({ clientCode: CLIENT_CODE, isActive: true })
  .project({ roleId: 1 })
  .toArray();

const headcountByRole = new Map();
for (const employee of activeEmployees) {
  if (!employee.roleId) continue;
  const key = String(employee.roleId);
  headcountByRole.set(key, (headcountByRole.get(key) ?? 0) + 1);
}

console.log(
  `${APPLY ? "APPLY" : "DRY RUN"} — ${menus.length} menus x ${actions.length} actions ` +
    `across ${roles.length} active role(s)\n`
);

let rolesChanged = 0;
let grantsAdded = 0;

for (const role of roles) {
  const headcount = headcountByRole.get(String(role._id)) ?? 0;
  if (headcount === 0) {
    console.log(`skip  ${role.roleName} — no active employees assigned`);
    continue;
  }

  // Every menuId:actionTypeId the role already carries a row for, INCLUDING
  // rows with granted:false. Filtering those out would treat a deliberate
  // revocation as "missing" and push a granted:true duplicate beside it —
  // $addToSet compares whole subdocuments, so both rows would survive, and
  // checkRbacPermission answers with .some(entry => entry.granted), so the
  // revocation would be silently overridden. seedRbacBaseline keys the same
  // way for the same reason; this script must not diverge from it.
  const held = new Set(
    (role.permissions ?? []).map((p) => `${String(p.menuId)}:${String(p.actionTypeId)}`)
  );

  const toAdd = [];
  for (const menu of menus) {
    for (const action of actions) {
      const key = `${String(menu._id)}:${String(action._id)}`;
      if (held.has(key)) continue;
      toAdd.push({ menuId: String(menu._id), actionTypeId: String(action._id), granted: true });
    }
  }

  if (toAdd.length === 0) {
    console.log(`ok    ${role.roleName} — already complete (${headcount} employee(s))`);
    continue;
  }

  // Summarise by menu rather than listing hundreds of id pairs: the reviewer
  // needs to see which screens open up, not the join keys.
  const byMenu = new Map();
  for (const grant of toAdd) {
    const url = menus.find((m) => String(m._id) === grant.menuId).menuUrl;
    byMenu.set(url, (byMenu.get(url) ?? 0) + 1);
  }

  console.log(
    `GRANT ${role.roleName} — ${headcount} employee(s), +${toAdd.length} grant(s) across ${byMenu.size} menu(s)`
  );
  for (const [url, count] of [...byMenu].sort()) {
    console.log(`        ${url} (+${count})`);
  }

  rolesChanged += 1;
  grantsAdded += toAdd.length;

  if (APPLY) {
    // $addToSet, never $pull: this script can only widen.
    await db
      .collection("rolemasters")
      .updateOne({ _id: role._id }, { $addToSet: { permissions: { $each: toAdd } } });

    await db.collection("auditlogs").insertOne({
      action: "rbac.role.grants_backfilled",
      entity: "RoleMaster",
      entityId: String(role._id),
      userId: "script:rbac-grant-backfill",
      before: { grantCount: held.size },
      after: { grantCount: held.size + toAdd.length },
      metadata: { menus: [...byMenu.keys()], addedGrants: toAdd.length },
      createdAt: new Date()
    });
  }
}

console.log(
  APPLY
    ? `\nApplied: ${grantsAdded} grant(s) across ${rolesChanged} role(s). ` +
        "Grants are never cached — this takes effect on the next request."
    : `\nWould add ${grantsAdded} grant(s) across ${rolesChanged} role(s). ` +
        "Review the list above, then re-run with --apply."
);

await mongoose.disconnect();
