import { env } from "../../config/env";
import { SystemSettingsModel, type SystemSettingsDocument } from "./system-settings.model";

export type SystemSettingsPayload = {
  timezone: string;
  defaultCurrency: string;
  locale: string;
};

const DEFAULTS: SystemSettingsPayload = {
  timezone: "UTC",
  defaultCurrency: "USD",
  locale: "en-US",
};

class SystemSettingsService {
  async get(): Promise<SystemSettingsPayload> {
    const doc = await SystemSettingsModel.findOne({ clientCode: env.CLIENT_CODE })
      .lean<SystemSettingsDocument>()
      .exec();

    if (!doc) return { ...DEFAULTS };

    return {
      timezone: doc.timezone,
      defaultCurrency: doc.defaultCurrency,
      locale: doc.locale,
    };
  }

  async upsert(payload: SystemSettingsPayload, updatedBy: string): Promise<SystemSettingsPayload> {
    await SystemSettingsModel.updateOne(
      { clientCode: env.CLIENT_CODE },
      {
        $set: {
          timezone: payload.timezone,
          defaultCurrency: payload.defaultCurrency,
          locale: payload.locale,
          updatedBy,
        },
      },
      { upsert: true }
    );

    return this.get();
  }
}

export const systemSettingsService = new SystemSettingsService();
