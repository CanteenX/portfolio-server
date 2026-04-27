import mongoose, { Schema } from "mongoose";

export type ApiAccessKeyDocument = {
  name: string;
  description?: string;
  scopes: string[];
  status: "active" | "revoked";
  keyPrefix: string;
  keyLast4: string;
  keyHash: string;
  createdByUserId: string;
  revokedAt?: Date;
  revokedByUserId?: string;
  lastUsedAt?: Date;
  expiresAt?: Date;
  rotatedFromKeyId?: mongoose.Types.ObjectId;
};

const apiAccessKeySchema = new Schema<ApiAccessKeyDocument>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    scopes: { type: [String], default: [] },
    status: { type: String, enum: ["active", "revoked"], default: "active" },
    keyPrefix: { type: String, required: true, index: true },
    keyLast4: { type: String, required: true },
    keyHash: { type: String, required: true, unique: true, index: true },
    createdByUserId: { type: String, required: true },
    revokedAt: { type: Date },
    revokedByUserId: { type: String },
    lastUsedAt: { type: Date },
    expiresAt: { type: Date, index: true },
    rotatedFromKeyId: { type: Schema.Types.ObjectId, ref: "ApiAccessKey", index: true }
  },
  { timestamps: true }
);

apiAccessKeySchema.index({ status: 1, createdAt: -1 });

export const ApiAccessKeyModel =
  mongoose.models.ApiAccessKey ?? mongoose.model<ApiAccessKeyDocument>("ApiAccessKey", apiAccessKeySchema);

export type ApiAccessKeyAuditEventDocument = {
  keyId: mongoose.Types.ObjectId;
  action: "issued" | "revoked" | "regenerated";
  actorUserId: string;
  metadata?: Record<string, unknown>;
};

const apiAccessKeyAuditEventSchema = new Schema<ApiAccessKeyAuditEventDocument>(
  {
    keyId: { type: Schema.Types.ObjectId, ref: "ApiAccessKey", required: true, index: true },
    action: { type: String, enum: ["issued", "revoked", "regenerated"], required: true },
    actorUserId: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

apiAccessKeyAuditEventSchema.index({ keyId: 1, createdAt: -1 });

export const ApiAccessKeyAuditEventModel =
  mongoose.models.ApiAccessKeyAuditEvent ??
  mongoose.model<ApiAccessKeyAuditEventDocument>("ApiAccessKeyAuditEvent", apiAccessKeyAuditEventSchema);
