import { AuditLogModel, type AuditLogDocument } from "./audit-log.model";

export type AuditEntry = Omit<AuditLogDocument, "createdAt">;

class AuditLogService {
  async log(entry: AuditEntry): Promise<void> {
    await AuditLogModel.create(entry);
  }

  async getRecent(options: {
    entity?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ items: AuditLogDocument[]; total: number }> {
    const filter: Record<string, unknown> = {};
    if (options.entity) {
      filter.entity = options.entity;
    }

    const limit = Math.min(options.limit ?? 50, 200);
    const offset = options.offset ?? 0;

    const [items, total] = await Promise.all([
      AuditLogModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean<AuditLogDocument[]>()
        .exec(),
      AuditLogModel.countDocuments(filter).exec()
    ]);

    return { items, total };
  }
}

export const auditLogService = new AuditLogService();
