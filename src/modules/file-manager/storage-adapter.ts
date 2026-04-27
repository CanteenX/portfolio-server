import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { Readable } from "node:stream";
import { env } from "../../config/env";
import { logger } from "../../core/logging/logger";

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
  } else {
    _adapter = new LocalStorageAdapter();
    logger.info("Storage backend: local", { dir: UPLOAD_DIR });
  }
  return _adapter;
}
