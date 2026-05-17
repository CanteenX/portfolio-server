import { MODULE_KEYS } from "@admin-platform/shared-types";
import { env } from "../config/env";
import { FeatureConfigModel } from "../core/feature-flags/feature-config.model";
import { logger } from "../core/logging/logger";
import { seedModuleData } from "./seed-data";

export async function seedBaseline(): Promise<void> {
  const existingConfig = await FeatureConfigModel.findOne({ clientCode: env.CLIENT_CODE }).exec();
  if (!existingConfig) {
    await FeatureConfigModel.create({
      clientCode: env.CLIENT_CODE,
      enabledModules: [...MODULE_KEYS],
      updatedBy: "seed"
    });
    logger.info(`Seeded feature config for client ${env.CLIENT_CODE}`);
  }

  await seedModuleData();
}
