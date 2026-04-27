/**
 * Audience Builder Service
 *
 * Builds MongoDB aggregation pipelines to select users for bulk messaging.
 * Translates admin panel filters into database queries.
 *
 * Supported Filters:
 * - User Types: Filter by user.type (personal, business, company, etc.)
 * - Geographic: City IDs, State IDs
 * - Date Ranges: Registered before/after, last active before/after
 * - Custom Fields: Industry, company size, etc.
 * - Saved Segments: Pre-configured audience types
 *
 * Integration Points:
 * - Bulk Messaging Handlers: Preview audience, enqueue messages
 * - Campaign Analytics: Count potential reach
 *
 * TODO: CHANGE THIS - Replace placeholder user model with your actual schema
 * TODO: CHANGE THIS - Update field paths to match your database structure
 * TODO: CHANGE THIS - Add custom filters specific to your app
 */

import mongoose from "mongoose";
import { logger } from "../../../core/logging/logger";
import { AudienceTypeModel } from "../models";

export interface AudienceFilter {
  // User type filters
  userTypes?: string[]; // ["personal", "business", "company"]

  // Geographic filters
  cityIds?: string[];
  stateIds?: string[];
  countryIds?: string[];

  // Date range filters
  registeredAfter?: Date;
  registeredBefore?: Date;
  lastActiveAfter?: Date;
  lastActiveBefore?: Date;

  // Custom field filters
  industries?: string[]; // For business users
  companySizes?: string[]; // For company users
  verifiedOnly?: boolean;
  premiumOnly?: boolean;

  // Saved audience segment
  audienceTypeId?: string;

  // Advanced MongoDB query (for power users)
  customQuery?: any;
}

/**
 * Build MongoDB aggregation pipeline from audience filter
 *
 * TODO: CHANGE THIS - Replace with your actual user model aggregation
 * This is a placeholder implementation that needs to be updated
 */
export async function buildAudiencePipeline(filter: AudienceFilter): Promise<any[]> {
  logger.warn("[Audience Builder] Using placeholder buildAudiencePipeline - implement for your user schema");

  const pipeline: any[] = [];

  // Load saved audience segment if specified
  if (filter.audienceTypeId) {
    const audienceType = await AudienceTypeModel.findById(filter.audienceTypeId).lean();
    if (audienceType) {
      // Merge saved filters with current filters
      const savedFilter = (audienceType as any).filterCriteria || {};
      filter = { ...savedFilter, ...filter };
    }
  }

  // Base match: active users with valid phone numbers
  const baseMatch: any = {
    isActive: true,
    mobile: { $exists: true, $ne: "" },
  };

  // TODO: CHANGE THIS - Update these field paths to match your User model
  // Example fields you might have:
  // - personalProfile.mobile
  // - businessProfile.contactMobile
  // - companyProfile.primaryContact.mobile

  // Apply user type filter
  if (filter.userTypes && filter.userTypes.length > 0) {
    baseMatch.type = { $in: filter.userTypes };
  }

  // Apply geographic filters
  if (filter.cityIds && filter.cityIds.length > 0) {
    baseMatch.cityId = { $in: filter.cityIds.map((id) => new mongoose.Types.ObjectId(id)) };
  }

  if (filter.stateIds && filter.stateIds.length > 0) {
    baseMatch.stateId = { $in: filter.stateIds.map((id) => new mongoose.Types.ObjectId(id)) };
  }

  if (filter.countryIds && filter.countryIds.length > 0) {
    baseMatch.countryId = { $in: filter.countryIds.map((id) => new mongoose.Types.ObjectId(id)) };
  }

  // Apply date filters
  if (filter.registeredAfter || filter.registeredBefore) {
    baseMatch.createdAt = {};
    if (filter.registeredAfter) {
      baseMatch.createdAt.$gte = filter.registeredAfter;
    }
    if (filter.registeredBefore) {
      baseMatch.createdAt.$lte = filter.registeredBefore;
    }
  }

  if (filter.lastActiveAfter || filter.lastActiveBefore) {
    baseMatch.lastActiveAt = {};
    if (filter.lastActiveAfter) {
      baseMatch.lastActiveAt.$gte = filter.lastActiveAfter;
    }
    if (filter.lastActiveBefore) {
      baseMatch.lastActiveAt.$lte = filter.lastActiveBefore;
    }
  }

  // Apply verification/premium filters
  if (filter.verifiedOnly === true) {
    baseMatch.isVerified = true;
  }

  if (filter.premiumOnly === true) {
    baseMatch.isPremium = true;
  }

  // Apply industry filter (for business users)
  if (filter.industries && filter.industries.length > 0) {
    baseMatch["businessProfile.industry"] = { $in: filter.industries };
  }

  // Apply company size filter
  if (filter.companySizes && filter.companySizes.length > 0) {
    baseMatch["companyProfile.size"] = { $in: filter.companySizes };
  }

  // Add custom query if provided
  if (filter.customQuery && typeof filter.customQuery === "object") {
    Object.assign(baseMatch, filter.customQuery);
  }

  pipeline.push({ $match: baseMatch });

  // Project only necessary fields (phone number + name for message queue)
  pipeline.push({
    $project: {
      _id: 1,
      mobile: 1,
      name: 1,
      email: 1,
      type: 1,
      // Add any other fields needed for variable resolution
      // personalProfile: 1,
      // businessProfile: 1,
    },
  });

  return pipeline;
}

