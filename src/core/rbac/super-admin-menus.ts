/**
 * Menus that exist but are granted to nobody — super-admin-only by design.
 *
 * `requireRbacPermission` bypasses only for super_admin, so a menu no role
 * holds a grant on is super-admin-only; that is the mechanism, not a side
 * effect. Listing a URL here does two things:
 *
 *   1. The seed and backfill never hand it to a role.
 *   2. buildRbacSnapshot excludes it for every non-super-admin, even one whose
 *      role still carries a stale grant from before it was listed here.
 *
 * (2) is what keeps the sidebar honest. The server guards these screens with
 * requireRole(["super_admin"]) independently of any grant, so a role that could
 * *see* one of them could click it and receive nothing but 403s — the UI
 * offering something the server refuses. That was live for Users and Audit Log:
 * the Administrator role showed both, and both answered 403.
 *
 * Membership should mirror the server exactly. If a screen's READ endpoint is
 * super-admin-only, it belongs here; if only its writes are, it does not —
 * delegated users may still view it.
 *
 * - Legal documents: a published privacy policy binds the business; editing
 *   one is an owner decision, not a CMS delegation.
 * - Users: account creation and password reset can mint or seize an account.
 * - Audit log: the record of who did what must not be readable by the people
 *   it records.
 */
export const SUPER_ADMIN_ONLY_MENUS: ReadonlySet<string> = new Set<string>([
  "/portfolio/legal",
  "/settings/users",
  "/settings/audit-log"
]);
