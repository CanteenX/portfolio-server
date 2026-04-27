import mongoose, { Schema } from "mongoose";

export type ChatConversationDocument = {
  title: string;
  participantUserIds: string[];
  status: "active" | "archived";
  lastMessageAt?: Date;
  messageCount: number;
  createdByUserId: string;
};

const chatConversationSchema = new Schema<ChatConversationDocument>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    participantUserIds: {
      type: [String],
      required: true,
      validate: {
        validator: (value: string[]) => Array.isArray(value) && value.length >= 1,
        message: "At least one participant is required"
      }
    },
    status: { type: String, enum: ["active", "archived"], default: "active", index: true },
    lastMessageAt: { type: Date, index: true },
    messageCount: { type: Number, default: 0, min: 0 },
    createdByUserId: { type: String, required: true }
  },
  { timestamps: true }
);

chatConversationSchema.index({ status: 1, lastMessageAt: -1 });

export const ChatConversationModel =
  mongoose.models.ChatConversation ??
  mongoose.model<ChatConversationDocument>("ChatConversation", chatConversationSchema);

export type ChatMessageDocument = {
  conversationId: mongoose.Types.ObjectId;
  senderUserId: string;
  senderEmail: string;
  content: string;
  editedAt?: Date;
};

const chatMessageSchema = new Schema<ChatMessageDocument>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "ChatConversation", required: true, index: true },
    senderUserId: { type: String, required: true },
    senderEmail: { type: String, required: true },
    content: { type: String, required: true, maxlength: 4000 },
    editedAt: { type: Date }
  },
  { timestamps: true }
);

chatMessageSchema.index({ conversationId: 1, createdAt: -1 });

export const ChatMessageModel =
  mongoose.models.ChatMessage ?? mongoose.model<ChatMessageDocument>("ChatMessage", chatMessageSchema);