/**
 * Preview audience: Get sample users matching filter
 *
 * @param filter - Audience filter criteria
 * @param limit - Number of samples to return (default 10)
 * @returns Sample users and total count
 */
export async function previewAudience(
  filter: AudienceFilter,
  limit = 10
): Promise<{ total: number; sample: any[] }> {
  logger.warn("[Audience Builder] Using placeholder previewAudience - implement for your user schema");

  // TODO: CHANGE THIS - Replace with actual user model query
  // const pipeline = await buildAudiencePipeline(filter);
  //
  // // Count total
  // const countPipeline = [...pipeline, { $count: "total" }];
  // const countResult = await UserModel.aggregate(countPipeline);
  // const total = countResult[0]?.total || 0;
  //
  // // Get sample
  // const samplePipeline = [...pipeline, { $limit: limit }];
  // const sample = await UserModel.aggregate(samplePipeline);
  //
  // return { total, sample };

  // Placeholder response
  return {
    total: 0,
    sample: [],
  };
}

/**
 * Count users matching filter (for campaign reach estimation)
 */
export async function countAudience(filter: AudienceFilter): Promise<number> {
  logger.warn("[Audience Builder] Using placeholder countAudience - implement for your user schema");

  // TODO: CHANGE THIS - Replace with actual user model query
  // const pipeline = await buildAudiencePipeline(filter);
  // pipeline.push({ $count: "total" });
  // const result = await UserModel.aggregate(pipeline);
  // return result[0]?.total || 0;

  // Placeholder
  return 0;
}

/**
 * Validate audience filter before execution
 *
 * Checks:
 * - ObjectId formats are valid
 * - Date ranges are logical
 * - Required fields are present
 */
export function validateAudienceFilter(filter: AudienceFilter): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate ObjectId arrays
  const objectIdFields: Array<keyof AudienceFilter> = ["cityIds", "stateIds", "countryIds"];
  for (const field of objectIdFields) {
    const ids = filter[field] as string[] | undefined;
    if (ids && Array.isArray(ids)) {
      for (const id of ids) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          errors.push(`Invalid ObjectId in ${field}: ${id}`);
        }
      }
    }
  }

  // Validate audience type ID
  if (filter.audienceTypeId && !mongoose.Types.ObjectId.isValid(filter.audienceTypeId)) {
    errors.push(`Invalid audienceTypeId: ${filter.audienceTypeId}`);
  }

  // Validate date ranges
  if (filter.registeredAfter && filter.registeredBefore) {
    if (filter.registeredAfter > filter.registeredBefore) {
      errors.push("registeredAfter cannot be later than registeredBefore");
    }
  }

  if (filter.lastActiveAfter && filter.lastActiveBefore) {
    if (filter.lastActiveAfter > filter.lastActiveBefore) {
      errors.push("lastActiveAfter cannot be later than lastActiveBefore");
    }
  }

  // Validate user types
  const validUserTypes = ["personal", "business", "company", "admin", "guest"];
  if (filter.userTypes && Array.isArray(filter.userTypes)) {
    for (const type of filter.userTypes) {
      if (!validUserTypes.includes(type)) {
        logger.warn("[Audience Builder] Unknown user type", { type });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Create saved audience segment
 */
export async function createAudienceType(
  name: string,
  description: string,
  filterCriteria: AudienceFilter,
  createdBy: string
): Promise<any> {
  const validation = validateAudienceFilter(filterCriteria);
  if (!validation.valid) {
    throw new Error(`Invalid audience filter: ${validation.errors.join(", ")}`);
  }

  const audienceType = await AudienceTypeModel.create({
    name,
    description,
    filterCriteria,
    createdBy: new mongoose.Types.ObjectId(createdBy),
  });

  logger.info("[Audience Builder] Created audience type", {
    audienceTypeId: audienceType._id,
    name,
  });

  return audienceType;
}
