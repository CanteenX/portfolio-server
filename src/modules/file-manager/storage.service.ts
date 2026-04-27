import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { env } from "../../config/env";

const UPLOAD_DIR = path.resolve(env.FILE_UPLOAD_DIR ?? "uploads");

function ensureUploadDir(): void {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

export function getStoragePath(userId: string, originalName: string): string {
  ensureUploadDir();
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const hash = crypto.randomBytes(8).toString("hex");
  const ext = path.extname(originalName);
  const safeName = `${datePart}_${hash}${ext}`;
  const userDir = path.join(UPLOAD_DIR, userId);
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  return path.join(userDir, safeName);
}

export function getAbsolutePath(storagePath: string): string {
  return path.isAbsolute(storagePath) ? storagePath : path.resolve(storagePath);
}

export function deleteStoredFile(storagePath: string): void {
  const abs = getAbsolutePath(storagePath);
  if (fs.existsSync(abs)) {
    fs.unlinkSync(abs);
  }
}
