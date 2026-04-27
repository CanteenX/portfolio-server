import type { ModuleKey } from "@admin-platform/shared-types";
import { MODULE_KEYS } from "@admin-platform/shared-types";
import { env } from "../../config/env";
import { getDefaultFeatures } from "../rbac/permissions";
import { FeatureConfigModel } from "./feature-config.model";

export class FeatureConfigService {
  async getEnabledFeatures(): Promise<Record<ModuleKey, boolean>> {
    const doc = await FeatureConfigModel.findOne({ clientCode: env.CLIENT_CODE }).exec();
    const defaults = getDefaultFeatures();

    if (!doc) {
      return defaults;
    }

    const enabledSet = new Set(doc.enabledModules as ModuleKey[]);
    const features = {} as Record<ModuleKey, boolean>;
    for (const moduleKey of MODULE_KEYS) {
      features[moduleKey] = enabledSet.has(moduleKey);
    }
    return features;
  }

  async upsertEnabledModules(enabledModules: ModuleKey[], updatedBy: string): Promise<void> {
    await FeatureConfigModel.updateOne(
      { clientCode: env.CLIENT_CODE },
      {
        $set: {
          enabledModules,
          updatedBy
        }
      },
      { upsert: true }
    );
  }
}

export const featureConfigService = new FeatureConfigService();
