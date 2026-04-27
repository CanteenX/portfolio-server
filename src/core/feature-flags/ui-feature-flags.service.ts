import {
  DEFAULT_UI_FEATURE_FLAGS,
  UI_FEATURE_FLAG_KEYS,
} from "@admin-platform/shared-types";
import type { UIFeatureFlags } from "@admin-platform/shared-types";
import { env } from "../../config/env";
import { UIFeatureFlagsModel } from "./ui-feature-flags.model";

export class UIFeatureFlagsService {
  async getFlags(): Promise<UIFeatureFlags> {
    const doc = await UIFeatureFlagsModel.findOne({
      clientCode: env.CLIENT_CODE,
    }).exec();

    if (!doc) {
      return { ...DEFAULT_UI_FEATURE_FLAGS };
    }

    // Merge DB flags with defaults (new keys get true)
    const merged = { ...DEFAULT_UI_FEATURE_FLAGS };
    for (const key of UI_FEATURE_FLAG_KEYS) {
      if (key in doc.flags) {
        merged[key] = Boolean(doc.flags[key]);
      }
    }
    return merged;
  }

  async upsertFlags(
    flags: Partial<UIFeatureFlags>,
    updatedBy: string
  ): Promise<UIFeatureFlags> {
    // Only accept known keys
    const sanitized: Record<string, boolean> = {};
    for (const key of UI_FEATURE_FLAG_KEYS) {
      if (key in flags) {
        sanitized[key] = Boolean(flags[key]);
      }
    }

    const doc = await UIFeatureFlagsModel.findOne({
      clientCode: env.CLIENT_CODE,
    }).exec();

    if (doc) {
      const existing = (doc.flags as Record<string, boolean>) ?? {};
      doc.flags = { ...existing, ...sanitized };
      doc.updatedBy = updatedBy;
      await doc.save();
    } else {
      await UIFeatureFlagsModel.create({
        clientCode: env.CLIENT_CODE,
        flags: { ...DEFAULT_UI_FEATURE_FLAGS, ...sanitized },
        updatedBy,
      });
    }

    return this.getFlags();
  }
}

export const uiFeatureFlagsService = new UIFeatureFlagsService();
