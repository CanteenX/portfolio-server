import mongoose, { Schema } from "mongoose";

export type MailboxAttachment = {
  filename: string;
  contentType: string;
  sizeBytes: number;
  storagePath?: string;
};

export type MailboxMessageDocument = {
  subject: string;
  body: string;
  fromAddress: string;
  fromName: string;
  toAddresses: string[];
  ccAddresses: string[];
  bccAddresses: string[];
  folder: "inbox" | "sent" | "drafts" | "trash" | "archive";
  status: "unread" | "read" | "flagged";
  isStarred: boolean;
  hasAttachments: boolean;
  attachments: MailboxAttachment[];
  externalMessageId?: string;
  inReplyToId?: mongoose.Types.ObjectId;
  ownerUserId: string;
  sentAt?: Date;
};

const mailboxMessageSchema = new Schema<MailboxMessageDocument>(
  {
    subject: { type: String, required: true, trim: true, maxlength: 300 },
    body: { type: String, required: true, maxlength: 50000 },
    fromAddress: { type: String, required: true, trim: true, lowercase: true },
    fromName: { type: String, required: true, trim: true, maxlength: 200 },
    toAddresses: {
      type: [String],
      required: true,
      validate: {
        validator: (value: string[]) => Array.isArray(value) && value.length >= 1,
        message: "At least one recipient is required"
      }
    },
    ccAddresses: { type: [String], default: [] },
    bccAddresses: { type: [String], default: [] },
    folder: { type: String, enum: ["inbox", "sent", "drafts", "trash", "archive"], default: "inbox", index: true },
    status: { type: String, enum: ["unread", "read", "flagged"], default: "unread", index: true },
    isStarred: { type: Boolean, default: false },
    hasAttachments: { type: Boolean, default: false },
    attachments: {
      type: [{
        filename: { type: String, required: true },
        contentType: { type: String, required: true },
        sizeBytes: { type: Number, required: true, min: 0 },
        storagePath: { type: String },
      }],
      default: [],
    },
    externalMessageId: { type: String },
    inReplyToId: { type: Schema.Types.ObjectId, ref: "MailboxMessage" },
    ownerUserId: { type: String, required: true, index: true },
    sentAt: { type: Date }
  },
  { timestamps: true }
);

mailboxMessageSchema.index({ ownerUserId: 1, folder: 1, createdAt: -1 });

export const MailboxMessageModel =
  mongoose.models.MailboxMessage ?? mongoose.model<MailboxMessageDocument>("MailboxMessage", mailboxMessageSchema);
