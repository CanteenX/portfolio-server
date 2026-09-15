import fs from "node:fs";
import path from "node:path";
import { env } from "../../config/env";
import { IS_SERVERLESS } from "../../config/runtime";

const LOCAL_DIR = env.FILE_UPLOAD_DIR || "uploads";

/**
 * Single place that turns validated upload bytes into a stored, servable
 * reference. Two very different backends sit behind one return value:
 *
 *   Supabase -> "https://<ref>.supabase.co/storage/v1/object/public/..." (absolute URL)
 *   local    -> "/uploads/<name>"                                       (relative path)
 *
 * Callers must treat the return value as opaque. `resolveImageUrl()` on the
 * website passes absolute URLs through untouched, so existing rows holding
 * relative paths keep working alongside new rows holding absolute URLs, with
 * no migration and no client change when the backend is switched.
 */

export type SupabaseStorageConfig = {
  url: string;
  key: string;
  bucket: string;
};

/**
 * Reads the Supabase credentials at call time rather than at module scope.
 *
 * `env` is parsed once at import, but the values are read lazily here so that
 * a test or script can set them after import and still exercise the same seam.
 */
export function supabaseConfig(): SupabaseStorageConfig | null {
  const url = (env.SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
  const key = (env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!url || !key) return null;
  return {
    url,
    key,
    bucket: (env.SUPABASE_STORAGE_BUCKET || "portfolio-uploads").trim()
  };
}

/** True when uploads will land in Supabase rather than on local disk. */
export function isSupabaseConfigured(): boolean {
  return supabaseConfig() !== null;
}

/**
 * Uploads through the Storage REST API rather than @supabase/supabase-js.
 *
 * The SDK exists to give you auth, realtime and PostgREST; none of that is
 * wanted here, and a single authenticated fetch avoids adding a dependency
 * (and its cold-start cost) to a function that already boots slowly.
 *
 * The service-role key is required: the bucket is public to READ, but anon
 * clients cannot write to it, which is exactly the split we want — the browser
 * fetches images straight from the CDN, only this server can put them there.
 */
async function putSupabase(
  { url, key, bucket }: SupabaseStorageConfig,
  body: Buffer,
  objectKey: string,
  contentType: string
): Promise<string> {
  const endpoint = `${url}/storage/v1/object/${bucket}/${objectKey}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": contentType || "application/octet-stream",
      // The caller already generated a unique filename, so a collision means a
      // genuine retry of the same upload rather than two different files.
      "x-upsert": "true",
      "cache-control": "public, max-age=31536000, immutable"
    },
    body: new Uint8Array(body)
  });

  if (!response.ok) {
    // Surface Supabase's own message: "Bucket not found" and "new row violates
    // row-level security policy" are the two failures worth telling apart, and
    // a bare status code hides both.
    const detail = await response.text().catch(() => "");
    throw new Error(`Supabase storage upload failed (${response.status}): ${detail.slice(0, 300)}`);
  }

  return `${url}/storage/v1/object/public/${bucket}/${objectKey}`;
}

async function putLocal(body: Buffer, key: string): Promise<string> {
  const dir = path.join(LOCAL_DIR, path.dirname(key));
  await fs.promises.mkdir(dir, { recursive: true });
  const dest = path.join(LOCAL_DIR, key);
  await fs.promises.writeFile(dest, new Uint8Array(body));
  // Keep POSIX separators: these strings end up in URLs, and path.join emits
  // backslashes on Windows.
  return `/${LOCAL_DIR}/${key}`.split(path.sep).join("/");
}

/**
 * Stores already-validated bytes and returns the stored reference. This is the
 * only seam upload routes write through, so switching backends never requires
 * touching a route or controller.
 *
 * Supabase wins when it is configured, on purpose and in every environment:
 * the point of pinning storage to one bucket is that a file uploaded from a
 * developer's machine is the same file production serves. Falling back per
 * environment would silently scatter media across two backends again.
 *
 * On Vercel with no Supabase credentials this throws rather than writing to a
 * read-only filesystem, because a silent local write there is lost on the next
 * invocation and produces a dead image URL that looks like it worked.
 *
 * `path.basename` is applied to the filename so a crafted value cannot escape
 * the intended folder.
 */
export async function persistBuffer(
  body: Buffer,
  filename: string,
  contentType: string,
  folder = "portfolio"
): Promise<string> {
  const key = `${folder}/${path.basename(filename)}`;

  const supabase = supabaseConfig();
  if (supabase) return putSupabase(supabase, body, key, contentType);

  if (IS_SERVERLESS) {
    throw new Error(
      "No object storage configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY — " +
        "the serverless filesystem is read-only, so uploads cannot fall back to local disk."
    );
  }

  return putLocal(body, key);
}

/**
 * Removes a stored object. Local paths and Supabase URLs are both accepted so
 * callers never have to know which backend produced the reference.
 *
 * Deletion is best-effort: a missing object is not an error, because the row
 * that pointed at it is going away either way.
 */
export async function deleteStored(reference: string): Promise<void> {
  if (!reference) return;

  const supabase = supabaseConfig();
  if (supabase && reference.startsWith(`${supabase.url}/storage/v1/object/public/${supabase.bucket}/`)) {
    const objectKey = reference.slice(
      `${supabase.url}/storage/v1/object/public/${supabase.bucket}/`.length
    );
    await fetch(`${supabase.url}/storage/v1/object/${supabase.bucket}/${objectKey}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${supabase.key}` }
    }).catch(() => undefined);
    return;
  }

  if (reference.startsWith("http") || IS_SERVERLESS) return;

  const relative = reference.replace(/^\/+/, "").replace(new RegExp(`^${LOCAL_DIR}/`), "");
  await fs.promises.unlink(path.join(LOCAL_DIR, relative)).catch(() => undefined);
}

export default { persistBuffer, deleteStored, supabaseConfig, isSupabaseConfigured };
