#!/usr/bin/env node
/**
 * OpenAPI validation script.
 *
 * Parses docs/api/openapi.yaml with swagger-parser, which validates:
 *   - YAML syntax
 *   - OpenAPI 3.x structural conformance
 *   - $ref resolution (all references resolve)
 *
 * Exit 0 = valid, exit 1 = invalid.
 *
 * Usage:
 *   node scripts/validate-openapi.mjs
 *   pnpm validate:openapi
 */

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import SwaggerParser from "@apidevtools/swagger-parser";

const __dirname = dirname(fileURLToPath(import.meta.url));
const specPath = resolve(__dirname, "..", "docs", "api", "openapi.yaml");

try {
  const api = await SwaggerParser.validate(specPath);
  const pathCount = Object.keys(api.paths ?? {}).length;
  console.log(`OpenAPI valid: ${api.info.title} v${api.info.version} (${pathCount} paths)`);
  process.exit(0);
} catch (err) {
  console.error("OpenAPI validation failed:");
  console.error(err.message);
  process.exit(1);
}
