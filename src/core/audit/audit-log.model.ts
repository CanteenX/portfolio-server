import mongoose, { Schema } from "mongoose";

export type AuditLogDocument = {
  action: string;
  entity: string;
  entityId?: string;
  userId: string;
  userEmail?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: Date;
};

const auditLogSchema = new Schema<AuditLogDocument>(
  {
    action: { type: String, required: true, index: true },
    entity: { type: String, required: true, index: true },
    entityId: { type: String },
    userId: { type: String, required: true, index: true },
    userEmail: { type: String },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    metadata: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: () => new Date(), index: true }
  },
  { timestamps: false }
);

auditLogSchema.index({ entity: 1, action: 1, createdAt: -1 });

export const AuditLogModel =
  mongoose.models.AuditLog ?? mongoose.model<AuditLogDocument>("AuditLog", auditLogSchema);
