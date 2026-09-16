/**
 * The A-4 gate, answered from data instead of from memory.
 *
 * Flipping RBAC_MODULE_MODE to "enforce" is allowed only after shadow mode has
 * recorded zero would-be denials for a sustained window. This reports that
 * window, so the decision is "the query returned zero" rather than "I think it
 * has been quiet for a while".
 *
 * Exit code is the answer: 0 = clear to enforce, 1 = not yet.
 *
 *   node scripts/rbac-soak-check.mjs          # default 7-day window
 *   node scripts/rbac-soak-check.mjs --days 14
 *
 * Read-only. Safe against production.
 */
import "dotenv/config";
import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("MONGO_URI is unset — nothing to check against.");
  process.exit(1);
}

const daysArgIndex = process.argv.indexOf("--days");
const REQUIRED_DAYS = daysArgIndex === -1 ? 7 : Number(process.argv[daysArgIndex + 1]);

if (!Number.isFinite(REQUIRED_DAYS) || REQUIRED_DAYS <= 0) {
  console.error("--days must be a positive number.");
  process.exit(1);
}

const windowStart = new Date(Date.now() - REQUIRED_DAYS * 24 * 60 * 60 * 1000);

await mongoose.connect(MONGO_URI);
const auditLogs = mongoose.connection.db.collection("auditlogs");

const denies = await auditLogs
  .find({ action: "rbac.shadow_deny", createdAt: { $gte: windowStart } })
  .project({ createdAt: 1, userEmail: 1, metadata: 1 })
  .sort({ createdAt: -1 })
  .toArray();

/**
 * Also reported: whether shadow mode has been running long enough to have
 * observed anything. Zero denials because nothing was logged for a week looks
 * identical to zero denials because everyone is correctly granted — and only
 * one of those is safe to act on.
 */
const everRecorded = await auditLogs
  .find({ action: "rbac.shadow_deny" })
  .project({ createdAt: 1 })
  .sort({ createdAt: 1 })
  .limit(1)
  .toArray();

console.log(`\n=== Shadow-mode soak, last ${REQUIRED_DAYS} day(s) ===`);
console.log(`window opens: ${windowStart.toISOString()}`);

if (denies.length === 0) {
  console.log("ok   zero rbac.shadow_deny records in the window");

  if (everRecorded.length === 0) {
    console.log(
      "\nWARNING no rbac.shadow_deny record has EVER been written.\n" +
        "        That is the expected result of a clean soak, but it is also what\n" +
        "        you see if shadow mode was never actually enabled. Confirm\n" +
        "        RBAC_MODULE_MODE=shadow has been live for the whole window\n" +
        "        before reading this as a pass."
    );
  }
} else {
  const byMenu = new Map();
  for (const entry of denies) {
    const key = `${entry.metadata?.moduleKey ?? "?"} ${entry.metadata?.actionCode ?? "?"}`;
    byMenu.set(key, (byMenu.get(key) ?? 0) + 1);
  }

  console.log(`FAIL ${denies.length} would-be denial(s) — enforcement would break these:\n`);
  for (const [key, count] of [...byMenu.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`     ${String(count).padStart(5)}x  ${key}`);
  }

  const affected = [...new Set(denies.map((d) => d.userEmail).filter(Boolean))];
  if (affected.length > 0) {
    console.log(`\n     accounts affected: ${affected.join(", ")}`);
  }

  console.log(`\n     most recent: ${denies[0].createdAt?.toISOString?.() ?? "unknown"}`);
  console.log("     Fix the grants (scripts/rbac-grant-backfill.mjs), then restart the window.");
}

console.log(
  denies.length === 0
    ? "\nSUMMARY: clear to set RBAC_MODULE_MODE=enforce (run rbac-coverage-report.mjs too)."
    : "\nSUMMARY: do NOT enforce yet."
);

await mongoose.disconnect();
process.exit(denies.length === 0 ? 0 : 1);
