import mongoose, { Schema } from "mongoose";

export type CrmContactDocument = {
  displayName: string;
  primaryEmail?: string;
  primaryPhone?: string;
  companyName?: string;
  ownerUserId?: string;
  tags: string[];
  notes?: string;
};

const crmContactSchema = new Schema<CrmContactDocument>(
  {
    displayName: { type: String, required: true, trim: true },
    primaryEmail: { type: String, lowercase: true },
    primaryPhone: { type: String },
    companyName: { type: String },
    ownerUserId: { type: String },
    tags: { type: [String], default: [] },
    notes: { type: String, default: "" }
  },
  { timestamps: true }
);

crmContactSchema.index({ primaryEmail: 1 });

export const CrmContactModel =
  mongoose.models.CrmContact ?? mongoose.model<CrmContactDocument>("CrmContact", crmContactSchema);

export type PipelineStage = {
  key: string;
  label: string;
  order: number;
  isTerminalWon?: boolean;
  isTerminalLost?: boolean;
};

export type CrmPipelineDocument = {
  name: string;
  isDefault: boolean;
  stages: PipelineStage[];
};

const pipelineStageSchema = new Schema<PipelineStage>(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    order: { type: Number, required: true },
    isTerminalWon: { type: Boolean, default: false },
    isTerminalLost: { type: Boolean, default: false }
  },
  { _id: false }
);

const crmPipelineSchema = new Schema<CrmPipelineDocument>(
  {
    name: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
    stages: { type: [pipelineStageSchema], required: true, default: [] }
  },
  { timestamps: true }
);

export const CrmPipelineModel =
  mongoose.models.CrmPipeline ?? mongoose.model<CrmPipelineDocument>("CrmPipeline", crmPipelineSchema);

export type CrmDealDocument = {
  title: string;
  contactId: mongoose.Types.ObjectId;
  pipelineId: mongoose.Types.ObjectId;
  stageKey: string;
  amountValue: number;
  currency: string;
  status: "open" | "won" | "lost";
  expectedCloseDate?: Date;
  ownerUserId?: string;
  lostReason?: string;
};

const crmDealSchema = new Schema<CrmDealDocument>(
  {
    title: { type: String, required: true },
    contactId: { type: Schema.Types.ObjectId, ref: "CrmContact", required: true, index: true },
    pipelineId: { type: Schema.Types.ObjectId, ref: "CrmPipeline", required: true, index: true },
    stageKey: { type: String, required: true },
    amountValue: { type: Number, required: true, min: 0, default: 0 },
    currency: { type: String, required: true, default: "USD" },
    status: { type: String, enum: ["open", "won", "lost"], default: "open" },
    expectedCloseDate: { type: Date },
    ownerUserId: { type: String },
    lostReason: { type: String }
  },
  { timestamps: true }
);

crmDealSchema.index({ pipelineId: 1, stageKey: 1 });

export const CrmDealModel =
  mongoose.models.CrmDeal ?? mongoose.model<CrmDealDocument>("CrmDeal", crmDealSchema);
