import mongoose, { Schema } from "mongoose";

export type SupportTicketComment = {
  authorUserId: string;
  authorEmail: string;
  message: string;
  isInternal: boolean;
  createdAt: Date;
};

const supportTicketCommentSchema = new Schema<SupportTicketComment>(
  {
    authorUserId: { type: String, required: true },
    authorEmail: { type: String, required: true },
    message: { type: String, required: true },
    isInternal: { type: Boolean, default: false },
    createdAt: { type: Date, default: () => new Date() }
  },
  { _id: false }
);

export type SupportTicketDocument = {
  ticketNumber: string;
  subject: string;
  description: string;
  requesterName: string;
  requesterEmail: string;
  channel: "email" | "chat" | "phone" | "web";
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "pending_customer" | "resolved" | "closed";
  tags: string[];
  assignedToUserId?: string;
  firstResponseAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  comments: SupportTicketComment[];
};

const supportTicketSchema = new Schema<SupportTicketDocument>(
  {
    ticketNumber: { type: String, required: true, unique: true, index: true },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    requesterName: { type: String, required: true, trim: true },
    requesterEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    channel: { type: String, enum: ["email", "chat", "phone", "web"], default: "web", index: true },
    priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium", index: true },
    status: {
      type: String,
      enum: ["open", "in_progress", "pending_customer", "resolved", "closed"],
      default: "open",
      index: true
    },
    tags: { type: [String], default: [] },
    assignedToUserId: { type: String },
    firstResponseAt: { type: Date },
    resolvedAt: { type: Date },
    closedAt: { type: Date },
    comments: { type: [supportTicketCommentSchema], default: [] }
  },
  { timestamps: true }
);

supportTicketSchema.index({ status: 1, priority: 1, createdAt: -1 });

export const SupportTicketModel =
  mongoose.models.SupportTicket ?? mongoose.model<SupportTicketDocument>("SupportTicket", supportTicketSchema);
