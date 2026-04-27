import mongoose, { Schema } from "mongoose";

export type NotificationDocument = {
  _id: mongoose.Types.ObjectId;
  userId: string;
  title: string;
  body: string;
  type: "info" | "warning" | "error" | "success";
  read: boolean;
  link?: string;
  createdAt: Date;
};

const notificationSchema = new Schema<NotificationDocument>(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true, maxlength: 200 },
    body: { type: String, required: true, maxlength: 1000 },
    type: { type: String, enum: ["info", "warning", "error", "success"], default: "info" },
    read: { type: Boolean, default: false },
    link: { type: String },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export const NotificationModel =
  mongoose.models.Notification ??
  mongoose.model<NotificationDocument>("Notification", notificationSchema);
