import { NotificationModel, type NotificationDocument } from "./notification.model";

export type CreateNotificationPayload = {
  userId: string;
  title: string;
  body: string;
  type?: "info" | "warning" | "error" | "success";
  link?: string;
};

export type NotificationResponse = {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  link?: string;
  createdAt: string;
};

function toResponse(doc: NotificationDocument): NotificationResponse {
  return {
    id: String(doc._id),
    title: doc.title,
    body: doc.body,
    type: doc.type,
    read: doc.read,
    link: doc.link,
    createdAt: doc.createdAt.toISOString(),
  };
}

class NotificationService {
  async list(userId: string, limit: number, offset: number): Promise<{ items: NotificationResponse[]; total: number }> {
    const [items, total] = await Promise.all([
      NotificationModel.find({ userId })
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean<NotificationDocument[]>()
        .exec(),
      NotificationModel.countDocuments({ userId }).exec(),
    ]);
    return { items: items.map(toResponse), total };
  }

  async unreadCount(userId: string): Promise<number> {
    return NotificationModel.countDocuments({ userId, read: false }).exec();
  }

  async markRead(notificationId: string, userId: string): Promise<boolean> {
    const result = await NotificationModel.updateOne(
      { _id: notificationId, userId },
      { $set: { read: true } }
    ).exec();
    return result.matchedCount > 0;
  }

  async markAllRead(userId: string): Promise<number> {
    const result = await NotificationModel.updateMany(
      { userId, read: false },
      { $set: { read: true } }
    ).exec();
    return result.modifiedCount;
  }

  async create(payload: CreateNotificationPayload): Promise<NotificationResponse> {
    const doc = await NotificationModel.create({
      userId: payload.userId,
      title: payload.title,
      body: payload.body,
      type: payload.type ?? "info",
      link: payload.link,
    });
    return toResponse(doc.toObject() as NotificationDocument);
  }
}

export const notificationService = new NotificationService();
