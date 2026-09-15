import { MODULE_KEYS } from "@admin-platform/shared-types";
import { env } from "../config/env";
import { FeatureConfigModel } from "../core/feature-flags/feature-config.model";
import { logger } from "../core/logging/logger";
import { seedModuleData } from "./seed-data";
import { seedRbacBaseline } from "./seed-rbac";

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

  // Must run on every boot, not only the first: requireRbacPermission resolves
  // menus BY URL, so a screen added in a later release has no row until this
  // runs, and every non-super-admin request to it 403s.
  //
  // Non-fatal, matching api-src/entry.ts. A seeding problem degrades RBAC to
  // "super admin only" and is loud in the log; it must not stop the server
  // starting, which is what an unhandled throw here used to do.
  try {
    await seedRbacBaseline();
  } catch (error) {
    logger.error("RBAC seed failed — guarded routes will deny non-super-admins", { error });
  }
}
