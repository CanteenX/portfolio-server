import type { QuickLink } from "@admin-platform/shared-types";
import { env } from "../../config/env";
import { QuickLinkModel, type QuickLinkDocument } from "./quick-links.model";

function toResponse(doc: QuickLinkDocument): QuickLink {
  return {
    _id: String(doc._id),
    name: doc.name,
    url: doc.url,
    iconUrl: doc.iconUrl || undefined,
    order: doc.order,
  };
}

class QuickLinksService {
  private get clientCode() {
    return env.CLIENT_CODE;
  }

  async list(): Promise<QuickLink[]> {
    const docs = await QuickLinkModel.find({ clientCode: this.clientCode })
      .sort({ order: 1 })
      .lean<QuickLinkDocument[]>()
      .exec();
    return docs.map(toResponse);
  }

  async create(
    payload: { name: string; url: string; iconUrl?: string; order: number },
    userId: string
  ): Promise<QuickLink> {
    const doc = await QuickLinkModel.create({
      clientCode: this.clientCode,
      ...payload,
      iconUrl: payload.iconUrl ?? "",
      createdBy: userId,
      updatedBy: userId,
    });
    return toResponse(doc.toObject() as QuickLinkDocument);
  }

  async update(
    id: string,
    payload: Partial<{ name: string; url: string; iconUrl: string; order: number }>,
    userId: string
  ): Promise<QuickLink | null> {
    const doc = await QuickLinkModel.findOneAndUpdate(
      { _id: id, clientCode: this.clientCode },
      { $set: { ...payload, updatedBy: userId } },
      { new: true }
    )
      .lean<QuickLinkDocument>()
      .exec();
    return doc ? toResponse(doc) : null;
  }

  async remove(id: string): Promise<boolean> {
    const result = await QuickLinkModel.deleteOne({
      _id: id,
      clientCode: this.clientCode,
    }).exec();
    return result.deletedCount > 0;
  }
}

export const quickLinksService = new QuickLinksService();
