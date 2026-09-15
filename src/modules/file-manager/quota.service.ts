import { env } from "../../config/env";
import { FileManagerEntryModel } from "./file-manager.models";

/** Default per-user storage quota: 500 MB */
// Reads the same value GET /file-manager/quota reports, so the enforced limit
// and the displayed limit cannot drift.
const DEFAULT_QUOTA_BYTES = env.FILE_QUOTA_BYTES;

export async function getUserStorageUsed(userId: string): Promise<number> {
  const result = await FileManagerEntryModel.aggregate([
    { $match: { createdByUserId: userId, kind: "file", status: "active" } },
    { $group: { _id: null, total: { $sum: "$sizeBytes" } } },
  ]).exec();
  return result[0]?.total ?? 0;
}

export async function checkQuota(
  userId: string,
  additionalBytes: number
): Promise<{ allowed: boolean; usedBytes: number; quotaBytes: number }> {
  const usedBytes = await getUserStorageUsed(userId);
  const quotaBytes = DEFAULT_QUOTA_BYTES;
  const allowed = usedBytes + additionalBytes <= quotaBytes;
  return { allowed, usedBytes, quotaBytes };
}
