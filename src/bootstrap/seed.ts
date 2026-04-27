import bcrypt from "bcryptjs";
import { MODULE_KEYS } from "@admin-platform/shared-types";
import { env } from "../config/env";
import { UserModel } from "../core/auth/user.model";
import { FeatureConfigModel } from "../core/feature-flags/feature-config.model";
import { logger } from "../core/logging/logger";
import { seedModuleData } from "./seed-data";

async function ensureUser(email: string, role: "super_admin" | "admin", password: string): Promise<void> {
  const existing = await UserModel.findOne({ email }).exec();
  if (existing) {
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await UserModel.create({ email, passwordHash, role });
  logger.info(`Seeded user: ${email}`);
}

export async function seedBaseline(): Promise<void> {
  await ensureUser("superadmin@admin.local", "super_admin", env.SUPER_ADMIN_SEED_PASSWORD!);
  await ensureUser("admin@admin.local", "admin", env.ADMIN_SEED_PASSWORD!);

  const existingConfig = await FeatureConfigModel.findOne({ clientCode: env.CLIENT_CODE }).exec();
  if (!existingConfig) {
    await FeatureConfigModel.create({
      clientCode: env.CLIENT_CODE,
      enabledModules: [...MODULE_KEYS],
      updatedBy: "seed"
    });
    logger.info(`Seeded feature config for client ${env.CLIENT_CODE}`);
  }

  // Seed module data after baseline
  await seedModuleData();
}
