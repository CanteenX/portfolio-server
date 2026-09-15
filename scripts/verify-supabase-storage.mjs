/**
 * Proves the Supabase storage wiring end to end: uploads a real PNG through the
 * Storage REST API exactly as src/core/storage/file-store.ts does, fetches the
 * URL it returns as an anonymous visitor would, then deletes the probe.
 *
 * Run it after pasting SUPABASE_SERVICE_ROLE_KEY into .env. A green run means
 * admin image uploads will work; there is no need to drive the panel to find out.
 *
 *   node scripts/verify-supabase-storage.mjs
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";

// Smallest valid PNG. A text file would be rejected by the bucket's
// allowed_mime_types before it proved anything about the credentials.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

const url = (process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const bucket = (process.env.SUPABASE_STORAGE_BUCKET || "portfolio-uploads").trim();

if (!url || !key) {
  console.error(
    "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are unset — uploads would still " +
      "go to local disk. Nothing to verify."
  );
  process.exit(1);
}

const objectKey = `portfolio/verify-${randomUUID()}.png`;
const endpoint = `${url}/storage/v1/object/${bucket}/${objectKey}`;

const put = await fetch(endpoint, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${key}`,
    "Content-Type": "image/png",
    "x-upsert": "true",
    "cache-control": "public, max-age=31536000, immutable"
  },
  body: new Uint8Array(PNG)
});

if (!put.ok) {
  const detail = await put.text().catch(() => "");
  console.error(`upload failed: HTTP ${put.status} — ${detail.slice(0, 300)}`);
  process.exit(1);
}

const publicUrl = `${url}/storage/v1/object/public/${bucket}/${objectKey}`;
console.log(`ok  uploaded -> ${publicUrl}`);

// No Authorization header on purpose: this is exactly what a visitor's browser
// sends, and a public bucket is the only reason it should succeed.
const read = await fetch(publicUrl);
if (!read.ok) {
  console.error(`public read failed: HTTP ${read.status} — bucket is not public`);
  process.exit(1);
}
const bytes = Buffer.from(await read.arrayBuffer());
if (!bytes.equals(PNG)) {
  console.error(`public read returned ${bytes.length} bytes, expected ${PNG.length}`);
  process.exit(1);
}
console.log(`ok  public read returned ${bytes.length} identical bytes, no auth header`);

const del = await fetch(endpoint, {
  method: "DELETE",
  headers: { Authorization: `Bearer ${key}` }
});
console.log(
  del.ok ? "ok  probe deleted" : `warn probe left behind (HTTP ${del.status}) — delete ${objectKey} by hand`
);
console.log(`\nSupabase storage is live on bucket "${bucket}". Admin uploads land there.`);
