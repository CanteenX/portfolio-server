import { env } from "../../config/env";
import { BrandingModel, type BrandingDocument } from "./branding.model";

export type BrandingPayload = {
  companyName: string;
  logoUrl: string;
  primaryColor: string;
};

const DEFAULTS: BrandingPayload = {
  companyName: "Admin Platform",
  logoUrl: "",
  primaryColor: "#1976d2",
};

class BrandingService {
  async get(): Promise<BrandingPayload> {
    const doc = await BrandingModel.findOne({ clientCode: env.CLIENT_CODE })
      .lean<BrandingDocument>()
      .exec();

    if (!doc) return { ...DEFAULTS };

    return {
      companyName: doc.companyName,
      logoUrl: doc.logoUrl,
      primaryColor: doc.primaryColor,
    };
  }

  async upsert(payload: BrandingPayload, updatedBy: string): Promise<BrandingPayload> {
    await BrandingModel.updateOne(
      { clientCode: env.CLIENT_CODE },
      {
        $set: {
          companyName: payload.companyName,
          logoUrl: payload.logoUrl,
          primaryColor: payload.primaryColor,
          updatedBy,
        },
      },
      { upsert: true }
    );

    return this.get();
  }
}

export const brandingService = new BrandingService();
