import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { Readable } from "node:stream";
import { env } from "../../config/env";
import { logger } from "../../core/logging/logger";
import { supabaseConfig } from "../../core/storage/file-store";

/**
 * Storage adapter interface.
 *
 * All file manager upload/download operations go through this interface,
 * enabling hot-swap between local filesystem and S3-compatible storage
 * via the STORAGE_BACKEND env var.
 */
export interface StorageAdapter {
  /** Store a local file at the given key. Returns the final storage key. */
  store(key: string, localFilePath: string): Promise<string>;

  /** Get a readable stream for the given key. */
  retrieve(key: string): Promise<Readable>;

  /** Delete the object at the given key. */
  delete(key: string): Promise<void>;

  /** Get a download URL (signed URL for S3, or null for local). */
  getDownloadUrl(key: string, filename: string): Promise<string | null>;
}

// ── Local adapter ─────────────────────────────────────────────────

const UPLOAD_DIR = path.resolve(env.FILE_UPLOAD_DIR ?? "uploads");

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export class LocalStorageAdapter implements StorageAdapter {
  async store(key: string, localFilePath: string): Promise<string> {
    const dest = path.join(UPLOAD_DIR, key);
    ensureDir(path.dirname(dest));
    fs.renameSync(localFilePath, dest);
    return key;
  }

  async retrieve(key: string): Promise<Readable> {
    const absPath = path.join(UPLOAD_DIR, key);
    if (!fs.existsSync(absPath)) {
      throw new Error(`File not found on disk: ${key}`);
    }
    return fs.createReadStream(absPath);
  }

  async delete(key: string): Promise<void> {
    const absPath = path.join(UPLOAD_DIR, key);
    if (fs.existsSync(absPath)) {
      fs.unlinkSync(absPath);
    }
  }

  async getDownloadUrl(_key: string, _filename: string): Promise<string | null> {
    return null; // local adapter streams through the API
  }
}

// ── S3 adapter ────────────────────────────────────────────────────

export class S3StorageAdapter implements StorageAdapter {
  private bucket: string;
  private clientPromise: Promise<any>;

  constructor() {
    this.bucket = env.S3_BUCKET ?? "";
    if (!this.bucket) {
      throw new Error("S3_BUCKET is required when STORAGE_BACKEND=s3");
    }
    // Lazy-load AWS SDK so the import cost is only paid when S3 is configured
    this.clientPromise = this.createClient();
  }

  private async createClient() {
    const { S3Client } = await import("@aws-sdk/client-s3");
    const config: Record<string, unknown> = {
      region: env.S3_REGION ?? "us-east-1",
    };
    if (env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY) {
      config.credentials = {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      };
    }
    if (env.S3_ENDPOINT) {
      config.endpoint = env.S3_ENDPOINT;
      config.forcePathStyle = true; // for MinIO / localstack
    }
    return new S3Client(config);
  }

  async store(key: string, localFilePath: string): Promise<string> {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await this.clientPromise;
    const body = fs.createReadStream(localFilePath);
    await client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body })
    );
    // Clean up local temp file
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    logger.info("S3 upload complete", { bucket: this.bucket, key });
    return key;
  }

  async retrieve(key: string): Promise<Readable> {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await this.clientPromise;
    const response = await client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key })
    );
    if (!response.Body) {
      throw new Error(`S3 object not found: ${key}`);
    }
    return response.Body as Readable;
  }

  async delete(key: string): Promise<void> {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await this.clientPromise;
    await client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key })
    );
  }

  async getDownloadUrl(key: string, filename: string): Promise<string | null> {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    const client = await this.clientPromise;
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${encodeURIComponent(filename)}"`,
    });
    return getSignedUrl(client, command, { expiresIn: 3600 });
  }
}

// ── Supabase adapter ──────────────────────────────────────────────

/**
 * Stores file-manager objects in the same Supabase bucket the website images
 * use, under a "file-manager/" prefix so the two never collide.
 *
 * Unlike the website image path, these objects are NOT served straight off the
 * public CDN URL: file-manager downloads are permission-checked, so
 * getDownloadUrl returns null and the API streams the bytes through
 * `retrieve()` exactly as the local adapter does. The bucket being public means
 * a leaked object key is readable, which is why keys carry 8 random bytes.
 */
export class SupabaseStorageAdapter implements StorageAdapter {
  private readonly url: string;
  private readonly key: string;
  private readonly bucket: string;
  private readonly prefix = "file-manager";

  constructor() {
    const config = supabaseConfig();
    if (!config) {
      throw new Error(
        "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required when STORAGE_BACKEND=supabase"
      );
    }
    this.url = config.url;
    this.key = config.key;
    this.bucket = config.bucket;
  }

  private objectUrl(key: string): string {
    return `${this.url}/storage/v1/object/${this.bucket}/${this.prefix}/${key}`;
  }

  async store(key: string, localFilePath: string): Promise<string> {
    const body = await fs.promises.readFile(localFilePath);
    const response = await fetch(this.objectUrl(key), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.key}`,
        "Content-Type": "application/octet-stream",
        "x-upsert": "true"
      },
      body: new Uint8Array(body)
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Supabase upload failed (${response.status}): ${detail.slice(0, 300)}`);
    }

    // Only remove the temp file once the bytes are safely stored, so a failed
    // upload leaves something to retry from.
    await fs.promises.unlink(localFilePath).catch(() => undefined);
    logger.info("Supabase upload complete", { bucket: this.bucket, key });
    return key;
  }

  async retrieve(key: string): Promise<Readable> {
    const response = await fetch(this.objectUrl(key), {
      headers: { Authorization: `Bearer ${this.key}` }
    });
    if (!response.ok || !response.body) {
      throw new Error(`Supabase object not found: ${key} (HTTP ${response.status})`);
    }
    return Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]);
  }

  async delete(key: string): Promise<void> {
    const response = await fetch(this.objectUrl(key), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${this.key}` }
    });
    // 404 means the object is already gone, which is the state we wanted.
    if (!response.ok && response.status !== 404) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Supabase delete failed (${response.status}): ${detail.slice(0, 300)}`);
    }
  }

  async getDownloadUrl(_key: string, _filename: string): Promise<string | null> {
    return null; // stream through the API so permission checks still apply
  }
}

// ── Factory ───────────────────────────────────────────────────────

export function generateStorageKey(userId: string, originalName: string): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const hash = crypto.randomBytes(8).toString("hex");
  const ext = path.extname(originalName);
  return `${userId}/${datePart}_${hash}${ext}`;
}

let _adapter: StorageAdapter | undefined;

export function getStorageAdapter(): StorageAdapter {
  if (_adapter) return _adapter;
  const backend = env.STORAGE_BACKEND ?? "local";
  if (backend === "s3") {
    _adapter = new S3StorageAdapter();
    logger.info("Storage backend: S3", { bucket: env.S3_BUCKET });
  } else if (backend === "supabase") {
    _adapter = new SupabaseStorageAdapter();
    logger.info("Storage backend: Supabase", { bucket: env.SUPABASE_STORAGE_BUCKET });
  } else {
    _adapter = new LocalStorageAdapter();
    logger.info("Storage backend: local", { dir: UPLOAD_DIR });
  }
  return _adapter;
}
