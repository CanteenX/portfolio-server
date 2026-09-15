/**
 * Moves legacy local-disk media into Supabase and rewrites the rows that point
 * at it.
 *
 * Why this exists: before storage moved to Supabase, uploads were written to
 * ./uploads and stored as "/uploads/portfolio/<name>". That directory is
 * gitignored and is not part of the deployed function, so every such row 404s
 * in production while rendering perfectly in local dev — the failure is
 * invisible until deployed.
 *
 * Run from portfolio-server, with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * set, and with the original ./uploads directory present:
 *
 *   node scripts/migrate-uploads-to-supabase.mjs --dry-run   # report only
 *   node scripts/migrate-uploads-to-supabase.mjs             # apply
 *
 * Idempotent: rows already holding an absolute URL are skipped, so a partial
 * run can simply be repeated.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";

const DRY_RUN = process.argv.includes("--dry-run");

const SUPABASE_URL = (process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
const SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const BUCKET = (process.env.SUPABASE_STORAGE_BUCKET || "portfolio-uploads").trim();
const LOCAL_DIR = process.env.FILE_UPLOAD_DIR || "uploads";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set.");
  process.exit(1);
}
if (!process.env.MONGO_URI) {
  console.error("MONGO_URI must be set.");
  process.exit(1);
}

const MIME_BY_EXT = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".pdf": "application/pdf"
};

/** Every field across the portfolio collections that can hold a stored reference. */
const TARGETS = [
  { collection: "portfolioprojects", paths: ["image"] },
  { collection: "portfolioprojects", paths: ["gallery.$.src"] },
  { collection: "portfolioprojects", paths: ["screens.$.image"] },
  { collection: "portfolioteammembers", paths: ["avatar"] },
  { collection: "portfoliotechstacks", paths: ["image"] },
  { collection: "portfoliosettings", paths: ["hero.featuredProjects.$.image"] }
];

const uploaded = new Map(); // local reference -> absolute CDN URL

async function uploadOne(reference) {
  if (uploaded.has(reference)) return uploaded.get(reference);

  const relative = reference.replace(/^\/+/, "").replace(new RegExp(`^${LOCAL_DIR}/`), "");
  const localPath = path.join(LOCAL_DIR, relative);

  if (!fs.existsSync(localPath)) {
    console.warn(`  MISSING on disk, leaving row unchanged: ${reference}`);
    return null;
  }

  const objectKey = relative;
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${objectKey}`;

  if (DRY_RUN) {
    uploaded.set(reference, publicUrl);
    return publicUrl;
  }

  const body = fs.readFileSync(localPath);
  const contentType = MIME_BY_EXT[path.extname(localPath).toLowerCase()] ?? "application/octet-stream";

  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${objectKey}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": contentType,
      "x-upsert": "true",
      "cache-control": "public, max-age=31536000, immutable"
    },
    body: new Uint8Array(body)
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`upload failed for ${objectKey} (${response.status}): ${detail.slice(0, 200)}`);
  }

  uploaded.set(reference, publicUrl);
  return publicUrl;
}

/** Walks a document and rewrites every string that looks like a local upload. */
async function rewriteValue(value) {
  if (typeof value === "string") {
    if (!value.startsWith("/uploads/") && !value.startsWith("uploads/")) return value;
    const url = await uploadOne(value);
    return url ?? value;
  }
  if (Array.isArray(value)) {
    const out = [];
    for (const item of value) out.push(await rewriteValue(item));
    return out;
  }
  if (value && typeof value === "object" && !(value instanceof Date) && !value._bsontype) {
    const out = {};
    for (const [key, inner] of Object.entries(value)) out[key] = await rewriteValue(inner);
    return out;
  }
  return value;
}

await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
console.log(DRY_RUN ? "DRY RUN — nothing will be written\n" : "APPLYING changes\n");

let scanned = 0;
let changed = 0;

for (const collectionName of [...new Set(TARGETS.map((t) => t.collection))]) {
  const collection = mongoose.connection.db.collection(collectionName);
  const docs = await collection.find({}).toArray();
  console.log(`${collectionName}: ${docs.length} documents`);

  for (const doc of docs) {
    scanned += 1;
    const { _id, ...rest } = doc;
    const rewritten = await rewriteValue(rest);

    if (JSON.stringify(rewritten) === JSON.stringify(rest)) continue;

    changed += 1;
    console.log(`  ${collectionName}/${_id}: references rewritten`);
    if (!DRY_RUN) {
      await collection.updateOne({ _id }, { $set: rewritten });
    }
  }
}

await mongoose.disconnect();

console.log(`\nscanned ${scanned} documents, ${changed} needed rewriting`);
console.log(`${uploaded.size} distinct files ${DRY_RUN ? "would be" : "were"} uploaded`);
if (DRY_RUN) console.log("\nRe-run without --dry-run to apply.");
