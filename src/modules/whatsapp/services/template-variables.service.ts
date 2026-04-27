/**
 * Template Variable Resolution Service
 *
 * Resolves template variables from user data, context, and static values.
 * Supports three variable sources:
 * 1. context: Runtime data passed when trigger fires (e.g., { userName: "John" })
 * 2. user_field: Database field lookup from user document (e.g., "personalProfile.name")
 * 3. static: Fixed value configured in trigger (e.g., "Welcome to DataSetu!")
 *
 * Used by:
 * - Trigger service (event-driven messaging)
 * - Bulk messaging service (mass campaigns)
 * - Inbox service (template replies)
 *
 * TODO: CHANGE THIS - Update user model references to match your schema
 */

import { logger } from "../../../core/logging/logger";
import type { TemplateVariable } from "../models/template.model";

export interface VariableMapping {
  position: number;
  source: "context" | "user_field" | "static";
  key: string;
  fallback?: string;
}

export interface ResolveVariablesParams {
  variableMapping: VariableMapping[];
  context?: Record<string, any>;
  userDocument?: any;
}

/**
 * Resolve template variables from multiple sources
 *
 * @param params.variableMapping - Array of variable mappings with position and source
 * @param params.context - Runtime context data (for "context" source)
 * @param params.userDocument - User DB document (for "user_field" source)
 * @returns Array of resolved variable values in position order
 */
export function resolveTemplateVariables(params: ResolveVariablesParams): string[] {
  const { variableMapping, context = {}, userDocument = {} } = params;

  // Sort by position to ensure correct order
  const sorted = [...variableMapping].sort((a, b) => a.position - b.position);

  return sorted.map((mapping) => {
    let value: any = null;

    switch (mapping.source) {
      case "context":
        // Extract from runtime context
        value = context[mapping.key];
        break;

      case "user_field":
        // Extract from user document using dot notation
        value = getNestedValue(userDocument, mapping.key);
        break;

      case "static":
        // Use static value directly
        value = mapping.key;
        break;

      default:
        logger.warn("[Template Variables] Unknown source", { mapping });
        value = null;
    }

    // Apply fallback if value is null/undefined/empty
    if (value == null || value === "") {
      value = mapping.fallback || "";
    }

    // Convert to string
    return String(value);
  });
}

/**
 * Build Meta API components array from resolved variables
 *
 * Meta expects components in this format:
 * [
 *   {
 *     type: "body",
 *     parameters: [
 *       { type: "text", text: "John" },
 *       { type: "text", text: "Meeting" }
 *     ]
 *   }
 * ]
 */
export function buildMetaComponents(variables: string[]): any[] {
  if (!variables || variables.length === 0) {
    return [];
  }

  return [
    {
      type: "body",
      parameters: variables.map((v) => ({
        type: "text",
        text: v,
      })),
    },
  ];
}

/**
 * Extract nested value from object using dot notation
 *
 * Examples:
 * - getNestedValue({ name: "John" }, "name") => "John"
 * - getNestedValue({ user: { profile: { city: "Mumbai" } } }, "user.profile.city") => "Mumbai"
 * - getNestedValue({ user: { name: "John" } }, "user.age") => undefined
 */
function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined;

  const keys = path.split(".");
  let current = obj;

  for (const key of keys) {
    if (current == null || typeof current !== "object") {
      return undefined;
    }
    current = current[key];
  }

  return current;
}

/**
 * Validate variable mapping configuration
 *
 * Ensures:
 * - All positions are unique
 * - Positions start from 1
 * - All required fields are present
 */
export function validateVariableMapping(mapping: VariableMapping[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!Array.isArray(mapping)) {
    return { valid: false, errors: ["Variable mapping must be an array"] };
  }

  // Check for duplicate positions
  const positions = mapping.map((m) => m.position);
  const uniquePositions = new Set(positions);
  if (positions.length !== uniquePositions.size) {
    errors.push("Duplicate position numbers found");
  }

  // Check positions start from 1
  const sortedPositions = [...positions].sort((a, b) => a - b);
  if (sortedPositions.length > 0 && sortedPositions[0] !== 1) {
    errors.push("Variable positions must start from 1");
  }

  // Check for gaps in positions
  for (let i = 0; i < sortedPositions.length; i++) {
    if (sortedPositions[i] !== i + 1) {
      errors.push(`Gap in variable positions: expected ${i + 1}, found ${sortedPositions[i]}`);
      break;
    }
  }

  // Validate each mapping
  mapping.forEach((m, index) => {
    if (!m.position || m.position < 1) {
      errors.push(`Mapping ${index}: position must be >= 1`);
    }
    if (!m.source || !["context", "user_field", "static"].includes(m.source)) {
      errors.push(`Mapping ${index}: source must be one of: context, user_field, static`);
    }
    if (!m.key || typeof m.key !== "string") {
      errors.push(`Mapping ${index}: key must be a non-empty string`);
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Extract variable placeholders from template body text
 *
 * Finds all {{1}}, {{2}}, {{3}} patterns and returns positions
 *
 * @param bodyText - Template body text
 * @returns Array of variable positions found (e.g., [1, 2, 3])
 */
export function extractVariablePositions(bodyText: string): number[] {
  if (!bodyText) return [];

  const matches = bodyText.match(/\{\{(\d+)\}\}/g) || [];
  const positions = matches.map((m) => parseInt(m.replace(/[{}]/g, ""), 10));

  // Return unique positions, sorted
  return [...new Set(positions)].sort((a, b) => a - b);
}

/**
 * Preview template with resolved variables
 *
 * Replaces {{1}}, {{2}} placeholders with actual values for preview
 *
 * @param bodyText - Template body text with placeholders
 * @param variables - Resolved variable values
 * @returns Preview text with variables replaced
 */
export function previewTemplate(bodyText: string, variables: string[]): string {
  if (!bodyText) return "";

  let preview = bodyText;
  variables.forEach((value, index) => {
    const position = index + 1;
    const placeholder = `{{${position}}}`;
    preview = preview.replace(new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g"), value);
  });

  return preview;
}
