import { FileManagerEntryModel } from "./file-manager.models";

/** Default per-user storage quota: 500 MB */
const DEFAULT_QUOTA_BYTES = 500 * 1024 * 1024;

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
