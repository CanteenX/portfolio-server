"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// api-src/entry.ts
var entry_exports = {};
__export(entry_exports, {
  config: () => config,
  default: () => handler
});
module.exports = __toCommonJS(entry_exports);
var import_config = require("dotenv/config");

// src/app.ts
var import_cors = __toESM(require("cors"), 1);
var import_express31 = __toESM(require("express"), 1);
var import_helmet = __toESM(require("helmet"), 1);
var import_node_path5 = __toESM(require("node:path"), 1);

// src/shared/types/errors.ts
var ERROR_CODES = {
  FEATURE_DISABLED: "FEATURE_DISABLED",
  FORBIDDEN: "FORBIDDEN",
  UNAUTHORIZED: "UNAUTHORIZED",
  BAD_REQUEST: "BAD_REQUEST",
  NOT_FOUND: "NOT_FOUND",
  INTERNAL_ERROR: "INTERNAL_ERROR"
};

// src/shared/types/modules.ts
var MODULE_KEYS = [
  "calendar",
  "chat",
  "mailbox",
  "ecommerce",
  "projects",
  "tasks",
  "crm",
  "invoices",
  "support-tickets",
  "file-manager",
  "todo",
  "job",
  "api-management",
  "whatsapp"
];
var MODULE_DEFINITIONS = [
  { key: "calendar", label: "Calendar" },
  { key: "chat", label: "Chat" },
  { key: "mailbox", label: "Mailbox" },
  { key: "ecommerce", label: "eCommerce" },
  { key: "projects", label: "Projects" },
  { key: "tasks", label: "Tasks" },
  { key: "crm", label: "CRM" },
  { key: "invoices", label: "Invoices" },
  { key: "support-tickets", label: "Support Tickets" },
  { key: "file-manager", label: "File Manager" },
  { key: "todo", label: "ToDo" },
  { key: "job", label: "Job" },
  { key: "api-management", label: "API Management" },
  { key: "whatsapp", label: "WhatsApp" }
];

// src/shared/types/ui-feature-flags.ts
var UI_FEATURE_FLAG_KEYS = [
  // Header
  "header.searchBar",
  "header.languageSwitcher",
  "header.fullscreenToggle",
  "header.lightDarkToggle",
  "header.notificationDropdown",
  "header.themeCustomizer",
  // Layout
  "layout.horizontalOption",
  "layout.twoColumnOption",
  "layout.sidebarThemes",
  "layout.sidebarSizes",
  // Sidebar sections
  "sidebar.modules",
  "sidebar.charts",
  "sidebar.forms",
  "sidebar.maps",
  "sidebar.pages",
  "sidebar.uiComponents",
  "sidebar.apps",
  // Pages
  "page.charts",
  "page.maps",
  "page.calendar",
  "page.kanban",
  "page.editor",
  "page.gallery",
  // Features
  "feature.i18n",
  "feature.rtlSupport",
  "feature.toastNotifications",
  // New features (Elevate.Admin adoption)
  "header.quickLinks",
  "header.universalSearch",
  "sidebar.dynamicMenus",
  "feature.permissionMatrix",
  "feature.csvExportModal",
  "feature.imageCropUploader",
  "feature.draggableTable",
  "feature.deleteConfirmModal"
];
var DEFAULT_UI_FEATURE_FLAGS = Object.fromEntries(
  UI_FEATURE_FLAG_KEYS.map((key) => [key, true])
);

// src/core/errors/app-error.ts
var AppError = class extends Error {
  statusCode;
  code;
  constructor(statusCode, code, message) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
};

// src/core/auth/jwt.ts
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);

// src/config/env.ts
var import_dotenv = __toESM(require("dotenv"), 1);
var import_zod = require("zod");
import_dotenv.default.config();
var envSchema = import_zod.z.object({
  NODE_ENV: import_zod.z.enum(["development", "test", "production"]).default("development"),
  PORT: import_zod.z.coerce.number().default(7002),
  MONGO_URI: import_zod.z.string().min(1),
  JWT_SECRET_SUPER_ADMIN: import_zod.z.string().min(8),
  JWT_SECRET_ADMIN: import_zod.z.string().min(8),
  JWT_EXPIRES_IN: import_zod.z.string().default("1d"),
  CLIENT_CODE: import_zod.z.string().default("default-client"),
  CORS_ORIGINS: import_zod.z.string().default("http://localhost:3000,http://localhost:3001,http://localhost:5173"),
  TRUST_PROXY: import_zod.z.string().default("0"),
  ENABLE_SEED: import_zod.z.enum(["true", "false"]).default("false"),
  API_KEY_HASH_SALT: import_zod.z.string().min(16).default("replace_api_key_hash_salt"),
  PAYMENT_DEFAULT_SUCCESS_URL: import_zod.z.string().url().default("http://localhost:5173/payment/success"),
  PAYMENT_DEFAULT_CANCEL_URL: import_zod.z.string().url().default("http://localhost:5173/payment/cancel"),
  PAYMENT_ALLOWED_REDIRECT_ORIGINS: import_zod.z.string().default("http://localhost:3000,http://localhost:3001,http://localhost:5173"),
  STRIPE_SECRET_KEY: import_zod.z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: import_zod.z.string().min(1).optional(),
  PAYPAL_MODE: import_zod.z.enum(["sandbox", "live"]).default("sandbox"),
  PAYPAL_CLIENT_ID: import_zod.z.string().min(1).optional(),
  PAYPAL_CLIENT_SECRET: import_zod.z.string().min(1).optional(),
  PAYPAL_WEBHOOK_ID: import_zod.z.string().min(1).optional(),
  RAZORPAY_KEY_ID: import_zod.z.string().min(1).optional(),
  RAZORPAY_KEY_SECRET: import_zod.z.string().min(1).optional(),
  RAZORPAY_WEBHOOK_SECRET: import_zod.z.string().min(1).optional(),
  ENABLE_API_DOCS: import_zod.z.enum(["true", "false"]).default("false"),
  FILE_UPLOAD_DIR: import_zod.z.string().default("uploads"),
  FILE_UPLOAD_MAX_BYTES: import_zod.z.coerce.number().default(50 * 1024 * 1024),
  FILE_QUOTA_BYTES: import_zod.z.coerce.number().default(500 * 1024 * 1024),
  EXPORT_MAX_ROWS: import_zod.z.coerce.number().int().min(1).default(1e4),
  IMPORT_MAX_ROWS: import_zod.z.coerce.number().int().min(1).default(1e3),
  STORAGE_BACKEND: import_zod.z.enum(["local", "s3"]).default("local"),
  S3_BUCKET: import_zod.z.string().optional(),
  S3_REGION: import_zod.z.string().default("us-east-1"),
  S3_ACCESS_KEY_ID: import_zod.z.string().optional(),
  S3_SECRET_ACCESS_KEY: import_zod.z.string().optional(),
  S3_ENDPOINT: import_zod.z.string().optional(),
  SMTP_HOST: import_zod.z.string().optional(),
  SMTP_PORT: import_zod.z.coerce.number().default(587),
  SMTP_SECURE: import_zod.z.enum(["true", "false"]).default("false"),
  SMTP_USER: import_zod.z.string().optional(),
  SMTP_PASS: import_zod.z.string().optional(),
  // WhatsApp Meta API Configuration
  WHATSAPP_ACCESS_TOKEN: import_zod.z.string().min(1).optional(),
  WHATSAPP_PHONE_NUMBER_ID: import_zod.z.string().min(1).optional(),
  WHATSAPP_API_VERSION: import_zod.z.string().default("v22.0"),
  WHATSAPP_GRAPH_BASE_URL: import_zod.z.string().url().default("https://graph.facebook.com"),
  WHATSAPP_TEMPLATE_LANGUAGE: import_zod.z.string().default("en"),
  WHATSAPP_WABA_ID: import_zod.z.string().min(1).optional(),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: import_zod.z.string().min(1).optional(),
  WHATSAPP_APP_SECRET: import_zod.z.string().min(1).optional(),
  // WhatsApp Queue Processing
  WA_SEND_DELAY_MS: import_zod.z.coerce.number().default(100),
  WA_BATCH_SIZE: import_zod.z.coerce.number().default(20),
  // RabbitMQ Configuration
  RABBITMQ_URL: import_zod.z.string().url().default("amqp://guest:guest@localhost:5672"),
  RABBITMQ_EXCHANGE: import_zod.z.string().default("datasetu_exchange")
}).superRefine((data, context) => {
  if (data.JWT_SECRET_SUPER_ADMIN === data.JWT_SECRET_ADMIN) {
    context.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      message: "JWT secrets for super admin and admin must be different",
      path: ["JWT_SECRET_ADMIN"]
    });
  }
  if (data.NODE_ENV === "production" && data.API_KEY_HASH_SALT === "replace_api_key_hash_salt") {
    context.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      message: "API_KEY_HASH_SALT must be explicitly set in production",
      path: ["API_KEY_HASH_SALT"]
    });
  }
  if (data.NODE_ENV === "production" && data.RABBITMQ_URL.includes("guest:guest")) {
    context.addIssue({
      code: import_zod.z.ZodIssueCode.custom,
      message: "RABBITMQ_URL must not use default guest credentials in production",
      path: ["RABBITMQ_URL"]
    });
  }
  const stripeConfigured = Boolean(data.STRIPE_SECRET_KEY || data.STRIPE_WEBHOOK_SECRET);
  if (stripeConfigured) {
    if (!data.STRIPE_SECRET_KEY) {
      context.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        message: "STRIPE_SECRET_KEY is required when Stripe is configured",
        path: ["STRIPE_SECRET_KEY"]
      });
    }
    if (!data.STRIPE_WEBHOOK_SECRET) {
      context.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        message: "STRIPE_WEBHOOK_SECRET is required when Stripe is configured",
        path: ["STRIPE_WEBHOOK_SECRET"]
      });
    }
  }
  const paypalConfigured = Boolean(data.PAYPAL_CLIENT_ID || data.PAYPAL_CLIENT_SECRET || data.PAYPAL_WEBHOOK_ID);
  if (paypalConfigured) {
    if (!data.PAYPAL_CLIENT_ID) {
      context.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        message: "PAYPAL_CLIENT_ID is required when PayPal is configured",
        path: ["PAYPAL_CLIENT_ID"]
      });
    }
    if (!data.PAYPAL_CLIENT_SECRET) {
      context.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        message: "PAYPAL_CLIENT_SECRET is required when PayPal is configured",
        path: ["PAYPAL_CLIENT_SECRET"]
      });
    }
    if (!data.PAYPAL_WEBHOOK_ID) {
      context.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        message: "PAYPAL_WEBHOOK_ID is required when PayPal is configured",
        path: ["PAYPAL_WEBHOOK_ID"]
      });
    }
  }
  const razorpayConfigured = Boolean(data.RAZORPAY_KEY_ID || data.RAZORPAY_KEY_SECRET || data.RAZORPAY_WEBHOOK_SECRET);
  if (razorpayConfigured) {
    if (!data.RAZORPAY_KEY_ID) {
      context.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        message: "RAZORPAY_KEY_ID is required when Razorpay is configured",
        path: ["RAZORPAY_KEY_ID"]
      });
    }
    if (!data.RAZORPAY_KEY_SECRET) {
      context.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        message: "RAZORPAY_KEY_SECRET is required when Razorpay is configured",
        path: ["RAZORPAY_KEY_SECRET"]
      });
    }
    if (!data.RAZORPAY_WEBHOOK_SECRET) {
      context.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        message: "RAZORPAY_WEBHOOK_SECRET is required when Razorpay is configured",
        path: ["RAZORPAY_WEBHOOK_SECRET"]
      });
    }
  }
  const whatsappConfigured = Boolean(
    data.WHATSAPP_ACCESS_TOKEN || data.WHATSAPP_PHONE_NUMBER_ID || data.WHATSAPP_WEBHOOK_VERIFY_TOKEN || data.WHATSAPP_APP_SECRET
  );
  if (whatsappConfigured) {
    if (!data.WHATSAPP_ACCESS_TOKEN) {
      context.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        message: "WHATSAPP_ACCESS_TOKEN is required when WhatsApp is configured",
        path: ["WHATSAPP_ACCESS_TOKEN"]
      });
    }
    if (!data.WHATSAPP_PHONE_NUMBER_ID) {
      context.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        message: "WHATSAPP_PHONE_NUMBER_ID is required when WhatsApp is configured",
        path: ["WHATSAPP_PHONE_NUMBER_ID"]
      });
    }
    if (!data.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
      context.addIssue({
        code: import_zod.z.ZodIssueCode.custom,
        message: "WHATSAPP_WEBHOOK_VERIFY_TOKEN is required when WhatsApp is configured",
        path: ["WHATSAPP_WEBHOOK_VERIFY_TOKEN"]
      });
    }
    if (!data.WHATSAPP_APP_SECRET) {
      if (data.NODE_ENV === "production") {
        context.addIssue({
          code: import_zod.z.ZodIssueCode.custom,
          message: "WHATSAPP_APP_SECRET is required in production for webhook signature validation",
          path: ["WHATSAPP_APP_SECRET"]
        });
      }
    }
  }
});
var env = envSchema.parse(process.env);

// src/core/auth/jwt.ts
function getSecret(role) {
  return role === "super_admin" ? env.JWT_SECRET_SUPER_ADMIN : env.JWT_SECRET_ADMIN;
}
function signToken(payload) {
  return import_jsonwebtoken.default.sign(payload, getSecret(payload.role), {
    expiresIn: env.JWT_EXPIRES_IN
  });
}
function verifyToken(token) {
  const secrets = [env.JWT_SECRET_SUPER_ADMIN, env.JWT_SECRET_ADMIN];
  for (const secret of secrets) {
    try {
      return import_jsonwebtoken.default.verify(token, secret);
    } catch {
    }
  }
  throw new import_jsonwebtoken.default.JsonWebTokenError("Invalid or expired token");
}

// src/core/auth/auth.middleware.ts
function authenticateJwt(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next(new AppError(401, ERROR_CODES.UNAUTHORIZED, "Missing bearer token"));
    return;
  }
  const token = authHeader.slice("Bearer ".length);
  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role
    };
    next();
  } catch {
    next(new AppError(401, ERROR_CODES.UNAUTHORIZED, "Invalid token"));
  }
}

// src/core/rbac/permissions.ts
var defaultActions = ["read", "create", "update", "delete", "export"];
function buildAdminPermissions() {
  const permissionList = [];
  for (const moduleKey of MODULE_KEYS) {
    for (const action of defaultActions) {
      permissionList.push(`${moduleKey}.${action}`);
    }
  }
  return permissionList;
}
var superAdminPermissions = buildAdminPermissions();
var adminPermissions = buildAdminPermissions();
var rolePermissions = {
  super_admin: superAdminPermissions,
  admin: adminPermissions
};
function getPermissionsByRole(role) {
  return rolePermissions[role] ?? [];
}
function getDefaultFeatures() {
  return MODULE_KEYS.reduce((acc, moduleKey) => {
    acc[moduleKey] = true;
    return acc;
  }, {});
}

// src/core/feature-flags/feature-config.model.ts
var import_mongoose = __toESM(require("mongoose"), 1);
var featureConfigSchema = new import_mongoose.Schema(
  {
    clientCode: { type: String, required: true, unique: true },
    enabledModules: { type: [String], required: true, default: [] },
    updatedBy: { type: String }
  },
  { timestamps: true }
);
var FeatureConfigModel = import_mongoose.default.models.FeatureConfig ?? import_mongoose.default.model("FeatureConfig", featureConfigSchema);

// src/core/feature-flags/feature-config.service.ts
var FeatureConfigService = class {
  async getEnabledFeatures() {
    const doc = await FeatureConfigModel.findOne({ clientCode: env.CLIENT_CODE }).exec();
    const defaults = getDefaultFeatures();
    if (!doc) {
      return defaults;
    }
    const enabledSet = new Set(doc.enabledModules);
    const features = {};
    for (const moduleKey of MODULE_KEYS) {
      features[moduleKey] = enabledSet.has(moduleKey);
    }
    return features;
  }
  async upsertEnabledModules(enabledModules, updatedBy) {
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
};
var featureConfigService = new FeatureConfigService();

// src/core/feature-flags/feature.middleware.ts
function requireFeatureEnabled(moduleKey) {
  return async (req, _res, next) => {
    if (!req.user) {
      next(new AppError(401, ERROR_CODES.UNAUTHORIZED, "Not authenticated"));
      return;
    }
    if (req.user.role === "super_admin") {
      next();
      return;
    }
    const features = await featureConfigService.getEnabledFeatures();
    if (!features[moduleKey]) {
      next(new AppError(403, ERROR_CODES.FEATURE_DISABLED, `${moduleKey} is disabled`));
      return;
    }
    next();
  };
}

// src/core/rbac/permission.middleware.ts
function requirePermission(requiredPermission) {
  return (req, _res, next) => {
    if (!req.user) {
      next(new AppError(401, ERROR_CODES.UNAUTHORIZED, "Not authenticated"));
      return;
    }
    if (req.user.role === "super_admin" || !requiredPermission) {
      next();
      return;
    }
    const rolePermissions2 = new Set(getPermissionsByRole(req.user.role));
    if (!rolePermissions2.has(requiredPermission)) {
      next(new AppError(403, ERROR_CODES.FORBIDDEN, "Permission denied"));
      return;
    }
    next();
  };
}

// src/core/rbac/role.middleware.ts
function requireRole(allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      next(new AppError(401, ERROR_CODES.UNAUTHORIZED, "Not authenticated"));
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      next(new AppError(403, ERROR_CODES.FORBIDDEN, "Role is not allowed"));
      return;
    }
    next();
  };
}

// src/bootstrap/module-registry.ts
function guardChain(route) {
  return [
    authenticateJwt,
    requireRole(["super_admin", "admin"]),
    requireFeatureEnabled(route.moduleKey),
    requirePermission(route.permission)
  ];
}
function registerModuleRoutes(app, manifests) {
  manifests.forEach((manifest) => {
    manifest.routes.forEach((route) => {
      if (!route.permission) {
        throw new Error(`Missing permission metadata for route ${route.method.toUpperCase()} ${route.path}`);
      }
      app[route.method](route.path, ...guardChain(route), route.handler);
    });
  });
}

// src/core/logging/logger.ts
var import_pino = __toESM(require("pino"), 1);
var pinoInstance = (0, import_pino.default)({
  level: env.NODE_ENV === "test" ? "silent" : "info",
  redact: {
    paths: [
      // Auth fields
      "password",
      "token",
      "authorization",
      "req.headers.authorization",
      "cookie",
      "req.headers.cookie",
      // Payment fields
      "stripeSecretKey",
      "paypalClientSecret",
      "razorpayKeySecret",
      "webhookSecret",
      "cardNumber",
      "cvv",
      "creditCard",
      // SMTP credentials
      "smtpPass"
    ],
    censor: "[REDACTED]"
  },
  ...env.NODE_ENV === "development" ? {
    transport: {
      target: "pino-pretty",
      options: { colorize: true, translateTime: "SYS:HH:MM:ss" }
    }
  } : {}
});
var logger = {
  info: (message, meta) => meta !== void 0 ? pinoInstance.info(typeof meta === "object" && meta !== null ? meta : { data: meta }, message) : pinoInstance.info(message),
  error: (message, meta) => meta !== void 0 ? pinoInstance.error(typeof meta === "object" && meta !== null ? meta : { data: meta }, message) : pinoInstance.error(message),
  warn: (message, meta) => meta !== void 0 ? pinoInstance.warn(typeof meta === "object" && meta !== null ? meta : { data: meta }, message) : pinoInstance.warn(message),
  debug: (message, meta) => meta !== void 0 ? pinoInstance.debug(typeof meta === "object" && meta !== null ? meta : { data: meta }, message) : pinoInstance.debug(message),
  /** Create a child logger with bound context fields. */
  child: (bindings) => pinoInstance.child(bindings),
  /** Raw pino instance for advanced usage. */
  pino: pinoInstance
};

// src/middleware/error-handler.ts
function errorHandler(err, req, res, _next) {
  const requestId2 = req.id;
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
      ...requestId2 ? { requestId: requestId2 } : {}
    });
    return;
  }
  logger.error("Unexpected server error", {
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : void 0,
    requestId: requestId2,
    method: req.method,
    path: req.path
  });
  res.status(500).json({
    code: ERROR_CODES.INTERNAL_ERROR,
    message: "Unexpected server error",
    ...requestId2 ? { requestId: requestId2 } : {}
  });
}

// src/middleware/request-id.ts
var import_node_crypto = __toESM(require("node:crypto"), 1);
function requestId(req, _res, next) {
  const id = typeof req.headers["x-request-id"] === "string" && req.headers["x-request-id"] || import_node_crypto.default.randomUUID();
  req.id = id;
  _res.setHeader("X-Request-Id", id);
  next();
}

// src/middleware/request-logger.ts
function requestLogger(req, res, next) {
  if (req.path === "/api/v1/system/health") {
    next();
    return;
  }
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const meta = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: duration,
      requestId: req.id
    };
    if (res.statusCode >= 500) {
      logger.error("request completed", meta);
    } else if (res.statusCode >= 400) {
      logger.warn("request completed", meta);
    } else {
      logger.info("request completed", meta);
    }
  });
  next();
}

// src/middleware/swagger.ts
var import_bcryptjs = __toESM(require("bcryptjs"), 1);
var import_node_fs = __toESM(require("node:fs"), 1);
var import_node_path = __toESM(require("node:path"), 1);

// src/core/auth/user.model.ts
var import_mongoose2 = __toESM(require("mongoose"), 1);
var userSchema = new import_mongoose2.Schema(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["super_admin", "admin"], required: true },
    customRoleId: { type: String, default: void 0 }
  },
  { timestamps: true }
);
var UserModel = import_mongoose2.default.models.User ?? import_mongoose2.default.model("User", userSchema);

// src/middleware/swagger.ts
var BASIC_REALM = 'Basic realm="Admin API Docs", charset="UTF-8"';
var SWAGGER_UI_VERSION = "5.17.14";
function requireBasic(res, message) {
  res.set("WWW-Authenticate", BASIC_REALM);
  res.status(401).json({ code: "UNAUTHORIZED", message });
}
async function docsAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) {
    requireBasic(res, "Authentication required");
    return;
  }
  if (header.startsWith("Bearer ")) {
    authenticateJwt(req, res, () => {
      const user = req.user;
      if (!user || user.role !== "super_admin") {
        res.status(403).json({ code: "FORBIDDEN", message: "API docs restricted to super_admin" });
        return;
      }
      next();
    });
    return;
  }
  if (header.startsWith("Basic ")) {
    try {
      const decoded = Buffer.from(header.slice(6), "base64").toString("utf-8");
      const sep = decoded.indexOf(":");
      const email = sep === -1 ? decoded : decoded.slice(0, sep);
      const password = sep === -1 ? "" : decoded.slice(sep + 1);
      if (!email || !password) {
        requireBasic(res, "Invalid credentials");
        return;
      }
      const user = await UserModel.findOne({ email }).exec();
      if (!user) {
        requireBasic(res, "Invalid credentials");
        return;
      }
      const valid = await import_bcryptjs.default.compare(password, user.passwordHash);
      if (!valid || user.role !== "super_admin") {
        requireBasic(res, "Invalid credentials");
        return;
      }
      next();
    } catch {
      requireBasic(res, "Invalid credentials");
    }
    return;
  }
  requireBasic(res, "Use Basic auth or Bearer token");
}
function renderDocsHtml() {
  const cdn = `https://unpkg.com/swagger-ui-dist@${SWAGGER_UI_VERSION}`;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Admin Platform API Docs</title>
    <link rel="stylesheet" href="${cdn}/swagger-ui.css" />
    <style>
      body { margin: 0; background: #fafafa; }
      .swagger-ui .topbar { display: none; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="${cdn}/swagger-ui-bundle.js" crossorigin></script>
    <script src="${cdn}/swagger-ui-standalone-preset.js" crossorigin></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: "/api/docs.json",
        dom_id: "#swagger-ui",
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: "StandaloneLayout",
        requestInterceptor: function (req) {
          // Re-use the page's Basic auth credentials on Try-It-Out calls so
          // every /api/v1/* test request from the browser is authenticated
          // with the same session the user opened the docs with.
          req.credentials = "include";
          return req;
        }
      });
    </script>
  </body>
</html>`;
}
async function mountSwagger(app) {
  const enabled = env.NODE_ENV !== "production" || env.ENABLE_API_DOCS === "true";
  if (!enabled) {
    return;
  }
  try {
    const cwd = process.cwd();
    const candidates = [
      import_node_path.default.resolve(cwd, "docs/api/openapi.yaml"),
      import_node_path.default.resolve(cwd, "../docs/api/openapi.yaml"),
      import_node_path.default.resolve(cwd, "../../docs/api/openapi.yaml")
    ];
    const specPath = candidates.find((p) => import_node_fs.default.existsSync(p));
    if (!specPath) {
      logger.info("Swagger UI skipped: openapi.yaml not found");
      return;
    }
    const YAML = await import("yaml");
    const specContent = import_node_fs.default.readFileSync(specPath, "utf-8");
    const spec = YAML.parse(specContent);
    const gate = [];
    if (env.NODE_ENV === "production") {
      gate.push(docsAuth);
    }
    const html = renderDocsHtml();
    app.get("/api/docs", ...gate, (_req, res) => {
      res.set(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data: https:; font-src 'self' https://unpkg.com data:; connect-src 'self'"
      );
      res.type("html").send(html);
    });
    app.get("/api/docs.json", ...gate, (_req, res) => {
      res.json(spec);
    });
    const mode = env.NODE_ENV === "production" ? "super_admin-only (Basic or Bearer)" : "open";
    logger.info(`Swagger UI mounted at /api/docs (${mode}, spec: ${specPath})`);
  } catch (err) {
    logger.error("Failed to mount Swagger UI", err);
  }
}

// src/modules/api-management/api-management.routes.ts
var import_crypto = require("crypto");
var import_express = require("express");
var import_mongoose4 = __toESM(require("mongoose"), 1);
var import_express_rate_limit = __toESM(require("express-rate-limit"), 1);
var import_zod2 = require("zod");

// src/core/http/module-guards.ts
function moduleGuards(moduleKey, permission) {
  return [
    authenticateJwt,
    requireRole(["super_admin", "admin"]),
    requireFeatureEnabled(moduleKey),
    requirePermission(permission)
  ];
}

// src/modules/api-management/api-management.models.ts
var import_mongoose3 = __toESM(require("mongoose"), 1);
var apiAccessKeySchema = new import_mongoose3.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    scopes: { type: [String], default: [] },
    status: { type: String, enum: ["active", "revoked"], default: "active" },
    keyPrefix: { type: String, required: true, index: true },
    keyLast4: { type: String, required: true },
    keyHash: { type: String, required: true, unique: true, index: true },
    createdByUserId: { type: String, required: true },
    revokedAt: { type: Date },
    revokedByUserId: { type: String },
    lastUsedAt: { type: Date },
    expiresAt: { type: Date, index: true },
    rotatedFromKeyId: { type: import_mongoose3.Schema.Types.ObjectId, ref: "ApiAccessKey", index: true }
  },
  { timestamps: true }
);
apiAccessKeySchema.index({ status: 1, createdAt: -1 });
var ApiAccessKeyModel = import_mongoose3.default.models.ApiAccessKey ?? import_mongoose3.default.model("ApiAccessKey", apiAccessKeySchema);
var apiAccessKeyAuditEventSchema = new import_mongoose3.Schema(
  {
    keyId: { type: import_mongoose3.Schema.Types.ObjectId, ref: "ApiAccessKey", required: true, index: true },
    action: { type: String, enum: ["issued", "revoked", "regenerated"], required: true },
    actorUserId: { type: String, required: true },
    metadata: { type: import_mongoose3.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);
apiAccessKeyAuditEventSchema.index({ keyId: 1, createdAt: -1 });
var ApiAccessKeyAuditEventModel = import_mongoose3.default.models.ApiAccessKeyAuditEvent ?? import_mongoose3.default.model("ApiAccessKeyAuditEvent", apiAccessKeyAuditEventSchema);

// src/modules/api-management/api-management.routes.ts
var router = (0, import_express.Router)();
var apiManagementWriteRateLimiter = (0, import_express_rate_limit.default)({
  windowMs: 60 * 1e3,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false
});
var createKeySchema = import_zod2.z.object({
  name: import_zod2.z.string().min(1).max(120),
  description: import_zod2.z.string().max(500).optional(),
  scopes: import_zod2.z.array(import_zod2.z.string().min(1).max(80)).max(32).default([]),
  expiresAt: import_zod2.z.string().datetime().optional()
});
var revokeKeySchema = import_zod2.z.object({
  reason: import_zod2.z.string().max(500).optional()
});
var regenerateKeySchema = import_zod2.z.object({
  name: import_zod2.z.string().min(1).max(120).optional(),
  description: import_zod2.z.string().max(500).optional(),
  scopes: import_zod2.z.array(import_zod2.z.string().min(1).max(80)).max(32).optional(),
  expiresAt: import_zod2.z.string().datetime().optional()
});
function ensureValidObjectId(id) {
  if (!import_mongoose4.default.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid id");
  }
}
function hashApiKey(plaintextKey) {
  return (0, import_crypto.createHash)("sha256").update(`${env.API_KEY_HASH_SALT}:${plaintextKey}`).digest("hex");
}
function generatePlaintextApiKey() {
  const envLabel = env.NODE_ENV === "production" ? "live" : "test";
  return `apk_${envLabel}_${(0, import_crypto.randomBytes)(24).toString("base64url")}`;
}
function toPublicKey(document) {
  return {
    _id: String(document._id),
    name: document.name,
    description: document.description ?? "",
    scopes: Array.isArray(document.scopes) ? document.scopes : [],
    status: document.status,
    keyPrefix: document.keyPrefix,
    keyLast4: document.keyLast4,
    createdByUserId: document.createdByUserId,
    revokedAt: document.revokedAt ?? null,
    revokedByUserId: document.revokedByUserId ?? null,
    lastUsedAt: document.lastUsedAt ?? null,
    expiresAt: document.expiresAt ?? null,
    rotatedFromKeyId: document.rotatedFromKeyId ? String(document.rotatedFromKeyId) : null,
    createdAt: document.createdAt ?? null,
    updatedAt: document.updatedAt ?? null
  };
}
async function createKeyRecord(input) {
  const plaintextKey = generatePlaintextApiKey();
  const keyHash = hashApiKey(plaintextKey);
  const created = await ApiAccessKeyModel.create(
    [
      {
        name: input.name,
        description: input.description ?? "",
        scopes: input.scopes,
        status: "active",
        keyPrefix: plaintextKey.slice(0, 12),
        keyLast4: plaintextKey.slice(-4),
        keyHash,
        createdByUserId: input.createdByUserId,
        expiresAt: input.expiresAt,
        rotatedFromKeyId: input.rotatedFromKeyId
      }
    ],
    input.session ? { session: input.session } : void 0
  );
  return {
    plaintextKey,
    key: created[0]
  };
}
router.get("/api/v1/api-management/keys", ...moduleGuards("api-management", "api-management.read"), async (_req, res, next) => {
  try {
    const keys = await ApiAccessKeyModel.find().sort({ createdAt: -1 }).lean().exec();
    res.json({ items: keys.map((item) => toPublicKey(item)) });
  } catch (error) {
    next(error);
  }
});
router.post(
  "/api/v1/api-management/keys",
  apiManagementWriteRateLimiter,
  ...moduleGuards("api-management", "api-management.create"),
  async (req, res, next) => {
    try {
      const payload = createKeySchema.parse(req.body ?? {});
      const { plaintextKey, key } = await createKeyRecord({
        name: payload.name,
        description: payload.description,
        scopes: payload.scopes,
        expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : void 0,
        createdByUserId: req.user.id
      });
      await ApiAccessKeyAuditEventModel.create({
        keyId: key._id,
        action: "issued",
        actorUserId: req.user.id,
        metadata: {
          scopes: payload.scopes
        }
      });
      res.status(201).json({
        key: toPublicKey(key.toObject()),
        plaintextKey
      });
    } catch (error) {
      if (error instanceof import_zod2.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid API key payload"));
        return;
      }
      next(error);
    }
  }
);
router.post(
  "/api/v1/api-management/keys/:id/revoke",
  apiManagementWriteRateLimiter,
  ...moduleGuards("api-management", "api-management.update"),
  async (req, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const payload = revokeKeySchema.parse(req.body ?? {});
      const key = await ApiAccessKeyModel.findById(req.params.id).exec();
      if (!key) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "API key not found");
      }
      if (key.status !== "revoked") {
        key.status = "revoked";
        key.revokedAt = /* @__PURE__ */ new Date();
        key.revokedByUserId = req.user.id;
        await key.save();
        await ApiAccessKeyAuditEventModel.create({
          keyId: key._id,
          action: "revoked",
          actorUserId: req.user.id,
          metadata: {
            reason: payload.reason ?? ""
          }
        });
      }
      res.json(toPublicKey(key.toObject()));
    } catch (error) {
      if (error instanceof import_zod2.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid revoke payload"));
        return;
      }
      next(error);
    }
  }
);
router.post(
  "/api/v1/api-management/keys/:id/regenerate",
  apiManagementWriteRateLimiter,
  ...moduleGuards("api-management", "api-management.create"),
  async (req, res, next) => {
    const session = await import_mongoose4.default.startSession();
    try {
      ensureValidObjectId(req.params.id);
      const payload = regenerateKeySchema.parse(req.body ?? {});
      let createdPublicKey = null;
      let plaintextKey = "";
      await session.withTransaction(async () => {
        const currentKey = await ApiAccessKeyModel.findById(req.params.id).session(session).exec();
        if (!currentKey) {
          throw new AppError(404, ERROR_CODES.NOT_FOUND, "API key not found");
        }
        if (currentKey.status !== "active") {
          throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Only active keys can be regenerated");
        }
        currentKey.status = "revoked";
        currentKey.revokedAt = /* @__PURE__ */ new Date();
        currentKey.revokedByUserId = req.user.id;
        await currentKey.save({ session });
        const created = await createKeyRecord({
          name: payload.name ?? currentKey.name,
          description: payload.description ?? currentKey.description,
          scopes: payload.scopes ?? currentKey.scopes,
          expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : currentKey.expiresAt,
          createdByUserId: req.user.id,
          rotatedFromKeyId: currentKey._id,
          session
        });
        plaintextKey = created.plaintextKey;
        createdPublicKey = toPublicKey(created.key.toObject());
        await ApiAccessKeyAuditEventModel.create(
          [
            {
              keyId: currentKey._id,
              action: "revoked",
              actorUserId: req.user.id,
              metadata: {
                reason: "regenerated",
                regeneratedToKeyId: created.key._id.toString()
              }
            },
            {
              keyId: created.key._id,
              action: "regenerated",
              actorUserId: req.user.id,
              metadata: {
                regeneratedFromKeyId: currentKey._id.toString()
              }
            }
          ],
          { session }
        );
      });
      res.status(201).json({
        key: createdPublicKey,
        plaintextKey
      });
    } catch (error) {
      if (error instanceof import_zod2.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid regenerate payload"));
        return;
      }
      next(error);
    } finally {
      await session.endSession();
    }
  }
);
router.get(
  "/api/v1/api-management/keys/:id/events",
  ...moduleGuards("api-management", "api-management.read"),
  async (req, res, next) => {
    try {
      ensureValidObjectId(req.params.id);
      const key = await ApiAccessKeyModel.findById(req.params.id).lean().exec();
      if (!key) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "API key not found");
      }
      const events = await ApiAccessKeyAuditEventModel.find({ keyId: req.params.id }).sort({ createdAt: -1 }).limit(100).lean().exec();
      res.json({
        items: events.map((event) => ({
          _id: String(event._id),
          keyId: String(event.keyId),
          action: event.action,
          actorUserId: event.actorUserId,
          metadata: event.metadata ?? {},
          createdAt: event.createdAt ?? null
        }))
      });
    } catch (error) {
      next(error);
    }
  }
);
router.get(
  "/api/v1/api-management/insights",
  ...moduleGuards("api-management", "api-management.read"),
  async (_req, res, next) => {
    try {
      const now = /* @__PURE__ */ new Date();
      const next30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3);
      const [totalKeys, activeKeys, revokedKeys, expiringSoon] = await Promise.all([
        ApiAccessKeyModel.countDocuments().exec(),
        ApiAccessKeyModel.countDocuments({ status: "active" }).exec(),
        ApiAccessKeyModel.countDocuments({ status: "revoked" }).exec(),
        ApiAccessKeyModel.countDocuments({
          status: "active",
          expiresAt: {
            $gte: now,
            $lte: next30Days
          }
        }).exec()
      ]);
      res.json({
        counts: {
          totalKeys,
          activeKeys,
          revokedKeys,
          expiringSoon
        }
      });
    } catch (error) {
      next(error);
    }
  }
);
var apiManagementRoutes = router;

// src/modules/calendar/calendar.routes.ts
var import_express_rate_limit2 = __toESM(require("express-rate-limit"), 1);
var import_express2 = require("express");
var import_mongoose6 = __toESM(require("mongoose"), 1);
var import_zod3 = require("zod");

// src/modules/calendar/calendar.models.ts
var import_mongoose5 = __toESM(require("mongoose"), 1);
var calendarEventSchema = new import_mongoose5.Schema(
  {
    title: { type: String, required: true, maxlength: 300, trim: true },
    description: { type: String, maxlength: 4e3 },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true },
    allDay: { type: Boolean, default: false },
    location: { type: String, maxlength: 500 },
    status: {
      type: String,
      enum: ["scheduled", "cancelled"],
      default: "scheduled",
      index: true
    },
    recurrence: {
      type: String,
      enum: ["none", "daily", "weekly", "monthly"],
      default: "none"
    },
    color: { type: String, maxlength: 20 },
    createdByUserId: { type: String, required: true, index: true },
    attendeeUserIds: { type: [String], default: [] },
    tags: { type: [String], default: [] }
  },
  { timestamps: true }
);
calendarEventSchema.index({ startDate: 1, endDate: 1 });
calendarEventSchema.index({ createdByUserId: 1, status: 1 });
var CalendarEventModel = import_mongoose5.default.models.CalendarEvent ?? import_mongoose5.default.model("CalendarEvent", calendarEventSchema);

// src/modules/calendar/calendar.routes.ts
var router2 = (0, import_express2.Router)();
var createEventSchema = import_zod3.z.object({
  title: import_zod3.z.string().min(1).max(300),
  description: import_zod3.z.string().max(4e3).optional(),
  startDate: import_zod3.z.coerce.date(),
  endDate: import_zod3.z.coerce.date(),
  allDay: import_zod3.z.boolean().default(false),
  location: import_zod3.z.string().max(500).optional(),
  recurrence: import_zod3.z.enum(["none", "daily", "weekly", "monthly"]).default("none"),
  color: import_zod3.z.string().max(20).optional(),
  attendeeUserIds: import_zod3.z.array(import_zod3.z.string()).default([]),
  tags: import_zod3.z.array(import_zod3.z.string()).default([])
});
var updateEventSchema = import_zod3.z.object({
  title: import_zod3.z.string().min(1).max(300).optional(),
  description: import_zod3.z.string().max(4e3).nullable().optional(),
  startDate: import_zod3.z.coerce.date().optional(),
  endDate: import_zod3.z.coerce.date().optional(),
  allDay: import_zod3.z.boolean().optional(),
  location: import_zod3.z.string().max(500).nullable().optional(),
  recurrence: import_zod3.z.enum(["none", "daily", "weekly", "monthly"]).optional(),
  color: import_zod3.z.string().max(20).nullable().optional(),
  attendeeUserIds: import_zod3.z.array(import_zod3.z.string()).optional(),
  tags: import_zod3.z.array(import_zod3.z.string()).optional()
});
var listEventsQuerySchema = import_zod3.z.object({
  page: import_zod3.z.coerce.number().int().min(1).default(1),
  limit: import_zod3.z.coerce.number().int().min(1).max(100).default(50),
  from: import_zod3.z.coerce.date().optional(),
  to: import_zod3.z.coerce.date().optional(),
  status: import_zod3.z.enum(["scheduled", "cancelled"]).optional()
});
var calendarWriteRateLimiter = (0, import_express_rate_limit2.default)({
  windowMs: 60 * 1e3,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});
function ensureValidObjectId2(id) {
  if (!import_mongoose6.default.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid id");
  }
}
router2.get(
  "/api/v1/calendar/events",
  ...moduleGuards("calendar", "calendar.read"),
  async (req, res, next) => {
    try {
      const { page, limit, from, to, status } = listEventsQuerySchema.parse(req.query ?? {});
      const skip = (page - 1) * limit;
      const filter = {};
      if (from || to) {
        filter.startDate = {};
        if (from) {
          filter.startDate.$gte = from;
        }
        if (to) {
          filter.startDate.$lte = to;
        }
      }
      if (status) {
        filter.status = status;
      }
      const [total, items] = await Promise.all([
        CalendarEventModel.countDocuments(filter).exec(),
        CalendarEventModel.find(filter).sort({ startDate: 1 }).skip(skip).limit(limit).lean().exec()
      ]);
      res.json({
        items,
        page,
        limit,
        total
      });
    } catch (error) {
      if (error instanceof import_zod3.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid calendar event list query"));
        return;
      }
      next(error);
    }
  }
);
router2.post(
  "/api/v1/calendar/events",
  calendarWriteRateLimiter,
  ...moduleGuards("calendar", "calendar.create"),
  async (req, res, next) => {
    try {
      const payload = createEventSchema.parse(req.body ?? {});
      if (payload.endDate < payload.startDate) {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "End date must be after or equal to start date");
      }
      const created = await CalendarEventModel.create({
        ...payload,
        status: "scheduled",
        createdByUserId: req.user.id
      });
      res.status(201).json(created.toObject());
    } catch (error) {
      if (error instanceof import_zod3.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid calendar event payload"));
        return;
      }
      next(error);
    }
  }
);
router2.get(
  "/api/v1/calendar/events/:id",
  ...moduleGuards("calendar", "calendar.read"),
  async (req, res, next) => {
    try {
      ensureValidObjectId2(req.params.id);
      const event = await CalendarEventModel.findById(req.params.id).lean().exec();
      if (!event) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Calendar event not found");
      }
      res.json(event);
    } catch (error) {
      next(error);
    }
  }
);
router2.patch(
  "/api/v1/calendar/events/:id",
  calendarWriteRateLimiter,
  ...moduleGuards("calendar", "calendar.update"),
  async (req, res, next) => {
    try {
      ensureValidObjectId2(req.params.id);
      const payload = updateEventSchema.parse(req.body ?? {});
      const existingEvent = await CalendarEventModel.findById(req.params.id).exec();
      if (!existingEvent) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Calendar event not found");
      }
      const startDate = payload.startDate ?? existingEvent.startDate;
      const endDate = payload.endDate ?? existingEvent.endDate;
      if (endDate < startDate) {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "End date must be after or equal to start date");
      }
      const updatePayload = { ...payload };
      const unsetFields = {};
      if (payload.description === null) {
        delete updatePayload.description;
        unsetFields.description = "";
      }
      if (payload.location === null) {
        delete updatePayload.location;
        unsetFields.location = "";
      }
      if (payload.color === null) {
        delete updatePayload.color;
        unsetFields.color = "";
      }
      const updateOperation = Object.keys(unsetFields).length > 0 ? {
        $set: updatePayload,
        $unset: unsetFields
      } : {
        $set: updatePayload
      };
      const updated = await CalendarEventModel.findByIdAndUpdate(req.params.id, updateOperation, {
        new: true,
        runValidators: true
      }).lean().exec();
      if (!updated) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Calendar event not found");
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof import_zod3.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid calendar event update payload"));
        return;
      }
      next(error);
    }
  }
);
router2.post(
  "/api/v1/calendar/events/:id/cancel",
  calendarWriteRateLimiter,
  ...moduleGuards("calendar", "calendar.update"),
  async (req, res, next) => {
    try {
      ensureValidObjectId2(req.params.id);
      const event = await CalendarEventModel.findById(req.params.id).exec();
      if (!event) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Calendar event not found");
      }
      if (event.status !== "scheduled") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Only scheduled events can be cancelled");
      }
      event.status = "cancelled";
      await event.save();
      res.json(event.toObject());
    } catch (error) {
      next(error);
    }
  }
);
router2.delete(
  "/api/v1/calendar/events/:id",
  calendarWriteRateLimiter,
  ...moduleGuards("calendar", "calendar.delete"),
  async (req, res, next) => {
    try {
      ensureValidObjectId2(req.params.id);
      const event = await CalendarEventModel.findById(req.params.id).exec();
      if (!event) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Calendar event not found");
      }
      if (event.status !== "cancelled") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Only cancelled events can be deleted");
      }
      await CalendarEventModel.deleteOne({ _id: event._id }).exec();
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);
router2.get(
  "/api/v1/calendar/insights",
  ...moduleGuards("calendar", "calendar.read"),
  async (_req, res, next) => {
    try {
      const now = /* @__PURE__ */ new Date();
      const [scheduled, cancelled, upcoming, past, totalEvents] = await Promise.all([
        CalendarEventModel.countDocuments({ status: "scheduled" }).exec(),
        CalendarEventModel.countDocuments({ status: "cancelled" }).exec(),
        CalendarEventModel.countDocuments({ status: "scheduled", startDate: { $gt: now } }).exec(),
        CalendarEventModel.countDocuments({ status: "scheduled", endDate: { $lt: now } }).exec(),
        CalendarEventModel.countDocuments().exec()
      ]);
      res.json({
        counts: {
          scheduled,
          cancelled,
          upcoming,
          past,
          totalEvents
        }
      });
    } catch (error) {
      next(error);
    }
  }
);
var calendarRoutes = router2;

// src/modules/chat/chat.routes.ts
var import_express_rate_limit3 = __toESM(require("express-rate-limit"), 1);
var import_express3 = require("express");
var import_mongoose8 = __toESM(require("mongoose"), 1);
var import_zod4 = require("zod");

// src/modules/chat/chat.models.ts
var import_mongoose7 = __toESM(require("mongoose"), 1);
var chatConversationSchema = new import_mongoose7.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    participantUserIds: {
      type: [String],
      required: true,
      validate: {
        validator: (value) => Array.isArray(value) && value.length >= 1,
        message: "At least one participant is required"
      }
    },
    status: { type: String, enum: ["active", "archived"], default: "active", index: true },
    lastMessageAt: { type: Date, index: true },
    messageCount: { type: Number, default: 0, min: 0 },
    createdByUserId: { type: String, required: true }
  },
  { timestamps: true }
);
chatConversationSchema.index({ status: 1, lastMessageAt: -1 });
var ChatConversationModel = import_mongoose7.default.models.ChatConversation ?? import_mongoose7.default.model("ChatConversation", chatConversationSchema);
var chatMessageSchema = new import_mongoose7.Schema(
  {
    conversationId: { type: import_mongoose7.Schema.Types.ObjectId, ref: "ChatConversation", required: true, index: true },
    senderUserId: { type: String, required: true },
    senderEmail: { type: String, required: true },
    content: { type: String, required: true, maxlength: 4e3 },
    editedAt: { type: Date }
  },
  { timestamps: true }
);
chatMessageSchema.index({ conversationId: 1, createdAt: -1 });
var ChatMessageModel = import_mongoose7.default.models.ChatMessage ?? import_mongoose7.default.model("ChatMessage", chatMessageSchema);

// src/modules/chat/chat-events.ts
var clients = [];
function addClient(client) {
  clients.push(client);
}
function removeClient(res) {
  const idx = clients.findIndex((c) => c.res === res);
  if (idx !== -1) clients.splice(idx, 1);
}
function broadcastToConversation(conversationId, event, data) {
  const payload = `event: ${event}
data: ${JSON.stringify(data)}

`;
  for (const client of clients) {
    if (client.conversationId === conversationId) {
      client.res.write(payload);
    }
  }
}

// src/modules/chat/chat.routes.ts
var router3 = (0, import_express3.Router)();
var listConversationsQuerySchema = import_zod4.z.object({
  page: import_zod4.z.coerce.number().int().min(1).default(1),
  limit: import_zod4.z.coerce.number().int().min(1).max(100).default(50)
});
var createConversationSchema = import_zod4.z.object({
  title: import_zod4.z.string().min(1).max(200),
  participantUserIds: import_zod4.z.array(import_zod4.z.string().min(1).max(120)).min(1).max(100)
});
var updateConversationSchema = import_zod4.z.object({
  title: import_zod4.z.string().min(1).max(200)
});
var listMessagesQuerySchema = import_zod4.z.object({
  page: import_zod4.z.coerce.number().int().min(1).default(1),
  limit: import_zod4.z.coerce.number().int().min(1).max(100).default(50)
});
var sendMessageSchema = import_zod4.z.object({
  content: import_zod4.z.string().min(1).max(4e3)
});
var editMessageSchema = import_zod4.z.object({
  content: import_zod4.z.string().min(1).max(4e3)
});
var chatWriteRateLimiter = (0, import_express_rate_limit3.default)({
  windowMs: 60 * 1e3,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});
function ensureValidObjectId3(id) {
  if (!import_mongoose8.default.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid id");
  }
}
function ensureParticipantOrSuperAdmin(req, participantUserIds) {
  if (req.user.role !== "super_admin" && !participantUserIds.includes(req.user.id)) {
    throw new AppError(403, ERROR_CODES.FORBIDDEN, "You are not a participant in this conversation");
  }
}
router3.get(
  "/api/v1/chat/conversations",
  ...moduleGuards("chat", "chat.read"),
  async (req, res, next) => {
    try {
      const { page, limit } = listConversationsQuerySchema.parse(req.query ?? {});
      const skip = (page - 1) * limit;
      const filter = {};
      if (req.user.role !== "super_admin") {
        filter.participantUserIds = req.user.id;
      }
      const [total, items] = await Promise.all([
        ChatConversationModel.countDocuments(filter).exec(),
        ChatConversationModel.find(filter).sort({ lastMessageAt: -1 }).skip(skip).limit(limit).lean().exec()
      ]);
      res.json({
        items,
        page,
        limit,
        total
      });
    } catch (error) {
      if (error instanceof import_zod4.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid conversation list query"));
        return;
      }
      next(error);
    }
  }
);
router3.post(
  "/api/v1/chat/conversations",
  chatWriteRateLimiter,
  ...moduleGuards("chat", "chat.create"),
  async (req, res, next) => {
    try {
      const payload = createConversationSchema.parse(req.body ?? {});
      const created = await ChatConversationModel.create({
        title: payload.title.trim(),
        participantUserIds: Array.from(new Set(payload.participantUserIds)),
        status: "active",
        messageCount: 0,
        createdByUserId: req.user.id
      });
      res.status(201).json(created.toObject());
    } catch (error) {
      if (error instanceof import_zod4.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid conversation payload"));
        return;
      }
      next(error);
    }
  }
);
router3.get(
  "/api/v1/chat/conversations/:id",
  ...moduleGuards("chat", "chat.read"),
  async (req, res, next) => {
    try {
      ensureValidObjectId3(req.params.id);
      const conversation = await ChatConversationModel.findById(req.params.id).lean().exec();
      if (!conversation) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Conversation not found");
      }
      ensureParticipantOrSuperAdmin(req, conversation.participantUserIds);
      res.json(conversation);
    } catch (error) {
      next(error);
    }
  }
);
router3.patch(
  "/api/v1/chat/conversations/:id",
  chatWriteRateLimiter,
  ...moduleGuards("chat", "chat.update"),
  async (req, res, next) => {
    try {
      ensureValidObjectId3(req.params.id);
      const payload = updateConversationSchema.parse(req.body ?? {});
      const existing = await ChatConversationModel.findById(req.params.id).exec();
      if (!existing) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Conversation not found");
      }
      ensureParticipantOrSuperAdmin(req, existing.participantUserIds);
      existing.title = payload.title.trim();
      await existing.save();
      res.json(existing.toObject());
    } catch (error) {
      if (error instanceof import_zod4.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid conversation update payload"));
        return;
      }
      next(error);
    }
  }
);
router3.post(
  "/api/v1/chat/conversations/:id/archive",
  chatWriteRateLimiter,
  ...moduleGuards("chat", "chat.update"),
  async (req, res, next) => {
    try {
      ensureValidObjectId3(req.params.id);
      const conversation = await ChatConversationModel.findById(req.params.id).exec();
      if (!conversation) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Conversation not found");
      }
      ensureParticipantOrSuperAdmin(req, conversation.participantUserIds);
      if (conversation.status !== "active") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Only active conversations can be archived");
      }
      conversation.status = "archived";
      await conversation.save();
      res.json(conversation.toObject());
    } catch (error) {
      next(error);
    }
  }
);
router3.delete(
  "/api/v1/chat/conversations/:id",
  chatWriteRateLimiter,
  ...moduleGuards("chat", "chat.delete"),
  async (req, res, next) => {
    try {
      ensureValidObjectId3(req.params.id);
      const conversation = await ChatConversationModel.findById(req.params.id).exec();
      if (!conversation) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Conversation not found");
      }
      ensureParticipantOrSuperAdmin(req, conversation.participantUserIds);
      if (conversation.status !== "archived") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Only archived conversations can be deleted");
      }
      await ChatConversationModel.deleteOne({ _id: conversation._id }).exec();
      await ChatMessageModel.deleteMany({ conversationId: conversation._id }).exec();
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);
router3.get(
  "/api/v1/chat/conversations/:id/messages",
  ...moduleGuards("chat", "chat.read"),
  async (req, res, next) => {
    try {
      ensureValidObjectId3(req.params.id);
      const { page, limit } = listMessagesQuerySchema.parse(req.query ?? {});
      const skip = (page - 1) * limit;
      const conversation = await ChatConversationModel.findById(req.params.id).lean().exec();
      if (!conversation) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Conversation not found");
      }
      ensureParticipantOrSuperAdmin(req, conversation.participantUserIds);
      const [total, items] = await Promise.all([
        ChatMessageModel.countDocuments({ conversationId: req.params.id }).exec(),
        ChatMessageModel.find({ conversationId: req.params.id }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec()
      ]);
      res.json({
        items,
        page,
        limit,
        total
      });
    } catch (error) {
      if (error instanceof import_zod4.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid message list query"));
        return;
      }
      next(error);
    }
  }
);
router3.post(
  "/api/v1/chat/conversations/:id/messages",
  chatWriteRateLimiter,
  ...moduleGuards("chat", "chat.create"),
  async (req, res, next) => {
    try {
      ensureValidObjectId3(req.params.id);
      const payload = sendMessageSchema.parse(req.body ?? {});
      const conversation = await ChatConversationModel.findById(req.params.id).exec();
      if (!conversation) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Conversation not found");
      }
      ensureParticipantOrSuperAdmin(req, conversation.participantUserIds);
      if (conversation.status === "archived") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Archived conversations cannot receive new messages");
      }
      const message = await ChatMessageModel.create({
        conversationId: new import_mongoose8.default.Types.ObjectId(req.params.id),
        senderUserId: req.user.id,
        senderEmail: req.user.email,
        content: payload.content.trim()
      });
      await ChatConversationModel.updateOne(
        { _id: conversation._id },
        { $inc: { messageCount: 1 }, $set: { lastMessageAt: /* @__PURE__ */ new Date() } }
      ).exec();
      broadcastToConversation(req.params.id, "message", message.toObject());
      res.status(201).json(message.toObject());
    } catch (error) {
      if (error instanceof import_zod4.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid message payload"));
        return;
      }
      next(error);
    }
  }
);
router3.patch(
  "/api/v1/chat/messages/:id",
  chatWriteRateLimiter,
  ...moduleGuards("chat", "chat.update"),
  async (req, res, next) => {
    try {
      ensureValidObjectId3(req.params.id);
      const payload = editMessageSchema.parse(req.body ?? {});
      const message = await ChatMessageModel.findById(req.params.id).exec();
      if (!message) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Message not found");
      }
      if (message.senderUserId !== req.user.id) {
        throw new AppError(403, ERROR_CODES.FORBIDDEN, "You can only edit your own messages");
      }
      message.content = payload.content.trim();
      message.editedAt = /* @__PURE__ */ new Date();
      await message.save();
      broadcastToConversation(String(message.conversationId), "message_edited", message.toObject());
      res.json(message.toObject());
    } catch (error) {
      if (error instanceof import_zod4.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid message edit payload"));
        return;
      }
      next(error);
    }
  }
);
router3.delete(
  "/api/v1/chat/messages/:id",
  chatWriteRateLimiter,
  ...moduleGuards("chat", "chat.delete"),
  async (req, res, next) => {
    try {
      ensureValidObjectId3(req.params.id);
      const message = await ChatMessageModel.findById(req.params.id).exec();
      if (!message) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Message not found");
      }
      if (message.senderUserId !== req.user.id) {
        throw new AppError(403, ERROR_CODES.FORBIDDEN, "You can only delete your own messages");
      }
      const conversation = await ChatConversationModel.findById(message.conversationId).exec();
      if (conversation && conversation.messageCount > 0) {
        conversation.messageCount -= 1;
        await conversation.save();
      }
      const conversationIdStr = String(message.conversationId);
      const deletedId = String(message._id);
      await ChatMessageModel.deleteOne({ _id: message._id }).exec();
      broadcastToConversation(conversationIdStr, "message_deleted", { _id: deletedId });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);
router3.get(
  "/api/v1/chat/insights",
  ...moduleGuards("chat", "chat.read"),
  async (_req, res, next) => {
    try {
      const [totalConversations, activeConversations, archivedConversations, totalMessages] = await Promise.all([
        ChatConversationModel.countDocuments().exec(),
        ChatConversationModel.countDocuments({ status: "active" }).exec(),
        ChatConversationModel.countDocuments({ status: "archived" }).exec(),
        ChatMessageModel.countDocuments().exec()
      ]);
      res.json({
        counts: {
          totalConversations,
          activeConversations,
          archivedConversations,
          totalMessages
        }
      });
    } catch (error) {
      next(error);
    }
  }
);
router3.get(
  "/api/v1/chat/conversations/:id/stream",
  (req, _res, next) => {
    const token = req.query.token;
    if (typeof token === "string" && token && !req.headers.authorization) {
      req.headers.authorization = `Bearer ${token}`;
    }
    next();
  },
  ...moduleGuards("chat", "chat.read"),
  async (req, res, next) => {
    try {
      ensureValidObjectId3(req.params.id);
      const conversation = await ChatConversationModel.findById(req.params.id).lean().exec();
      if (!conversation) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Conversation not found");
      }
      ensureParticipantOrSuperAdmin(req, conversation.participantUserIds);
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no"
      });
      res.write("event: connected\ndata: {}\n\n");
      addClient({ res, userId: req.user.id, conversationId: req.params.id });
      const heartbeat = setInterval(() => {
        res.write(": heartbeat\n\n");
      }, 3e4);
      req.on("close", () => {
        clearInterval(heartbeat);
        removeClient(res);
      });
    } catch (error) {
      next(error);
    }
  }
);
var chatRoutes = router3;

// src/modules/crm/crm.routes.ts
var import_express4 = require("express");
var import_mongoose10 = __toESM(require("mongoose"), 1);
var import_express_rate_limit4 = __toESM(require("express-rate-limit"), 1);
var import_zod5 = require("zod");

// src/modules/crm/crm.models.ts
var import_mongoose9 = __toESM(require("mongoose"), 1);
var crmContactSchema = new import_mongoose9.Schema(
  {
    displayName: { type: String, required: true, trim: true },
    primaryEmail: { type: String, lowercase: true },
    primaryPhone: { type: String },
    companyName: { type: String },
    ownerUserId: { type: String },
    tags: { type: [String], default: [] },
    notes: { type: String, default: "" }
  },
  { timestamps: true }
);
crmContactSchema.index({ primaryEmail: 1 });
var CrmContactModel = import_mongoose9.default.models.CrmContact ?? import_mongoose9.default.model("CrmContact", crmContactSchema);
var pipelineStageSchema = new import_mongoose9.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    order: { type: Number, required: true },
    isTerminalWon: { type: Boolean, default: false },
    isTerminalLost: { type: Boolean, default: false }
  },
  { _id: false }
);
var crmPipelineSchema = new import_mongoose9.Schema(
  {
    name: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
    stages: { type: [pipelineStageSchema], required: true, default: [] }
  },
  { timestamps: true }
);
var CrmPipelineModel = import_mongoose9.default.models.CrmPipeline ?? import_mongoose9.default.model("CrmPipeline", crmPipelineSchema);
var crmDealSchema = new import_mongoose9.Schema(
  {
    title: { type: String, required: true },
    contactId: { type: import_mongoose9.Schema.Types.ObjectId, ref: "CrmContact", required: true, index: true },
    pipelineId: { type: import_mongoose9.Schema.Types.ObjectId, ref: "CrmPipeline", required: true, index: true },
    stageKey: { type: String, required: true },
    amountValue: { type: Number, required: true, min: 0, default: 0 },
    currency: { type: String, required: true, default: "USD" },
    status: { type: String, enum: ["open", "won", "lost"], default: "open" },
    expectedCloseDate: { type: Date },
    ownerUserId: { type: String },
    lostReason: { type: String }
  },
  { timestamps: true }
);
crmDealSchema.index({ pipelineId: 1, stageKey: 1 });
var CrmDealModel = import_mongoose9.default.models.CrmDeal ?? import_mongoose9.default.model("CrmDeal", crmDealSchema);

// src/modules/crm/crm.routes.ts
var router4 = (0, import_express4.Router)();
var crmWriteRateLimiter = (0, import_express_rate_limit4.default)({
  windowMs: 60 * 1e3,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});
var contactSchema = import_zod5.z.object({
  displayName: import_zod5.z.string().min(1).max(200),
  primaryEmail: import_zod5.z.string().email().optional(),
  primaryPhone: import_zod5.z.string().max(40).optional(),
  companyName: import_zod5.z.string().max(200).optional(),
  ownerUserId: import_zod5.z.string().optional(),
  tags: import_zod5.z.array(import_zod5.z.string().max(40)).max(20).default([]),
  notes: import_zod5.z.string().max(2e3).optional()
});
var pipelineSchema = import_zod5.z.object({
  name: import_zod5.z.string().min(1).max(120),
  isDefault: import_zod5.z.boolean().default(false),
  stages: import_zod5.z.array(
    import_zod5.z.object({
      key: import_zod5.z.string().min(1).max(60),
      label: import_zod5.z.string().min(1).max(120),
      order: import_zod5.z.number().int().min(0),
      isTerminalWon: import_zod5.z.boolean().optional(),
      isTerminalLost: import_zod5.z.boolean().optional()
    })
  ).min(1).max(30)
});
var dealSchema = import_zod5.z.object({
  title: import_zod5.z.string().min(1),
  contactId: import_zod5.z.string().min(1),
  pipelineId: import_zod5.z.string().min(1),
  stageKey: import_zod5.z.string().min(1),
  amountValue: import_zod5.z.number().min(0).default(0),
  currency: import_zod5.z.string().min(3).max(3).default("USD"),
  expectedCloseDate: import_zod5.z.string().datetime().optional(),
  ownerUserId: import_zod5.z.string().optional(),
  lostReason: import_zod5.z.string().optional()
});
var stageTransitionSchema = import_zod5.z.object({
  stageKey: import_zod5.z.string().min(1),
  lostReason: import_zod5.z.string().optional()
});
function ensureValidObjectId4(id) {
  if (!import_mongoose10.default.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid id");
  }
}
function deriveDealStatus(stage) {
  if (stage.isTerminalWon) return "won";
  if (stage.isTerminalLost) return "lost";
  return "open";
}
router4.get("/api/v1/crm/contacts", ...moduleGuards("crm", "crm.read"), async (_req, res, next) => {
  try {
    const items = await CrmContactModel.find().sort({ createdAt: -1 }).lean().exec();
    res.json({ items });
  } catch (error) {
    next(error);
  }
});
router4.post("/api/v1/crm/contacts", crmWriteRateLimiter, ...moduleGuards("crm", "crm.create"), async (req, res, next) => {
  try {
    const payload = contactSchema.parse(req.body ?? {});
    const created = await CrmContactModel.create(payload);
    res.status(201).json(created);
  } catch (error) {
    if (error instanceof import_zod5.z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid contact payload"));
      return;
    }
    next(error);
  }
});
router4.patch("/api/v1/crm/contacts/:id", crmWriteRateLimiter, ...moduleGuards("crm", "crm.update"), async (req, res, next) => {
  try {
    ensureValidObjectId4(req.params.id);
    const payload = contactSchema.partial().parse(req.body ?? {});
    const updated = await CrmContactModel.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true
    }).lean().exec();
    if (!updated) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Contact not found");
    }
    res.json(updated);
  } catch (error) {
    if (error instanceof import_zod5.z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid contact update payload"));
      return;
    }
    next(error);
  }
});
router4.delete("/api/v1/crm/contacts/:id", crmWriteRateLimiter, ...moduleGuards("crm", "crm.delete"), async (req, res, next) => {
  try {
    ensureValidObjectId4(req.params.id);
    const hasDeals = await CrmDealModel.countDocuments({ contactId: req.params.id }).exec();
    if (hasDeals > 0) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Cannot delete contact linked to deals");
    }
    const deleted = await CrmContactModel.findByIdAndDelete(req.params.id).lean().exec();
    if (!deleted) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Contact not found");
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
router4.get("/api/v1/crm/pipelines", ...moduleGuards("crm", "crm.read"), async (_req, res, next) => {
  try {
    const items = await CrmPipelineModel.find().sort({ createdAt: -1 }).lean().exec();
    res.json({ items });
  } catch (error) {
    next(error);
  }
});
router4.post("/api/v1/crm/pipelines", crmWriteRateLimiter, ...moduleGuards("crm", "crm.create"), async (req, res, next) => {
  try {
    const payload = pipelineSchema.parse(req.body ?? {});
    if (payload.isDefault) {
      await CrmPipelineModel.updateMany({}, { $set: { isDefault: false } }).exec();
    }
    const created = await CrmPipelineModel.create(payload);
    res.status(201).json(created);
  } catch (error) {
    if (error instanceof import_zod5.z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid pipeline payload"));
      return;
    }
    next(error);
  }
});
router4.patch("/api/v1/crm/pipelines/:id", crmWriteRateLimiter, ...moduleGuards("crm", "crm.update"), async (req, res, next) => {
  try {
    ensureValidObjectId4(req.params.id);
    const payload = pipelineSchema.partial().parse(req.body ?? {});
    if (payload.isDefault) {
      await CrmPipelineModel.updateMany({}, { $set: { isDefault: false } }).exec();
    }
    const updated = await CrmPipelineModel.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true
    }).lean().exec();
    if (!updated) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Pipeline not found");
    }
    res.json(updated);
  } catch (error) {
    if (error instanceof import_zod5.z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid pipeline update payload"));
      return;
    }
    next(error);
  }
});
router4.get("/api/v1/crm/deals", ...moduleGuards("crm", "crm.read"), async (_req, res, next) => {
  try {
    const items = await CrmDealModel.find().sort({ createdAt: -1 }).lean().exec();
    res.json({ items });
  } catch (error) {
    next(error);
  }
});
router4.post("/api/v1/crm/deals", crmWriteRateLimiter, ...moduleGuards("crm", "crm.create"), async (req, res, next) => {
  try {
    const payload = dealSchema.parse(req.body ?? {});
    ensureValidObjectId4(payload.contactId);
    ensureValidObjectId4(payload.pipelineId);
    const [contact, pipeline] = await Promise.all([
      CrmContactModel.findById(payload.contactId).exec(),
      CrmPipelineModel.findById(payload.pipelineId).exec()
    ]);
    if (!contact) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Contact not found");
    if (!pipeline) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Pipeline not found");
    const stage = pipeline.stages.find((item) => item.key === payload.stageKey);
    if (!stage) throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Stage not found in pipeline");
    if (stage.isTerminalLost && !payload.lostReason) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Lost reason is required for lost stage");
    }
    const created = await CrmDealModel.create({
      ...payload,
      contactId: new import_mongoose10.default.Types.ObjectId(payload.contactId),
      pipelineId: new import_mongoose10.default.Types.ObjectId(payload.pipelineId),
      expectedCloseDate: payload.expectedCloseDate ? new Date(payload.expectedCloseDate) : void 0,
      status: deriveDealStatus(stage)
    });
    res.status(201).json(created);
  } catch (error) {
    if (error instanceof import_zod5.z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid deal payload"));
      return;
    }
    next(error);
  }
});
router4.patch("/api/v1/crm/deals/:id", crmWriteRateLimiter, ...moduleGuards("crm", "crm.update"), async (req, res, next) => {
  try {
    ensureValidObjectId4(req.params.id);
    const payload = dealSchema.partial().parse(req.body ?? {});
    if (payload.stageKey !== void 0 || payload.pipelineId !== void 0 || payload.lostReason !== void 0) {
      throw new AppError(
        400,
        ERROR_CODES.BAD_REQUEST,
        "Use /api/v1/crm/deals/:id/stage for pipeline, stage, or lost reason transitions"
      );
    }
    if (payload.contactId) {
      ensureValidObjectId4(payload.contactId);
      const contact = await CrmContactModel.findById(payload.contactId).exec();
      if (!contact) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Contact not found");
      }
    }
    const updated = await CrmDealModel.findByIdAndUpdate(
      req.params.id,
      {
        ...payload,
        expectedCloseDate: payload.expectedCloseDate ? new Date(payload.expectedCloseDate) : void 0
      },
      { new: true, runValidators: true }
    ).lean().exec();
    if (!updated) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Deal not found");
    }
    res.json(updated);
  } catch (error) {
    if (error instanceof import_zod5.z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid deal update payload"));
      return;
    }
    next(error);
  }
});
router4.post("/api/v1/crm/deals/:id/stage", crmWriteRateLimiter, ...moduleGuards("crm", "crm.update"), async (req, res, next) => {
  try {
    ensureValidObjectId4(req.params.id);
    const payload = stageTransitionSchema.parse(req.body ?? {});
    const deal = await CrmDealModel.findById(req.params.id).exec();
    if (!deal) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Deal not found");
    const pipeline = await CrmPipelineModel.findById(deal.pipelineId).exec();
    if (!pipeline) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Pipeline not found");
    const stage = pipeline.stages.find((item) => item.key === payload.stageKey);
    if (!stage) throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Stage not found in pipeline");
    if (stage.isTerminalLost && !payload.lostReason) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Lost reason is required for lost stage");
    }
    deal.stageKey = payload.stageKey;
    deal.status = deriveDealStatus(stage);
    deal.lostReason = stage.isTerminalLost ? payload.lostReason : void 0;
    await deal.save();
    res.json(deal);
  } catch (error) {
    if (error instanceof import_zod5.z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid stage transition payload"));
      return;
    }
    next(error);
  }
});
router4.get("/api/v1/crm/insights", ...moduleGuards("crm", "crm.read"), async (_req, res, next) => {
  try {
    const [contactCount, openDeals, wonDeals, lostDeals] = await Promise.all([
      CrmContactModel.countDocuments().exec(),
      CrmDealModel.countDocuments({ status: "open" }).exec(),
      CrmDealModel.countDocuments({ status: "won" }).exec(),
      CrmDealModel.countDocuments({ status: "lost" }).exec()
    ]);
    res.json({
      counts: {
        contacts: contactCount,
        openDeals,
        wonDeals,
        lostDeals
      }
    });
  } catch (error) {
    next(error);
  }
});
var crmRoutes = router4;

// src/modules/ecommerce/ecommerce.payment.routes.ts
var import_express5 = __toESM(require("express"), 1);
var import_express_rate_limit5 = __toESM(require("express-rate-limit"), 1);
var import_zod6 = require("zod");

// src/core/payments/payment.types.ts
var PAYMENT_PROVIDER_KEYS = ["stripe", "paypal", "razorpay"];

// src/modules/ecommerce/ecommerce.payment.service.ts
var import_crypto3 = __toESM(require("crypto"), 1);
var import_mongoose13 = __toESM(require("mongoose"), 1);

// src/core/payments/payment.models.ts
var import_mongoose11 = __toESM(require("mongoose"), 1);
var paymentIdempotencySchema = new import_mongoose11.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    provider: { type: String, enum: ["stripe", "paypal", "razorpay"], required: true },
    orderId: { type: import_mongoose11.Schema.Types.ObjectId, required: true, ref: "EcommerceOrder" },
    requestHash: { type: String, required: true },
    responsePayload: { type: import_mongoose11.Schema.Types.Mixed, required: true }
  },
  { timestamps: true }
);
var PaymentIdempotencyModel = import_mongoose11.default.models.PaymentIdempotency ?? import_mongoose11.default.model("PaymentIdempotency", paymentIdempotencySchema);
var paymentWebhookEventSchema = new import_mongoose11.Schema(
  {
    provider: { type: String, enum: ["stripe", "paypal", "razorpay"], required: true },
    eventId: { type: String, required: true },
    payloadHash: { type: String, required: true },
    processedAt: { type: Date, required: true, default: () => /* @__PURE__ */ new Date() }
  },
  { timestamps: true }
);
paymentWebhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });
var PaymentWebhookEventModel = import_mongoose11.default.models.PaymentWebhookEvent ?? import_mongoose11.default.model("PaymentWebhookEvent", paymentWebhookEventSchema);

// src/core/payments/payment.providers.ts
var crc32 = __toESM(require("buffer-crc32"), 1);
var import_crypto2 = __toESM(require("crypto"), 1);
var import_razorpay = __toESM(require("razorpay"), 1);
var import_stripe = __toESM(require("stripe"), 1);
var stripeClient = null;
var razorpayClient = null;
var paypalTokenCache = null;
function headerValue(headers, name) {
  const value = headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0];
  return value;
}
function secureEqualHex(expectedHex, receivedHex) {
  const expected = Buffer.from(expectedHex, "hex");
  const received = Buffer.from(receivedHex, "hex");
  if (expected.length !== received.length) return false;
  return import_crypto2.default.timingSafeEqual(expected, received);
}
function ensureProviderConfigured(provider) {
  const providerState = listPaymentProviders().find((item) => item.id === provider);
  if (!providerState?.enabled) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, `${provider} is not configured`);
  }
}
function getStripeClient() {
  if (!env.STRIPE_SECRET_KEY) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Stripe is not configured");
  }
  if (!stripeClient) {
    stripeClient = new import_stripe.default(env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}
function getRazorpayClient() {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Razorpay is not configured");
  }
  if (!razorpayClient) {
    razorpayClient = new import_razorpay.default({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET
    });
  }
  return razorpayClient;
}
function getPayPalBaseUrl() {
  return env.PAYPAL_MODE === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}
async function getPayPalAccessToken() {
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "PayPal is not configured");
  }
  if (paypalTokenCache && Date.now() < paypalTokenCache.expiresAtMs) {
    return paypalTokenCache.token;
  }
  const basicAuth = Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });
  if (!response.ok) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Failed to acquire PayPal access token");
  }
  const data = await response.json();
  if (!data.access_token) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "PayPal access token is missing");
  }
  paypalTokenCache = {
    token: data.access_token,
    expiresAtMs: Date.now() + ((data.expires_in ?? 300) - 10) * 1e3
  };
  return data.access_token;
}
function amountMinorToMajor(amountMinor) {
  return (amountMinor / 100).toFixed(2);
}
function fetchTimeoutOptions(timeoutMs = 15e3) {
  return {
    signal: AbortSignal.timeout(timeoutMs)
  };
}
function resolveSafeRedirectUrl(candidateUrl, fallbackUrl) {
  const targetUrl = candidateUrl ?? fallbackUrl;
  const parsed = new URL(targetUrl);
  const allowedOrigins = env.PAYMENT_ALLOWED_REDIRECT_ORIGINS.split(",").map((item) => item.trim()).filter((item) => item.length > 0);
  if (!allowedOrigins.includes(parsed.origin)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, `Redirect origin is not allowed: ${parsed.origin}`);
  }
  return parsed.toString();
}
function listPaymentProviders() {
  return [
    {
      id: "stripe",
      displayName: "Stripe",
      enabled: Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET)
    },
    {
      id: "paypal",
      displayName: "PayPal",
      enabled: Boolean(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET && env.PAYPAL_WEBHOOK_ID)
    },
    {
      id: "razorpay",
      displayName: "Razorpay",
      enabled: Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET && env.RAZORPAY_WEBHOOK_SECRET)
    }
  ];
}
async function initiateProviderPayment(order, payload, idempotencyKey) {
  ensureProviderConfigured(payload.provider);
  if (payload.provider === "stripe") {
    const stripe = getStripeClient();
    const successUrl = resolveSafeRedirectUrl(payload.successUrl, env.PAYMENT_DEFAULT_SUCCESS_URL);
    const cancelUrl = resolveSafeRedirectUrl(payload.cancelUrl, env.PAYMENT_DEFAULT_CANCEL_URL);
    const checkoutSession = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: order.customerEmail,
        client_reference_id: order._id.toString(),
        line_items: [
          {
            price_data: {
              currency: order.currency.toLowerCase(),
              unit_amount: order.grandTotalMinor,
              product_data: {
                name: `Order ${order.orderNumber}`
              }
            },
            quantity: 1
          }
        ],
        payment_intent_data: {
          metadata: {
            orderId: order._id.toString(),
            orderNumber: order.orderNumber,
            customerEmail: order.customerEmail
          }
        },
        metadata: {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber
        }
      },
      { idempotencyKey: `stripe-${idempotencyKey}`.slice(0, 255) }
    );
    if (!checkoutSession.url) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Stripe checkout session URL is missing");
    }
    return {
      provider: "stripe",
      mode: "redirect_url",
      providerOrderId: checkoutSession.id,
      providerPaymentId: typeof checkoutSession.payment_intent === "string" ? checkoutSession.payment_intent : void 0,
      approvalUrl: checkoutSession.url,
      metadata: {
        orderNumber: order.orderNumber
      }
    };
  }
  if (payload.provider === "paypal") {
    const accessToken = await getPayPalAccessToken();
    const successUrl = resolveSafeRedirectUrl(payload.successUrl, env.PAYMENT_DEFAULT_SUCCESS_URL);
    const cancelUrl = resolveSafeRedirectUrl(payload.cancelUrl, env.PAYMENT_DEFAULT_CANCEL_URL);
    const response = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `paypal-${idempotencyKey}`.slice(0, 108)
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: order.currency.toUpperCase(),
              value: amountMinorToMajor(order.grandTotalMinor)
            },
            custom_id: order._id.toString(),
            invoice_id: order.orderNumber
          }
        ],
        application_context: {
          return_url: successUrl,
          cancel_url: cancelUrl,
          user_action: "PAY_NOW"
        }
      }),
      ...fetchTimeoutOptions()
    });
    if (!response.ok) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Failed to create PayPal order");
    }
    const data = await response.json();
    const approvalUrl = data.links?.find((link) => link.rel === "approve")?.href;
    if (!data.id || !approvalUrl) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "PayPal order response is incomplete");
    }
    return {
      provider: "paypal",
      mode: "redirect_url",
      providerOrderId: data.id,
      approvalUrl,
      metadata: {
        orderNumber: order.orderNumber
      }
    };
  }
  const razorpay = getRazorpayClient();
  const razorpayOrder = await razorpay.orders.create({
    amount: order.grandTotalMinor,
    currency: order.currency.toUpperCase(),
    receipt: order.orderNumber.slice(0, 40),
    notes: {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber
    }
  });
  return {
    provider: "razorpay",
    mode: "razorpay_order",
    providerOrderId: razorpayOrder.id,
    keyId: env.RAZORPAY_KEY_ID ?? void 0,
    metadata: {
      orderNumber: order.orderNumber
    }
  };
}
async function confirmProviderPayment(order, payload) {
  ensureProviderConfigured(payload.provider);
  if (payload.provider === "stripe") {
    if (order.payment?.provider && order.payment.provider !== "stripe") {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Order is not linked to Stripe");
    }
    const stripe = getStripeClient();
    const checkoutSessionId = payload.checkoutSessionId ?? order.payment?.providerOrderId;
    if (!checkoutSessionId && !payload.providerPaymentId && !order.payment?.providerPaymentId) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Stripe checkout reference is missing");
    }
    let providerPaymentId = payload.providerPaymentId ?? order.payment?.providerPaymentId;
    if (checkoutSessionId) {
      const checkoutSession = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
        expand: ["payment_intent"]
      });
      if (checkoutSession.client_reference_id !== order._id.toString()) {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Stripe checkout session is not linked to this order");
      }
      if (typeof checkoutSession.payment_intent === "string") {
        providerPaymentId = checkoutSession.payment_intent;
      } else if (checkoutSession.payment_intent?.id) {
        providerPaymentId = checkoutSession.payment_intent.id;
      }
    }
    if (!providerPaymentId) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "providerPaymentId is required for Stripe confirmation");
    }
    const intent = await stripe.paymentIntents.retrieve(providerPaymentId);
    if (intent.metadata.orderId !== order._id.toString()) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Stripe payment does not belong to this order");
    }
    if (intent.amount !== order.grandTotalMinor || intent.currency !== order.currency.toLowerCase()) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Stripe payment amount or currency mismatch");
    }
    if (intent.status === "succeeded") {
      return {
        provider: "stripe",
        status: "succeeded",
        providerPaymentId: intent.id,
        providerOrderId: checkoutSessionId
      };
    }
    if (intent.status === "processing" || intent.status === "requires_capture") {
      return {
        provider: "stripe",
        status: "pending_capture",
        providerPaymentId: intent.id,
        providerOrderId: checkoutSessionId,
        message: "Stripe payment is still processing"
      };
    }
    return {
      provider: "stripe",
      status: "failed",
      providerPaymentId: intent.id,
      providerOrderId: checkoutSessionId,
      message: `Stripe payment status is ${intent.status}`
    };
  }
  if (payload.provider === "paypal") {
    if (order.payment?.provider && order.payment.provider !== "paypal") {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Order is not linked to PayPal");
    }
    if (order.payment?.providerOrderId && order.payment.providerOrderId !== payload.providerOrderId) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "PayPal order id does not match initiated order");
    }
    const accessToken = await getPayPalAccessToken();
    const captureResponse = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders/${payload.providerOrderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      ...fetchTimeoutOptions()
    });
    if (!captureResponse.ok) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Failed to capture PayPal payment");
    }
    const captureData = await captureResponse.json();
    const capture = captureData.purchase_units?.[0]?.payments?.captures?.[0];
    const purchaseUnit = captureData.purchase_units?.[0];
    if (!purchaseUnit?.custom_id) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "PayPal custom_id is missing in capture response");
    }
    if (purchaseUnit.custom_id !== order._id.toString()) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "PayPal payment does not belong to this order");
    }
    const captureCurrency = capture?.amount?.currency_code ?? purchaseUnit?.amount?.currency_code;
    const captureValue = capture?.amount?.value ?? purchaseUnit?.amount?.value;
    if (!captureCurrency || !captureValue) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "PayPal amount or currency is missing in capture response");
    }
    if (captureCurrency.toUpperCase() !== order.currency.toUpperCase() || Number.parseInt((Number.parseFloat(captureValue) * 100).toFixed(0), 10) !== order.grandTotalMinor) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "PayPal payment amount or currency mismatch");
    }
    if (capture?.status === "COMPLETED") {
      return {
        provider: "paypal",
        status: "succeeded",
        providerOrderId: payload.providerOrderId,
        providerPaymentId: capture.id
      };
    }
    if (capture?.status === "PENDING" || captureData.status === "PAYER_ACTION_REQUIRED") {
      return {
        provider: "paypal",
        status: "pending_capture",
        providerOrderId: payload.providerOrderId,
        providerPaymentId: capture?.id,
        message: "PayPal payment is pending"
      };
    }
    return {
      provider: "paypal",
      status: "failed",
      providerOrderId: payload.providerOrderId,
      providerPaymentId: capture?.id,
      message: `PayPal capture status is ${capture?.status ?? captureData.status ?? "UNKNOWN"}`
    };
  }
  if (!env.RAZORPAY_KEY_SECRET) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Razorpay is not configured");
  }
  if (order.payment?.provider && order.payment.provider !== "razorpay") {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Order is not linked to Razorpay");
  }
  if (order.payment?.providerOrderId && order.payment.providerOrderId !== payload.razorpayOrderId) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Razorpay order id does not match initiated order");
  }
  const expected = import_crypto2.default.createHmac("sha256", env.RAZORPAY_KEY_SECRET).update(`${payload.razorpayOrderId}|${payload.razorpayPaymentId}`).digest("hex");
  if (!secureEqualHex(expected, payload.razorpaySignature)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid Razorpay signature");
  }
  const razorpay = getRazorpayClient();
  const payment = await razorpay.payments.fetch(payload.razorpayPaymentId);
  if (payment.order_id !== payload.razorpayOrderId) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Razorpay order id mismatch");
  }
  if (payment.notes?.orderId && payment.notes.orderId !== order._id.toString()) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Razorpay payment does not belong to this order");
  }
  if (payment.amount !== void 0 && payment.currency && (payment.amount !== order.grandTotalMinor || payment.currency.toUpperCase() !== order.currency.toUpperCase())) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Razorpay payment amount or currency mismatch");
  }
  if (payment.status === "captured") {
    return {
      provider: "razorpay",
      status: "succeeded",
      providerOrderId: payment.order_id,
      providerPaymentId: payment.id
    };
  }
  if (payment.status === "authorized") {
    return {
      provider: "razorpay",
      status: "pending_capture",
      providerOrderId: payment.order_id,
      providerPaymentId: payment.id,
      message: "Razorpay payment is authorized but not captured"
    };
  }
  return {
    provider: "razorpay",
    status: "failed",
    providerOrderId: payment.order_id,
    providerPaymentId: payment.id,
    message: `Razorpay payment status is ${payment.status}`
  };
}
async function validateProviderPaymentForOrder(order, refs) {
  if (refs.provider === "stripe") {
    const providerPaymentId2 = refs.providerPaymentId ?? order.payment?.providerPaymentId;
    if (!providerPaymentId2) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Stripe payment reference is missing");
    }
    const stripe = getStripeClient();
    const intent = await stripe.paymentIntents.retrieve(providerPaymentId2);
    if (intent.metadata.orderId !== order._id.toString()) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Stripe payment does not belong to this order");
    }
    if (intent.amount !== order.grandTotalMinor || intent.currency !== order.currency.toLowerCase()) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Stripe payment amount or currency mismatch");
    }
    return;
  }
  if (refs.provider === "paypal") {
    const providerOrderId = refs.providerOrderId ?? order.payment?.providerOrderId;
    if (!providerOrderId) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "PayPal order reference is missing");
    }
    const accessToken = await getPayPalAccessToken();
    const paypalOrderResponse = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders/${providerOrderId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      ...fetchTimeoutOptions()
    });
    if (!paypalOrderResponse.ok) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Failed to verify PayPal order");
    }
    const paypalOrder = await paypalOrderResponse.json();
    const purchaseUnit = paypalOrder.purchase_units?.[0];
    const amount = purchaseUnit?.amount;
    if (!purchaseUnit?.custom_id || !amount?.currency_code || !amount.value) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "PayPal verification payload is incomplete");
    }
    if (purchaseUnit.custom_id !== order._id.toString()) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "PayPal payment does not belong to this order");
    }
    if (amount.currency_code.toUpperCase() !== order.currency.toUpperCase() || Number.parseInt((Number.parseFloat(amount.value) * 100).toFixed(0), 10) !== order.grandTotalMinor) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "PayPal payment amount or currency mismatch");
    }
    return;
  }
  const providerPaymentId = refs.providerPaymentId ?? order.payment?.providerPaymentId;
  if (!providerPaymentId) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Razorpay payment reference is missing");
  }
  const razorpay = getRazorpayClient();
  const payment = await razorpay.payments.fetch(providerPaymentId);
  if (refs.providerOrderId && payment.order_id !== refs.providerOrderId) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Razorpay order id mismatch");
  }
  if (payment.notes?.orderId && payment.notes.orderId !== order._id.toString()) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Razorpay payment does not belong to this order");
  }
  if (payment.amount !== void 0 && payment.currency && (payment.amount !== order.grandTotalMinor || payment.currency.toUpperCase() !== order.currency.toUpperCase())) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Razorpay payment amount or currency mismatch");
  }
}
async function verifyPayPalWebhook(rawBody, headers) {
  if (!env.PAYPAL_WEBHOOK_ID) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "PayPal webhook id is not configured");
  }
  const transmissionId = headerValue(headers, "paypal-transmission-id");
  const transmissionTime = headerValue(headers, "paypal-transmission-time");
  const transmissionSignature = headerValue(headers, "paypal-transmission-sig");
  const authAlgo = headerValue(headers, "paypal-auth-algo");
  const certUrl = headerValue(headers, "paypal-cert-url");
  if (!transmissionId || !transmissionTime || !transmissionSignature || !authAlgo || !certUrl) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Missing PayPal webhook signature headers");
  }
  let event;
  try {
    event = JSON.parse(rawBody.toString("utf-8"));
  } catch {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid PayPal webhook payload");
  }
  const accessToken = await getPayPalAccessToken();
  const verifyResponse = await fetch(`${getPayPalBaseUrl()}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      transmission_id: transmissionId,
      transmission_time: transmissionTime,
      cert_url: certUrl,
      auth_algo: authAlgo,
      transmission_sig: transmissionSignature,
      webhook_id: env.PAYPAL_WEBHOOK_ID,
      webhook_event: event
    }),
    ...fetchTimeoutOptions()
  });
  if (!verifyResponse.ok) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "PayPal webhook verification failed");
  }
  const verifyData = await verifyResponse.json();
  if (verifyData.verification_status !== "SUCCESS") {
    throw new AppError(401, ERROR_CODES.UNAUTHORIZED, "Invalid PayPal webhook signature");
  }
  return event;
}
function resolveRazorpayWebhookEventId(rawEvent, headers) {
  const fromHeader = headerValue(headers, "x-razorpay-event-id");
  if (fromHeader) return fromHeader;
  const paymentEntity = rawEvent.payload?.payment?.entity;
  const eventType = typeof rawEvent.event === "string" ? rawEvent.event : "unknown";
  return `${eventType}:${paymentEntity?.id ?? import_crypto2.default.createHash("sha256").update(JSON.stringify(rawEvent)).digest("hex")}`;
}
async function verifyAndNormalizeWebhook(provider, rawBody, headers) {
  ensureProviderConfigured(provider);
  if (provider === "stripe") {
    const signature2 = headerValue(headers, "stripe-signature");
    if (!signature2 || !env.STRIPE_WEBHOOK_SECRET) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Missing Stripe signature header");
    }
    const stripe = getStripeClient();
    const event = stripe.webhooks.constructEvent(rawBody, signature2, env.STRIPE_WEBHOOK_SECRET);
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      return {
        provider,
        eventId: event.id,
        status: "succeeded",
        orderId: session.client_reference_id ?? void 0,
        providerOrderId: session.id,
        providerPaymentId: typeof session.payment_intent === "string" ? session.payment_intent : void 0
      };
    }
    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object;
      return {
        provider,
        eventId: event.id,
        status: "succeeded",
        orderId: intent.metadata.orderId,
        providerPaymentId: intent.id
      };
    }
    if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object;
      return {
        provider,
        eventId: event.id,
        status: "failed",
        orderId: intent.metadata.orderId,
        providerPaymentId: intent.id
      };
    }
    if (event.type === "charge.refunded") {
      const charge = event.data.object;
      return {
        provider,
        eventId: event.id,
        status: "refunded",
        providerPaymentId: typeof charge.payment_intent === "string" ? charge.payment_intent : void 0
      };
    }
    return {
      provider,
      eventId: event.id,
      status: "ignored"
    };
  }
  if (provider === "paypal") {
    const paypalEvent = await verifyPayPalWebhook(rawBody, headers);
    const eventType2 = paypalEvent.event_type;
    const eventId2 = paypalEvent.id ?? `${headerValue(headers, "paypal-transmission-id") ?? "paypal"}:${headerValue(headers, "paypal-transmission-time") ?? "unknown"}`;
    const resource = paypalEvent.resource ?? {};
    const relatedIds = resource.supplementary_data?.related_ids;
    if (eventType2 === "PAYMENT.CAPTURE.COMPLETED") {
      return {
        provider,
        eventId: eventId2,
        status: "succeeded",
        orderId: resource.custom_id ?? void 0,
        providerOrderId: relatedIds?.order_id,
        providerPaymentId: resource.id
      };
    }
    if (eventType2 === "PAYMENT.CAPTURE.DENIED" || eventType2 === "PAYMENT.CAPTURE.DECLINED") {
      return {
        provider,
        eventId: eventId2,
        status: "failed",
        orderId: resource.custom_id ?? void 0,
        providerOrderId: relatedIds?.order_id,
        providerPaymentId: resource.id
      };
    }
    if (eventType2 === "PAYMENT.CAPTURE.REFUNDED") {
      return {
        provider,
        eventId: eventId2,
        status: "refunded",
        orderId: resource.custom_id ?? void 0,
        providerOrderId: relatedIds?.order_id,
        providerPaymentId: resource.id
      };
    }
    return {
      provider,
      eventId: eventId2,
      status: "ignored"
    };
  }
  const signature = headerValue(headers, "x-razorpay-signature");
  if (!signature || !env.RAZORPAY_WEBHOOK_SECRET) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Missing Razorpay webhook signature");
  }
  const expected = import_crypto2.default.createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex");
  if (!secureEqualHex(expected, signature)) {
    throw new AppError(401, ERROR_CODES.UNAUTHORIZED, "Invalid Razorpay webhook signature");
  }
  let razorEvent;
  try {
    razorEvent = JSON.parse(rawBody.toString("utf-8"));
  } catch {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid Razorpay webhook payload");
  }
  const eventType = razorEvent.event;
  const eventId = resolveRazorpayWebhookEventId(razorEvent, headers);
  const paymentEntity = razorEvent.payload?.payment?.entity;
  const refundEntity = razorEvent.payload?.refund?.entity;
  if (eventType === "payment.captured") {
    return {
      provider,
      eventId,
      status: "succeeded",
      orderId: paymentEntity?.notes?.orderId,
      providerOrderId: paymentEntity?.order_id,
      providerPaymentId: paymentEntity?.id
    };
  }
  if (eventType === "payment.failed") {
    return {
      provider,
      eventId,
      status: "failed",
      orderId: paymentEntity?.notes?.orderId,
      providerOrderId: paymentEntity?.order_id,
      providerPaymentId: paymentEntity?.id
    };
  }
  if (eventType === "refund.processed") {
    return {
      provider,
      eventId,
      status: "refunded",
      providerPaymentId: refundEntity?.payment_id
    };
  }
  return {
    provider,
    eventId,
    status: "ignored"
  };
}
function hashRawPayload(rawBody) {
  const digest = import_crypto2.default.createHash("sha256").update(rawBody).digest("hex");
  const crc = crc32.unsigned(rawBody).toString();
  return `${digest}:${crc}`;
}

// src/modules/ecommerce/ecommerce.models.ts
var import_mongoose12 = __toESM(require("mongoose"), 1);
var ecommerceProductSchema = new import_mongoose12.Schema(
  {
    title: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: "" },
    priceMinor: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: "USD" },
    stock: { type: Number, required: true, min: 0, default: 0 },
    status: { type: String, enum: ["draft", "active", "archived"], default: "draft" }
  },
  { timestamps: true }
);
var EcommerceProductModel = import_mongoose12.default.models.EcommerceProduct ?? import_mongoose12.default.model("EcommerceProduct", ecommerceProductSchema);
var ecommerceOrderLineSchema = new import_mongoose12.Schema(
  {
    productId: { type: import_mongoose12.Schema.Types.ObjectId, ref: "EcommerceProduct", required: true },
    title: { type: String, required: true },
    sku: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    unitPriceMinor: { type: Number, required: true, min: 0 },
    lineTotalMinor: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);
var ecommerceOrderSchema = new import_mongoose12.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true, lowercase: true },
    status: {
      type: String,
      enum: ["open", "paid", "shipped", "completed", "cancelled", "refunded"],
      default: "open"
    },
    currency: { type: String, required: true, default: "USD" },
    lineItems: { type: [ecommerceOrderLineSchema], required: true, default: [] },
    subtotalMinor: { type: Number, required: true, min: 0, default: 0 },
    taxMinor: { type: Number, required: true, min: 0, default: 0 },
    shippingMinor: { type: Number, required: true, min: 0, default: 0 },
    grandTotalMinor: { type: Number, required: true, min: 0, default: 0 },
    stockReverted: { type: Boolean, default: false },
    payment: {
      provider: { type: String, enum: ["stripe", "paypal", "razorpay"] },
      status: {
        type: String,
        enum: ["none", "initiated", "pending_capture", "succeeded", "failed", "refunded"],
        default: "none"
      },
      amountMinor: { type: Number, required: true, min: 0, default: 0 },
      currency: { type: String, required: true, default: "USD" },
      providerOrderId: { type: String },
      providerPaymentId: { type: String },
      idempotencyKey: { type: String },
      lastEventId: { type: String },
      failureCode: { type: String },
      failureMessage: { type: String },
      succeededAt: { type: Date },
      updatedAt: { type: Date }
    }
  },
  { timestamps: true }
);
ecommerceOrderSchema.index({ status: 1, createdAt: -1 });
ecommerceOrderSchema.index({ "payment.providerOrderId": 1 });
ecommerceOrderSchema.index({ "payment.providerPaymentId": 1 });
var EcommerceOrderModel = import_mongoose12.default.models.EcommerceOrder ?? import_mongoose12.default.model("EcommerceOrder", ecommerceOrderSchema);

// src/modules/ecommerce/ecommerce.payment.service.ts
function ensureValidObjectId5(id) {
  if (!import_mongoose13.default.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid id");
  }
}
function buildInitiationRequestHash(orderId, payload) {
  return import_crypto3.default.createHash("sha256").update(JSON.stringify({ orderId, payload })).digest("hex");
}
function applyPaymentResultToOrder(order, result, metadata) {
  order.payment = {
    ...order.payment,
    provider: result.provider,
    status: result.status,
    amountMinor: order.grandTotalMinor,
    currency: order.currency,
    providerOrderId: result.providerOrderId ?? order.payment?.providerOrderId,
    providerPaymentId: result.providerPaymentId ?? order.payment?.providerPaymentId,
    idempotencyKey: metadata?.idempotencyKey ?? order.payment?.idempotencyKey,
    lastEventId: metadata?.eventId ?? order.payment?.lastEventId,
    failureCode: result.status === "failed" ? "PAYMENT_FAILED" : void 0,
    failureMessage: result.status === "failed" ? result.message : void 0,
    succeededAt: result.status === "succeeded" ? /* @__PURE__ */ new Date() : order.payment?.succeededAt,
    updatedAt: /* @__PURE__ */ new Date()
  };
  if (result.status === "succeeded" && order.status === "open") {
    order.status = "paid";
  }
  if (result.status === "refunded" && ["paid", "shipped", "completed"].includes(order.status)) {
    order.status = "refunded";
  }
}
function getPaymentProviderAvailability() {
  return listPaymentProviders();
}
async function initiateOrderPayment(orderId, payload, idempotencyKey) {
  ensureValidObjectId5(orderId);
  if (!idempotencyKey || idempotencyKey.length < 8) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Idempotency-Key header is required");
  }
  const requestHash = buildInitiationRequestHash(orderId, payload);
  const previousRequest = await PaymentIdempotencyModel.findOne({ key: idempotencyKey }).lean().exec();
  if (previousRequest) {
    if (previousRequest.requestHash !== requestHash || previousRequest.orderId.toString() !== orderId || previousRequest.provider !== payload.provider) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Idempotency-Key already used for a different request");
    }
    return previousRequest.responsePayload;
  }
  const order = await EcommerceOrderModel.findById(orderId).exec();
  if (!order) {
    throw new AppError(404, ERROR_CODES.NOT_FOUND, "Order not found");
  }
  if (order.status !== "open") {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Only open orders can initiate payment");
  }
  const initiatedSession = await initiateProviderPayment(order, payload, idempotencyKey);
  order.payment = {
    provider: payload.provider,
    status: initiatedSession.mode === "redirect_url" ? "pending_capture" : "initiated",
    amountMinor: order.grandTotalMinor,
    currency: order.currency,
    providerOrderId: initiatedSession.providerOrderId,
    providerPaymentId: initiatedSession.providerPaymentId,
    idempotencyKey,
    updatedAt: /* @__PURE__ */ new Date()
  };
  await order.save();
  await PaymentIdempotencyModel.create({
    key: idempotencyKey,
    provider: payload.provider,
    orderId: order._id,
    requestHash,
    responsePayload: initiatedSession
  });
  return initiatedSession;
}
async function confirmOrderPayment(orderId, payload) {
  ensureValidObjectId5(orderId);
  const order = await EcommerceOrderModel.findById(orderId).exec();
  if (!order) {
    throw new AppError(404, ERROR_CODES.NOT_FOUND, "Order not found");
  }
  const result = await confirmProviderPayment(order, payload);
  applyPaymentResultToOrder(order, result);
  await order.save();
  return {
    result,
    order
  };
}
async function saveWebhookEventIfNew(provider, eventId, payloadHash) {
  try {
    await PaymentWebhookEventModel.create({
      provider,
      eventId,
      payloadHash,
      processedAt: /* @__PURE__ */ new Date()
    });
    return true;
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11e3) {
      return false;
    }
    throw error;
  }
}
async function processPaymentWebhook(provider, rawBody, headers) {
  const normalizedEvent = await verifyAndNormalizeWebhook(provider, rawBody, headers);
  const payloadHash = hashRawPayload(rawBody);
  const shouldProcess = await saveWebhookEventIfNew(provider, normalizedEvent.eventId, payloadHash);
  if (!shouldProcess) {
    return {
      processed: false,
      eventId: normalizedEvent.eventId
    };
  }
  if (normalizedEvent.status === "ignored") {
    return {
      processed: true,
      eventId: normalizedEvent.eventId
    };
  }
  let order = normalizedEvent.orderId && import_mongoose13.default.Types.ObjectId.isValid(normalizedEvent.orderId) ? await EcommerceOrderModel.findById(normalizedEvent.orderId).exec() : null;
  if (!order && normalizedEvent.providerOrderId) {
    order = await EcommerceOrderModel.findOne({ "payment.providerOrderId": normalizedEvent.providerOrderId }).exec();
  }
  if (!order && normalizedEvent.providerPaymentId) {
    order = await EcommerceOrderModel.findOne({
      "payment.providerPaymentId": normalizedEvent.providerPaymentId
    }).exec();
  }
  if (!order) {
    return {
      processed: true,
      eventId: normalizedEvent.eventId
    };
  }
  if (normalizedEvent.status === "succeeded") {
    if (order.status !== "open" && !(order.status === "paid" && order.payment?.status === "succeeded")) {
      return {
        processed: true,
        eventId: normalizedEvent.eventId
      };
    }
    await validateProviderPaymentForOrder(order, {
      provider,
      providerOrderId: normalizedEvent.providerOrderId,
      providerPaymentId: normalizedEvent.providerPaymentId
    });
    applyPaymentResultToOrder(
      order,
      {
        provider,
        status: "succeeded",
        providerOrderId: normalizedEvent.providerOrderId,
        providerPaymentId: normalizedEvent.providerPaymentId
      },
      { eventId: normalizedEvent.eventId }
    );
  } else if (normalizedEvent.status === "failed") {
    if (order.status !== "open" || order.payment?.status === "succeeded" || order.payment?.status === "refunded") {
      return {
        processed: true,
        eventId: normalizedEvent.eventId
      };
    }
    applyPaymentResultToOrder(
      order,
      {
        provider,
        status: "failed",
        providerOrderId: normalizedEvent.providerOrderId,
        providerPaymentId: normalizedEvent.providerPaymentId,
        message: normalizedEvent.message
      },
      { eventId: normalizedEvent.eventId }
    );
  } else if (normalizedEvent.status === "refunded") {
    if (!["paid", "shipped", "completed", "refunded"].includes(order.status)) {
      return {
        processed: true,
        eventId: normalizedEvent.eventId
      };
    }
    applyPaymentResultToOrder(
      order,
      {
        provider,
        status: "refunded",
        providerOrderId: normalizedEvent.providerOrderId,
        providerPaymentId: normalizedEvent.providerPaymentId
      },
      { eventId: normalizedEvent.eventId }
    );
  }
  await order.save();
  return {
    processed: true,
    eventId: normalizedEvent.eventId
  };
}

// src/modules/ecommerce/ecommerce.payment.routes.ts
var paymentRoutes = (0, import_express5.Router)();
var paymentWebhookRoutes = (0, import_express5.Router)();
var paymentWebhookRateLimiter = (0, import_express_rate_limit5.default)({
  windowMs: 60 * 1e3,
  max: 180,
  standardHeaders: true,
  legacyHeaders: false
});
var initiateSchema = import_zod6.z.object({
  provider: import_zod6.z.enum(PAYMENT_PROVIDER_KEYS),
  successUrl: import_zod6.z.string().url().optional(),
  cancelUrl: import_zod6.z.string().url().optional()
});
var confirmSchema = import_zod6.z.discriminatedUnion("provider", [
  import_zod6.z.object({
    provider: import_zod6.z.literal("stripe"),
    providerPaymentId: import_zod6.z.string().min(1).max(256).optional(),
    checkoutSessionId: import_zod6.z.string().min(1).max(256).optional()
  }),
  import_zod6.z.object({
    provider: import_zod6.z.literal("paypal"),
    providerOrderId: import_zod6.z.string().min(1).max(256)
  }),
  import_zod6.z.object({
    provider: import_zod6.z.literal("razorpay"),
    razorpayOrderId: import_zod6.z.string().min(1).max(256),
    razorpayPaymentId: import_zod6.z.string().min(1).max(256),
    razorpaySignature: import_zod6.z.string().min(1).max(512)
  })
]);
var providerParamSchema = import_zod6.z.object({
  provider: import_zod6.z.enum(PAYMENT_PROVIDER_KEYS)
});
paymentRoutes.get(
  "/api/v1/ecommerce/payments/providers",
  ...moduleGuards("ecommerce", "ecommerce.read"),
  (_req, res) => {
    res.json({
      providers: getPaymentProviderAvailability()
    });
  }
);
paymentRoutes.post(
  "/api/v1/ecommerce/orders/:id/payments/initiate",
  ...moduleGuards("ecommerce", "ecommerce.update"),
  async (req, res, next) => {
    try {
      const payload = initiateSchema.parse(req.body ?? {});
      const idempotencyKey = req.header("Idempotency-Key");
      if (!idempotencyKey) {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Idempotency-Key header is required");
      }
      const session = await initiateOrderPayment(req.params.id, payload, idempotencyKey);
      res.json(session);
    } catch (error) {
      if (error instanceof import_zod6.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid payment initiate payload"));
        return;
      }
      next(error);
    }
  }
);
paymentRoutes.post(
  "/api/v1/ecommerce/orders/:id/payments/confirm",
  ...moduleGuards("ecommerce", "ecommerce.update"),
  async (req, res, next) => {
    try {
      const payload = confirmSchema.parse(req.body ?? {});
      const data = await confirmOrderPayment(req.params.id, payload);
      res.json(data);
    } catch (error) {
      if (error instanceof import_zod6.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid payment confirm payload"));
        return;
      }
      next(error);
    }
  }
);
paymentWebhookRoutes.post(
  "/api/v1/payments/webhooks/:provider",
  paymentWebhookRateLimiter,
  import_express5.default.raw({ type: "application/json", limit: "1mb" }),
  async (req, res, next) => {
    try {
      const parsedParams = providerParamSchema.parse(req.params);
      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(typeof req.body === "string" ? req.body : "");
      const result = await processPaymentWebhook(parsedParams.provider, rawBody, req.headers);
      res.status(200).json({
        received: true,
        processed: result.processed,
        eventId: result.eventId
      });
    } catch (error) {
      if (error instanceof import_zod6.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid payment webhook provider"));
        return;
      }
      next(error);
    }
  }
);

// src/modules/ecommerce/ecommerce.routes.ts
var import_express6 = require("express");
var import_mongoose14 = __toESM(require("mongoose"), 1);
var import_express_rate_limit6 = __toESM(require("express-rate-limit"), 1);
var import_zod7 = require("zod");
var router5 = (0, import_express6.Router)();
var ecommerceWriteRateLimiter = (0, import_express_rate_limit6.default)({
  windowMs: 60 * 1e3,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});
var productPayloadSchema = import_zod7.z.object({
  title: import_zod7.z.string().min(1).max(200),
  sku: import_zod7.z.string().min(1).max(80),
  description: import_zod7.z.string().max(4e3).optional(),
  priceMinor: import_zod7.z.number().int().min(0),
  currency: import_zod7.z.string().min(3).max(3).default("USD"),
  stock: import_zod7.z.number().int().min(0).default(0),
  status: import_zod7.z.enum(["draft", "active", "archived"]).default("draft")
});
var orderPayloadSchema = import_zod7.z.object({
  customerName: import_zod7.z.string().min(1),
  customerEmail: import_zod7.z.string().email(),
  currency: import_zod7.z.string().min(3).max(3).default("USD"),
  items: import_zod7.z.array(
    import_zod7.z.object({
      productId: import_zod7.z.string().min(1),
      qty: import_zod7.z.number().int().min(1)
    })
  ).min(1).max(100),
  taxMinor: import_zod7.z.number().int().min(0).default(0),
  shippingMinor: import_zod7.z.number().int().min(0).default(0)
});
var transitionPayloadSchema = import_zod7.z.object({
  to: import_zod7.z.enum(["open", "paid", "shipped", "completed", "cancelled", "refunded"])
});
function ensureValidObjectId6(id) {
  if (!import_mongoose14.default.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid id");
  }
}
function assertAllowedTransition(from, to) {
  const allowedTransitions = {
    open: ["paid", "cancelled"],
    paid: ["shipped", "refunded", "cancelled"],
    shipped: ["completed", "refunded"],
    completed: [],
    cancelled: [],
    refunded: []
  };
  const allowed = allowedTransitions[from] ?? [];
  if (!allowed.includes(to)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, `Invalid transition ${from} -> ${to}`);
  }
}
router5.get("/api/v1/ecommerce/products", ...moduleGuards("ecommerce", "ecommerce.read"), async (_req, res, next) => {
  try {
    const products = await EcommerceProductModel.find().sort({ createdAt: -1 }).lean().exec();
    res.json({ items: products });
  } catch (error) {
    next(error);
  }
});
router5.post("/api/v1/ecommerce/products", ecommerceWriteRateLimiter, ...moduleGuards("ecommerce", "ecommerce.create"), async (req, res, next) => {
  try {
    const payload = productPayloadSchema.parse(req.body ?? {});
    const created = await EcommerceProductModel.create(payload);
    res.status(201).json(created);
  } catch (error) {
    if (error instanceof import_zod7.z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid product payload"));
      return;
    }
    next(error);
  }
});
router5.patch(
  "/api/v1/ecommerce/products/:id",
  ecommerceWriteRateLimiter,
  ...moduleGuards("ecommerce", "ecommerce.update"),
  async (req, res, next) => {
    try {
      ensureValidObjectId6(req.params.id);
      const payload = productPayloadSchema.partial().parse(req.body ?? {});
      const updated = await EcommerceProductModel.findByIdAndUpdate(req.params.id, payload, {
        new: true,
        runValidators: true
      }).lean().exec();
      if (!updated) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Product not found");
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof import_zod7.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid product update payload"));
        return;
      }
      next(error);
    }
  }
);
router5.delete(
  "/api/v1/ecommerce/products/:id",
  ecommerceWriteRateLimiter,
  ...moduleGuards("ecommerce", "ecommerce.delete"),
  async (req, res, next) => {
    try {
      ensureValidObjectId6(req.params.id);
      const deleted = await EcommerceProductModel.findByIdAndDelete(req.params.id).lean().exec();
      if (!deleted) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Product not found");
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);
router5.get("/api/v1/ecommerce/orders", ...moduleGuards("ecommerce", "ecommerce.read"), async (_req, res, next) => {
  try {
    const orders = await EcommerceOrderModel.find().sort({ createdAt: -1 }).lean().exec();
    res.json({ items: orders });
  } catch (error) {
    next(error);
  }
});
router5.post("/api/v1/ecommerce/orders", ecommerceWriteRateLimiter, ...moduleGuards("ecommerce", "ecommerce.create"), async (req, res, next) => {
  const session = await import_mongoose14.default.startSession();
  try {
    const payload = orderPayloadSchema.parse(req.body ?? {});
    let createdOrder = null;
    await session.withTransaction(async () => {
      const lineItems = [];
      let subtotalMinor = 0;
      for (const item of payload.items) {
        ensureValidObjectId6(item.productId);
        const decrementedProduct = await EcommerceProductModel.findOneAndUpdate(
          { _id: item.productId, stock: { $gte: item.qty } },
          { $inc: { stock: -item.qty } },
          { new: true, session }
        ).exec();
        if (!decrementedProduct) {
          throw new AppError(
            400,
            ERROR_CODES.BAD_REQUEST,
            "Insufficient stock or missing product while creating order"
          );
        }
        const lineTotalMinor = decrementedProduct.priceMinor * item.qty;
        subtotalMinor += lineTotalMinor;
        lineItems.push({
          productId: decrementedProduct._id,
          title: decrementedProduct.title,
          sku: decrementedProduct.sku,
          qty: item.qty,
          unitPriceMinor: decrementedProduct.priceMinor,
          lineTotalMinor
        });
      }
      const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
      const created = await EcommerceOrderModel.create(
        [
          {
            orderNumber,
            customerName: payload.customerName,
            customerEmail: payload.customerEmail,
            status: "open",
            currency: payload.currency,
            lineItems,
            subtotalMinor,
            taxMinor: payload.taxMinor,
            shippingMinor: payload.shippingMinor,
            grandTotalMinor: subtotalMinor + payload.taxMinor + payload.shippingMinor,
            stockReverted: false,
            payment: {
              status: "none",
              amountMinor: subtotalMinor + payload.taxMinor + payload.shippingMinor,
              currency: payload.currency,
              updatedAt: /* @__PURE__ */ new Date()
            }
          }
        ],
        { session }
      );
      [createdOrder] = created;
    });
    res.status(201).json(createdOrder);
  } catch (error) {
    if (error instanceof import_zod7.z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid order payload"));
      return;
    }
    next(error);
  } finally {
    await session.endSession();
  }
});
router5.post(
  "/api/v1/ecommerce/orders/:id/transition",
  ecommerceWriteRateLimiter,
  ...moduleGuards("ecommerce", "ecommerce.update"),
  async (req, res, next) => {
    const session = await import_mongoose14.default.startSession();
    try {
      ensureValidObjectId6(req.params.id);
      const { to } = transitionPayloadSchema.parse(req.body ?? {});
      let updatedOrder = null;
      await session.withTransaction(async () => {
        const order = await EcommerceOrderModel.findById(req.params.id).session(session).exec();
        if (!order) {
          throw new AppError(404, ERROR_CODES.NOT_FOUND, "Order not found");
        }
        assertAllowedTransition(order.status, to);
        if ((to === "cancelled" || to === "refunded") && !order.stockReverted) {
          for (const lineItem of order.lineItems) {
            const stockRestoreResult = await EcommerceProductModel.updateOne(
              { _id: lineItem.productId },
              { $inc: { stock: lineItem.qty } },
              { session }
            ).exec();
            if (stockRestoreResult.matchedCount !== 1) {
              throw new AppError(
                404,
                ERROR_CODES.NOT_FOUND,
                "Could not restore stock because linked product was not found"
              );
            }
          }
          order.stockReverted = true;
        }
        order.status = to;
        await order.save({ session });
        updatedOrder = order.toObject();
      });
      res.json(updatedOrder);
    } catch (error) {
      if (error instanceof import_zod7.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid transition payload"));
        return;
      }
      next(error);
    } finally {
      await session.endSession();
    }
  }
);
router5.get("/api/v1/ecommerce/insights", ...moduleGuards("ecommerce", "ecommerce.read"), async (_req, res, next) => {
  try {
    const [productCount, orderCount, paidOrders] = await Promise.all([
      EcommerceProductModel.countDocuments().exec(),
      EcommerceOrderModel.countDocuments().exec(),
      EcommerceOrderModel.countDocuments({ status: "paid" }).exec()
    ]);
    res.json({
      counts: {
        products: productCount,
        orders: orderCount,
        paidOrders
      }
    });
  } catch (error) {
    next(error);
  }
});
var ecommerceRoutes = router5;

// src/modules/file-manager/file-manager.routes.ts
var import_node_fs3 = __toESM(require("node:fs"), 1);
var import_node_path3 = __toESM(require("node:path"), 1);
var import_node_util = require("node:util");
var import_express_rate_limit7 = __toESM(require("express-rate-limit"), 1);
var import_express7 = require("express");
var import_mongoose16 = __toESM(require("mongoose"), 1);
var import_multer = __toESM(require("multer"), 1);
var import_zod8 = require("zod");

// src/modules/file-manager/file-manager.models.ts
var import_mongoose15 = __toESM(require("mongoose"), 1);
var fileManagerEntrySchema = new import_mongoose15.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    kind: { type: String, enum: ["folder", "file"], required: true, index: true },
    parentId: { type: import_mongoose15.Schema.Types.ObjectId, ref: "FileManagerEntry", default: null, index: true },
    sizeBytes: { type: Number, min: 0 },
    mimeType: { type: String, trim: true, maxlength: 180 },
    extension: { type: String, trim: true, maxlength: 24 },
    storagePath: { type: String },
    scanStatus: { type: String, enum: ["pending", "clean", "infected", "skipped"], default: "skipped" },
    status: { type: String, enum: ["active", "trashed"], default: "active", index: true },
    tags: { type: [String], default: [] },
    isStarred: { type: Boolean, default: false, index: true },
    createdByUserId: { type: String, required: true },
    updatedByUserId: { type: String, required: true },
    trashedAt: { type: Date }
  },
  { timestamps: true }
);
fileManagerEntrySchema.index(
  { parentId: 1, name: 1, kind: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "active" }
  }
);
fileManagerEntrySchema.index({ parentId: 1, status: 1, kind: 1, createdAt: -1 });
var FileManagerEntryModel = import_mongoose15.default.models.FileManagerEntry ?? import_mongoose15.default.model("FileManagerEntry", fileManagerEntrySchema);

// src/modules/file-manager/storage-adapter.ts
var import_node_fs2 = __toESM(require("node:fs"), 1);
var import_node_path2 = __toESM(require("node:path"), 1);
var import_node_crypto2 = __toESM(require("node:crypto"), 1);
var UPLOAD_DIR = import_node_path2.default.resolve(env.FILE_UPLOAD_DIR ?? "uploads");
function ensureDir(dir) {
  if (!import_node_fs2.default.existsSync(dir)) {
    import_node_fs2.default.mkdirSync(dir, { recursive: true });
  }
}
var LocalStorageAdapter = class {
  async store(key, localFilePath) {
    const dest = import_node_path2.default.join(UPLOAD_DIR, key);
    ensureDir(import_node_path2.default.dirname(dest));
    import_node_fs2.default.renameSync(localFilePath, dest);
    return key;
  }
  async retrieve(key) {
    const absPath = import_node_path2.default.join(UPLOAD_DIR, key);
    if (!import_node_fs2.default.existsSync(absPath)) {
      throw new Error(`File not found on disk: ${key}`);
    }
    return import_node_fs2.default.createReadStream(absPath);
  }
  async delete(key) {
    const absPath = import_node_path2.default.join(UPLOAD_DIR, key);
    if (import_node_fs2.default.existsSync(absPath)) {
      import_node_fs2.default.unlinkSync(absPath);
    }
  }
  async getDownloadUrl(_key, _filename) {
    return null;
  }
};
var S3StorageAdapter = class {
  bucket;
  clientPromise;
  constructor() {
    this.bucket = env.S3_BUCKET ?? "";
    if (!this.bucket) {
      throw new Error("S3_BUCKET is required when STORAGE_BACKEND=s3");
    }
    this.clientPromise = this.createClient();
  }
  async createClient() {
    const { S3Client } = await import("@aws-sdk/client-s3");
    const config2 = {
      region: env.S3_REGION ?? "us-east-1"
    };
    if (env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY) {
      config2.credentials = {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY
      };
    }
    if (env.S3_ENDPOINT) {
      config2.endpoint = env.S3_ENDPOINT;
      config2.forcePathStyle = true;
    }
    return new S3Client(config2);
  }
  async store(key, localFilePath) {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await this.clientPromise;
    const body = import_node_fs2.default.createReadStream(localFilePath);
    await client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body })
    );
    if (import_node_fs2.default.existsSync(localFilePath)) {
      import_node_fs2.default.unlinkSync(localFilePath);
    }
    logger.info("S3 upload complete", { bucket: this.bucket, key });
    return key;
  }
  async retrieve(key) {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await this.clientPromise;
    const response = await client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key })
    );
    if (!response.Body) {
      throw new Error(`S3 object not found: ${key}`);
    }
    return response.Body;
  }
  async delete(key) {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await this.clientPromise;
    await client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key })
    );
  }
  async getDownloadUrl(key, filename) {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    const client = await this.clientPromise;
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${encodeURIComponent(filename)}"`
    });
    return getSignedUrl(client, command, { expiresIn: 3600 });
  }
};
function generateStorageKey(userId, originalName) {
  const datePart = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10).replace(/-/g, "");
  const hash = import_node_crypto2.default.randomBytes(8).toString("hex");
  const ext = import_node_path2.default.extname(originalName);
  return `${userId}/${datePart}_${hash}${ext}`;
}
var _adapter;
function getStorageAdapter() {
  if (_adapter) return _adapter;
  const backend = env.STORAGE_BACKEND ?? "local";
  if (backend === "s3") {
    _adapter = new S3StorageAdapter();
    logger.info("Storage backend: S3", { bucket: env.S3_BUCKET });
  } else {
    _adapter = new LocalStorageAdapter();
    logger.info("Storage backend: local", { dir: UPLOAD_DIR });
  }
  return _adapter;
}

// src/modules/file-manager/virus-scan.hook.ts
async function scanFile(filePath) {
  logger.info("Virus scan hook invoked (placeholder \u2014 no scanner configured)", {
    filePath
  });
  return "skipped";
}

// src/modules/file-manager/quota.service.ts
var DEFAULT_QUOTA_BYTES = 500 * 1024 * 1024;
async function getUserStorageUsed(userId) {
  const result = await FileManagerEntryModel.aggregate([
    { $match: { createdByUserId: userId, kind: "file", status: "active" } },
    { $group: { _id: null, total: { $sum: "$sizeBytes" } } }
  ]).exec();
  return result[0]?.total ?? 0;
}
async function checkQuota(userId, additionalBytes) {
  const usedBytes = await getUserStorageUsed(userId);
  const quotaBytes = DEFAULT_QUOTA_BYTES;
  const allowed = usedBytes + additionalBytes <= quotaBytes;
  return { allowed, usedBytes, quotaBytes };
}

// src/modules/file-manager/file-manager.routes.ts
var router6 = (0, import_express7.Router)();
var entryNameSchema = import_zod8.z.string().min(1).max(200).refine((value) => !/[\\/\u0000-\u001f]/.test(value), "Invalid entry name characters");
var listEntriesQuerySchema = import_zod8.z.object({
  parentId: import_zod8.z.string().optional(),
  status: import_zod8.z.enum(["active", "trashed", "all"]).default("active"),
  kind: import_zod8.z.enum(["file", "folder", "all"]).default("all"),
  q: import_zod8.z.string().max(200).optional(),
  page: import_zod8.z.coerce.number().int().min(1).default(1),
  limit: import_zod8.z.coerce.number().int().min(1).max(100).default(25)
});
var createFolderSchema = import_zod8.z.object({
  name: entryNameSchema,
  parentId: import_zod8.z.string().nullable().optional()
});
var createFileSchema = import_zod8.z.object({
  name: entryNameSchema,
  parentId: import_zod8.z.string().nullable().optional(),
  sizeBytes: import_zod8.z.number().int().min(0).max(1024 * 1024 * 1024),
  mimeType: import_zod8.z.string().max(180).optional(),
  tags: import_zod8.z.array(import_zod8.z.string().min(1).max(40)).max(25).default([])
});
var updateEntrySchema = import_zod8.z.object({
  name: entryNameSchema.optional(),
  tags: import_zod8.z.array(import_zod8.z.string().min(1).max(40)).max(25).optional(),
  isStarred: import_zod8.z.boolean().optional(),
  mimeType: import_zod8.z.string().max(180).optional()
}).refine((value) => Object.keys(value).length > 0, {
  message: "At least one field is required"
});
var moveEntrySchema = import_zod8.z.object({
  targetParentId: import_zod8.z.string().nullable().optional()
});
var transitionEntrySchema = import_zod8.z.object({
  to: import_zod8.z.enum(["active", "trashed"])
});
var fileManagerWriteRateLimiter = (0, import_express_rate_limit7.default)({
  windowMs: 60 * 1e3,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});
function isStrictObjectId(value) {
  return /^[a-f\d]{24}$/i.test(value);
}
function parseNullableObjectId(value, fieldLabel) {
  if (value === void 0 || value === null || value === "" || value === "null") {
    return null;
  }
  if (!isStrictObjectId(value)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, `Invalid ${fieldLabel}`);
  }
  return new import_mongoose16.default.Types.ObjectId(value);
}
function extractExtension(name) {
  const dotIndex = name.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === name.length - 1) {
    return void 0;
  }
  return name.slice(dotIndex + 1).toLowerCase();
}
var ALLOWED_MIME_TYPES = /* @__PURE__ */ new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/x-zip-compressed",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg"
]);
var MAGIC_SIGNATURES = [
  { mime: "image/jpeg", offset: 0, bytes: [255, 216, 255] },
  { mime: "image/png", offset: 0, bytes: [137, 80, 78, 71] },
  { mime: "image/gif", offset: 0, bytes: [71, 73, 70, 56] },
  { mime: "image/webp", offset: 8, bytes: [87, 69, 66, 80] },
  { mime: "application/pdf", offset: 0, bytes: [37, 80, 68, 70] },
  { mime: "application/zip", offset: 0, bytes: [80, 75, 3, 4] },
  { mime: "video/mp4", offset: 4, bytes: [102, 116, 121, 112] },
  { mime: "audio/mpeg", offset: 0, bytes: [255, 251] },
  { mime: "audio/wav", offset: 0, bytes: [82, 73, 70, 70] },
  { mime: "audio/ogg", offset: 0, bytes: [79, 103, 103, 83] }
];
var MAGIC_BUFFER_SIZE = 16;
var fsOpen = (0, import_node_util.promisify)(import_node_fs3.default.open);
var fsRead = (0, import_node_util.promisify)(import_node_fs3.default.read);
var fsClose = (0, import_node_util.promisify)(import_node_fs3.default.close);
async function detectMimeFromFile(filePath) {
  let fd;
  try {
    fd = await fsOpen(filePath, "r");
    const buf = Buffer.alloc(MAGIC_BUFFER_SIZE);
    await fsRead(fd, buf, 0, MAGIC_BUFFER_SIZE, 0);
    for (const sig of MAGIC_SIGNATURES) {
      const slice = buf.slice(sig.offset, sig.offset + sig.bytes.length);
      if (slice.length === sig.bytes.length && sig.bytes.every((b, i) => slice[i] === b)) {
        return sig.mime;
      }
    }
    return null;
  } finally {
    if (fd !== void 0) await fsClose(fd);
  }
}
var MIME_ALIAS = {
  "application/zip": ["application/x-zip-compressed"],
  "video/mp4": ["video/webm"]
};
function mimeMatchesDetected(declared, detected) {
  if (detected === null) return true;
  if (declared === detected) return true;
  return (MIME_ALIAS[detected] ?? []).includes(declared);
}
var upload = (0, import_multer.default)({
  dest: import_node_path3.default.resolve(env.FILE_UPLOAD_DIR ?? "uploads", "_tmp"),
  limits: { fileSize: env.FILE_UPLOAD_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(400, ERROR_CODES.BAD_REQUEST, `File type '${file.mimetype}' is not allowed`));
    }
  }
});
function toFileManagerEntry(document) {
  return {
    _id: String(document._id),
    name: document.name,
    kind: document.kind,
    parentId: document.parentId ? String(document.parentId) : null,
    sizeBytes: typeof document.sizeBytes === "number" ? document.sizeBytes : void 0,
    mimeType: document.mimeType ?? void 0,
    extension: document.extension ?? void 0,
    storagePath: document.storagePath ?? void 0,
    scanStatus: document.scanStatus ?? void 0,
    status: document.status,
    tags: Array.isArray(document.tags) ? document.tags : [],
    isStarred: Boolean(document.isStarred),
    createdByUserId: document.createdByUserId,
    updatedByUserId: document.updatedByUserId,
    trashedAt: document.trashedAt?.toISOString?.() ?? void 0,
    createdAt: document.createdAt?.toISOString?.() ?? void 0,
    updatedAt: document.updatedAt?.toISOString?.() ?? void 0
  };
}
async function ensureParentFolderExists(parentId) {
  if (!parentId) {
    return;
  }
  const parent = await FileManagerEntryModel.findById(parentId).select({ kind: 1, status: 1 }).lean().exec();
  if (!parent || parent.kind !== "folder" || parent.status !== "active") {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Parent folder not found");
  }
}
async function ensureMoveDoesNotCreateCycle(entryId, targetParentId) {
  if (!targetParentId) {
    return;
  }
  if (String(targetParentId) === entryId) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Entry cannot be moved into itself");
  }
  let currentParentId = targetParentId;
  for (let depth = 0; depth < 120; depth += 1) {
    if (!currentParentId) {
      return;
    }
    const currentId = String(currentParentId);
    if (currentId === entryId) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid move target");
    }
    const parent = await FileManagerEntryModel.findById(currentParentId).select({ parentId: 1 }).lean().exec();
    if (!parent) {
      return;
    }
    currentParentId = parent.parentId ?? null;
  }
  throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Move validation exceeded maximum depth");
}
router6.get(
  "/api/v1/file-manager/entries",
  ...moduleGuards("file-manager", "file-manager.read"),
  async (req, res, next) => {
    try {
      const query = listEntriesQuerySchema.parse(req.query ?? {});
      const parentId = parseNullableObjectId(query.parentId, "parentId");
      const skip = (query.page - 1) * query.limit;
      const filter = {
        parentId
      };
      if (query.status !== "all") {
        filter.status = query.status;
      }
      if (query.kind !== "all") {
        filter.kind = query.kind;
      }
      if (query.q && query.q.trim()) {
        filter.name = {
          $regex: query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          $options: "i"
        };
      }
      const [items, total] = await Promise.all([
        FileManagerEntryModel.find(filter).sort({ kind: 1, name: 1, createdAt: -1 }).skip(skip).limit(query.limit).lean().exec(),
        FileManagerEntryModel.countDocuments(filter).exec()
      ]);
      res.json({
        items: items.map(toFileManagerEntry),
        page: query.page,
        limit: query.limit,
        total
      });
    } catch (error) {
      if (error instanceof import_zod8.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid file manager list query"));
        return;
      }
      next(error);
    }
  }
);
router6.post(
  "/api/v1/file-manager/folders",
  fileManagerWriteRateLimiter,
  ...moduleGuards("file-manager", "file-manager.create"),
  async (req, res, next) => {
    try {
      const payload = createFolderSchema.parse(req.body ?? {});
      const parentId = parseNullableObjectId(payload.parentId, "parentId");
      await ensureParentFolderExists(parentId);
      const created = await FileManagerEntryModel.create({
        name: payload.name.trim(),
        kind: "folder",
        parentId,
        status: "active",
        tags: [],
        isStarred: false,
        createdByUserId: req.user.id,
        updatedByUserId: req.user.id
      });
      res.status(201).json(toFileManagerEntry(created.toObject()));
    } catch (error) {
      if (error instanceof import_zod8.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid create folder payload"));
        return;
      }
      if (error?.code === 11e3) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "An active folder with this name already exists"));
        return;
      }
      next(error);
    }
  }
);
router6.post(
  "/api/v1/file-manager/files",
  fileManagerWriteRateLimiter,
  ...moduleGuards("file-manager", "file-manager.create"),
  async (req, res, next) => {
    try {
      const payload = createFileSchema.parse(req.body ?? {});
      const parentId = parseNullableObjectId(payload.parentId, "parentId");
      await ensureParentFolderExists(parentId);
      const created = await FileManagerEntryModel.create({
        name: payload.name.trim(),
        kind: "file",
        parentId,
        sizeBytes: payload.sizeBytes,
        mimeType: payload.mimeType?.trim() || void 0,
        extension: extractExtension(payload.name.trim()),
        status: "active",
        tags: Array.from(new Set(payload.tags.map((item) => item.trim()).filter((item) => item.length > 0))),
        isStarred: false,
        createdByUserId: req.user.id,
        updatedByUserId: req.user.id
      });
      res.status(201).json(toFileManagerEntry(created.toObject()));
    } catch (error) {
      if (error instanceof import_zod8.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid create file payload"));
        return;
      }
      if (error?.code === 11e3) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "An active file with this name already exists"));
        return;
      }
      next(error);
    }
  }
);
router6.patch(
  "/api/v1/file-manager/entries/:id",
  fileManagerWriteRateLimiter,
  ...moduleGuards("file-manager", "file-manager.update"),
  async (req, res, next) => {
    try {
      if (!isStrictObjectId(req.params.id)) {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid entry id");
      }
      const payload = updateEntrySchema.parse(req.body ?? {});
      const existing = await FileManagerEntryModel.findById(req.params.id).exec();
      if (!existing) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "File manager entry not found");
      }
      if (existing.status === "trashed") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Trashed entries cannot be updated");
      }
      if (payload.name !== void 0) {
        existing.name = payload.name.trim();
        if (existing.kind === "file") {
          existing.extension = extractExtension(existing.name);
        }
      }
      if (payload.tags !== void 0) {
        existing.tags = Array.from(new Set(payload.tags.map((item) => item.trim()).filter((item) => item.length > 0)));
      }
      if (payload.isStarred !== void 0) {
        existing.isStarred = payload.isStarred;
      }
      if (payload.mimeType !== void 0 && existing.kind === "file") {
        existing.mimeType = payload.mimeType.trim() || void 0;
      }
      existing.updatedByUserId = req.user.id;
      await existing.save();
      res.json(toFileManagerEntry(existing.toObject()));
    } catch (error) {
      if (error instanceof import_zod8.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid file manager update payload"));
        return;
      }
      if (error?.code === 11e3) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "An active entry with this name already exists"));
        return;
      }
      next(error);
    }
  }
);
router6.post(
  "/api/v1/file-manager/entries/:id/move",
  fileManagerWriteRateLimiter,
  ...moduleGuards("file-manager", "file-manager.update"),
  async (req, res, next) => {
    try {
      if (!isStrictObjectId(req.params.id)) {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid entry id");
      }
      const payload = moveEntrySchema.parse(req.body ?? {});
      const targetParentId = parseNullableObjectId(payload.targetParentId, "targetParentId");
      const entry = await FileManagerEntryModel.findById(req.params.id).exec();
      if (!entry) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "File manager entry not found");
      }
      if (entry.status === "trashed") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Trashed entries cannot be moved");
      }
      await ensureParentFolderExists(targetParentId);
      if (entry.kind === "folder") {
        await ensureMoveDoesNotCreateCycle(String(entry._id), targetParentId);
      }
      entry.parentId = targetParentId;
      entry.updatedByUserId = req.user.id;
      await entry.save();
      res.json(toFileManagerEntry(entry.toObject()));
    } catch (error) {
      if (error instanceof import_zod8.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid move payload"));
        return;
      }
      next(error);
    }
  }
);
router6.post(
  "/api/v1/file-manager/entries/:id/transition",
  fileManagerWriteRateLimiter,
  ...moduleGuards("file-manager", "file-manager.update"),
  async (req, res, next) => {
    try {
      if (!isStrictObjectId(req.params.id)) {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid entry id");
      }
      const payload = transitionEntrySchema.parse(req.body ?? {});
      const entry = await FileManagerEntryModel.findById(req.params.id).exec();
      if (!entry) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "File manager entry not found");
      }
      if (entry.status === payload.to) {
        res.json(toFileManagerEntry(entry.toObject()));
        return;
      }
      if (payload.to === "active" && entry.parentId) {
        const parent = await FileManagerEntryModel.findById(entry.parentId).select({ kind: 1, status: 1 }).lean().exec();
        if (!parent || parent.kind !== "folder" || parent.status !== "active") {
          throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Cannot restore entry to an inactive parent folder");
        }
      }
      entry.status = payload.to;
      entry.trashedAt = payload.to === "trashed" ? /* @__PURE__ */ new Date() : void 0;
      entry.updatedByUserId = req.user.id;
      await entry.save();
      res.json(toFileManagerEntry(entry.toObject()));
    } catch (error) {
      if (error instanceof import_zod8.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid transition payload"));
        return;
      }
      next(error);
    }
  }
);
router6.delete(
  "/api/v1/file-manager/entries/:id",
  fileManagerWriteRateLimiter,
  ...moduleGuards("file-manager", "file-manager.delete"),
  async (req, res, next) => {
    try {
      if (!isStrictObjectId(req.params.id)) {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid entry id");
      }
      const entry = await FileManagerEntryModel.findById(req.params.id).exec();
      if (!entry) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "File manager entry not found");
      }
      if (entry.status !== "trashed") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Only trashed entries can be deleted permanently");
      }
      if (entry.kind === "folder") {
        const childCount = await FileManagerEntryModel.countDocuments({ parentId: entry._id }).exec();
        if (childCount > 0) {
          throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Folder must be empty before permanent deletion");
        }
      }
      await FileManagerEntryModel.deleteOne({ _id: entry._id }).exec();
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);
router6.get(
  "/api/v1/file-manager/insights",
  ...moduleGuards("file-manager", "file-manager.read"),
  async (_req, res, next) => {
    try {
      const [totalFiles, totalFolders, trashedEntries, starredEntries, sizeAggregation] = await Promise.all([
        FileManagerEntryModel.countDocuments({ kind: "file", status: "active" }).exec(),
        FileManagerEntryModel.countDocuments({ kind: "folder", status: "active" }).exec(),
        FileManagerEntryModel.countDocuments({ status: "trashed" }).exec(),
        FileManagerEntryModel.countDocuments({ isStarred: true, status: "active" }).exec(),
        FileManagerEntryModel.aggregate([
          {
            $match: {
              kind: "file",
              status: "active"
            }
          },
          {
            $group: {
              _id: null,
              totalSizeBytes: {
                $sum: "$sizeBytes"
              }
            }
          }
        ]).exec()
      ]);
      res.json({
        counts: {
          totalFiles,
          totalFolders,
          trashedEntries,
          starredEntries,
          totalSizeBytes: sizeAggregation[0]?.totalSizeBytes ?? 0
        }
      });
    } catch (error) {
      next(error);
    }
  }
);
router6.post(
  "/api/v1/file-manager/upload",
  fileManagerWriteRateLimiter,
  ...moduleGuards("file-manager", "file-manager.create"),
  upload.single("file"),
  async (req, res, next) => {
    try {
      const file = req.file;
      if (!file) {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "No file provided");
      }
      const detectedMime = await detectMimeFromFile(file.path);
      if (!mimeMatchesDetected(file.mimetype, detectedMime)) {
        import_node_fs3.default.unlinkSync(file.path);
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "File content does not match declared type");
      }
      const quota = await checkQuota(req.user.id, file.size);
      if (!quota.allowed) {
        import_node_fs3.default.unlinkSync(file.path);
        throw new AppError(
          400,
          ERROR_CODES.BAD_REQUEST,
          `Storage quota exceeded (${Math.round(quota.usedBytes / 1024 / 1024)}MB / ${Math.round(quota.quotaBytes / 1024 / 1024)}MB)`
        );
      }
      const parentIdRaw = typeof req.body?.parentId === "string" ? req.body.parentId : void 0;
      const parentId = parseNullableObjectId(parentIdRaw, "parentId");
      if (parentId) await ensureParentFolderExists(parentId);
      const scanResult = await scanFile(file.path);
      if (scanResult === "infected") {
        import_node_fs3.default.unlinkSync(file.path);
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "File rejected by virus scanner");
      }
      const storageKey = generateStorageKey(req.user.id, file.originalname);
      const adapter = getStorageAdapter();
      const storagePath = await adapter.store(storageKey, file.path);
      const originalName = file.originalname;
      const created = await FileManagerEntryModel.create({
        name: originalName,
        kind: "file",
        parentId,
        sizeBytes: file.size,
        mimeType: file.mimetype,
        extension: extractExtension(originalName),
        storagePath,
        scanStatus: scanResult,
        status: "active",
        tags: [],
        isStarred: false,
        createdByUserId: req.user.id,
        updatedByUserId: req.user.id
      });
      res.status(201).json(toFileManagerEntry(created.toObject()));
    } catch (error) {
      if (req.file && import_node_fs3.default.existsSync(req.file.path)) {
        import_node_fs3.default.unlinkSync(req.file.path);
      }
      if (typeof error === "object" && error !== null && error.code === 11e3) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "A file with this name already exists"));
        return;
      }
      next(error);
    }
  }
);
router6.get(
  "/api/v1/file-manager/files/:id/download",
  ...moduleGuards("file-manager", "file-manager.read"),
  async (req, res, next) => {
    try {
      if (!isStrictObjectId(req.params.id)) {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid entry id");
      }
      const entry = await FileManagerEntryModel.findById(req.params.id).lean().exec();
      if (!entry || entry.kind !== "file") {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "File not found");
      }
      if (entry.status === "trashed") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Cannot download trashed files");
      }
      if (!entry.storagePath) {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "File has no stored content (metadata-only entry)");
      }
      const adapter = getStorageAdapter();
      const signedUrl = await adapter.getDownloadUrl(entry.storagePath, entry.name);
      if (signedUrl) {
        res.redirect(302, signedUrl);
        return;
      }
      const stream = await adapter.retrieve(entry.storagePath);
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(entry.name)}"`);
      if (entry.mimeType) {
        res.setHeader("Content-Type", entry.mimeType);
      }
      if (typeof entry.sizeBytes === "number") {
        res.setHeader("Content-Length", String(entry.sizeBytes));
      }
      stream.pipe(res);
    } catch (error) {
      next(error);
    }
  }
);
router6.get(
  "/api/v1/file-manager/quota",
  ...moduleGuards("file-manager", "file-manager.read"),
  async (req, res, next) => {
    try {
      const usedBytes = await getUserStorageUsed(req.user.id);
      const quotaBytes = env.FILE_QUOTA_BYTES;
      res.json({
        usedBytes,
        quotaBytes,
        usedPercent: Math.round(usedBytes / quotaBytes * 100),
        remainingBytes: Math.max(0, quotaBytes - usedBytes)
      });
    } catch (error) {
      next(error);
    }
  }
);
var fileManagerRoutes = router6;

// src/modules/job/job.routes.ts
var import_express_rate_limit8 = __toESM(require("express-rate-limit"), 1);
var import_express8 = require("express");
var import_mongoose18 = __toESM(require("mongoose"), 1);
var import_zod9 = require("zod");

// src/modules/job/job.models.ts
var import_mongoose17 = __toESM(require("mongoose"), 1);
var jobPostingSchema = new import_mongoose17.Schema(
  {
    title: { type: String, required: true, maxlength: 300, trim: true },
    description: { type: String, required: true, maxlength: 1e4 },
    department: { type: String, required: true, maxlength: 100 },
    location: { type: String, required: true, maxlength: 200 },
    employmentType: {
      type: String,
      enum: ["full_time", "part_time", "contract", "internship"],
      required: true
    },
    experienceLevel: {
      type: String,
      enum: ["entry", "mid", "senior", "lead"],
      default: "mid"
    },
    salaryMinMinor: { type: Number, min: 0 },
    salaryMaxMinor: { type: Number, min: 0 },
    currency: { type: String, default: "USD", maxlength: 3 },
    status: {
      type: String,
      enum: ["draft", "open", "closed", "filled"],
      default: "draft",
      index: true
    },
    postedAt: { type: Date },
    closedAt: { type: Date },
    createdByUserId: { type: String, required: true },
    tags: { type: [String], default: [] }
  },
  { timestamps: true }
);
jobPostingSchema.index({ status: 1, createdAt: -1 });
var JobPostingModel = import_mongoose17.default.models.JobPosting ?? import_mongoose17.default.model("JobPosting", jobPostingSchema);
var jobApplicationSchema = new import_mongoose17.Schema(
  {
    jobId: { type: import_mongoose17.Schema.Types.ObjectId, ref: "JobPosting", required: true, index: true },
    applicantName: { type: String, required: true, maxlength: 200, trim: true },
    applicantEmail: { type: String, required: true, lowercase: true, trim: true },
    resumeUrl: { type: String, maxlength: 2e3 },
    coverLetter: { type: String, maxlength: 5e3 },
    status: {
      type: String,
      enum: ["submitted", "screening", "interview", "offered", "hired", "rejected", "withdrawn"],
      default: "submitted",
      index: true
    },
    notes: { type: String, maxlength: 2e3 },
    appliedAt: { type: Date, default: () => /* @__PURE__ */ new Date() }
  },
  { timestamps: true }
);
jobApplicationSchema.index({ jobId: 1, status: 1 });
jobApplicationSchema.index({ jobId: 1, applicantEmail: 1 }, { unique: true });
var JobApplicationModel = import_mongoose17.default.models.JobApplication ?? import_mongoose17.default.model("JobApplication", jobApplicationSchema);

// src/modules/job/job.routes.ts
var router7 = (0, import_express8.Router)();
var createJobPostingSchema = import_zod9.z.object({
  title: import_zod9.z.string().min(1).max(300),
  description: import_zod9.z.string().min(1).max(1e4),
  department: import_zod9.z.string().min(1).max(100),
  location: import_zod9.z.string().min(1).max(200),
  employmentType: import_zod9.z.enum(["full_time", "part_time", "contract", "internship"]),
  experienceLevel: import_zod9.z.enum(["entry", "mid", "senior", "lead"]).default("mid"),
  salaryMinMinor: import_zod9.z.number().int().min(0).optional(),
  salaryMaxMinor: import_zod9.z.number().int().min(0).optional(),
  currency: import_zod9.z.string().max(3).default("USD"),
  tags: import_zod9.z.array(import_zod9.z.string()).default([])
});
var updateJobPostingSchema = import_zod9.z.object({
  title: import_zod9.z.string().min(1).max(300).optional(),
  description: import_zod9.z.string().min(1).max(1e4).optional(),
  department: import_zod9.z.string().min(1).max(100).optional(),
  location: import_zod9.z.string().min(1).max(200).optional(),
  employmentType: import_zod9.z.enum(["full_time", "part_time", "contract", "internship"]).optional(),
  experienceLevel: import_zod9.z.enum(["entry", "mid", "senior", "lead"]).optional(),
  salaryMinMinor: import_zod9.z.number().int().min(0).nullable().optional(),
  salaryMaxMinor: import_zod9.z.number().int().min(0).nullable().optional(),
  currency: import_zod9.z.string().max(3).optional(),
  tags: import_zod9.z.array(import_zod9.z.string()).optional()
});
var transitionJobPostingSchema = import_zod9.z.object({
  to: import_zod9.z.enum(["open", "closed", "filled"])
});
var createJobApplicationSchema = import_zod9.z.object({
  applicantName: import_zod9.z.string().min(1).max(200),
  applicantEmail: import_zod9.z.string().email(),
  resumeUrl: import_zod9.z.string().max(2e3).optional(),
  coverLetter: import_zod9.z.string().max(5e3).optional()
});
var updateJobApplicationSchema = import_zod9.z.object({
  notes: import_zod9.z.string().max(2e3).optional()
});
var transitionJobApplicationSchema = import_zod9.z.object({
  to: import_zod9.z.enum(["screening", "interview", "offered", "hired", "rejected", "withdrawn"]),
  notes: import_zod9.z.string().max(2e3).optional()
});
var listQuerySchema = import_zod9.z.object({
  page: import_zod9.z.coerce.number().int().min(1).default(1),
  limit: import_zod9.z.coerce.number().int().min(1).max(100).default(50),
  status: import_zod9.z.string().optional()
});
var jobWriteRateLimiter = (0, import_express_rate_limit8.default)({
  windowMs: 60 * 1e3,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});
var applicationSubmitRateLimiter = (0, import_express_rate_limit8.default)({
  windowMs: 60 * 1e3,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false
});
function ensureValidObjectId7(id) {
  if (!import_mongoose18.default.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid id");
  }
}
function assertAllowedJobPostingTransition(from, to) {
  const allowedTransitions = {
    draft: ["open"],
    open: ["closed", "filled"],
    closed: ["open"],
    filled: []
  };
  const allowed = allowedTransitions[from] ?? [];
  if (!allowed.includes(to)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, `Invalid job posting transition ${from} -> ${to}`);
  }
}
function assertAllowedJobApplicationTransition(from, to) {
  const allowedTransitions = {
    submitted: ["screening", "rejected", "withdrawn"],
    screening: ["interview", "rejected", "withdrawn"],
    interview: ["offered", "rejected", "withdrawn"],
    offered: ["hired", "rejected", "withdrawn"],
    hired: [],
    rejected: [],
    withdrawn: []
  };
  const allowed = allowedTransitions[from] ?? [];
  if (!allowed.includes(to)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, `Invalid job application transition ${from} -> ${to}`);
  }
}
router7.get(
  "/api/v1/job/postings",
  ...moduleGuards("job", "job.read"),
  async (req, res, next) => {
    try {
      const { page, limit, status } = listQuerySchema.parse(req.query ?? {});
      const skip = (page - 1) * limit;
      const filter = {};
      if (status) {
        filter.status = status;
      }
      const [total, items] = await Promise.all([
        JobPostingModel.countDocuments(filter).exec(),
        JobPostingModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec()
      ]);
      res.json({
        items,
        page,
        limit,
        total
      });
    } catch (error) {
      if (error instanceof import_zod9.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid job posting list query"));
        return;
      }
      next(error);
    }
  }
);
router7.post(
  "/api/v1/job/postings",
  jobWriteRateLimiter,
  ...moduleGuards("job", "job.create"),
  async (req, res, next) => {
    try {
      const payload = createJobPostingSchema.parse(req.body ?? {});
      const created = await JobPostingModel.create({
        ...payload,
        status: "draft",
        createdByUserId: req.user.id
      });
      res.status(201).json(created.toObject());
    } catch (error) {
      if (error instanceof import_zod9.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid job posting payload"));
        return;
      }
      next(error);
    }
  }
);
router7.get(
  "/api/v1/job/postings/:id",
  ...moduleGuards("job", "job.read"),
  async (req, res, next) => {
    try {
      ensureValidObjectId7(req.params.id);
      const posting = await JobPostingModel.findById(req.params.id).lean().exec();
      if (!posting) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Job posting not found");
      }
      res.json(posting);
    } catch (error) {
      next(error);
    }
  }
);
router7.patch(
  "/api/v1/job/postings/:id",
  jobWriteRateLimiter,
  ...moduleGuards("job", "job.update"),
  async (req, res, next) => {
    try {
      ensureValidObjectId7(req.params.id);
      const payload = updateJobPostingSchema.parse(req.body ?? {});
      const existingPosting = await JobPostingModel.findById(req.params.id).exec();
      if (!existingPosting) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Job posting not found");
      }
      const updatePayload = { ...payload };
      const unsetFields = {};
      if (payload.salaryMinMinor === null) {
        delete updatePayload.salaryMinMinor;
        unsetFields.salaryMinMinor = "";
      }
      if (payload.salaryMaxMinor === null) {
        delete updatePayload.salaryMaxMinor;
        unsetFields.salaryMaxMinor = "";
      }
      const updateOperation = Object.keys(unsetFields).length > 0 ? {
        $set: updatePayload,
        $unset: unsetFields
      } : {
        $set: updatePayload
      };
      const updated = await JobPostingModel.findByIdAndUpdate(req.params.id, updateOperation, {
        new: true,
        runValidators: true
      }).lean().exec();
      if (!updated) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Job posting not found");
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof import_zod9.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid job posting update payload"));
        return;
      }
      next(error);
    }
  }
);
router7.post(
  "/api/v1/job/postings/:id/transition",
  jobWriteRateLimiter,
  ...moduleGuards("job", "job.update"),
  async (req, res, next) => {
    try {
      ensureValidObjectId7(req.params.id);
      const payload = transitionJobPostingSchema.parse(req.body ?? {});
      const posting = await JobPostingModel.findById(req.params.id).exec();
      if (!posting) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Job posting not found");
      }
      assertAllowedJobPostingTransition(posting.status, payload.to);
      posting.status = payload.to;
      if (payload.to === "open" && !posting.postedAt) {
        posting.postedAt = /* @__PURE__ */ new Date();
      }
      if ((payload.to === "closed" || payload.to === "filled") && !posting.closedAt) {
        posting.closedAt = /* @__PURE__ */ new Date();
      }
      await posting.save();
      res.json(posting.toObject());
    } catch (error) {
      if (error instanceof import_zod9.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid job posting transition payload"));
        return;
      }
      next(error);
    }
  }
);
router7.delete(
  "/api/v1/job/postings/:id",
  jobWriteRateLimiter,
  ...moduleGuards("job", "job.delete"),
  async (req, res, next) => {
    try {
      ensureValidObjectId7(req.params.id);
      const posting = await JobPostingModel.findById(req.params.id).exec();
      if (!posting) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Job posting not found");
      }
      if (posting.status !== "draft") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Only draft postings can be deleted");
      }
      await JobPostingModel.deleteOne({ _id: posting._id }).exec();
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);
router7.get(
  "/api/v1/job/postings/:id/applications",
  ...moduleGuards("job", "job.read"),
  async (req, res, next) => {
    try {
      ensureValidObjectId7(req.params.id);
      const posting = await JobPostingModel.findById(req.params.id).exec();
      if (!posting) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Job posting not found");
      }
      const { page, limit } = listQuerySchema.parse(req.query ?? {});
      const skip = (page - 1) * limit;
      const [total, items] = await Promise.all([
        JobApplicationModel.countDocuments({ jobId: req.params.id }).exec(),
        JobApplicationModel.find({ jobId: req.params.id }).sort({ appliedAt: -1 }).skip(skip).limit(limit).lean().exec()
      ]);
      res.json({
        items,
        page,
        limit,
        total
      });
    } catch (error) {
      if (error instanceof import_zod9.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid job application list query"));
        return;
      }
      next(error);
    }
  }
);
router7.post(
  "/api/v1/job/postings/:id/applications",
  applicationSubmitRateLimiter,
  ...moduleGuards("job", "job.create"),
  async (req, res, next) => {
    try {
      ensureValidObjectId7(req.params.id);
      const payload = createJobApplicationSchema.parse(req.body ?? {});
      const posting = await JobPostingModel.findById(req.params.id).exec();
      if (!posting) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Job posting not found");
      }
      if (posting.status !== "open") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Job posting is not open for applications");
      }
      const created = await JobApplicationModel.create({
        jobId: req.params.id,
        ...payload,
        status: "submitted",
        appliedAt: /* @__PURE__ */ new Date()
      });
      res.status(201).json(created.toObject());
    } catch (error) {
      if (error instanceof import_zod9.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid job application payload"));
        return;
      }
      if (error.code === 11e3) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Application already exists for this email"));
        return;
      }
      next(error);
    }
  }
);
router7.patch(
  "/api/v1/job/applications/:id",
  jobWriteRateLimiter,
  ...moduleGuards("job", "job.update"),
  async (req, res, next) => {
    try {
      ensureValidObjectId7(req.params.id);
      const payload = updateJobApplicationSchema.parse(req.body ?? {});
      const updated = await JobApplicationModel.findByIdAndUpdate(
        req.params.id,
        { $set: payload },
        {
          new: true,
          runValidators: true
        }
      ).lean().exec();
      if (!updated) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Job application not found");
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof import_zod9.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid job application update payload"));
        return;
      }
      next(error);
    }
  }
);
router7.post(
  "/api/v1/job/applications/:id/transition",
  jobWriteRateLimiter,
  ...moduleGuards("job", "job.update"),
  async (req, res, next) => {
    try {
      ensureValidObjectId7(req.params.id);
      const payload = transitionJobApplicationSchema.parse(req.body ?? {});
      const application = await JobApplicationModel.findById(req.params.id).exec();
      if (!application) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Job application not found");
      }
      assertAllowedJobApplicationTransition(application.status, payload.to);
      application.status = payload.to;
      if (payload.notes && payload.notes.trim()) {
        application.notes = payload.notes.trim();
      }
      await application.save();
      res.json(application.toObject());
    } catch (error) {
      if (error instanceof import_zod9.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid job application transition payload"));
        return;
      }
      next(error);
    }
  }
);
router7.delete(
  "/api/v1/job/applications/:id",
  jobWriteRateLimiter,
  ...moduleGuards("job", "job.delete"),
  async (req, res, next) => {
    try {
      ensureValidObjectId7(req.params.id);
      const application = await JobApplicationModel.findById(req.params.id).exec();
      if (!application) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Job application not found");
      }
      await JobApplicationModel.deleteOne({ _id: application._id }).exec();
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);
router7.get(
  "/api/v1/job/insights",
  ...moduleGuards("job", "job.read"),
  async (_req, res, next) => {
    try {
      const [draftPostings, openPostings, closedPostings, filledPostings, totalApplications, submittedApplications, hiredApplications] = await Promise.all([
        JobPostingModel.countDocuments({ status: "draft" }).exec(),
        JobPostingModel.countDocuments({ status: "open" }).exec(),
        JobPostingModel.countDocuments({ status: "closed" }).exec(),
        JobPostingModel.countDocuments({ status: "filled" }).exec(),
        JobApplicationModel.countDocuments().exec(),
        JobApplicationModel.countDocuments({ status: "submitted" }).exec(),
        JobApplicationModel.countDocuments({ status: "hired" }).exec()
      ]);
      res.json({
        counts: {
          draftPostings,
          openPostings,
          closedPostings,
          filledPostings,
          totalApplications,
          submittedApplications,
          hiredApplications
        }
      });
    } catch (error) {
      next(error);
    }
  }
);
var jobRoutes = router7;

// src/modules/mailbox/mailbox.routes.ts
var import_express_rate_limit9 = __toESM(require("express-rate-limit"), 1);
var import_express9 = require("express");
var import_mongoose20 = __toESM(require("mongoose"), 1);
var import_zod10 = require("zod");

// src/modules/mailbox/mailbox.models.ts
var import_mongoose19 = __toESM(require("mongoose"), 1);
var mailboxMessageSchema = new import_mongoose19.Schema(
  {
    subject: { type: String, required: true, trim: true, maxlength: 300 },
    body: { type: String, required: true, maxlength: 5e4 },
    fromAddress: { type: String, required: true, trim: true, lowercase: true },
    fromName: { type: String, required: true, trim: true, maxlength: 200 },
    toAddresses: {
      type: [String],
      required: true,
      validate: {
        validator: (value) => Array.isArray(value) && value.length >= 1,
        message: "At least one recipient is required"
      }
    },
    ccAddresses: { type: [String], default: [] },
    bccAddresses: { type: [String], default: [] },
    folder: { type: String, enum: ["inbox", "sent", "drafts", "trash", "archive"], default: "inbox", index: true },
    status: { type: String, enum: ["unread", "read", "flagged"], default: "unread", index: true },
    isStarred: { type: Boolean, default: false },
    hasAttachments: { type: Boolean, default: false },
    attachments: {
      type: [{
        filename: { type: String, required: true },
        contentType: { type: String, required: true },
        sizeBytes: { type: Number, required: true, min: 0 },
        storagePath: { type: String }
      }],
      default: []
    },
    externalMessageId: { type: String },
    inReplyToId: { type: import_mongoose19.Schema.Types.ObjectId, ref: "MailboxMessage" },
    ownerUserId: { type: String, required: true, index: true },
    sentAt: { type: Date }
  },
  { timestamps: true }
);
mailboxMessageSchema.index({ ownerUserId: 1, folder: 1, createdAt: -1 });
var MailboxMessageModel = import_mongoose19.default.models.MailboxMessage ?? import_mongoose19.default.model("MailboxMessage", mailboxMessageSchema);

// src/modules/mailbox/mail-adapter.ts
var import_nodemailer = __toESM(require("nodemailer"), 1);
var transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  if (env.SMTP_HOST) {
    transporter = import_nodemailer.default.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE === "true",
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS ?? "" } : void 0
    });
    logger.info("Mail adapter configured with SMTP transport", { host: env.SMTP_HOST });
  } else {
    transporter = import_nodemailer.default.createTransport({ jsonTransport: true });
    logger.info("Mail adapter using JSON transport (no SMTP configured \u2014 emails will be logged, not sent)");
  }
  return transporter;
}
async function sendMail(envelope) {
  const transport = getTransporter();
  const recipientCount = envelope.to.length + (envelope.cc?.length ?? 0) + (envelope.bcc?.length ?? 0);
  logger.info("Mail delivery attempt", {
    to: envelope.to,
    cc: envelope.cc,
    subject: envelope.subject,
    recipientCount,
    hasAttachments: (envelope.attachments?.length ?? 0) > 0
  });
  try {
    const info = await transport.sendMail({
      from: `"${envelope.from.name}" <${envelope.from.address}>`,
      to: envelope.to.join(", "),
      cc: envelope.cc?.join(", "),
      bcc: envelope.bcc?.join(", "),
      subject: envelope.subject,
      html: envelope.html,
      attachments: envelope.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType
      }))
    });
    const result = {
      messageId: info.messageId ?? "",
      accepted: Array.isArray(info.accepted) ? info.accepted.map(String) : [],
      rejected: Array.isArray(info.rejected) ? info.rejected.map(String) : []
    };
    if (!env.SMTP_HOST) {
      logger.info("Mail logged (JSON transport \u2014 no SMTP)", {
        messageId: result.messageId
      });
    } else {
      logger.info("Mail delivered via SMTP", {
        messageId: result.messageId,
        accepted: result.accepted,
        rejected: result.rejected
      });
    }
    if (result.rejected.length > 0) {
      logger.warn("Mail delivery partial rejection", {
        messageId: result.messageId,
        rejected: result.rejected
      });
    }
    return result;
  } catch (err) {
    logger.error("Mail delivery failed", {
      error: err instanceof Error ? err.message : String(err),
      to: envelope.to,
      subject: envelope.subject
    });
    throw err;
  }
}
async function syncInbound() {
  logger.info("Inbound mail sync invoked (placeholder \u2014 no IMAP/vendor configured)");
  return { fetched: 0 };
}

// src/modules/mailbox/mailbox.routes.ts
var router8 = (0, import_express9.Router)();
var listMessagesQuerySchema2 = import_zod10.z.object({
  folder: import_zod10.z.enum(["inbox", "sent", "drafts", "trash", "archive"]).default("inbox"),
  page: import_zod10.z.coerce.number().int().min(1).default(1),
  limit: import_zod10.z.coerce.number().int().min(1).max(100).default(50),
  allUsers: import_zod10.z.coerce.boolean().default(false)
});
var createMessageSchema = import_zod10.z.object({
  subject: import_zod10.z.string().min(1).max(300),
  body: import_zod10.z.string().min(1).max(5e4),
  fromAddress: import_zod10.z.string().email(),
  fromName: import_zod10.z.string().min(1).max(200),
  toAddresses: import_zod10.z.array(import_zod10.z.string().email()).min(1),
  ccAddresses: import_zod10.z.array(import_zod10.z.string().email()).default([]),
  bccAddresses: import_zod10.z.array(import_zod10.z.string().email()).default([]),
  folder: import_zod10.z.enum(["drafts", "sent"]).default("sent"),
  inReplyToId: import_zod10.z.string().optional()
});
var updateMessageSchema = import_zod10.z.object({
  subject: import_zod10.z.string().min(1).max(300).optional(),
  body: import_zod10.z.string().min(1).max(5e4).optional(),
  toAddresses: import_zod10.z.array(import_zod10.z.string().email()).min(1).optional(),
  ccAddresses: import_zod10.z.array(import_zod10.z.string().email()).optional(),
  bccAddresses: import_zod10.z.array(import_zod10.z.string().email()).optional()
});
var moveMessageSchema = import_zod10.z.object({
  folder: import_zod10.z.enum(["inbox", "sent", "drafts", "trash", "archive"])
});
var mailboxSendRateLimiter = (0, import_express_rate_limit9.default)({
  windowMs: 60 * 1e3,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false
});
var mailboxWriteRateLimiter = (0, import_express_rate_limit9.default)({
  windowMs: 60 * 1e3,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});
function ensureValidObjectId8(id) {
  if (!import_mongoose20.default.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid id");
  }
}
router8.get(
  "/api/v1/mailbox/messages",
  ...moduleGuards("mailbox", "mailbox.read"),
  async (req, res, next) => {
    try {
      const { folder, page, limit, allUsers } = listMessagesQuerySchema2.parse(req.query ?? {});
      const skip = (page - 1) * limit;
      const filter = { folder };
      if (req.user.role !== "super_admin" || !allUsers) {
        filter.ownerUserId = req.user.id;
      }
      const [total, items] = await Promise.all([
        MailboxMessageModel.countDocuments(filter).exec(),
        MailboxMessageModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec()
      ]);
      res.json({
        items,
        page,
        limit,
        total
      });
    } catch (error) {
      if (error instanceof import_zod10.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid message list query"));
        return;
      }
      next(error);
    }
  }
);
router8.post(
  "/api/v1/mailbox/messages",
  mailboxSendRateLimiter,
  ...moduleGuards("mailbox", "mailbox.create"),
  async (req, res, next) => {
    try {
      const payload = createMessageSchema.parse(req.body ?? {});
      let inReplyToObjectId = void 0;
      if (payload.inReplyToId) {
        ensureValidObjectId8(payload.inReplyToId);
        inReplyToObjectId = new import_mongoose20.default.Types.ObjectId(payload.inReplyToId);
      }
      const message = await MailboxMessageModel.create({
        subject: payload.subject.trim(),
        body: payload.body.trim(),
        fromAddress: payload.fromAddress.toLowerCase().trim(),
        fromName: payload.fromName.trim(),
        toAddresses: payload.toAddresses.map((email) => email.toLowerCase().trim()),
        ccAddresses: payload.ccAddresses.map((email) => email.toLowerCase().trim()),
        bccAddresses: payload.bccAddresses.map((email) => email.toLowerCase().trim()),
        folder: payload.folder,
        status: "unread",
        isStarred: false,
        hasAttachments: false,
        inReplyToId: inReplyToObjectId,
        ownerUserId: req.user.id,
        sentAt: payload.folder === "sent" ? /* @__PURE__ */ new Date() : void 0
      });
      res.status(201).json(message.toObject());
    } catch (error) {
      if (error instanceof import_zod10.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid message payload"));
        return;
      }
      next(error);
    }
  }
);
router8.get(
  "/api/v1/mailbox/messages/:id",
  ...moduleGuards("mailbox", "mailbox.read"),
  async (req, res, next) => {
    try {
      ensureValidObjectId8(req.params.id);
      const filter = { _id: req.params.id };
      if (req.user.role !== "super_admin") {
        filter.ownerUserId = req.user.id;
      }
      const message = await MailboxMessageModel.findOne(filter).exec();
      if (!message) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Message not found");
      }
      if (message.status === "unread" && message.folder === "inbox" && message.ownerUserId === req.user.id) {
        message.status = "read";
        await message.save();
      }
      res.json(message.toObject());
    } catch (error) {
      next(error);
    }
  }
);
router8.patch(
  "/api/v1/mailbox/messages/:id",
  mailboxWriteRateLimiter,
  ...moduleGuards("mailbox", "mailbox.update"),
  async (req, res, next) => {
    try {
      ensureValidObjectId8(req.params.id);
      const payload = updateMessageSchema.parse(req.body ?? {});
      const filter = { _id: req.params.id };
      if (req.user.role !== "super_admin") {
        filter.ownerUserId = req.user.id;
      }
      const message = await MailboxMessageModel.findOne(filter).exec();
      if (!message) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Message not found");
      }
      if (message.folder !== "drafts") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Only draft messages can be updated");
      }
      if (payload.subject !== void 0) {
        message.subject = payload.subject.trim();
      }
      if (payload.body !== void 0) {
        message.body = payload.body.trim();
      }
      if (payload.toAddresses !== void 0) {
        message.toAddresses = payload.toAddresses.map((email) => email.toLowerCase().trim());
      }
      if (payload.ccAddresses !== void 0) {
        message.ccAddresses = payload.ccAddresses.map((email) => email.toLowerCase().trim());
      }
      if (payload.bccAddresses !== void 0) {
        message.bccAddresses = payload.bccAddresses.map((email) => email.toLowerCase().trim());
      }
      await message.save();
      res.json(message.toObject());
    } catch (error) {
      if (error instanceof import_zod10.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid message update payload"));
        return;
      }
      next(error);
    }
  }
);
router8.post(
  "/api/v1/mailbox/messages/:id/send",
  mailboxSendRateLimiter,
  ...moduleGuards("mailbox", "mailbox.update"),
  async (req, res, next) => {
    try {
      ensureValidObjectId8(req.params.id);
      const filter = { _id: req.params.id };
      if (req.user.role !== "super_admin") {
        filter.ownerUserId = req.user.id;
      }
      const message = await MailboxMessageModel.findOne(filter).exec();
      if (!message) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Message not found");
      }
      if (message.folder !== "drafts") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Only draft messages can be sent");
      }
      const result = await sendMail({
        from: { name: message.fromName, address: message.fromAddress },
        to: message.toAddresses,
        cc: message.ccAddresses.length > 0 ? message.ccAddresses : void 0,
        bcc: message.bccAddresses.length > 0 ? message.bccAddresses : void 0,
        subject: message.subject,
        html: message.body
      });
      message.folder = "sent";
      message.sentAt = /* @__PURE__ */ new Date();
      message.externalMessageId = result.messageId || void 0;
      await message.save();
      res.json(message.toObject());
    } catch (error) {
      next(error);
    }
  }
);
router8.post(
  "/api/v1/mailbox/messages/:id/move",
  mailboxWriteRateLimiter,
  ...moduleGuards("mailbox", "mailbox.update"),
  async (req, res, next) => {
    try {
      ensureValidObjectId8(req.params.id);
      const payload = moveMessageSchema.parse(req.body ?? {});
      const filter = { _id: req.params.id };
      if (req.user.role !== "super_admin") {
        filter.ownerUserId = req.user.id;
      }
      const message = await MailboxMessageModel.findOne(filter).exec();
      if (!message) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Message not found");
      }
      message.folder = payload.folder;
      await message.save();
      res.json(message.toObject());
    } catch (error) {
      if (error instanceof import_zod10.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid move payload"));
        return;
      }
      next(error);
    }
  }
);
router8.post(
  "/api/v1/mailbox/messages/:id/star",
  mailboxWriteRateLimiter,
  ...moduleGuards("mailbox", "mailbox.update"),
  async (req, res, next) => {
    try {
      ensureValidObjectId8(req.params.id);
      const filter = { _id: req.params.id };
      if (req.user.role !== "super_admin") {
        filter.ownerUserId = req.user.id;
      }
      const message = await MailboxMessageModel.findOne(filter).exec();
      if (!message) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Message not found");
      }
      message.isStarred = !message.isStarred;
      await message.save();
      res.json(message.toObject());
    } catch (error) {
      next(error);
    }
  }
);
router8.post(
  "/api/v1/mailbox/messages/:id/read",
  mailboxWriteRateLimiter,
  ...moduleGuards("mailbox", "mailbox.update"),
  async (req, res, next) => {
    try {
      ensureValidObjectId8(req.params.id);
      const filter = { _id: req.params.id };
      if (req.user.role !== "super_admin") {
        filter.ownerUserId = req.user.id;
      }
      const message = await MailboxMessageModel.findOne(filter).exec();
      if (!message) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Message not found");
      }
      message.status = "read";
      await message.save();
      res.json(message.toObject());
    } catch (error) {
      next(error);
    }
  }
);
router8.delete(
  "/api/v1/mailbox/messages/:id",
  mailboxWriteRateLimiter,
  ...moduleGuards("mailbox", "mailbox.delete"),
  async (req, res, next) => {
    try {
      ensureValidObjectId8(req.params.id);
      const filter = { _id: req.params.id };
      if (req.user.role !== "super_admin") {
        filter.ownerUserId = req.user.id;
      }
      const message = await MailboxMessageModel.findOne(filter).exec();
      if (!message) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Message not found");
      }
      if (message.folder === "trash") {
        await MailboxMessageModel.deleteOne({ _id: message._id }).exec();
        res.status(204).send();
      } else {
        message.folder = "trash";
        await message.save();
        res.json(message.toObject());
      }
    } catch (error) {
      next(error);
    }
  }
);
router8.get(
  "/api/v1/mailbox/insights",
  ...moduleGuards("mailbox", "mailbox.read"),
  async (req, res, next) => {
    try {
      const filter = {};
      if (req.user.role !== "super_admin") {
        filter.ownerUserId = req.user.id;
      }
      const [inbox, sent, drafts, trash, archive, unread, starred] = await Promise.all([
        MailboxMessageModel.countDocuments({ ...filter, folder: "inbox" }).exec(),
        MailboxMessageModel.countDocuments({ ...filter, folder: "sent" }).exec(),
        MailboxMessageModel.countDocuments({ ...filter, folder: "drafts" }).exec(),
        MailboxMessageModel.countDocuments({ ...filter, folder: "trash" }).exec(),
        MailboxMessageModel.countDocuments({ ...filter, folder: "archive" }).exec(),
        MailboxMessageModel.countDocuments({ ...filter, status: "unread" }).exec(),
        MailboxMessageModel.countDocuments({ ...filter, isStarred: true }).exec()
      ]);
      res.json({
        counts: {
          inbox,
          sent,
          drafts,
          trash,
          archive,
          unread,
          starred
        }
      });
    } catch (error) {
      next(error);
    }
  }
);
router8.post(
  "/api/v1/mailbox/sync-inbound",
  mailboxWriteRateLimiter,
  ...moduleGuards("mailbox", "mailbox.create"),
  async (_req, res, next) => {
    try {
      const result = await syncInbound();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);
var mailboxRoutes = router8;

// src/modules/system/auth.routes.ts
var import_bcryptjs2 = __toESM(require("bcryptjs"), 1);
var import_express10 = require("express");
var import_express_rate_limit10 = __toESM(require("express-rate-limit"), 1);
var import_zod11 = require("zod");

// src/modules/rbac/employee.model.ts
var import_mongoose21 = __toESM(require("mongoose"), 1);
var employeeSchema = new import_mongoose21.Schema(
  {
    clientCode: { type: String, required: true },
    userId: { type: import_mongoose21.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    employeeName: { type: String, required: true, maxlength: 100 },
    emailOffice: { type: String, required: true },
    department: { type: String, maxlength: 100, default: "" },
    contact: { type: String, maxlength: 20, default: "" },
    roleId: { type: import_mongoose21.Schema.Types.ObjectId, ref: "RoleMaster", default: null },
    parentEmployeeId: { type: import_mongoose21.Schema.Types.ObjectId, ref: "Employee", default: null },
    ancestorIds: { type: [import_mongoose21.Schema.Types.ObjectId], default: [] },
    isActive: { type: Boolean, required: true, default: true },
    createdBy: { type: String, default: null },
    updatedBy: { type: String, required: true }
  },
  { timestamps: true }
);
employeeSchema.index({ clientCode: 1 });
employeeSchema.index({ ancestorIds: 1 });
employeeSchema.index({ clientCode: 1, emailOffice: 1 });
var EmployeeModel = import_mongoose21.default.models.Employee ?? import_mongoose21.default.model("Employee", employeeSchema);

// src/modules/rbac/role-master.model.ts
var import_mongoose22 = __toESM(require("mongoose"), 1);
var rolePermissionSchema = new import_mongoose22.Schema(
  {
    menuId: { type: String, required: true },
    actionTypeId: { type: String, required: true },
    granted: { type: Boolean, required: true, default: false }
  },
  { _id: false }
);
var roleMasterSchema = new import_mongoose22.Schema(
  {
    clientCode: { type: String, required: true },
    roleName: { type: String, required: true, maxlength: 60 },
    permissions: { type: [rolePermissionSchema], default: [] },
    isActive: { type: Boolean, required: true, default: true },
    createdBy: { type: String, default: null },
    updatedBy: { type: String, required: true }
  },
  { timestamps: true }
);
roleMasterSchema.index({ clientCode: 1, roleName: 1 }, { unique: true });
var RoleMasterModel = import_mongoose22.default.models.RoleMaster ?? import_mongoose22.default.model("RoleMaster", roleMasterSchema);

// src/modules/rbac/menu-master.model.ts
var import_mongoose23 = __toESM(require("mongoose"), 1);
var menuMasterSchema = new import_mongoose23.Schema(
  {
    clientCode: { type: String, required: true },
    menuName: { type: String, required: true, maxlength: 100 },
    isRoot: { type: Boolean, required: true, default: true },
    isParentMenu: { type: Boolean, required: true, default: false },
    parentMenu: {
      type: import_mongoose23.Schema.Types.ObjectId,
      ref: "MenuMaster",
      default: null
    },
    menuUrl: { type: String, required: true, maxlength: 255 },
    sequence: { type: Number, required: true, default: 0 },
    icon: { type: String, maxlength: 100, default: "" },
    isActive: { type: Boolean, required: true, default: true },
    createdBy: { type: String, default: null },
    updatedBy: { type: String, required: true }
  },
  { timestamps: true }
);
menuMasterSchema.index({ clientCode: 1, menuUrl: 1 }, { unique: true });
menuMasterSchema.index({ clientCode: 1, isRoot: 1, sequence: 1 });
var MenuMasterModel = import_mongoose23.default.models.MenuMaster ?? import_mongoose23.default.model("MenuMaster", menuMasterSchema);

// src/modules/rbac/action-type.model.ts
var import_mongoose24 = __toESM(require("mongoose"), 1);
var actionTypeSchema = new import_mongoose24.Schema(
  {
    clientCode: { type: String, required: true },
    actionName: { type: String, required: true, maxlength: 60 },
    actionCode: { type: String, required: true, maxlength: 30 },
    isActive: { type: Boolean, required: true, default: true }
  },
  { timestamps: true }
);
actionTypeSchema.index({ clientCode: 1, actionCode: 1 }, { unique: true });
var ActionTypeModel = import_mongoose24.default.models.ActionType ?? import_mongoose24.default.model("ActionType", actionTypeSchema);

// src/modules/system/auth.routes.ts
var router9 = (0, import_express10.Router)();
var loginSchema = import_zod11.z.object({
  email: import_zod11.z.string().email(),
  password: import_zod11.z.string().min(8)
});
var loginRateLimiter = (0, import_express_rate_limit10.default)({
  windowMs: 15 * 60 * 1e3,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
});
router9.post("/api/v1/auth/login", loginRateLimiter, async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body ?? {});
    const user = await UserModel.findOne({ email }).exec();
    if (!user) {
      throw new AppError(401, ERROR_CODES.UNAUTHORIZED, "Invalid credentials");
    }
    const isValid = await import_bcryptjs2.default.compare(password, user.passwordHash);
    if (!isValid) {
      throw new AppError(401, ERROR_CODES.UNAUTHORIZED, "Invalid credentials");
    }
    const token = signToken({
      sub: String(user.id),
      email: user.email,
      role: user.role
    });
    res.json({
      token,
      user: {
        id: String(user.id),
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    if (error instanceof import_zod11.z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid login payload"));
      return;
    }
    next(error);
  }
});
router9.get(
  "/api/v1/auth/user/me",
  authenticateJwt,
  requireRole(["super_admin", "admin"]),
  async (req, res, next) => {
    try {
      const isSuperAdmin = req.user.role === "super_admin";
      if (isSuperAdmin) {
        const allMenus = await MenuMasterModel.find({
          // clientCode: env.CLIENT_CODE,
          isActive: true
        }).sort({ isRoot: -1, sequence: 1 }).lean().exec();
        const allActions = await ActionTypeModel.find({
          // clientCode: env.CLIENT_CODE,
          isActive: true
        }).lean().exec();
        const permissions2 = {};
        for (const menu of allMenus) {
          permissions2[menu.menuUrl] = allActions.map((a) => a.actionCode);
        }
        return res.json({
          user: req.user,
          allowedMenus: allMenus,
          permissions: permissions2
        });
      }
      const employee = await EmployeeModel.findOne({ userId: req.user.id }).lean().exec();
      if (!employee || !employee.roleId) {
        return res.json({ user: req.user, allowedMenus: [], permissions: {} });
      }
      const role = await RoleMasterModel.findById(employee.roleId).lean().exec();
      if (!role) {
        return res.json({ user: req.user, allowedMenus: [], permissions: {} });
      }
      const grantedMenuIds = new Set(
        role.permissions.filter((p) => p.granted).map((p) => p.menuId)
      );
      const allowedMenus = await MenuMasterModel.find({
        _id: { $in: Array.from(grantedMenuIds) },
        clientCode: env.CLIENT_CODE,
        isActive: true
      }).sort({ isRoot: -1, sequence: 1 }).lean().exec();
      const actionTypeIds = new Set(
        role.permissions.filter((p) => p.granted).map((p) => p.actionTypeId)
      );
      const actionTypes = await ActionTypeModel.find({
        _id: { $in: Array.from(actionTypeIds) },
        clientCode: env.CLIENT_CODE,
        isActive: true
      }).lean().exec();
      const actionCodeMap = new Map(
        actionTypes.map((a) => {
          const typed = a;
          return [typed._id.toString(), typed.actionCode];
        })
      );
      const permissions = {};
      for (const perm of role.permissions) {
        if (!perm.granted) continue;
        const menu = allowedMenus.find((m) => {
          const typed = m;
          return typed._id.toString() === perm.menuId;
        });
        const actionCode = actionCodeMap.get(perm.actionTypeId);
        if (menu && actionCode) {
          const typedMenu = menu;
          if (!permissions[typedMenu.menuUrl])
            permissions[typedMenu.menuUrl] = [];
          permissions[typedMenu.menuUrl].push(actionCode);
        }
      }
      res.json({
        user: req.user,
        allowedMenus,
        permissions,
        employeeId: employee._id,
        roleName: role.roleName
      });
    } catch (error) {
      next(error);
    }
  }
);
var authRoutes = router9;

// src/modules/health/health.routes.ts
var import_express11 = require("express");
var import_mongoose25 = __toESM(require("mongoose"), 1);
var router10 = (0, import_express11.Router)();
router10.get("/api/v1/system/health", (_req, res) => {
  const mongoState = import_mongoose25.default.connection.readyState;
  const mongoOk = mongoState === 1;
  const status = mongoOk ? "ok" : "degraded";
  res.status(mongoOk ? 200 : 503).json({
    status,
    uptime: Math.floor(process.uptime()),
    mongo: mongoOk ? "connected" : "disconnected",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
var healthRoutes = router10;

// src/modules/invoices/invoice.routes.ts
var import_express12 = require("express");
var import_mongoose27 = __toESM(require("mongoose"), 1);
var import_express_rate_limit11 = __toESM(require("express-rate-limit"), 1);
var import_zod12 = require("zod");

// src/modules/invoices/invoice.models.ts
var import_mongoose26 = __toESM(require("mongoose"), 1);
var invoiceLineItemSchema = new import_mongoose26.Schema(
  {
    description: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPriceMinor: { type: Number, required: true, min: 0 },
    lineTotalMinor: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);
var invoiceSchema = new import_mongoose26.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ["draft", "issued", "sent", "partially_paid", "overdue", "paid", "void", "uncollectible"],
      default: "draft"
    },
    contactId: { type: import_mongoose26.Schema.Types.ObjectId, ref: "CrmContact" },
    dealId: { type: import_mongoose26.Schema.Types.ObjectId, ref: "CrmDeal" },
    orderId: { type: import_mongoose26.Schema.Types.ObjectId, ref: "EcommerceOrder" },
    currency: { type: String, required: true, default: "USD" },
    lineItems: { type: [invoiceLineItemSchema], required: true, default: [] },
    subtotalMinor: { type: Number, required: true, min: 0, default: 0 },
    taxMinor: { type: Number, required: true, min: 0, default: 0 },
    discountMinor: { type: Number, required: true, min: 0, default: 0 },
    grandTotalMinor: { type: Number, required: true, min: 0, default: 0 },
    amountPaidMinor: { type: Number, required: true, min: 0, default: 0 },
    dueAt: { type: Date },
    issuedAt: { type: Date },
    sentAt: { type: Date },
    paidAt: { type: Date },
    voidedAt: { type: Date },
    notes: { type: String, default: "" }
  },
  { timestamps: true }
);
invoiceSchema.index({ status: 1, dueAt: 1 });
var InvoiceDocumentModelRef = import_mongoose26.default.models.InvoiceDocument ?? import_mongoose26.default.model("InvoiceDocument", invoiceSchema);

// src/modules/invoices/invoice.routes.ts
var router11 = (0, import_express12.Router)();
var invoiceWriteRateLimiter = (0, import_express_rate_limit11.default)({
  windowMs: 60 * 1e3,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});
var invoiceLineSchema = import_zod12.z.object({
  description: import_zod12.z.string().min(1),
  quantity: import_zod12.z.number().int().min(1),
  unitPriceMinor: import_zod12.z.number().int().min(0)
});
var invoicePayloadSchema = import_zod12.z.object({
  contactId: import_zod12.z.string().optional(),
  dealId: import_zod12.z.string().optional(),
  orderId: import_zod12.z.string().optional(),
  currency: import_zod12.z.string().min(3).max(3).default("USD"),
  lineItems: import_zod12.z.array(invoiceLineSchema).min(1).max(100),
  taxMinor: import_zod12.z.number().int().min(0).default(0),
  discountMinor: import_zod12.z.number().int().min(0).default(0),
  amountPaidMinor: import_zod12.z.number().int().min(0).default(0),
  dueAt: import_zod12.z.string().datetime().optional(),
  notes: import_zod12.z.string().optional()
});
var transitionPayloadSchema2 = import_zod12.z.object({
  to: import_zod12.z.enum(["draft", "issued", "sent", "partially_paid", "overdue", "paid", "void", "uncollectible"]),
  amountPaidMinor: import_zod12.z.number().int().min(0).optional()
});
function ensureValidObjectId9(id) {
  if (!import_mongoose27.default.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid id");
  }
}
function assertInvoiceTransition(from, to) {
  const map = {
    draft: ["issued", "void"],
    issued: ["sent", "void"],
    sent: ["partially_paid", "paid", "overdue"],
    partially_paid: ["paid", "overdue"],
    overdue: ["partially_paid", "paid", "uncollectible"],
    paid: [],
    void: [],
    uncollectible: []
  };
  if (!(map[from] ?? []).includes(to)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, `Invalid transition ${from} -> ${to}`);
  }
}
function buildTotals(payload) {
  const subtotalMinor = payload.lineItems.reduce(
    (total, lineItem) => total + lineItem.quantity * lineItem.unitPriceMinor,
    0
  );
  const grandTotalMinor = Math.max(0, subtotalMinor + payload.taxMinor - payload.discountMinor);
  return { subtotalMinor, grandTotalMinor };
}
router11.get("/api/v1/invoices/documents", ...moduleGuards("invoices", "invoices.read"), async (_req, res, next) => {
  try {
    const items = await InvoiceDocumentModelRef.find().sort({ createdAt: -1 }).lean().exec();
    res.json({ items });
  } catch (error) {
    next(error);
  }
});
router11.post("/api/v1/invoices/documents", invoiceWriteRateLimiter, ...moduleGuards("invoices", "invoices.create"), async (req, res, next) => {
  try {
    const payload = invoicePayloadSchema.parse(req.body ?? {});
    if (payload.contactId) ensureValidObjectId9(payload.contactId);
    if (payload.dealId) ensureValidObjectId9(payload.dealId);
    if (payload.orderId) ensureValidObjectId9(payload.orderId);
    if (payload.contactId) {
      const contact = await CrmContactModel.findById(payload.contactId).exec();
      if (!contact) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Contact not found");
      }
    }
    if (payload.dealId) {
      const deal = await CrmDealModel.findById(payload.dealId).exec();
      if (!deal) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Deal not found");
      }
    }
    if (payload.orderId) {
      const order = await EcommerceOrderModel.findById(payload.orderId).exec();
      if (!order) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Order not found");
      }
    }
    const lineItems = payload.lineItems.map((lineItem) => ({
      ...lineItem,
      lineTotalMinor: lineItem.quantity * lineItem.unitPriceMinor
    }));
    const { subtotalMinor, grandTotalMinor } = buildTotals(payload);
    if (payload.amountPaidMinor > grandTotalMinor) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "amountPaidMinor cannot exceed invoice grand total");
    }
    const created = await InvoiceDocumentModelRef.create({
      invoiceNumber: `INV-${Date.now()}`,
      status: "draft",
      contactId: payload.contactId ? new import_mongoose27.default.Types.ObjectId(payload.contactId) : void 0,
      dealId: payload.dealId ? new import_mongoose27.default.Types.ObjectId(payload.dealId) : void 0,
      orderId: payload.orderId ? new import_mongoose27.default.Types.ObjectId(payload.orderId) : void 0,
      currency: payload.currency,
      lineItems,
      subtotalMinor,
      taxMinor: payload.taxMinor,
      discountMinor: payload.discountMinor,
      grandTotalMinor,
      amountPaidMinor: payload.amountPaidMinor,
      dueAt: payload.dueAt ? new Date(payload.dueAt) : void 0,
      notes: payload.notes ?? ""
    });
    res.status(201).json(created);
  } catch (error) {
    if (error instanceof import_zod12.z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid invoice payload"));
      return;
    }
    next(error);
  }
});
router11.patch(
  "/api/v1/invoices/documents/:id",
  invoiceWriteRateLimiter,
  ...moduleGuards("invoices", "invoices.update"),
  async (req, res, next) => {
    try {
      ensureValidObjectId9(req.params.id);
      const payload = invoicePayloadSchema.partial().parse(req.body ?? {});
      const existing = await InvoiceDocumentModelRef.findById(req.params.id).exec();
      if (!existing) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Invoice not found");
      }
      if (existing.status !== "draft") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Only draft invoices can be edited");
      }
      if (payload.contactId) {
        ensureValidObjectId9(payload.contactId);
        const contact = await CrmContactModel.findById(payload.contactId).exec();
        if (!contact) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Contact not found");
      }
      if (payload.dealId) {
        ensureValidObjectId9(payload.dealId);
        const deal = await CrmDealModel.findById(payload.dealId).exec();
        if (!deal) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Deal not found");
      }
      if (payload.orderId) {
        ensureValidObjectId9(payload.orderId);
        const order = await EcommerceOrderModel.findById(payload.orderId).exec();
        if (!order) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Order not found");
      }
      const effectivePayload = {
        lineItems: payload.lineItems ? payload.lineItems.map((lineItem) => ({
          ...lineItem,
          lineTotalMinor: lineItem.quantity * lineItem.unitPriceMinor
        })) : existing.lineItems,
        taxMinor: payload.taxMinor ?? existing.taxMinor,
        discountMinor: payload.discountMinor ?? existing.discountMinor
      };
      const subtotalMinor = effectivePayload.lineItems.reduce(
        (total, lineItem) => total + lineItem.lineTotalMinor,
        0
      );
      const grandTotalMinor = Math.max(
        0,
        subtotalMinor + effectivePayload.taxMinor - effectivePayload.discountMinor
      );
      const updated = await InvoiceDocumentModelRef.findByIdAndUpdate(
        req.params.id,
        {
          ...payload,
          contactId: payload.contactId ? new import_mongoose27.default.Types.ObjectId(payload.contactId) : payload.contactId,
          dealId: payload.dealId ? new import_mongoose27.default.Types.ObjectId(payload.dealId) : payload.dealId,
          orderId: payload.orderId ? new import_mongoose27.default.Types.ObjectId(payload.orderId) : payload.orderId,
          lineItems: effectivePayload.lineItems,
          subtotalMinor,
          grandTotalMinor,
          dueAt: payload.dueAt ? new Date(payload.dueAt) : payload.dueAt
        },
        { new: true, runValidators: true }
      ).lean().exec();
      res.json(updated);
    } catch (error) {
      if (error instanceof import_zod12.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid invoice update payload"));
        return;
      }
      next(error);
    }
  }
);
router11.post(
  "/api/v1/invoices/documents/:id/transition",
  invoiceWriteRateLimiter,
  ...moduleGuards("invoices", "invoices.update"),
  async (req, res, next) => {
    try {
      ensureValidObjectId9(req.params.id);
      const payload = transitionPayloadSchema2.parse(req.body ?? {});
      const invoice = await InvoiceDocumentModelRef.findById(req.params.id).exec();
      if (!invoice) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Invoice not found");
      }
      assertInvoiceTransition(invoice.status, payload.to);
      if (payload.amountPaidMinor !== void 0) {
        if (payload.amountPaidMinor < invoice.amountPaidMinor) {
          throw new AppError(400, ERROR_CODES.BAD_REQUEST, "amountPaidMinor cannot decrease");
        }
        invoice.amountPaidMinor = payload.amountPaidMinor;
      }
      if (payload.to === "partially_paid") {
        if (payload.amountPaidMinor === void 0 || payload.amountPaidMinor <= 0 || payload.amountPaidMinor >= invoice.grandTotalMinor) {
          throw new AppError(
            400,
            ERROR_CODES.BAD_REQUEST,
            "partially_paid requires amountPaidMinor between 1 and invoice grand total - 1"
          );
        }
      }
      if (payload.to === "issued" && !invoice.issuedAt) {
        invoice.issuedAt = /* @__PURE__ */ new Date();
      }
      if (payload.to === "sent" && !invoice.sentAt) {
        invoice.sentAt = /* @__PURE__ */ new Date();
      }
      if (payload.to === "paid") {
        if (invoice.amountPaidMinor < invoice.grandTotalMinor) {
          throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invoice must be fully paid to mark as paid");
        }
        invoice.paidAt = /* @__PURE__ */ new Date();
      }
      if (payload.to === "void") {
        invoice.voidedAt = /* @__PURE__ */ new Date();
      }
      invoice.status = payload.to;
      await invoice.save();
      res.json(invoice);
    } catch (error) {
      if (error instanceof import_zod12.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid transition payload"));
        return;
      }
      next(error);
    }
  }
);
router11.get("/api/v1/invoices/insights", ...moduleGuards("invoices", "invoices.read"), async (_req, res, next) => {
  try {
    const [draft, sent, paid, overdue] = await Promise.all([
      InvoiceDocumentModelRef.countDocuments({ status: "draft" }).exec(),
      InvoiceDocumentModelRef.countDocuments({ status: "sent" }).exec(),
      InvoiceDocumentModelRef.countDocuments({ status: "paid" }).exec(),
      InvoiceDocumentModelRef.countDocuments({ status: "overdue" }).exec()
    ]);
    res.json({
      counts: { draft, sent, paid, overdue }
    });
  } catch (error) {
    next(error);
  }
});
var invoiceRoutes = router11;

// src/modules/resource/resource.handlers.ts
var import_mongoose29 = __toESM(require("mongoose"), 1);
var import_zod13 = require("zod");

// src/modules/resource/resource.model.ts
var import_mongoose28 = __toESM(require("mongoose"), 1);
var resourceRecordSchema = new import_mongoose28.Schema(
  {
    moduleKey: { type: String, enum: MODULE_KEYS, required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    status: { type: String, enum: ["active", "inactive", "archived"], default: "active" },
    data: { type: import_mongoose28.Schema.Types.Mixed, default: {} },
    createdBy: { type: String },
    updatedBy: { type: String }
  },
  { timestamps: true }
);
resourceRecordSchema.index({ moduleKey: 1, createdAt: -1 });
var ResourceRecordModel = import_mongoose28.default.models.ResourceRecord ?? import_mongoose28.default.model("ResourceRecord", resourceRecordSchema);

// src/modules/resource/resource.handlers.ts
var createSchema = import_zod13.z.object({
  title: import_zod13.z.string().min(1).max(200),
  description: import_zod13.z.string().max(2e3).optional(),
  status: import_zod13.z.enum(["active", "inactive", "archived"]).optional(),
  data: import_zod13.z.record(import_zod13.z.unknown()).optional()
});
var updateSchema = createSchema.partial().refine((payload) => Object.keys(payload).length > 0, {
  message: "At least one field is required"
});
var listSchema = import_zod13.z.object({
  page: import_zod13.z.coerce.number().int().min(1).default(1),
  limit: import_zod13.z.coerce.number().int().min(1).max(100).default(20)
});
function toModuleRecord(document) {
  return {
    id: String(document._id),
    moduleKey: document.moduleKey,
    title: document.title,
    description: document.description,
    status: document.status,
    data: document.data,
    createdBy: document.createdBy,
    updatedBy: document.updatedBy,
    createdAt: document.createdAt?.toISOString?.() ?? (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: document.updatedAt?.toISOString?.() ?? (/* @__PURE__ */ new Date()).toISOString()
  };
}
function ensureValidId(id) {
  if (!import_mongoose29.default.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid record id");
  }
}
function listModuleRecordsHandler(moduleKey) {
  return async (req, res, next) => {
    try {
      const { page, limit } = listSchema.parse(req.query);
      const skip = (page - 1) * limit;
      const [items, total] = await Promise.all([
        ResourceRecordModel.find({ moduleKey }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
        ResourceRecordModel.countDocuments({ moduleKey }).exec()
      ]);
      res.json({
        items: items.map(toModuleRecord),
        page,
        limit,
        total
      });
    } catch (error) {
      if (error instanceof import_zod13.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid list query"));
        return;
      }
      next(error);
    }
  };
}
function createModuleRecordHandler(moduleKey) {
  return async (req, res, next) => {
    try {
      const payload = createSchema.parse(req.body ?? {});
      const created = await ResourceRecordModel.create({
        moduleKey,
        ...payload,
        createdBy: req.user?.id,
        updatedBy: req.user?.id
      });
      res.status(201).json(toModuleRecord(created.toObject()));
    } catch (error) {
      if (error instanceof import_zod13.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid create payload"));
        return;
      }
      next(error);
    }
  };
}
function getModuleRecordByIdHandler(moduleKey) {
  return async (req, res, next) => {
    try {
      ensureValidId(req.params.id);
      const document = await ResourceRecordModel.findOne({
        _id: req.params.id,
        moduleKey
      }).lean().exec();
      if (!document) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Record not found");
      }
      res.json(toModuleRecord(document));
    } catch (error) {
      next(error);
    }
  };
}
function updateModuleRecordHandler(moduleKey) {
  return async (req, res, next) => {
    try {
      ensureValidId(req.params.id);
      const payload = updateSchema.parse(req.body ?? {});
      const document = await ResourceRecordModel.findOneAndUpdate(
        { _id: req.params.id, moduleKey },
        {
          ...payload,
          updatedBy: req.user?.id
        },
        { new: true }
      ).lean().exec();
      if (!document) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Record not found");
      }
      res.json(toModuleRecord(document));
    } catch (error) {
      if (error instanceof import_zod13.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid update payload"));
        return;
      }
      next(error);
    }
  };
}
function deleteModuleRecordHandler(moduleKey) {
  return async (req, res, next) => {
    try {
      ensureValidId(req.params.id);
      const document = await ResourceRecordModel.findOneAndDelete({
        _id: req.params.id,
        moduleKey
      }).lean().exec();
      if (!document) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Record not found");
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}

// src/modules/module-manifests.ts
var moduleManifests = MODULE_KEYS.map((moduleKey) => ({
  moduleKey,
  routes: [
    {
      method: "get",
      path: `/api/v1/${moduleKey}/items`,
      moduleKey,
      permission: `${moduleKey}.read`,
      handler: listModuleRecordsHandler(moduleKey)
    },
    {
      method: "post",
      path: `/api/v1/${moduleKey}/items`,
      moduleKey,
      permission: `${moduleKey}.create`,
      handler: createModuleRecordHandler(moduleKey)
    },
    {
      method: "get",
      path: `/api/v1/${moduleKey}/items/:id`,
      moduleKey,
      permission: `${moduleKey}.read`,
      handler: getModuleRecordByIdHandler(moduleKey)
    },
    {
      method: "put",
      path: `/api/v1/${moduleKey}/items/:id`,
      moduleKey,
      permission: `${moduleKey}.update`,
      handler: updateModuleRecordHandler(moduleKey)
    },
    {
      method: "delete",
      path: `/api/v1/${moduleKey}/items/:id`,
      moduleKey,
      permission: `${moduleKey}.delete`,
      handler: deleteModuleRecordHandler(moduleKey)
    }
  ]
}));

// src/modules/projects/projects.routes.ts
var import_express_rate_limit12 = __toESM(require("express-rate-limit"), 1);
var import_express13 = require("express");
var import_mongoose31 = __toESM(require("mongoose"), 1);
var import_zod14 = require("zod");

// src/modules/projects/projects.models.ts
var import_mongoose30 = __toESM(require("mongoose"), 1);
var projectSchema = new import_mongoose30.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, maxlength: 4e3 },
    status: {
      type: String,
      enum: ["planning", "active", "on_hold", "completed", "archived"],
      default: "planning",
      index: true
    },
    ownerUserId: { type: String, required: true, index: true },
    memberUserIds: { type: [String], default: [] },
    startDate: { type: Date },
    targetEndDate: { type: Date },
    actualEndDate: { type: Date },
    tags: { type: [String], default: [] },
    priority: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" }
  },
  { timestamps: true }
);
projectSchema.index({ status: 1, createdAt: -1 });
var ProjectModel = import_mongoose30.default.models.Project ?? import_mongoose30.default.model("Project", projectSchema);

// src/modules/projects/projects.routes.ts
var router12 = (0, import_express13.Router)();
var createProjectSchema = import_zod14.z.object({
  name: import_zod14.z.string().min(1).max(200).trim(),
  description: import_zod14.z.string().max(4e3).optional(),
  status: import_zod14.z.enum(["planning", "active", "on_hold", "completed", "archived"]).default("planning"),
  ownerUserId: import_zod14.z.string().min(1).optional(),
  memberUserIds: import_zod14.z.array(import_zod14.z.string().min(1)).max(100).default([]),
  startDate: import_zod14.z.coerce.date().optional(),
  targetEndDate: import_zod14.z.coerce.date().optional(),
  actualEndDate: import_zod14.z.coerce.date().optional(),
  tags: import_zod14.z.array(import_zod14.z.string().min(1).max(50)).max(30).default([]),
  priority: import_zod14.z.enum(["low", "medium", "high", "critical"]).default("medium")
});
var updateProjectSchema = import_zod14.z.object({
  name: import_zod14.z.string().min(1).max(200).trim().optional(),
  description: import_zod14.z.string().max(4e3).optional(),
  ownerUserId: import_zod14.z.string().min(1).optional(),
  memberUserIds: import_zod14.z.array(import_zod14.z.string().min(1)).optional(),
  startDate: import_zod14.z.coerce.date().nullable().optional(),
  targetEndDate: import_zod14.z.coerce.date().nullable().optional(),
  actualEndDate: import_zod14.z.coerce.date().nullable().optional(),
  tags: import_zod14.z.array(import_zod14.z.string().min(1).max(50)).max(30).optional(),
  priority: import_zod14.z.enum(["low", "medium", "high", "critical"]).optional()
});
var transitionProjectSchema = import_zod14.z.object({
  to: import_zod14.z.enum(["planning", "active", "on_hold", "completed", "archived"]),
  note: import_zod14.z.string().max(1e3).optional()
});
var addMemberSchema = import_zod14.z.object({
  userId: import_zod14.z.string().min(1)
});
var listProjectsQuerySchema = import_zod14.z.object({
  page: import_zod14.z.coerce.number().int().min(1).default(1),
  limit: import_zod14.z.coerce.number().int().min(1).max(100).default(50),
  status: import_zod14.z.enum(["planning", "active", "on_hold", "completed", "archived"]).optional()
});
var projectWriteRateLimiter = (0, import_express_rate_limit12.default)({
  windowMs: 60 * 1e3,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});
function ensureValidObjectId10(id) {
  if (!import_mongoose31.default.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid id");
  }
}
function assertAllowedTransition2(from, to) {
  const allowedTransitions = {
    planning: ["active", "archived"],
    active: ["on_hold", "completed", "archived"],
    on_hold: ["active", "archived"],
    completed: ["archived"],
    archived: []
  };
  const allowed = allowedTransitions[from] ?? [];
  if (!allowed.includes(to)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, `Invalid transition ${from} -> ${to}`);
  }
}
router12.get(
  "/api/v1/projects/projects",
  ...moduleGuards("projects", "projects.read"),
  async (req, res, next) => {
    try {
      const { page, limit, status } = listProjectsQuerySchema.parse(req.query ?? {});
      const skip = (page - 1) * limit;
      const filter = status ? { status } : {};
      const [total, items] = await Promise.all([
        ProjectModel.countDocuments(filter).exec(),
        ProjectModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec()
      ]);
      res.json({
        items,
        page,
        limit,
        total
      });
    } catch (error) {
      if (error instanceof import_zod14.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid project list query"));
        return;
      }
      next(error);
    }
  }
);
router12.post(
  "/api/v1/projects/projects",
  projectWriteRateLimiter,
  ...moduleGuards("projects", "projects.create"),
  async (req, res, next) => {
    try {
      const payload = createProjectSchema.parse(req.body ?? {});
      const created = await ProjectModel.create({ ...payload, ownerUserId: req.user.id });
      res.status(201).json(created.toObject());
    } catch (error) {
      if (error instanceof import_zod14.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid project payload"));
        return;
      }
      next(error);
    }
  }
);
router12.get(
  "/api/v1/projects/projects/:id",
  ...moduleGuards("projects", "projects.read"),
  async (req, res, next) => {
    try {
      ensureValidObjectId10(req.params.id);
      const project = await ProjectModel.findById(req.params.id).lean().exec();
      if (!project) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Project not found");
      }
      res.json(project);
    } catch (error) {
      next(error);
    }
  }
);
router12.patch(
  "/api/v1/projects/projects/:id",
  projectWriteRateLimiter,
  ...moduleGuards("projects", "projects.update"),
  async (req, res, next) => {
    try {
      ensureValidObjectId10(req.params.id);
      const payload = updateProjectSchema.parse(req.body ?? {});
      const existingProject = await ProjectModel.findById(req.params.id).select({ status: 1 }).exec();
      if (!existingProject) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Project not found");
      }
      if (existingProject.status === "archived") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Archived projects cannot be updated");
      }
      const updatePayload = { ...payload };
      const unsetFields = {};
      if (payload.startDate === null) {
        delete updatePayload.startDate;
        unsetFields.startDate = "";
      }
      if (payload.targetEndDate === null) {
        delete updatePayload.targetEndDate;
        unsetFields.targetEndDate = "";
      }
      if (payload.actualEndDate === null) {
        delete updatePayload.actualEndDate;
        unsetFields.actualEndDate = "";
      }
      const updateOperation = Object.keys(unsetFields).length > 0 ? {
        $set: updatePayload,
        $unset: unsetFields
      } : {
        $set: updatePayload
      };
      const updated = await ProjectModel.findByIdAndUpdate(req.params.id, updateOperation, {
        new: true,
        runValidators: true
      }).lean().exec();
      if (!updated) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Project not found");
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof import_zod14.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid project update payload"));
        return;
      }
      next(error);
    }
  }
);
router12.post(
  "/api/v1/projects/projects/:id/transition",
  projectWriteRateLimiter,
  ...moduleGuards("projects", "projects.update"),
  async (req, res, next) => {
    try {
      ensureValidObjectId10(req.params.id);
      const payload = transitionProjectSchema.parse(req.body ?? {});
      const project = await ProjectModel.findById(req.params.id).exec();
      if (!project) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Project not found");
      }
      assertAllowedTransition2(project.status, payload.to);
      project.status = payload.to;
      if (payload.to === "completed" && !project.actualEndDate) {
        project.actualEndDate = /* @__PURE__ */ new Date();
      }
      await project.save();
      res.json(project.toObject());
    } catch (error) {
      if (error instanceof import_zod14.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid project transition payload"));
        return;
      }
      next(error);
    }
  }
);
router12.delete(
  "/api/v1/projects/projects/:id",
  projectWriteRateLimiter,
  ...moduleGuards("projects", "projects.delete"),
  async (req, res, next) => {
    try {
      ensureValidObjectId10(req.params.id);
      const project = await ProjectModel.findById(req.params.id).exec();
      if (!project) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Project not found");
      }
      if (project.status !== "archived") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Only archived projects can be deleted");
      }
      await ProjectModel.deleteOne({ _id: project._id }).exec();
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);
router12.post(
  "/api/v1/projects/projects/:id/members",
  projectWriteRateLimiter,
  ...moduleGuards("projects", "projects.update"),
  async (req, res, next) => {
    try {
      ensureValidObjectId10(req.params.id);
      const payload = addMemberSchema.parse(req.body ?? {});
      const project = await ProjectModel.findById(req.params.id).exec();
      if (!project) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Project not found");
      }
      if (project.status === "archived") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Cannot add members to archived projects");
      }
      if (project.memberUserIds.includes(payload.userId)) {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "User is already a member");
      }
      const updated = await ProjectModel.findByIdAndUpdate(
        req.params.id,
        { $addToSet: { memberUserIds: payload.userId } },
        { new: true, runValidators: true }
      ).lean().exec();
      res.json(updated);
    } catch (error) {
      if (error instanceof import_zod14.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid add member payload"));
        return;
      }
      next(error);
    }
  }
);
router12.delete(
  "/api/v1/projects/projects/:id/members/:userId",
  projectWriteRateLimiter,
  ...moduleGuards("projects", "projects.update"),
  async (req, res, next) => {
    try {
      ensureValidObjectId10(req.params.id);
      const { userId } = req.params;
      const project = await ProjectModel.findById(req.params.id).exec();
      if (!project) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Project not found");
      }
      if (project.status === "archived") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Cannot remove members from archived projects");
      }
      if (!project.memberUserIds.includes(userId)) {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "User is not a member");
      }
      const updated = await ProjectModel.findByIdAndUpdate(
        req.params.id,
        { $pull: { memberUserIds: userId } },
        { new: true, runValidators: true }
      ).lean().exec();
      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);
router12.get(
  "/api/v1/projects/insights",
  ...moduleGuards("projects", "projects.read"),
  async (_req, res, next) => {
    try {
      const [planning, active, onHold, completed, archived, totalProjects] = await Promise.all([
        ProjectModel.countDocuments({ status: "planning" }).exec(),
        ProjectModel.countDocuments({ status: "active" }).exec(),
        ProjectModel.countDocuments({ status: "on_hold" }).exec(),
        ProjectModel.countDocuments({ status: "completed" }).exec(),
        ProjectModel.countDocuments({ status: "archived" }).exec(),
        ProjectModel.countDocuments().exec()
      ]);
      res.json({
        counts: {
          planning,
          active,
          onHold,
          completed,
          archived,
          totalProjects
        }
      });
    } catch (error) {
      next(error);
    }
  }
);
var projectRoutes = router12;

// src/modules/support-tickets/support-tickets.routes.ts
var import_crypto4 = require("crypto");
var import_express_rate_limit13 = __toESM(require("express-rate-limit"), 1);
var import_express14 = require("express");
var import_mongoose33 = __toESM(require("mongoose"), 1);
var import_zod15 = require("zod");

// src/modules/support-tickets/support-tickets.models.ts
var import_mongoose32 = __toESM(require("mongoose"), 1);
var supportTicketCommentSchema = new import_mongoose32.Schema(
  {
    authorUserId: { type: String, required: true },
    authorEmail: { type: String, required: true },
    message: { type: String, required: true },
    isInternal: { type: Boolean, default: false },
    createdAt: { type: Date, default: () => /* @__PURE__ */ new Date() }
  },
  { _id: false }
);
var supportTicketSchema = new import_mongoose32.Schema(
  {
    ticketNumber: { type: String, required: true, unique: true, index: true },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    requesterName: { type: String, required: true, trim: true },
    requesterEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    channel: { type: String, enum: ["email", "chat", "phone", "web"], default: "web", index: true },
    priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium", index: true },
    status: {
      type: String,
      enum: ["open", "in_progress", "pending_customer", "resolved", "closed"],
      default: "open",
      index: true
    },
    tags: { type: [String], default: [] },
    assignedToUserId: { type: String },
    firstResponseAt: { type: Date },
    resolvedAt: { type: Date },
    closedAt: { type: Date },
    comments: { type: [supportTicketCommentSchema], default: [] }
  },
  { timestamps: true }
);
supportTicketSchema.index({ status: 1, priority: 1, createdAt: -1 });
var SupportTicketModel = import_mongoose32.default.models.SupportTicket ?? import_mongoose32.default.model("SupportTicket", supportTicketSchema);

// src/modules/support-tickets/support-tickets.routes.ts
var router13 = (0, import_express14.Router)();
var createTicketSchema = import_zod15.z.object({
  subject: import_zod15.z.string().min(1).max(200),
  description: import_zod15.z.string().min(1).max(8e3),
  requesterName: import_zod15.z.string().min(1).max(160),
  requesterEmail: import_zod15.z.string().email(),
  channel: import_zod15.z.enum(["email", "chat", "phone", "web"]).default("web"),
  priority: import_zod15.z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  tags: import_zod15.z.array(import_zod15.z.string().min(1).max(40)).max(20).default([]),
  assignedToUserId: import_zod15.z.string().min(1).max(120).optional()
});
var updateTicketSchema = import_zod15.z.object({
  subject: import_zod15.z.string().min(1).max(200).optional(),
  description: import_zod15.z.string().min(1).max(8e3).optional(),
  requesterName: import_zod15.z.string().min(1).max(160).optional(),
  requesterEmail: import_zod15.z.string().email().optional(),
  channel: import_zod15.z.enum(["email", "chat", "phone", "web"]).optional(),
  priority: import_zod15.z.enum(["low", "medium", "high", "urgent"]).optional(),
  tags: import_zod15.z.array(import_zod15.z.string().min(1).max(40)).max(20).optional(),
  assignedToUserId: import_zod15.z.string().min(1).max(120).nullable().optional()
});
var transitionTicketSchema = import_zod15.z.object({
  to: import_zod15.z.enum(["open", "in_progress", "pending_customer", "resolved", "closed"]),
  note: import_zod15.z.string().max(1e3).optional()
});
var addCommentSchema = import_zod15.z.object({
  message: import_zod15.z.string().min(1).max(4e3),
  isInternal: import_zod15.z.boolean().default(false)
});
var listTicketsQuerySchema = import_zod15.z.object({
  page: import_zod15.z.coerce.number().int().min(1).default(1),
  limit: import_zod15.z.coerce.number().int().min(1).max(100).default(50)
});
var supportTicketWriteRateLimiter = (0, import_express_rate_limit13.default)({
  windowMs: 60 * 1e3,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});
function ensureValidObjectId11(id) {
  if (!import_mongoose33.default.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid id");
  }
}
function assertAllowedTransition3(from, to) {
  const allowedTransitions = {
    open: ["in_progress", "pending_customer", "resolved", "closed"],
    in_progress: ["pending_customer", "resolved", "closed"],
    pending_customer: ["in_progress", "resolved", "closed"],
    resolved: ["in_progress", "closed"],
    closed: []
  };
  const allowed = allowedTransitions[from] ?? [];
  if (!allowed.includes(to)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, `Invalid transition ${from} -> ${to}`);
  }
}
function nextTicketNumber() {
  return `TKT-${Date.now()}-${(0, import_crypto4.randomUUID)().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
}
function toTicketResponse(ticket, includeInternalComments) {
  const rawTicket = typeof ticket?.toObject === "function" ? ticket.toObject() : ticket;
  const comments = Array.isArray(rawTicket?.comments) ? rawTicket.comments : [];
  return {
    ...rawTicket,
    comments: includeInternalComments ? comments : comments.filter((item) => !item.isInternal)
  };
}
router13.get(
  "/api/v1/support-tickets/tickets",
  ...moduleGuards("support-tickets", "support-tickets.read"),
  async (req, res, next) => {
    try {
      const { page, limit } = listTicketsQuerySchema.parse(req.query ?? {});
      const skip = (page - 1) * limit;
      const [total, items] = await Promise.all([
        SupportTicketModel.countDocuments().exec(),
        SupportTicketModel.find({}, { comments: 0 }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec()
      ]);
      res.json({
        items,
        page,
        limit,
        total
      });
    } catch (error) {
      if (error instanceof import_zod15.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid support ticket list query"));
        return;
      }
      next(error);
    }
  }
);
router13.post(
  "/api/v1/support-tickets/tickets",
  supportTicketWriteRateLimiter,
  ...moduleGuards("support-tickets", "support-tickets.create"),
  async (req, res, next) => {
    try {
      const payload = createTicketSchema.parse(req.body ?? {});
      const created = await SupportTicketModel.create({
        ticketNumber: nextTicketNumber(),
        ...payload,
        comments: [
          {
            authorUserId: req.user.id,
            authorEmail: req.user.email,
            message: "Ticket created",
            isInternal: true,
            createdAt: /* @__PURE__ */ new Date()
          }
        ]
      });
      res.status(201).json(toTicketResponse(created, req.user.role === "super_admin"));
    } catch (error) {
      if (error instanceof import_zod15.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid support ticket payload"));
        return;
      }
      next(error);
    }
  }
);
router13.patch(
  "/api/v1/support-tickets/tickets/:id",
  supportTicketWriteRateLimiter,
  ...moduleGuards("support-tickets", "support-tickets.update"),
  async (req, res, next) => {
    try {
      ensureValidObjectId11(req.params.id);
      const payload = updateTicketSchema.parse(req.body ?? {});
      const existingTicket = await SupportTicketModel.findById(req.params.id).select({ status: 1 }).exec();
      if (!existingTicket) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Support ticket not found");
      }
      if (existingTicket.status === "closed") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Closed tickets cannot be updated");
      }
      const updatePayload = { ...payload };
      if (payload.assignedToUserId === null) {
        delete updatePayload.assignedToUserId;
      }
      const updateOperation = payload.assignedToUserId === null ? {
        $set: updatePayload,
        $unset: { assignedToUserId: "" }
      } : {
        $set: updatePayload
      };
      const updated = await SupportTicketModel.findByIdAndUpdate(req.params.id, updateOperation, {
        new: true,
        runValidators: true
      }).lean().exec();
      if (!updated) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Support ticket not found");
      }
      res.json(toTicketResponse(updated, req.user.role === "super_admin"));
    } catch (error) {
      if (error instanceof import_zod15.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid support ticket update payload"));
        return;
      }
      next(error);
    }
  }
);
router13.post(
  "/api/v1/support-tickets/tickets/:id/transition",
  supportTicketWriteRateLimiter,
  ...moduleGuards("support-tickets", "support-tickets.update"),
  async (req, res, next) => {
    try {
      ensureValidObjectId11(req.params.id);
      const payload = transitionTicketSchema.parse(req.body ?? {});
      const ticket = await SupportTicketModel.findById(req.params.id).exec();
      if (!ticket) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Support ticket not found");
      }
      assertAllowedTransition3(ticket.status, payload.to);
      ticket.status = payload.to;
      if (payload.to === "in_progress" && !ticket.firstResponseAt) {
        ticket.firstResponseAt = /* @__PURE__ */ new Date();
      }
      if (payload.to === "resolved" && !ticket.resolvedAt) {
        ticket.resolvedAt = /* @__PURE__ */ new Date();
      }
      if (payload.to === "closed") {
        ticket.closedAt = /* @__PURE__ */ new Date();
        if (!ticket.resolvedAt) {
          ticket.resolvedAt = /* @__PURE__ */ new Date();
        }
      }
      if (payload.note && payload.note.trim()) {
        ticket.comments.push({
          authorUserId: req.user.id,
          authorEmail: req.user.email,
          message: payload.note.trim(),
          isInternal: req.user.role === "super_admin",
          createdAt: /* @__PURE__ */ new Date()
        });
      }
      await ticket.save();
      res.json(toTicketResponse(ticket, req.user.role === "super_admin"));
    } catch (error) {
      if (error instanceof import_zod15.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid support ticket transition payload"));
        return;
      }
      next(error);
    }
  }
);
router13.post(
  "/api/v1/support-tickets/tickets/:id/comments",
  supportTicketWriteRateLimiter,
  ...moduleGuards("support-tickets", "support-tickets.update"),
  async (req, res, next) => {
    try {
      ensureValidObjectId11(req.params.id);
      const payload = addCommentSchema.parse(req.body ?? {});
      const ticket = await SupportTicketModel.findById(req.params.id).exec();
      if (!ticket) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Support ticket not found");
      }
      if (ticket.status === "closed") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Closed tickets cannot be commented");
      }
      const isInternalComment = req.user.role === "super_admin" ? payload.isInternal : false;
      ticket.comments.push({
        authorUserId: req.user.id,
        authorEmail: req.user.email,
        message: payload.message.trim(),
        isInternal: isInternalComment,
        createdAt: /* @__PURE__ */ new Date()
      });
      if (!ticket.firstResponseAt) {
        ticket.firstResponseAt = /* @__PURE__ */ new Date();
      }
      await ticket.save();
      res.json(toTicketResponse(ticket, req.user.role === "super_admin"));
    } catch (error) {
      if (error instanceof import_zod15.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid support ticket comment payload"));
        return;
      }
      next(error);
    }
  }
);
router13.delete(
  "/api/v1/support-tickets/tickets/:id",
  supportTicketWriteRateLimiter,
  ...moduleGuards("support-tickets", "support-tickets.delete"),
  async (req, res, next) => {
    try {
      ensureValidObjectId11(req.params.id);
      const ticket = await SupportTicketModel.findById(req.params.id).exec();
      if (!ticket) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Support ticket not found");
      }
      if (ticket.status !== "closed") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Only closed tickets can be deleted");
      }
      await SupportTicketModel.deleteOne({ _id: ticket._id }).exec();
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);
router13.get(
  "/api/v1/support-tickets/insights",
  ...moduleGuards("support-tickets", "support-tickets.read"),
  async (_req, res, next) => {
    try {
      const [open, inProgress, pendingCustomer, resolved, closed, urgentOpen] = await Promise.all([
        SupportTicketModel.countDocuments({ status: "open" }).exec(),
        SupportTicketModel.countDocuments({ status: "in_progress" }).exec(),
        SupportTicketModel.countDocuments({ status: "pending_customer" }).exec(),
        SupportTicketModel.countDocuments({ status: "resolved" }).exec(),
        SupportTicketModel.countDocuments({ status: "closed" }).exec(),
        SupportTicketModel.countDocuments({
          status: { $in: ["open", "in_progress", "pending_customer"] },
          priority: "urgent"
        }).exec()
      ]);
      res.json({
        counts: {
          open,
          inProgress,
          pendingCustomer,
          resolved,
          closed,
          urgentOpen
        }
      });
    } catch (error) {
      next(error);
    }
  }
);
var supportTicketRoutes = router13;

// src/modules/menu/menu.routes.ts
var import_express15 = require("express");
var import_express_rate_limit14 = __toESM(require("express-rate-limit"), 1);
var import_zod16 = require("zod");

// src/modules/menu/menu.model.ts
var import_mongoose34 = __toESM(require("mongoose"), 1);
var menuGroupSchema = new import_mongoose34.Schema(
  {
    clientCode: { type: String, required: true },
    name: { type: String, required: true, maxlength: 100 },
    slug: { type: String, required: true, maxlength: 100 },
    order: { type: Number, required: true, default: 0 },
    isLink: { type: Boolean, required: true, default: false },
    route: { type: String, maxlength: 255 },
    icon: { type: String, maxlength: 100 },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true }
  },
  { timestamps: true }
);
menuGroupSchema.index({ clientCode: 1, slug: 1 }, { unique: true });
menuGroupSchema.index({ clientCode: 1, order: 1 });
var MenuGroupModel = import_mongoose34.default.models.MenuGroup ?? import_mongoose34.default.model("MenuGroup", menuGroupSchema);
var menuItemSchema = new import_mongoose34.Schema(
  {
    clientCode: { type: String, required: true },
    groupId: { type: import_mongoose34.Schema.Types.ObjectId, ref: "MenuGroup", required: true },
    name: { type: String, required: true, maxlength: 100 },
    slug: { type: String, required: true, maxlength: 100 },
    route: { type: String, required: true, maxlength: 255 },
    icon: { type: String, maxlength: 100, default: "" },
    parentId: { type: import_mongoose34.Schema.Types.ObjectId, ref: "MenuItem", default: null },
    order: { type: Number, required: true, default: 0 },
    isParent: { type: Boolean, required: true, default: false },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true }
  },
  { timestamps: true }
);
menuItemSchema.index({ clientCode: 1, groupId: 1, slug: 1 }, { unique: true });
menuItemSchema.index({ clientCode: 1, groupId: 1, order: 1 });
var MenuItemModel = import_mongoose34.default.models.MenuItem ?? import_mongoose34.default.model("MenuItem", menuItemSchema);

// src/modules/menu/menu.service.ts
function toMenuItemResponse(doc) {
  return {
    _id: String(doc._id),
    name: doc.name,
    slug: doc.slug,
    route: doc.route,
    icon: doc.icon,
    parentId: doc.parentId ? String(doc.parentId) : null,
    groupId: String(doc.groupId),
    order: doc.order,
    isParent: doc.isParent
  };
}
function buildMenuTree(items) {
  const map = /* @__PURE__ */ new Map();
  const roots = [];
  for (const item of items) {
    map.set(item._id, { ...item, children: [] });
  }
  for (const item of items) {
    const node = map.get(item._id);
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}
var MenuService = class {
  get clientCode() {
    return env.CLIENT_CODE;
  }
  async listGroupsWithMenus() {
    const groups = await MenuGroupModel.find({ clientCode: this.clientCode }).sort({ order: 1 }).lean().exec();
    const items = await MenuItemModel.find({ clientCode: this.clientCode }).sort({ order: 1 }).lean().exec();
    const itemsByGroup = /* @__PURE__ */ new Map();
    for (const item of items) {
      const gid = String(item.groupId);
      const arr = itemsByGroup.get(gid) ?? [];
      arr.push(toMenuItemResponse(item));
      itemsByGroup.set(gid, arr);
    }
    return groups.map((g) => ({
      _id: String(g._id),
      name: g.name,
      slug: g.slug,
      order: g.order,
      isLink: g.isLink,
      route: g.route,
      icon: g.icon,
      menus: buildMenuTree(itemsByGroup.get(String(g._id)) ?? [])
    }));
  }
  // ── Group CRUD ─────────────────────────────────────────────────
  async createGroup(payload, userId) {
    const doc = await MenuGroupModel.create({
      clientCode: this.clientCode,
      ...payload,
      createdBy: userId,
      updatedBy: userId
    });
    return {
      _id: String(doc._id),
      name: doc.name,
      slug: doc.slug,
      order: doc.order,
      isLink: doc.isLink,
      route: doc.route,
      icon: doc.icon,
      menus: []
    };
  }
  async updateGroup(id, payload, userId) {
    const doc = await MenuGroupModel.findOneAndUpdate(
      { _id: id, clientCode: this.clientCode },
      { $set: { ...payload, updatedBy: userId } },
      { new: true }
    ).lean().exec();
    if (!doc) return null;
    const items = await MenuItemModel.find({ clientCode: this.clientCode, groupId: id }).sort({ order: 1 }).lean().exec();
    return {
      _id: String(doc._id),
      name: doc.name,
      slug: doc.slug,
      order: doc.order,
      isLink: doc.isLink,
      route: doc.route,
      icon: doc.icon,
      menus: buildMenuTree(items.map(toMenuItemResponse))
    };
  }
  async deleteGroup(id) {
    const result = await MenuGroupModel.deleteOne({ _id: id, clientCode: this.clientCode }).exec();
    if (result.deletedCount > 0) {
      await MenuItemModel.deleteMany({ clientCode: this.clientCode, groupId: id }).exec();
      return true;
    }
    return false;
  }
  // ── Item CRUD ──────────────────────────────────────────────────
  async createItem(payload, userId) {
    const doc = await MenuItemModel.create({
      clientCode: this.clientCode,
      ...payload,
      parentId: payload.parentId ?? null,
      createdBy: userId,
      updatedBy: userId
    });
    return toMenuItemResponse(doc.toObject());
  }
  async updateItem(id, payload, userId) {
    const doc = await MenuItemModel.findOneAndUpdate(
      { _id: id, clientCode: this.clientCode },
      { $set: { ...payload, updatedBy: userId } },
      { new: true }
    ).lean().exec();
    return doc ? toMenuItemResponse(doc) : null;
  }
  async deleteItem(id) {
    const result = await MenuItemModel.deleteOne({ _id: id, clientCode: this.clientCode }).exec();
    if (result.deletedCount > 0) {
      await MenuItemModel.updateMany(
        { clientCode: this.clientCode, parentId: id },
        { $set: { parentId: null } }
      ).exec();
      return true;
    }
    return false;
  }
  async reorderItem(id, newOrder, userId) {
    const result = await MenuItemModel.updateOne(
      { _id: id, clientCode: this.clientCode },
      { $set: { order: newOrder, updatedBy: userId } }
    ).exec();
    return result.matchedCount > 0;
  }
  async reorderGroup(id, newOrder, userId) {
    const result = await MenuGroupModel.updateOne(
      { _id: id, clientCode: this.clientCode },
      { $set: { order: newOrder, updatedBy: userId } }
    ).exec();
    return result.matchedCount > 0;
  }
};
var menuService = new MenuService();

// src/modules/menu/menu.routes.ts
var router14 = (0, import_express15.Router)();
var menuWriteRateLimiter = (0, import_express_rate_limit14.default)({
  windowMs: 60 * 1e3,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
});
var createGroupSchema = import_zod16.z.object({
  name: import_zod16.z.string().min(1).max(100),
  slug: import_zod16.z.string().min(1).max(100),
  order: import_zod16.z.number().int().min(0).default(0),
  isLink: import_zod16.z.boolean().default(false),
  route: import_zod16.z.string().max(255).optional(),
  icon: import_zod16.z.string().max(100).optional()
});
var updateGroupSchema = import_zod16.z.object({
  name: import_zod16.z.string().min(1).max(100).optional(),
  slug: import_zod16.z.string().min(1).max(100).optional(),
  order: import_zod16.z.number().int().min(0).optional(),
  isLink: import_zod16.z.boolean().optional(),
  route: import_zod16.z.string().max(255).optional(),
  icon: import_zod16.z.string().max(100).optional()
});
var createItemSchema = import_zod16.z.object({
  groupId: import_zod16.z.string().min(1),
  name: import_zod16.z.string().min(1).max(100),
  slug: import_zod16.z.string().min(1).max(100),
  route: import_zod16.z.string().min(1).max(255),
  icon: import_zod16.z.string().max(100).default(""),
  parentId: import_zod16.z.string().nullable().optional(),
  order: import_zod16.z.number().int().min(0).default(0),
  isParent: import_zod16.z.boolean().default(false)
});
var updateItemSchema = import_zod16.z.object({
  name: import_zod16.z.string().min(1).max(100).optional(),
  slug: import_zod16.z.string().min(1).max(100).optional(),
  route: import_zod16.z.string().min(1).max(255).optional(),
  icon: import_zod16.z.string().max(100).optional(),
  parentId: import_zod16.z.string().nullable().optional(),
  order: import_zod16.z.number().int().min(0).optional(),
  isParent: import_zod16.z.boolean().optional()
});
var reorderSchema = import_zod16.z.object({
  order: import_zod16.z.number().int().min(0)
});
router14.get(
  "/api/v1/menus/groups",
  authenticateJwt,
  requireRole(["super_admin", "admin"]),
  async (_req, res, next) => {
    try {
      const groups = await menuService.listGroupsWithMenus();
      res.json({ groups });
    } catch (error) {
      next(error);
    }
  }
);
router14.post(
  "/api/v1/menus/groups",
  menuWriteRateLimiter,
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req, res, next) => {
    try {
      const payload = createGroupSchema.parse(req.body ?? {});
      const group = await menuService.createGroup(payload, req.user.id);
      res.status(201).json(group);
    } catch (error) {
      if (error instanceof import_zod16.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid menu group payload"));
        return;
      }
      next(error);
    }
  }
);
router14.put(
  "/api/v1/menus/groups/:id",
  menuWriteRateLimiter,
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req, res, next) => {
    try {
      const payload = updateGroupSchema.parse(req.body ?? {});
      const group = await menuService.updateGroup(req.params.id, payload, req.user.id);
      if (!group) {
        next(new AppError(404, ERROR_CODES.NOT_FOUND, "Menu group not found"));
        return;
      }
      res.json(group);
    } catch (error) {
      if (error instanceof import_zod16.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid menu group payload"));
        return;
      }
      next(error);
    }
  }
);
router14.delete(
  "/api/v1/menus/groups/:id",
  menuWriteRateLimiter,
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req, res, next) => {
    try {
      const deleted = await menuService.deleteGroup(req.params.id);
      if (!deleted) {
        next(new AppError(404, ERROR_CODES.NOT_FOUND, "Menu group not found"));
        return;
      }
      res.json({ deleted: true });
    } catch (error) {
      next(error);
    }
  }
);
router14.post(
  "/api/v1/menus/items",
  menuWriteRateLimiter,
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req, res, next) => {
    try {
      const payload = createItemSchema.parse(req.body ?? {});
      const item = await menuService.createItem(payload, req.user.id);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof import_zod16.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid menu item payload"));
        return;
      }
      next(error);
    }
  }
);
router14.put(
  "/api/v1/menus/items/:id",
  menuWriteRateLimiter,
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req, res, next) => {
    try {
      const payload = updateItemSchema.parse(req.body ?? {});
      const item = await menuService.updateItem(req.params.id, payload, req.user.id);
      if (!item) {
        next(new AppError(404, ERROR_CODES.NOT_FOUND, "Menu item not found"));
        return;
      }
      res.json(item);
    } catch (error) {
      if (error instanceof import_zod16.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid menu item payload"));
        return;
      }
      next(error);
    }
  }
);
router14.delete(
  "/api/v1/menus/items/:id",
  menuWriteRateLimiter,
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req, res, next) => {
    try {
      const deleted = await menuService.deleteItem(req.params.id);
      if (!deleted) {
        next(new AppError(404, ERROR_CODES.NOT_FOUND, "Menu item not found"));
        return;
      }
      res.json({ deleted: true });
    } catch (error) {
      next(error);
    }
  }
);
router14.patch(
  "/api/v1/menus/items/:id/reorder",
  menuWriteRateLimiter,
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req, res, next) => {
    try {
      const { order } = reorderSchema.parse(req.body ?? {});
      const updated = await menuService.reorderItem(req.params.id, order, req.user.id);
      if (!updated) {
        next(new AppError(404, ERROR_CODES.NOT_FOUND, "Menu item not found"));
        return;
      }
      res.json({ updated: true });
    } catch (error) {
      if (error instanceof import_zod16.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid reorder payload"));
        return;
      }
      next(error);
    }
  }
);
router14.patch(
  "/api/v1/menus/groups/:id/reorder",
  menuWriteRateLimiter,
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req, res, next) => {
    try {
      const { order } = reorderSchema.parse(req.body ?? {});
      const updated = await menuService.reorderGroup(req.params.id, order, req.user.id);
      if (!updated) {
        next(new AppError(404, ERROR_CODES.NOT_FOUND, "Menu group not found"));
        return;
      }
      res.json({ updated: true });
    } catch (error) {
      if (error instanceof import_zod16.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid reorder payload"));
        return;
      }
      next(error);
    }
  }
);
var menuRoutes = router14;

// src/modules/system/system.routes.ts
var import_bcryptjs3 = __toESM(require("bcryptjs"), 1);
var import_express16 = require("express");
var import_express_rate_limit15 = __toESM(require("express-rate-limit"), 1);
var import_zod17 = require("zod");

// src/core/audit/audit-log.model.ts
var import_mongoose35 = __toESM(require("mongoose"), 1);
var auditLogSchema = new import_mongoose35.Schema(
  {
    action: { type: String, required: true, index: true },
    entity: { type: String, required: true, index: true },
    entityId: { type: String },
    userId: { type: String, required: true, index: true },
    userEmail: { type: String },
    before: { type: import_mongoose35.Schema.Types.Mixed },
    after: { type: import_mongoose35.Schema.Types.Mixed },
    metadata: { type: import_mongoose35.Schema.Types.Mixed },
    createdAt: { type: Date, default: () => /* @__PURE__ */ new Date(), index: true }
  },
  { timestamps: false }
);
auditLogSchema.index({ entity: 1, action: 1, createdAt: -1 });
var AuditLogModel = import_mongoose35.default.models.AuditLog ?? import_mongoose35.default.model("AuditLog", auditLogSchema);

// src/core/audit/audit-log.service.ts
var AuditLogService = class {
  async log(entry) {
    await AuditLogModel.create(entry);
  }
  async getRecent(options = {}) {
    const filter = {};
    if (options.entity) {
      filter.entity = options.entity;
    }
    const limit = Math.min(options.limit ?? 50, 200);
    const offset = options.offset ?? 0;
    const [items, total] = await Promise.all([
      AuditLogModel.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).lean().exec(),
      AuditLogModel.countDocuments(filter).exec()
    ]);
    return { items, total };
  }
};
var auditLogService = new AuditLogService();

// src/core/feature-flags/ui-feature-flags.model.ts
var import_mongoose36 = __toESM(require("mongoose"), 1);
var uiFeatureFlagsSchema = new import_mongoose36.Schema(
  {
    clientCode: { type: String, required: true, unique: true },
    flags: { type: import_mongoose36.Schema.Types.Mixed, required: true, default: {} },
    updatedBy: { type: String }
  },
  { timestamps: true }
);
var UIFeatureFlagsModel = import_mongoose36.default.models.UIFeatureFlags ?? import_mongoose36.default.model("UIFeatureFlags", uiFeatureFlagsSchema);

// src/core/feature-flags/ui-feature-flags.service.ts
var UIFeatureFlagsService = class {
  async getFlags() {
    const doc = await UIFeatureFlagsModel.findOne({
      clientCode: env.CLIENT_CODE
    }).exec();
    if (!doc) {
      return { ...DEFAULT_UI_FEATURE_FLAGS };
    }
    const merged = { ...DEFAULT_UI_FEATURE_FLAGS };
    for (const key of UI_FEATURE_FLAG_KEYS) {
      if (key in doc.flags) {
        merged[key] = Boolean(doc.flags[key]);
      }
    }
    return merged;
  }
  async upsertFlags(flags, updatedBy) {
    const sanitized = {};
    for (const key of UI_FEATURE_FLAG_KEYS) {
      if (key in flags) {
        sanitized[key] = Boolean(flags[key]);
      }
    }
    const doc = await UIFeatureFlagsModel.findOne({
      clientCode: env.CLIENT_CODE
    }).exec();
    if (doc) {
      const existing = doc.flags ?? {};
      doc.flags = { ...existing, ...sanitized };
      doc.updatedBy = updatedBy;
      await doc.save();
    } else {
      await UIFeatureFlagsModel.create({
        clientCode: env.CLIENT_CODE,
        flags: { ...DEFAULT_UI_FEATURE_FLAGS, ...sanitized },
        updatedBy
      });
    }
    return this.getFlags();
  }
};
var uiFeatureFlagsService = new UIFeatureFlagsService();

// src/modules/tasks/tasks.models.ts
var import_mongoose37 = __toESM(require("mongoose"), 1);
var taskSchema = new import_mongoose37.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 300 },
    description: { type: String, maxlength: 8e3 },
    projectId: { type: import_mongoose37.Schema.Types.ObjectId, ref: "Project", index: true },
    status: {
      type: String,
      enum: ["todo", "in_progress", "review", "done", "cancelled"],
      default: "todo",
      index: true
    },
    priority: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium", index: true },
    assigneeUserId: { type: String, index: true },
    reporterUserId: { type: String, required: true },
    dueDate: { type: Date },
    completedAt: { type: Date },
    tags: { type: [String], default: [] },
    estimatedHours: { type: Number, min: 0 }
  },
  { timestamps: true }
);
taskSchema.index({ status: 1, priority: 1, createdAt: -1 });
taskSchema.index({ projectId: 1, status: 1 });
var TaskModel = import_mongoose37.default.models.Task ?? import_mongoose37.default.model("Task", taskSchema);

// src/modules/system/system-settings.model.ts
var import_mongoose38 = __toESM(require("mongoose"), 1);
var systemSettingsSchema = new import_mongoose38.Schema(
  {
    clientCode: { type: String, required: true, unique: true },
    timezone: { type: String, required: true, default: "UTC" },
    defaultCurrency: { type: String, required: true, default: "USD", maxlength: 3 },
    locale: { type: String, required: true, default: "en-US" },
    updatedBy: { type: String }
  },
  { timestamps: true }
);
var SystemSettingsModel = import_mongoose38.default.models.SystemSettings ?? import_mongoose38.default.model("SystemSettings", systemSettingsSchema);

// src/modules/system/system-settings.service.ts
var DEFAULTS = {
  timezone: "UTC",
  defaultCurrency: "USD",
  locale: "en-US"
};
var SystemSettingsService = class {
  async get() {
    const doc = await SystemSettingsModel.findOne({ clientCode: env.CLIENT_CODE }).lean().exec();
    if (!doc) return { ...DEFAULTS };
    return {
      timezone: doc.timezone,
      defaultCurrency: doc.defaultCurrency,
      locale: doc.locale
    };
  }
  async upsert(payload, updatedBy) {
    await SystemSettingsModel.updateOne(
      { clientCode: env.CLIENT_CODE },
      {
        $set: {
          timezone: payload.timezone,
          defaultCurrency: payload.defaultCurrency,
          locale: payload.locale,
          updatedBy
        }
      },
      { upsert: true }
    );
    return this.get();
  }
};
var systemSettingsService = new SystemSettingsService();

// src/modules/system/branding.model.ts
var import_mongoose39 = __toESM(require("mongoose"), 1);
var brandingSchema = new import_mongoose39.Schema(
  {
    clientCode: { type: String, required: true, unique: true },
    companyName: { type: String, required: true, default: "Admin Platform" },
    logoUrl: { type: String, default: "" },
    primaryColor: { type: String, required: true, default: "#1976d2" },
    updatedBy: { type: String }
  },
  { timestamps: true }
);
var BrandingModel = import_mongoose39.default.models.Branding ?? import_mongoose39.default.model("Branding", brandingSchema);

// src/modules/system/branding.service.ts
var DEFAULTS2 = {
  companyName: "Admin Platform",
  logoUrl: "",
  primaryColor: "#1976d2"
};
var BrandingService = class {
  async get() {
    const doc = await BrandingModel.findOne({ clientCode: env.CLIENT_CODE }).lean().exec();
    if (!doc) return { ...DEFAULTS2 };
    return {
      companyName: doc.companyName,
      logoUrl: doc.logoUrl,
      primaryColor: doc.primaryColor
    };
  }
  async upsert(payload, updatedBy) {
    await BrandingModel.updateOne(
      { clientCode: env.CLIENT_CODE },
      {
        $set: {
          companyName: payload.companyName,
          logoUrl: payload.logoUrl,
          primaryColor: payload.primaryColor,
          updatedBy
        }
      },
      { upsert: true }
    );
    return this.get();
  }
};
var brandingService = new BrandingService();

// src/core/rbac/custom-role.model.ts
var import_mongoose40 = __toESM(require("mongoose"), 1);
var structuredPermissionSchema = new import_mongoose40.Schema(
  {
    menuId: { type: String },
    menuGroupId: { type: String },
    read: { type: Boolean, default: false },
    create: { type: Boolean, default: false },
    update: { type: Boolean, default: false },
    delete: { type: Boolean, default: false },
    export: { type: Boolean, default: false }
  },
  { _id: false }
);
var customRoleSchema = new import_mongoose40.Schema(
  {
    clientCode: { type: String, required: true },
    name: { type: String, required: true, maxlength: 60 },
    permissions: { type: [String], required: true, default: [] },
    structuredPermissions: { type: [structuredPermissionSchema], default: [] },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true }
  },
  { timestamps: true }
);
customRoleSchema.index({ clientCode: 1, name: 1 }, { unique: true });
var CustomRoleModel = import_mongoose40.default.models.CustomRole ?? import_mongoose40.default.model("CustomRole", customRoleSchema);

// src/core/rbac/custom-role.service.ts
function toResponse(doc) {
  return {
    id: String(doc._id),
    name: doc.name,
    permissions: doc.permissions,
    structuredPermissions: (doc.structuredPermissions ?? []).map((sp) => ({
      menuId: sp.menuId,
      menuGroupId: sp.menuGroupId,
      read: sp.read,
      create: sp.create,
      update: sp.update,
      delete: sp.delete,
      export: sp.export
    }))
  };
}
var CustomRoleService = class {
  async list() {
    const docs = await CustomRoleModel.find({ clientCode: env.CLIENT_CODE }).sort({ name: 1 }).lean().exec();
    return docs.map(toResponse);
  }
  async getById(id) {
    const doc = await CustomRoleModel.findOne({ _id: id, clientCode: env.CLIENT_CODE }).lean().exec();
    return doc ? toResponse(doc) : null;
  }
  async create(payload, userId) {
    const doc = await CustomRoleModel.create({
      clientCode: env.CLIENT_CODE,
      name: payload.name,
      permissions: payload.permissions,
      createdBy: userId,
      updatedBy: userId
    });
    return toResponse(doc.toObject());
  }
  async update(id, payload, userId) {
    const doc = await CustomRoleModel.findOneAndUpdate(
      { _id: id, clientCode: env.CLIENT_CODE },
      {
        $set: {
          name: payload.name,
          permissions: payload.permissions,
          updatedBy: userId
        }
      },
      { new: true }
    ).lean().exec();
    return doc ? toResponse(doc) : null;
  }
  async remove(id) {
    const result = await CustomRoleModel.deleteOne({ _id: id, clientCode: env.CLIENT_CODE }).exec();
    return result.deletedCount > 0;
  }
  async getPermissionsForRole(roleId) {
    const doc = await CustomRoleModel.findOne({ _id: roleId, clientCode: env.CLIENT_CODE }).lean().exec();
    return doc ? doc.permissions : null;
  }
  // ── Structured Permissions ───────────────────────────────────
  async getStructuredPermissions(roleId) {
    const doc = await CustomRoleModel.findOne({ _id: roleId, clientCode: env.CLIENT_CODE }).lean().exec();
    if (!doc) return null;
    return (doc.structuredPermissions ?? []).map((sp) => ({
      menuId: sp.menuId,
      menuGroupId: sp.menuGroupId,
      read: sp.read,
      create: sp.create,
      update: sp.update,
      delete: sp.delete,
      export: sp.export
    }));
  }
  async updateStructuredPermissions(roleId, permissions, userId) {
    const sanitized = permissions.map((p) => ({
      menuId: p.menuId,
      menuGroupId: p.menuGroupId,
      read: Boolean(p.read),
      create: Boolean(p.create),
      update: Boolean(p.update),
      delete: Boolean(p.delete),
      export: Boolean(p.export)
    }));
    const flatPermissions = await this.flattenStructuredToLegacy(sanitized);
    const doc = await CustomRoleModel.findOneAndUpdate(
      { _id: roleId, clientCode: env.CLIENT_CODE },
      {
        $set: {
          structuredPermissions: sanitized,
          permissions: flatPermissions,
          updatedBy: userId
        }
      },
      { new: true }
    ).lean().exec();
    return doc ? toResponse(doc) : null;
  }
  /**
   * Converts structured per-menu permissions into the flat
   * "module.action" string array used by requirePermission middleware.
   */
  async flattenStructuredToLegacy(structured) {
    const perms = /* @__PURE__ */ new Set();
    const menuItems = await MenuItemModel.find({ clientCode: env.CLIENT_CODE }).lean().exec();
    const slugById = /* @__PURE__ */ new Map();
    for (const item of menuItems) {
      slugById.set(String(item._id), item.slug);
    }
    const actionMap = {
      read: "read",
      create: "create",
      update: "update",
      delete: "delete",
      export: "export"
    };
    for (const entry of structured) {
      const id = entry.menuId ?? entry.menuGroupId;
      if (!id) continue;
      const slug = slugById.get(id) ?? id;
      for (const [key, action] of Object.entries(actionMap)) {
        if (entry[key]) {
          perms.add(`${slug}.${action}`);
        }
      }
    }
    return Array.from(perms);
  }
};
var customRoleService = new CustomRoleService();

// src/modules/system/quick-links.model.ts
var import_mongoose41 = __toESM(require("mongoose"), 1);
var quickLinkSchema = new import_mongoose41.Schema(
  {
    clientCode: { type: String, required: true },
    name: { type: String, required: true, maxlength: 60 },
    url: { type: String, required: true, maxlength: 2048 },
    iconUrl: { type: String, maxlength: 2048, default: "" },
    order: { type: Number, required: true, default: 0 },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true }
  },
  { timestamps: true }
);
quickLinkSchema.index({ clientCode: 1, order: 1 });
var QuickLinkModel = import_mongoose41.default.models.QuickLink ?? import_mongoose41.default.model("QuickLink", quickLinkSchema);

// src/modules/system/quick-links.service.ts
function toResponse2(doc) {
  return {
    _id: String(doc._id),
    name: doc.name,
    url: doc.url,
    iconUrl: doc.iconUrl || void 0,
    order: doc.order
  };
}
var QuickLinksService = class {
  get clientCode() {
    return env.CLIENT_CODE;
  }
  async list() {
    const docs = await QuickLinkModel.find({ clientCode: this.clientCode }).sort({ order: 1 }).lean().exec();
    return docs.map(toResponse2);
  }
  async create(payload, userId) {
    const doc = await QuickLinkModel.create({
      clientCode: this.clientCode,
      ...payload,
      iconUrl: payload.iconUrl ?? "",
      createdBy: userId,
      updatedBy: userId
    });
    return toResponse2(doc.toObject());
  }
  async update(id, payload, userId) {
    const doc = await QuickLinkModel.findOneAndUpdate(
      { _id: id, clientCode: this.clientCode },
      { $set: { ...payload, updatedBy: userId } },
      { new: true }
    ).lean().exec();
    return doc ? toResponse2(doc) : null;
  }
  async remove(id) {
    const result = await QuickLinkModel.deleteOne({
      _id: id,
      clientCode: this.clientCode
    }).exec();
    return result.deletedCount > 0;
  }
};
var quickLinksService = new QuickLinksService();

// src/modules/system/notification.model.ts
var import_mongoose42 = __toESM(require("mongoose"), 1);
var notificationSchema = new import_mongoose42.Schema(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true, maxlength: 200 },
    body: { type: String, required: true, maxlength: 1e3 },
    type: { type: String, enum: ["info", "warning", "error", "success"], default: "info" },
    read: { type: Boolean, default: false },
    link: { type: String }
  },
  { timestamps: true }
);
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
var NotificationModel = import_mongoose42.default.models.Notification ?? import_mongoose42.default.model("Notification", notificationSchema);

// src/modules/system/notification.service.ts
function toResponse3(doc) {
  return {
    id: String(doc._id),
    title: doc.title,
    body: doc.body,
    type: doc.type,
    read: doc.read,
    link: doc.link,
    createdAt: doc.createdAt.toISOString()
  };
}
var NotificationService = class {
  async list(userId, limit, offset) {
    const [items, total] = await Promise.all([
      NotificationModel.find({ userId }).sort({ createdAt: -1 }).skip(offset).limit(limit).lean().exec(),
      NotificationModel.countDocuments({ userId }).exec()
    ]);
    return { items: items.map(toResponse3), total };
  }
  async unreadCount(userId) {
    return NotificationModel.countDocuments({ userId, read: false }).exec();
  }
  async markRead(notificationId, userId) {
    const result = await NotificationModel.updateOne(
      { _id: notificationId, userId },
      { $set: { read: true } }
    ).exec();
    return result.matchedCount > 0;
  }
  async markAllRead(userId) {
    const result = await NotificationModel.updateMany(
      { userId, read: false },
      { $set: { read: true } }
    ).exec();
    return result.modifiedCount;
  }
  async create(payload) {
    const doc = await NotificationModel.create({
      userId: payload.userId,
      title: payload.title,
      body: payload.body,
      type: payload.type ?? "info",
      link: payload.link
    });
    return toResponse3(doc.toObject());
  }
};
var notificationService = new NotificationService();

// src/modules/todo/todo.models.ts
var import_mongoose43 = __toESM(require("mongoose"), 1);
var todoItemSchema = new import_mongoose43.Schema(
  {
    title: { type: String, required: true, maxlength: 300, trim: true },
    description: { type: String, maxlength: 2e3 },
    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
      index: true
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
      index: true
    },
    dueDate: { type: Date },
    completedAt: { type: Date },
    ownerUserId: { type: String, required: true, index: true },
    tags: { type: [String], default: [] }
  },
  { timestamps: true }
);
todoItemSchema.index({ ownerUserId: 1, status: 1, createdAt: -1 });
var TodoItemModel = import_mongoose43.default.models.TodoItem ?? import_mongoose43.default.model("TodoItem", todoItemSchema);

// src/modules/system/system.routes.ts
var router15 = (0, import_express16.Router)();
var systemWriteRateLimiter = (0, import_express_rate_limit15.default)({
  windowMs: 60 * 1e3,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
});
var featureConfigSchema2 = import_zod17.z.object({
  enabledModules: import_zod17.z.array(import_zod17.z.enum(MODULE_KEYS))
});
router15.get(
  "/api/v1/system/session-bootstrap",
  authenticateJwt,
  requireRole(["super_admin", "admin"]),
  async (req, res, next) => {
    try {
      const features = await featureConfigService.getEnabledFeatures();
      const role = req.user.role;
      let permissions = getPermissionsByRole(role);
      let customRole;
      if (role === "admin") {
        const userDoc = await UserModel.findById(req.user.id).lean().exec();
        if (userDoc?.customRoleId) {
          const crPerms = await customRoleService.getPermissionsForRole(
            userDoc.customRoleId
          );
          if (crPerms) {
            permissions = crPerms;
            const crDetails = await customRoleService.getById(
              userDoc.customRoleId
            );
            if (crDetails) {
              customRole = { id: crDetails.id, name: crDetails.name };
            }
          }
        }
      }
      const [uiFeatureFlags, menuGroups] = await Promise.all([
        uiFeatureFlagsService.getFlags(),
        menuService.listGroupsWithMenus()
      ]);
      let currentRolePermissions;
      if (role === "admin" && customRole) {
        const userDoc2 = await UserModel.findById(req.user.id).lean().exec();
        if (userDoc2?.customRoleId) {
          currentRolePermissions = await customRoleService.getStructuredPermissions(
            userDoc2.customRoleId
          );
        }
      }
      res.json({
        user: req.user,
        permissions,
        features,
        uiFeatureFlags,
        menuGroups,
        ...currentRolePermissions ? { currentRolePermissions } : {},
        moduleCatalog: MODULE_DEFINITIONS,
        ...customRole ? { customRole } : {}
      });
    } catch (error) {
      next(error);
    }
  }
);
router15.get(
  "/api/v1/system/module-catalog",
  authenticateJwt,
  requireRole(["super_admin", "admin"]),
  (_req, res) => {
    res.json({
      modules: MODULE_DEFINITIONS
    });
  }
);
router15.get(
  "/api/v1/system/feature-config",
  authenticateJwt,
  requireRole(["super_admin", "admin"]),
  async (_req, res, next) => {
    try {
      const features = await featureConfigService.getEnabledFeatures();
      res.json({ features });
    } catch (error) {
      next(error);
    }
  }
);
router15.put(
  "/api/v1/system/feature-config",
  systemWriteRateLimiter,
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req, res, next) => {
    try {
      const { enabledModules } = featureConfigSchema2.parse(req.body ?? {});
      const previousFeatures = await featureConfigService.getEnabledFeatures();
      await featureConfigService.upsertEnabledModules(
        enabledModules,
        req.user.id
      );
      const features = await featureConfigService.getEnabledFeatures();
      await auditLogService.log({
        action: "feature_config.update",
        entity: "feature_config",
        userId: req.user.id,
        userEmail: req.user.email,
        before: previousFeatures,
        after: features
      });
      res.json({ features });
    } catch (error) {
      if (error instanceof import_zod17.z.ZodError) {
        next(
          new AppError(
            400,
            ERROR_CODES.BAD_REQUEST,
            "Invalid feature config payload"
          )
        );
        return;
      }
      next(error);
    }
  }
);
var uiFeatureFlagsSchema2 = import_zod17.z.object({
  flags: import_zod17.z.record(
    import_zod17.z.enum(UI_FEATURE_FLAG_KEYS),
    import_zod17.z.boolean()
  )
});
router15.get(
  "/api/v1/system/ui-feature-flags",
  authenticateJwt,
  requireRole(["super_admin", "admin"]),
  async (_req, res, next) => {
    try {
      const flags = await uiFeatureFlagsService.getFlags();
      res.json(flags);
    } catch (error) {
      next(error);
    }
  }
);
router15.put(
  "/api/v1/system/ui-feature-flags",
  systemWriteRateLimiter,
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req, res, next) => {
    try {
      const { flags } = uiFeatureFlagsSchema2.parse(req.body ?? {});
      const previous = await uiFeatureFlagsService.getFlags();
      const updated = await uiFeatureFlagsService.upsertFlags(
        flags,
        req.user.id
      );
      await auditLogService.log({
        action: "ui_feature_flags.update",
        entity: "ui_feature_flags",
        userId: req.user.id,
        userEmail: req.user.email,
        before: previous,
        after: updated
      });
      res.json(updated);
    } catch (error) {
      if (error instanceof import_zod17.z.ZodError) {
        next(
          new AppError(
            400,
            ERROR_CODES.BAD_REQUEST,
            "Invalid UI feature flags payload"
          )
        );
        return;
      }
      next(error);
    }
  }
);
router15.get(
  "/api/v1/system/payment-settings",
  authenticateJwt,
  requireRole(["super_admin"]),
  (_req, res) => {
    const providers = PAYMENT_PROVIDER_KEYS.map((id) => {
      const configured = id === "stripe" ? Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET) : id === "paypal" ? Boolean(
        env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET && env.PAYPAL_WEBHOOK_ID
      ) : Boolean(
        env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET && env.RAZORPAY_WEBHOOK_SECRET
      );
      return {
        id,
        displayName: id.charAt(0).toUpperCase() + id.slice(1),
        configured,
        webhookPath: `/api/v1/payments/webhooks/${id}`
      };
    });
    const allowedRedirectOrigins = env.PAYMENT_ALLOWED_REDIRECT_ORIGINS.split(
      ","
    ).map((o) => o.trim()).filter(Boolean);
    res.json({
      providers,
      defaultSuccessUrl: env.PAYMENT_DEFAULT_SUCCESS_URL,
      defaultCancelUrl: env.PAYMENT_DEFAULT_CANCEL_URL,
      allowedRedirectOrigins,
      paypalMode: env.PAYPAL_MODE
    });
  }
);
router15.get(
  "/api/v1/system/dashboard-kpis",
  authenticateJwt,
  requireRole(["super_admin", "admin"]),
  async (_req, res, next) => {
    try {
      const now = /* @__PURE__ */ new Date();
      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );
      const todayEnd = new Date(todayStart.getTime() + 864e5);
      const [
        openTickets,
        activeTasks,
        todayEvents,
        openDeals,
        pipelineValue,
        openJobs,
        pendingApplications
      ] = await Promise.all([
        SupportTicketModel.countDocuments({
          status: { $in: ["open", "in_progress", "pending_customer"] }
        }).exec(),
        TaskModel.countDocuments({
          status: { $in: ["todo", "in_progress", "review"] }
        }).exec(),
        CalendarEventModel.countDocuments({
          status: "scheduled",
          startDate: { $gte: todayStart, $lt: todayEnd }
        }).exec(),
        CrmDealModel.countDocuments({ status: "open" }).exec(),
        CrmDealModel.aggregate([
          { $match: { status: "open" } },
          { $group: { _id: null, total: { $sum: "$amountValue" } } }
        ]).exec(),
        JobPostingModel.countDocuments({ status: "open" }).exec(),
        JobApplicationModel.countDocuments({ status: "submitted" }).exec()
      ]);
      res.json({
        openTickets,
        activeTasks,
        todayEvents,
        openDeals,
        pipelineValue: pipelineValue[0]?.total ?? 0,
        openJobs,
        pendingApplications
      });
    } catch (error) {
      next(error);
    }
  }
);
router15.get(
  "/api/v1/system/audit-log",
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req, res, next) => {
    try {
      const entity = typeof req.query.entity === "string" ? req.query.entity : void 0;
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const offset = Math.max(Number(req.query.offset) || 0, 0);
      const result = await auditLogService.getRecent({ entity, limit, offset });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);
var systemSettingsSchema2 = import_zod17.z.object({
  timezone: import_zod17.z.string().min(1).max(60),
  defaultCurrency: import_zod17.z.string().min(3).max(3),
  locale: import_zod17.z.string().min(2).max(20)
});
router15.get(
  "/api/v1/system/settings",
  authenticateJwt,
  requireRole(["super_admin", "admin"]),
  async (_req, res, next) => {
    try {
      const settings = await systemSettingsService.get();
      res.json(settings);
    } catch (error) {
      next(error);
    }
  }
);
router15.put(
  "/api/v1/system/settings",
  systemWriteRateLimiter,
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req, res, next) => {
    try {
      const payload = systemSettingsSchema2.parse(req.body ?? {});
      const previous = await systemSettingsService.get();
      const updated = await systemSettingsService.upsert(payload, req.user.id);
      await auditLogService.log({
        action: "system_settings.update",
        entity: "system_settings",
        userId: req.user.id,
        userEmail: req.user.email,
        before: previous,
        after: updated
      });
      res.json(updated);
    } catch (error) {
      if (error instanceof import_zod17.z.ZodError) {
        next(
          new AppError(
            400,
            ERROR_CODES.BAD_REQUEST,
            "Invalid system settings payload"
          )
        );
        return;
      }
      next(error);
    }
  }
);
var customRoleSchema2 = import_zod17.z.object({
  name: import_zod17.z.string().min(1).max(60),
  permissions: import_zod17.z.array(import_zod17.z.string().min(1))
});
router15.get(
  "/api/v1/system/custom-roles",
  authenticateJwt,
  requireRole(["super_admin"]),
  async (_req, res, next) => {
    try {
      const roles = await customRoleService.list();
      res.json({ roles });
    } catch (error) {
      next(error);
    }
  }
);
router15.post(
  "/api/v1/system/custom-roles",
  systemWriteRateLimiter,
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req, res, next) => {
    try {
      const payload = customRoleSchema2.parse(req.body ?? {});
      const role = await customRoleService.create(payload, req.user.id);
      res.status(201).json(role);
    } catch (error) {
      if (error instanceof import_zod17.z.ZodError) {
        next(
          new AppError(
            400,
            ERROR_CODES.BAD_REQUEST,
            "Invalid custom role payload"
          )
        );
        return;
      }
      next(error);
    }
  }
);
router15.put(
  "/api/v1/system/custom-roles/:id",
  systemWriteRateLimiter,
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req, res, next) => {
    try {
      const payload = customRoleSchema2.parse(req.body ?? {});
      const role = await customRoleService.update(
        req.params.id,
        payload,
        req.user.id
      );
      if (!role) {
        next(new AppError(404, ERROR_CODES.NOT_FOUND, "Custom role not found"));
        return;
      }
      res.json(role);
    } catch (error) {
      if (error instanceof import_zod17.z.ZodError) {
        next(
          new AppError(
            400,
            ERROR_CODES.BAD_REQUEST,
            "Invalid custom role payload"
          )
        );
        return;
      }
      next(error);
    }
  }
);
router15.delete(
  "/api/v1/system/custom-roles/:id",
  systemWriteRateLimiter,
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req, res, next) => {
    try {
      const deleted = await customRoleService.remove(req.params.id);
      if (!deleted) {
        next(new AppError(404, ERROR_CODES.NOT_FOUND, "Custom role not found"));
        return;
      }
      await UserModel.updateMany(
        { customRoleId: req.params.id },
        { $unset: { customRoleId: 1 } }
      );
      res.json({ deleted: true });
    } catch (error) {
      next(error);
    }
  }
);
var structuredPermissionsSchema = import_zod17.z.object({
  permissions: import_zod17.z.array(
    import_zod17.z.object({
      menuId: import_zod17.z.string().optional(),
      menuGroupId: import_zod17.z.string().optional(),
      read: import_zod17.z.boolean(),
      create: import_zod17.z.boolean(),
      update: import_zod17.z.boolean(),
      delete: import_zod17.z.boolean(),
      export: import_zod17.z.boolean()
    })
  )
});
router15.get(
  "/api/v1/system/custom-roles/:id/permissions",
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req, res, next) => {
    try {
      const perms = await customRoleService.getStructuredPermissions(
        req.params.id
      );
      if (perms === null) {
        next(new AppError(404, ERROR_CODES.NOT_FOUND, "Custom role not found"));
        return;
      }
      res.json({ permissions: perms });
    } catch (error) {
      next(error);
    }
  }
);
router15.put(
  "/api/v1/system/custom-roles/:id/permissions",
  systemWriteRateLimiter,
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req, res, next) => {
    try {
      const { permissions } = structuredPermissionsSchema.parse(req.body ?? {});
      const previous = await customRoleService.getStructuredPermissions(
        req.params.id
      );
      if (previous === null) {
        next(new AppError(404, ERROR_CODES.NOT_FOUND, "Custom role not found"));
        return;
      }
      const updated = await customRoleService.updateStructuredPermissions(
        req.params.id,
        permissions,
        req.user.id
      );
      if (!updated) {
        next(new AppError(404, ERROR_CODES.NOT_FOUND, "Custom role not found"));
        return;
      }
      await auditLogService.log({
        action: "custom_role.permissions_update",
        entity: "custom_role",
        userId: req.user.id,
        userEmail: req.user.email,
        before: {
          roleId: req.params.id,
          permissions: previous
        },
        after: {
          roleId: req.params.id,
          permissions: updated.structuredPermissions
        }
      });
      res.json(updated);
    } catch (error) {
      if (error instanceof import_zod17.z.ZodError) {
        next(
          new AppError(
            400,
            ERROR_CODES.BAD_REQUEST,
            "Invalid permissions payload"
          )
        );
        return;
      }
      next(error);
    }
  }
);
var createUserSchema = import_zod17.z.object({
  email: import_zod17.z.string().email().max(200),
  password: import_zod17.z.string().min(8).max(128),
  role: import_zod17.z.enum(["super_admin", "admin"])
});
var updateUserSchema = import_zod17.z.object({
  email: import_zod17.z.string().email().max(200).optional(),
  password: import_zod17.z.string().min(8).max(128).optional(),
  role: import_zod17.z.enum(["super_admin", "admin"]).optional()
});
router15.get(
  "/api/v1/system/users",
  authenticateJwt,
  requireRole(["super_admin"]),
  async (_req, res, next) => {
    try {
      const users = await UserModel.find({}, { passwordHash: 0 }).lean().exec();
      res.json({ users });
    } catch (error) {
      next(error);
    }
  }
);
router15.post(
  "/api/v1/system/users",
  systemWriteRateLimiter,
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req, res, next) => {
    try {
      const { email, password, role } = createUserSchema.parse(req.body ?? {});
      const existing = await UserModel.findOne({ email }).exec();
      if (existing) {
        next(
          new AppError(
            409,
            ERROR_CODES.BAD_REQUEST,
            "A user with this email already exists"
          )
        );
        return;
      }
      const passwordHash = await import_bcryptjs3.default.hash(password, 10);
      const user = await UserModel.create({ email, passwordHash, role });
      await auditLogService.log({
        action: "CREATE",
        entity: "user",
        entityId: String(user._id),
        userId: req.user.id,
        userEmail: req.user.email,
        after: { email, role }
      });
      const { passwordHash: _, ...safe } = user.toObject();
      res.status(201).json(safe);
    } catch (error) {
      if (error instanceof import_zod17.z.ZodError) {
        next(
          new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid user payload")
        );
        return;
      }
      next(error);
    }
  }
);
router15.put(
  "/api/v1/system/users/:userId",
  systemWriteRateLimiter,
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req, res, next) => {
    try {
      const payload = updateUserSchema.parse(req.body ?? {});
      const update = {};
      if (payload.email) update.email = payload.email;
      if (payload.role) update.role = payload.role;
      if (payload.password)
        update.passwordHash = await import_bcryptjs3.default.hash(payload.password, 10);
      if (Object.keys(update).length === 0) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "No fields to update"));
        return;
      }
      const user = await UserModel.findByIdAndUpdate(
        req.params.userId,
        { $set: update },
        { new: true, projection: { passwordHash: 0 } }
      ).lean().exec();
      if (!user) {
        next(new AppError(404, ERROR_CODES.NOT_FOUND, "User not found"));
        return;
      }
      await auditLogService.log({
        action: "UPDATE",
        entity: "user",
        entityId: req.params.userId,
        userId: req.user.id,
        userEmail: req.user.email,
        after: {
          email: payload.email,
          role: payload.role
        }
      });
      res.json(user);
    } catch (error) {
      if (error instanceof import_zod17.z.ZodError) {
        next(
          new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid user payload")
        );
        return;
      }
      next(error);
    }
  }
);
router15.delete(
  "/api/v1/system/users/:userId",
  systemWriteRateLimiter,
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req, res, next) => {
    try {
      if (req.params.userId === req.user.id) {
        next(
          new AppError(
            400,
            ERROR_CODES.BAD_REQUEST,
            "Cannot delete your own account"
          )
        );
        return;
      }
      const user = await UserModel.findByIdAndDelete(req.params.userId).lean().exec();
      if (!user) {
        next(new AppError(404, ERROR_CODES.NOT_FOUND, "User not found"));
        return;
      }
      await auditLogService.log({
        action: "DELETE",
        entity: "user",
        entityId: req.params.userId,
        userId: req.user.id,
        userEmail: req.user.email
      });
      res.json({ deleted: true });
    } catch (error) {
      next(error);
    }
  }
);
router15.put(
  "/api/v1/system/users/:userId/custom-role",
  systemWriteRateLimiter,
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req, res, next) => {
    try {
      const { customRoleId } = import_zod17.z.object({
        customRoleId: import_zod17.z.string().min(1).nullable()
      }).parse(req.body ?? {});
      if (customRoleId) {
        const role = await customRoleService.getById(customRoleId);
        if (!role) {
          next(
            new AppError(404, ERROR_CODES.NOT_FOUND, "Custom role not found")
          );
          return;
        }
      }
      const result = await UserModel.updateOne(
        { _id: req.params.userId },
        customRoleId ? { $set: { customRoleId } } : { $unset: { customRoleId: 1 } }
      );
      if (result.matchedCount === 0) {
        next(new AppError(404, ERROR_CODES.NOT_FOUND, "User not found"));
        return;
      }
      res.json({ updated: true });
    } catch (error) {
      if (error instanceof import_zod17.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid payload"));
        return;
      }
      next(error);
    }
  }
);
var quickLinkSchema2 = import_zod17.z.object({
  name: import_zod17.z.string().min(1).max(60),
  url: import_zod17.z.string().min(1).max(2048),
  iconUrl: import_zod17.z.string().max(2048).optional(),
  order: import_zod17.z.number().int().min(0).default(0)
});
router15.get(
  "/api/v1/system/quick-links",
  authenticateJwt,
  requireRole(["super_admin", "admin"]),
  async (_req, res, next) => {
    try {
      const links = await quickLinksService.list();
      res.json({ links });
    } catch (error) {
      next(error);
    }
  }
);
router15.post(
  "/api/v1/system/quick-links",
  systemWriteRateLimiter,
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req, res, next) => {
    try {
      const payload = quickLinkSchema2.parse(req.body ?? {});
      const link = await quickLinksService.create(payload, req.user.id);
      res.status(201).json(link);
    } catch (error) {
      if (error instanceof import_zod17.z.ZodError) {
        next(
          new AppError(
            400,
            ERROR_CODES.BAD_REQUEST,
            "Invalid quick link payload"
          )
        );
        return;
      }
      next(error);
    }
  }
);
router15.put(
  "/api/v1/system/quick-links/:id",
  systemWriteRateLimiter,
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req, res, next) => {
    try {
      const payload = quickLinkSchema2.parse(req.body ?? {});
      const link = await quickLinksService.update(
        req.params.id,
        payload,
        req.user.id
      );
      if (!link) {
        next(new AppError(404, ERROR_CODES.NOT_FOUND, "Quick link not found"));
        return;
      }
      res.json(link);
    } catch (error) {
      if (error instanceof import_zod17.z.ZodError) {
        next(
          new AppError(
            400,
            ERROR_CODES.BAD_REQUEST,
            "Invalid quick link payload"
          )
        );
        return;
      }
      next(error);
    }
  }
);
router15.delete(
  "/api/v1/system/quick-links/:id",
  systemWriteRateLimiter,
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req, res, next) => {
    try {
      const deleted = await quickLinksService.remove(req.params.id);
      if (!deleted) {
        next(new AppError(404, ERROR_CODES.NOT_FOUND, "Quick link not found"));
        return;
      }
      res.json({ deleted: true });
    } catch (error) {
      next(error);
    }
  }
);
var brandingSchema2 = import_zod17.z.object({
  companyName: import_zod17.z.string().min(1).max(100),
  logoUrl: import_zod17.z.string().max(2048).default(""),
  primaryColor: import_zod17.z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color (#RRGGBB)")
});
router15.get(
  "/api/v1/system/branding",
  authenticateJwt,
  requireRole(["super_admin", "admin"]),
  async (_req, res, next) => {
    try {
      const branding = await brandingService.get();
      res.json(branding);
    } catch (error) {
      next(error);
    }
  }
);
router15.put(
  "/api/v1/system/branding",
  systemWriteRateLimiter,
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req, res, next) => {
    try {
      const payload = brandingSchema2.parse(req.body ?? {});
      const previous = await brandingService.get();
      const updated = await brandingService.upsert(payload, req.user.id);
      await auditLogService.log({
        action: "branding.update",
        entity: "branding",
        userId: req.user.id,
        userEmail: req.user.email,
        before: previous,
        after: updated
      });
      res.json(updated);
    } catch (error) {
      if (error instanceof import_zod17.z.ZodError) {
        next(
          new AppError(
            400,
            ERROR_CODES.BAD_REQUEST,
            "Invalid branding payload"
          )
        );
        return;
      }
      next(error);
    }
  }
);
var MODEL_MAP = {
  "support-tickets": {
    model: SupportTicketModel,
    searchFields: ["subject", "requesterName", "requesterEmail"]
  },
  tasks: {
    model: TaskModel,
    searchFields: ["title"]
  },
  projects: {
    model: ProjectModel,
    searchFields: ["name"]
  },
  crm: {
    model: CrmContactModel,
    searchFields: ["displayName", "primaryEmail", "companyName"]
  },
  job: {
    model: JobPostingModel,
    searchFields: ["title", "department"]
  }
};
router15.get(
  "/api/v1/system/search",
  authenticateJwt,
  requireRole(["super_admin", "admin"]),
  async (req, res, next) => {
    try {
      const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
      if (q.length < 2) {
        res.json({ results: [] });
        return;
      }
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const limit = 5;
      const searches = Object.entries(MODEL_MAP).map(
        async ([module2, { model, searchFields }]) => {
          const orClauses = searchFields.map((field) => ({ [field]: regex }));
          const items = await model.find({ $or: orClauses }).limit(limit).lean().exec();
          return items.map((item) => ({
            module: module2,
            id: String(item._id),
            label: String(item[searchFields[0]] ?? "")
          }));
        }
      );
      const groups = await Promise.all(searches);
      const results = groups.flat();
      res.json({ results });
    } catch (error) {
      next(error);
    }
  }
);
router15.get(
  "/api/v1/system/export/:module",
  authenticateJwt,
  requireRole(["super_admin", "admin"]),
  async (req, res, next) => {
    try {
      const moduleName = req.params.module;
      const entry = MODEL_MAP[moduleName];
      if (!entry) {
        next(
          new AppError(
            400,
            ERROR_CODES.BAD_REQUEST,
            `Unknown module: ${moduleName}`
          )
        );
        return;
      }
      const maxRows = env.EXPORT_MAX_ROWS;
      const items = await entry.model.find({}).limit(maxRows + 1).lean().exec();
      const truncated = items.length > maxRows;
      const exportItems = truncated ? items.slice(0, maxRows) : items;
      if (exportItems.length === 0) {
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${moduleName}-export.csv"`
        );
        res.send("");
        return;
      }
      const headers = Object.keys(exportItems[0]).filter((k) => k !== "__v");
      const escapeCell = (val) => {
        const str = val instanceof Date ? val.toISOString() : String(val ?? "");
        return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str.replace(/"/g, '""')}"` : str;
      };
      const rows = [
        headers.join(","),
        ...exportItems.map(
          (item) => headers.map((h) => escapeCell(item[h])).join(",")
        )
      ];
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${moduleName}-export.csv"`
      );
      if (truncated) {
        res.setHeader("X-Export-Truncated", "true");
        res.setHeader("X-Export-Max-Rows", String(maxRows));
      }
      res.send(rows.join("\n"));
    } catch (error) {
      next(error);
    }
  }
);
router15.get(
  "/api/v1/system/notifications",
  authenticateJwt,
  requireRole(["super_admin", "admin"]),
  async (req, res, next) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const offset = Math.max(Number(req.query.offset) || 0, 0);
      const result = await notificationService.list(
        req.user.id,
        limit,
        offset
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);
router15.get(
  "/api/v1/system/notifications/unread-count",
  authenticateJwt,
  requireRole(["super_admin", "admin"]),
  async (req, res, next) => {
    try {
      const count = await notificationService.unreadCount(req.user.id);
      res.json({ unreadCount: count });
    } catch (error) {
      next(error);
    }
  }
);
router15.patch(
  "/api/v1/system/notifications/:id/read",
  authenticateJwt,
  requireRole(["super_admin", "admin"]),
  async (req, res, next) => {
    try {
      const found = await notificationService.markRead(
        req.params.id,
        req.user.id
      );
      if (!found) {
        next(
          new AppError(404, ERROR_CODES.NOT_FOUND, "Notification not found")
        );
        return;
      }
      res.json({ read: true });
    } catch (error) {
      next(error);
    }
  }
);
router15.post(
  "/api/v1/system/notifications/mark-all-read",
  authenticateJwt,
  requireRole(["super_admin", "admin"]),
  async (req, res, next) => {
    try {
      const count = await notificationService.markAllRead(req.user.id);
      res.json({ marked: count });
    } catch (error) {
      next(error);
    }
  }
);
router15.get(
  "/api/v1/system/gdpr-export",
  authenticateJwt,
  requireRole(["super_admin", "admin"]),
  async (req, res, next) => {
    try {
      const userId = req.user.id;
      const userEmail = req.user.email;
      let userRecord = null;
      try {
        userRecord = await UserModel.findById(userId).lean().exec();
      } catch {
      }
      const [tickets, tasks, events, todos, projects, contacts, deals] = await Promise.all([
        SupportTicketModel.find({ requesterEmail: userEmail }).lean().exec(),
        TaskModel.find({ assigneeUserId: userId }).lean().exec(),
        CalendarEventModel.find({ createdByUserId: userId }).lean().exec(),
        TodoItemModel.find({ ownerUserId: userId }).lean().exec(),
        ProjectModel.find({ ownerUserId: userId }).lean().exec(),
        CrmContactModel.find({ primaryEmail: userEmail }).lean().exec(),
        CrmDealModel.find({ ownerUserId: userId }).lean().exec()
      ]);
      const sanitizedUser = userRecord ? { ...userRecord, passwordHash: void 0 } : null;
      const bundle = {
        exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
        user: sanitizedUser,
        supportTickets: tickets,
        tasks,
        calendarEvents: events,
        todoItems: todos,
        projects,
        crmContacts: contacts,
        crmDeals: deals
      };
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="gdpr-export-${userId}.json"`
      );
      res.json(bundle);
    } catch (error) {
      next(error);
    }
  }
);
function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = [];
    let current = "";
    let inQuotes = false;
    for (const ch of lines[i]) {
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    values.push(current.trim());
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? "";
    }
    rows.push(row);
  }
  return rows;
}
router15.post(
  "/api/v1/system/import/:module",
  systemWriteRateLimiter,
  authenticateJwt,
  requireRole(["super_admin"]),
  async (req, res, next) => {
    try {
      const moduleName = req.params.module;
      const entry = MODEL_MAP[moduleName];
      if (!entry) {
        next(
          new AppError(
            400,
            ERROR_CODES.BAD_REQUEST,
            `Unknown module: ${moduleName}`
          )
        );
        return;
      }
      const csvText = typeof req.body?.csv === "string" ? req.body.csv : "";
      if (!csvText.trim()) {
        next(
          new AppError(
            400,
            ERROR_CODES.BAD_REQUEST,
            "Missing csv field in request body"
          )
        );
        return;
      }
      const rows = parseCsv(csvText);
      if (rows.length === 0) {
        res.json({ imported: 0, errors: [] });
        return;
      }
      const maxImportRows = env.IMPORT_MAX_ROWS;
      if (rows.length > maxImportRows) {
        next(
          new AppError(
            400,
            ERROR_CODES.BAD_REQUEST,
            `Import exceeds maximum of ${maxImportRows} rows`
          )
        );
        return;
      }
      const sanitized = rows.map((row) => {
        const clean = {};
        for (const [key, value] of Object.entries(row)) {
          if (key !== "_id" && key !== "__v") {
            clean[key] = value;
          }
        }
        return clean;
      });
      const errors = [];
      let imported = 0;
      for (let i = 0; i < sanitized.length; i++) {
        try {
          await entry.model.create(sanitized[i]);
          imported++;
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          errors.push({ row: i + 1, message });
        }
      }
      res.json({ imported, errors });
    } catch (error) {
      next(error);
    }
  }
);
var systemRoutes = router15;

// src/modules/tasks/tasks.routes.ts
var import_express_rate_limit16 = __toESM(require("express-rate-limit"), 1);
var import_express17 = require("express");
var import_mongoose44 = __toESM(require("mongoose"), 1);
var import_zod18 = require("zod");
var router16 = (0, import_express17.Router)();
var createTaskSchema = import_zod18.z.object({
  title: import_zod18.z.string().min(1).max(300).trim(),
  description: import_zod18.z.string().max(8e3).optional(),
  projectId: import_zod18.z.string().min(1).optional(),
  status: import_zod18.z.enum(["todo", "in_progress", "review", "done", "cancelled"]).default("todo"),
  priority: import_zod18.z.enum(["low", "medium", "high", "critical"]).default("medium"),
  assigneeUserId: import_zod18.z.string().min(1).optional(),
  reporterUserId: import_zod18.z.string().min(1).optional(),
  dueDate: import_zod18.z.coerce.date().optional(),
  tags: import_zod18.z.array(import_zod18.z.string().min(1).max(50)).max(30).default([]),
  estimatedHours: import_zod18.z.number().min(0).optional()
});
var updateTaskSchema = import_zod18.z.object({
  title: import_zod18.z.string().min(1).max(300).trim().optional(),
  description: import_zod18.z.string().max(8e3).optional(),
  projectId: import_zod18.z.string().min(1).nullable().optional(),
  priority: import_zod18.z.enum(["low", "medium", "high", "critical"]).optional(),
  assigneeUserId: import_zod18.z.string().min(1).nullable().optional(),
  dueDate: import_zod18.z.coerce.date().nullable().optional(),
  tags: import_zod18.z.array(import_zod18.z.string().min(1).max(50)).max(30).optional(),
  estimatedHours: import_zod18.z.number().min(0).nullable().optional()
});
var transitionTaskSchema = import_zod18.z.object({
  to: import_zod18.z.enum(["todo", "in_progress", "review", "done", "cancelled"])
});
var listTasksQuerySchema = import_zod18.z.object({
  page: import_zod18.z.coerce.number().int().min(1).default(1),
  limit: import_zod18.z.coerce.number().int().min(1).max(100).default(50),
  status: import_zod18.z.enum(["todo", "in_progress", "review", "done", "cancelled"]).optional(),
  projectId: import_zod18.z.string().min(1).optional(),
  assigneeUserId: import_zod18.z.string().min(1).optional()
});
var taskWriteRateLimiter = (0, import_express_rate_limit16.default)({
  windowMs: 60 * 1e3,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});
function ensureValidObjectId12(id) {
  if (!import_mongoose44.default.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid id");
  }
}
function assertAllowedTransition4(from, to) {
  const allowedTransitions = {
    todo: ["in_progress", "cancelled"],
    in_progress: ["review", "todo", "cancelled"],
    review: ["done", "in_progress", "cancelled"],
    done: ["todo"],
    cancelled: ["todo"]
  };
  const allowed = allowedTransitions[from] ?? [];
  if (!allowed.includes(to)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, `Invalid transition ${from} -> ${to}`);
  }
}
router16.get(
  "/api/v1/tasks/tasks",
  ...moduleGuards("tasks", "tasks.read"),
  async (req, res, next) => {
    try {
      const { page, limit, status, projectId, assigneeUserId } = listTasksQuerySchema.parse(req.query ?? {});
      const skip = (page - 1) * limit;
      const filter = {};
      if (status) {
        filter.status = status;
      }
      if (projectId) {
        ensureValidObjectId12(projectId);
        filter.projectId = new import_mongoose44.default.Types.ObjectId(projectId);
      }
      if (assigneeUserId) {
        filter.assigneeUserId = assigneeUserId;
      }
      const [total, items] = await Promise.all([
        TaskModel.countDocuments(filter).exec(),
        TaskModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec()
      ]);
      res.json({
        items,
        page,
        limit,
        total
      });
    } catch (error) {
      if (error instanceof import_zod18.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid task list query"));
        return;
      }
      next(error);
    }
  }
);
router16.post(
  "/api/v1/tasks/tasks",
  taskWriteRateLimiter,
  ...moduleGuards("tasks", "tasks.create"),
  async (req, res, next) => {
    try {
      const payload = createTaskSchema.parse(req.body ?? {});
      if (payload.projectId) {
        ensureValidObjectId12(payload.projectId);
        const projectExists = await ProjectModel.exists({ _id: payload.projectId }).exec();
        if (!projectExists) {
          throw new AppError(404, ERROR_CODES.NOT_FOUND, "Project not found");
        }
      }
      const createPayload = { ...payload, reporterUserId: req.user.id };
      if (payload.projectId) {
        createPayload.projectId = new import_mongoose44.default.Types.ObjectId(payload.projectId);
      }
      const created = await TaskModel.create(createPayload);
      res.status(201).json(created.toObject());
    } catch (error) {
      if (error instanceof import_zod18.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid task payload"));
        return;
      }
      next(error);
    }
  }
);
router16.get(
  "/api/v1/tasks/tasks/:id",
  ...moduleGuards("tasks", "tasks.read"),
  async (req, res, next) => {
    try {
      ensureValidObjectId12(req.params.id);
      const task = await TaskModel.findById(req.params.id).lean().exec();
      if (!task) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Task not found");
      }
      res.json(task);
    } catch (error) {
      next(error);
    }
  }
);
router16.patch(
  "/api/v1/tasks/tasks/:id",
  taskWriteRateLimiter,
  ...moduleGuards("tasks", "tasks.update"),
  async (req, res, next) => {
    try {
      ensureValidObjectId12(req.params.id);
      const payload = updateTaskSchema.parse(req.body ?? {});
      if (payload.projectId) {
        ensureValidObjectId12(payload.projectId);
        const projectExists = await ProjectModel.exists({ _id: payload.projectId }).exec();
        if (!projectExists) {
          throw new AppError(404, ERROR_CODES.NOT_FOUND, "Project not found");
        }
      }
      const updatePayload = { ...payload };
      const unsetFields = {};
      if (payload.projectId) {
        updatePayload.projectId = new import_mongoose44.default.Types.ObjectId(payload.projectId);
      } else if (payload.projectId === null) {
        delete updatePayload.projectId;
        unsetFields.projectId = "";
      }
      if (payload.assigneeUserId === null) {
        delete updatePayload.assigneeUserId;
        unsetFields.assigneeUserId = "";
      }
      if (payload.dueDate === null) {
        delete updatePayload.dueDate;
        unsetFields.dueDate = "";
      }
      if (payload.estimatedHours === null) {
        delete updatePayload.estimatedHours;
        unsetFields.estimatedHours = "";
      }
      const updateOperation = Object.keys(unsetFields).length > 0 ? {
        $set: updatePayload,
        $unset: unsetFields
      } : {
        $set: updatePayload
      };
      const updated = await TaskModel.findByIdAndUpdate(req.params.id, updateOperation, {
        new: true,
        runValidators: true
      }).lean().exec();
      if (!updated) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Task not found");
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof import_zod18.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid task update payload"));
        return;
      }
      next(error);
    }
  }
);
router16.post(
  "/api/v1/tasks/tasks/:id/transition",
  taskWriteRateLimiter,
  ...moduleGuards("tasks", "tasks.update"),
  async (req, res, next) => {
    try {
      ensureValidObjectId12(req.params.id);
      const payload = transitionTaskSchema.parse(req.body ?? {});
      const task = await TaskModel.findById(req.params.id).exec();
      if (!task) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Task not found");
      }
      const previousStatus = task.status;
      assertAllowedTransition4(previousStatus, payload.to);
      task.status = payload.to;
      if (payload.to === "done") {
        task.completedAt = /* @__PURE__ */ new Date();
      } else if (previousStatus === "done" || previousStatus === "cancelled") {
        task.completedAt = void 0;
      }
      await task.save();
      res.json(task.toObject());
    } catch (error) {
      if (error instanceof import_zod18.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid task transition payload"));
        return;
      }
      next(error);
    }
  }
);
router16.delete(
  "/api/v1/tasks/tasks/:id",
  taskWriteRateLimiter,
  ...moduleGuards("tasks", "tasks.delete"),
  async (req, res, next) => {
    try {
      ensureValidObjectId12(req.params.id);
      const task = await TaskModel.findById(req.params.id).exec();
      if (!task) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Task not found");
      }
      if (task.status !== "done" && task.status !== "cancelled") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Only done or cancelled tasks can be deleted");
      }
      await TaskModel.deleteOne({ _id: task._id }).exec();
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);
router16.get(
  "/api/v1/tasks/insights",
  ...moduleGuards("tasks", "tasks.read"),
  async (_req, res, next) => {
    try {
      const now = /* @__PURE__ */ new Date();
      const [todo, inProgress, review, done, cancelled, totalTasks, overdue] = await Promise.all([
        TaskModel.countDocuments({ status: "todo" }).exec(),
        TaskModel.countDocuments({ status: "in_progress" }).exec(),
        TaskModel.countDocuments({ status: "review" }).exec(),
        TaskModel.countDocuments({ status: "done" }).exec(),
        TaskModel.countDocuments({ status: "cancelled" }).exec(),
        TaskModel.countDocuments().exec(),
        TaskModel.countDocuments({
          dueDate: { $lt: now },
          status: { $nin: ["done", "cancelled"] }
        }).exec()
      ]);
      res.json({
        counts: {
          todo,
          inProgress,
          review,
          done,
          cancelled,
          totalTasks,
          overdue
        }
      });
    } catch (error) {
      next(error);
    }
  }
);
var taskRoutes = router16;

// src/modules/todo/todo.routes.ts
var import_express_rate_limit17 = __toESM(require("express-rate-limit"), 1);
var import_express18 = require("express");
var import_mongoose45 = __toESM(require("mongoose"), 1);
var import_zod19 = require("zod");
var router17 = (0, import_express18.Router)();
var createTodoSchema = import_zod19.z.object({
  title: import_zod19.z.string().min(1).max(300),
  description: import_zod19.z.string().max(2e3).optional(),
  priority: import_zod19.z.enum(["low", "medium", "high"]).default("medium"),
  dueDate: import_zod19.z.coerce.date().optional(),
  tags: import_zod19.z.array(import_zod19.z.string()).default([])
});
var updateTodoSchema = import_zod19.z.object({
  title: import_zod19.z.string().min(1).max(300).optional(),
  description: import_zod19.z.string().max(2e3).nullable().optional(),
  priority: import_zod19.z.enum(["low", "medium", "high"]).optional(),
  dueDate: import_zod19.z.coerce.date().nullable().optional(),
  tags: import_zod19.z.array(import_zod19.z.string()).optional()
});
var listTodosQuerySchema = import_zod19.z.object({
  page: import_zod19.z.coerce.number().int().min(1).default(1),
  limit: import_zod19.z.coerce.number().int().min(1).max(100).default(50),
  status: import_zod19.z.enum(["pending", "completed"]).optional(),
  allUsers: import_zod19.z.string().optional().transform((val) => val === "true")
});
var todoWriteRateLimiter = (0, import_express_rate_limit17.default)({
  windowMs: 60 * 1e3,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});
function ensureValidObjectId13(id) {
  if (!import_mongoose45.default.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid id");
  }
}
function ensureOwnerOrSuperAdmin(req, todo) {
  if (req.user.role !== "super_admin" && req.user.id !== todo.ownerUserId) {
    throw new AppError(403, ERROR_CODES.FORBIDDEN, "You can only access your own todo items");
  }
}
router17.get(
  "/api/v1/todo/items",
  ...moduleGuards("todo", "todo.read"),
  async (req, res, next) => {
    try {
      const { page, limit, status, allUsers } = listTodosQuerySchema.parse(req.query ?? {});
      const skip = (page - 1) * limit;
      const filter = {};
      if (status) {
        filter.status = status;
      }
      if (req.user.role !== "super_admin" || !allUsers) {
        filter.ownerUserId = req.user.id;
      }
      const [total, items] = await Promise.all([
        TodoItemModel.countDocuments(filter).exec(),
        TodoItemModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec()
      ]);
      res.json({
        items,
        page,
        limit,
        total
      });
    } catch (error) {
      if (error instanceof import_zod19.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid todo item list query"));
        return;
      }
      next(error);
    }
  }
);
router17.post(
  "/api/v1/todo/items",
  todoWriteRateLimiter,
  ...moduleGuards("todo", "todo.create"),
  async (req, res, next) => {
    try {
      const payload = createTodoSchema.parse(req.body ?? {});
      const created = await TodoItemModel.create({
        ...payload,
        status: "pending",
        ownerUserId: req.user.id
      });
      res.status(201).json(created.toObject());
    } catch (error) {
      if (error instanceof import_zod19.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid todo item payload"));
        return;
      }
      next(error);
    }
  }
);
router17.get(
  "/api/v1/todo/items/:id",
  ...moduleGuards("todo", "todo.read"),
  async (req, res, next) => {
    try {
      ensureValidObjectId13(req.params.id);
      const todo = await TodoItemModel.findById(req.params.id).lean().exec();
      if (!todo) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Todo item not found");
      }
      ensureOwnerOrSuperAdmin(req, todo);
      res.json(todo);
    } catch (error) {
      next(error);
    }
  }
);
router17.patch(
  "/api/v1/todo/items/:id",
  todoWriteRateLimiter,
  ...moduleGuards("todo", "todo.update"),
  async (req, res, next) => {
    try {
      ensureValidObjectId13(req.params.id);
      const payload = updateTodoSchema.parse(req.body ?? {});
      const existingTodo = await TodoItemModel.findById(req.params.id).exec();
      if (!existingTodo) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Todo item not found");
      }
      ensureOwnerOrSuperAdmin(req, existingTodo);
      const updatePayload = { ...payload };
      const unsetFields = {};
      if (payload.description === null) {
        delete updatePayload.description;
        unsetFields.description = "";
      }
      if (payload.dueDate === null) {
        delete updatePayload.dueDate;
        unsetFields.dueDate = "";
      }
      const updateOperation = Object.keys(unsetFields).length > 0 ? {
        $set: updatePayload,
        $unset: unsetFields
      } : {
        $set: updatePayload
      };
      const updated = await TodoItemModel.findByIdAndUpdate(req.params.id, updateOperation, {
        new: true,
        runValidators: true
      }).lean().exec();
      if (!updated) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Todo item not found");
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof import_zod19.z.ZodError) {
        next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid todo item update payload"));
        return;
      }
      next(error);
    }
  }
);
router17.post(
  "/api/v1/todo/items/:id/complete",
  todoWriteRateLimiter,
  ...moduleGuards("todo", "todo.update"),
  async (req, res, next) => {
    try {
      ensureValidObjectId13(req.params.id);
      const todo = await TodoItemModel.findById(req.params.id).exec();
      if (!todo) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Todo item not found");
      }
      ensureOwnerOrSuperAdmin(req, todo);
      if (todo.status === "completed") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Todo item is already completed");
      }
      todo.status = "completed";
      todo.completedAt = /* @__PURE__ */ new Date();
      await todo.save();
      res.json(todo.toObject());
    } catch (error) {
      next(error);
    }
  }
);
router17.post(
  "/api/v1/todo/items/:id/reopen",
  todoWriteRateLimiter,
  ...moduleGuards("todo", "todo.update"),
  async (req, res, next) => {
    try {
      ensureValidObjectId13(req.params.id);
      const todo = await TodoItemModel.findById(req.params.id).exec();
      if (!todo) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Todo item not found");
      }
      ensureOwnerOrSuperAdmin(req, todo);
      if (todo.status === "pending") {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Todo item is already pending");
      }
      todo.status = "pending";
      todo.completedAt = void 0;
      await todo.save();
      res.json(todo.toObject());
    } catch (error) {
      next(error);
    }
  }
);
router17.delete(
  "/api/v1/todo/items/:id",
  todoWriteRateLimiter,
  ...moduleGuards("todo", "todo.delete"),
  async (req, res, next) => {
    try {
      ensureValidObjectId13(req.params.id);
      const todo = await TodoItemModel.findById(req.params.id).exec();
      if (!todo) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Todo item not found");
      }
      ensureOwnerOrSuperAdmin(req, todo);
      await TodoItemModel.deleteOne({ _id: todo._id }).exec();
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);
router17.get(
  "/api/v1/todo/insights",
  ...moduleGuards("todo", "todo.read"),
  async (req, res, next) => {
    try {
      const { allUsers } = listTodosQuerySchema.parse(req.query ?? {});
      const filter = {};
      if (req.user.role !== "super_admin" || !allUsers) {
        filter.ownerUserId = req.user.id;
      }
      const now = /* @__PURE__ */ new Date();
      const [pending, completed, overdue, totalItems] = await Promise.all([
        TodoItemModel.countDocuments({ ...filter, status: "pending" }).exec(),
        TodoItemModel.countDocuments({ ...filter, status: "completed" }).exec(),
        TodoItemModel.countDocuments({ ...filter, status: "pending", dueDate: { $lt: now } }).exec(),
        TodoItemModel.countDocuments(filter).exec()
      ]);
      res.json({
        counts: {
          pending,
          completed,
          overdue,
          totalItems
        }
      });
    } catch (error) {
      next(error);
    }
  }
);
var todoRoutes = router17;

// src/modules/whatsapp/webhook.routes.ts
var import_express19 = __toESM(require("express"), 1);
var import_express_rate_limit18 = __toESM(require("express-rate-limit"), 1);

// src/modules/whatsapp/webhook.handlers.ts
var import_crypto5 = __toESM(require("crypto"), 1);

// src/core/utils/phone-utils.ts
function normalizePhoneNumber(phone, defaultCountryCode = "91") {
  if (!phone) return null;
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, "");
  if (!cleaned) return null;
  const withoutLeadingZero = cleaned.startsWith("0") ? cleaned.slice(1) : cleaned;
  if (withoutLeadingZero.startsWith(defaultCountryCode) && withoutLeadingZero.length === defaultCountryCode.length + 10) {
    return withoutLeadingZero;
  }
  if (withoutLeadingZero.length === 10) {
    return defaultCountryCode + withoutLeadingZero;
  }
  return withoutLeadingZero;
}

// src/modules/whatsapp/models/wa-opt-out.model.ts
var import_mongoose46 = __toESM(require("mongoose"), 1);
var waOptOutSchema = new import_mongoose46.Schema(
  {
    phone: { type: String, required: true, index: true },
    clientCode: { type: String, required: true, index: true },
    optedOutAt: { type: Date, default: Date.now },
    keyword: { type: String, required: true }
  },
  { timestamps: false }
);
waOptOutSchema.index({ phone: 1, clientCode: 1 }, { unique: true });
var WaOptOutModel = import_mongoose46.default.models.WaOptOut ?? import_mongoose46.default.model("WaOptOut", waOptOutSchema);

// src/modules/whatsapp/models/campaign.model.ts
var import_mongoose47 = __toESM(require("mongoose"), 1);
var CampaignSchema = new import_mongoose47.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1e3
    },
    type: {
      type: String,
      default: "general",
      trim: true
    },
    status: {
      type: String,
      enum: ["draft", "active", "paused", "completed", "archived"],
      default: "draft",
      index: true
    },
    defaultTemplateId: {
      type: import_mongoose47.Schema.Types.ObjectId,
      ref: "WhatsAppTemplate",
      // TODO: CHANGE THIS - Update to your template model
      default: null
    },
    stats: {
      totalBulkMessagings: { type: Number, default: 0, min: 0 },
      totalMessages: { type: Number, default: 0, min: 0 },
      totalSent: { type: Number, default: 0, min: 0 },
      totalDelivered: { type: Number, default: 0, min: 0 },
      totalRead: { type: Number, default: 0, min: 0 },
      totalFailed: { type: Number, default: 0, min: 0 }
    },
    createdBy: {
      type: import_mongoose47.Schema.Types.ObjectId,
      ref: "User"
      // TODO: CHANGE THIS - Update if your user model has different name
    },
    tags: [{ type: String, trim: true, maxlength: 50 }],
    totalCost: { type: Number, default: 0, min: 0 },
    budgetLimit: { type: Number, default: null, min: 0 }
  },
  {
    timestamps: true,
    collection: "BM-Campaigns"
  }
);
CampaignSchema.index({ createdAt: -1 });
CampaignSchema.index({ createdBy: 1 });
CampaignSchema.index({ status: 1, createdAt: -1 });
var CampaignModel = import_mongoose47.default.models.Campaign ?? import_mongoose47.default.model("Campaign", CampaignSchema);

// src/modules/whatsapp/models/bulk-messaging.model.ts
var import_mongoose48 = __toESM(require("mongoose"), 1);
var BulkMessagingSchema = new import_mongoose48.Schema(
  {
    campaignId: {
      type: import_mongoose48.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
      index: true
    },
    name: {
      type: String,
      trim: true,
      default: "",
      maxlength: 200
    },
    templateId: {
      type: import_mongoose48.Schema.Types.ObjectId,
      ref: "WhatsAppTemplate",
      // TODO: CHANGE THIS
      required: true
    },
    audienceFilter: {
      userType: {
        type: [String],
        enum: ["all", "prospect", "organic", "member", "premium"],
        default: ["all"]
      },
      audienceTypeIds: [{ type: import_mongoose48.Schema.Types.ObjectId, ref: "AudienceType" }],
      cityIds: [{ type: import_mongoose48.Schema.Types.ObjectId, ref: "City" }],
      // TODO: CHANGE THIS
      stateIds: [{ type: import_mongoose48.Schema.Types.ObjectId, ref: "State" }],
      // TODO: CHANGE THIS
      industryIds: [{ type: import_mongoose48.Schema.Types.ObjectId, ref: "Industry" }],
      // TODO: CHANGE THIS
      planIds: [{ type: import_mongoose48.Schema.Types.ObjectId, ref: "PlanMaster" }],
      // TODO: CHANGE THIS
      profileCompleteness: {
        type: String,
        enum: ["any", "complete", "incomplete"],
        default: "any"
      },
      planExpiryBefore: { type: Date, default: null },
      planExpiryAfter: { type: Date, default: null },
      registeredBefore: { type: Date, default: null },
      registeredAfter: { type: Date, default: null },
      lastMessagedBefore: { type: Date, default: null },
      lastMessagedAfter: { type: Date, default: null },
      excludeRecentlyMessaged: { type: Number, default: 0, min: 0 }
    },
    variableOverrides: [
      {
        position: { type: Number, required: true, min: 1 },
        fieldMapping: { type: String },
        customValue: { type: String }
      }
    ],
    stats: {
      totalRecipients: { type: Number, default: 0, min: 0 },
      queued: { type: Number, default: 0, min: 0 },
      sent: { type: Number, default: 0, min: 0 },
      delivered: { type: Number, default: 0, min: 0 },
      read: { type: Number, default: 0, min: 0 },
      failed: { type: Number, default: 0, min: 0 }
    },
    status: {
      type: String,
      enum: ["draft", "queued", "processing", "paused", "completed", "failed"],
      default: "draft",
      index: true
    },
    scheduledFor: { type: Date, default: null },
    sendWindow: {
      startHour: { type: Number, default: 9, min: 0, max: 23 },
      endHour: { type: Number, default: 21, min: 0, max: 23 },
      timezone: { type: String, default: "Asia/Kolkata" },
      respectQuietHours: { type: Boolean, default: true }
    },
    estimatedCost: { type: Number, default: 0, min: 0 },
    actualCost: { type: Number, default: 0, min: 0 },
    budgetLimit: { type: Number, default: null, min: 0 },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    createdBy: {
      type: import_mongoose48.Schema.Types.ObjectId,
      ref: "User"
      // TODO: CHANGE THIS - Update if your user model has different name
    }
  },
  {
    timestamps: true,
    collection: "BM-BulkMessagings"
  }
);
BulkMessagingSchema.index({ status: 1, scheduledFor: 1 });
BulkMessagingSchema.index({ campaignId: 1, createdAt: -1 });
var BulkMessagingModel = import_mongoose48.default.models.BulkMessaging ?? import_mongoose48.default.model("BulkMessaging", BulkMessagingSchema);

// src/modules/whatsapp/models/message-queue.model.ts
var import_mongoose49 = __toESM(require("mongoose"), 1);
var MessageQueueSchema = new import_mongoose49.Schema(
  {
    bulkMessagingId: {
      type: import_mongoose49.Schema.Types.ObjectId,
      ref: "BulkMessaging",
      required: true,
      index: true
    },
    userId: {
      type: import_mongoose49.Schema.Types.ObjectId,
      ref: "RegisteredUser",
      // TODO: CHANGE THIS - Update to your user model
      required: true
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20
    },
    templateName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    templateLanguage: {
      type: String,
      default: "en_US",
      trim: true,
      maxlength: 10
    },
    components: [{ type: import_mongoose49.Schema.Types.Mixed }],
    status: {
      type: String,
      enum: ["pending", "processing", "sent", "delivered", "read", "failed", "skipped"],
      default: "pending",
      index: true
    },
    messageId: {
      type: String,
      default: null,
      trim: true,
      maxlength: 100
    },
    error: {
      type: String,
      default: null,
      maxlength: 500
    },
    errorCode: {
      type: Number,
      default: null
    },
    errorCategory: {
      type: String,
      enum: ["transient", "permanent", "rate_limit", "policy"],
      default: null
    },
    retryCount: {
      type: Number,
      default: 0,
      min: 0
    },
    maxRetries: {
      type: Number,
      default: 3,
      min: 0,
      max: 10
    },
    nextRetryAt: {
      type: Date,
      default: null
    },
    lastAttemptAt: {
      type: Date,
      default: null
    },
    sentAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    readAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    lockedAt: {
      type: Date,
      default: null
    },
    lockedBy: {
      type: String,
      default: null,
      maxlength: 100
    },
    cost: { type: Number, default: 0, min: 0 }
  },
  {
    timestamps: true,
    collection: "BM-MessageQueue"
  }
);
MessageQueueSchema.index(
  { status: 1, nextRetryAt: 1, lockedAt: 1 },
  {
    partialFilterExpression: {
      status: { $in: ["pending", "failed"] }
    }
  }
);
MessageQueueSchema.index({ bulkMessagingId: 1, status: 1 });
MessageQueueSchema.index({ messageId: 1 }, { sparse: true });
MessageQueueSchema.index({ userId: 1, createdAt: -1 });
MessageQueueSchema.index({ bulkMessagingId: 1, userId: 1 }, { unique: true });
var MessageQueueModel = import_mongoose49.default.models.MessageQueue ?? import_mongoose49.default.model("MessageQueue", MessageQueueSchema);

// src/modules/whatsapp/models/template.model.ts
var import_mongoose50 = __toESM(require("mongoose"), 1);
var WhatsAppTemplateSchema = new import_mongoose50.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    metaTemplateName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      lowercase: true
    },
    language: {
      type: String,
      default: "en",
      trim: true,
      maxlength: 10
    },
    category: {
      type: String,
      enum: ["MARKETING", "UTILITY", "AUTHENTICATION"],
      default: "MARKETING",
      index: true
    },
    bodyText: {
      type: String,
      default: "",
      maxlength: 1024
    },
    headerText: {
      type: String,
      default: "",
      maxlength: 60
    },
    footerText: {
      type: String,
      default: "",
      maxlength: 60
    },
    metaTemplateId: {
      type: String,
      default: null,
      maxlength: 100
    },
    metaStatus: {
      type: String,
      enum: ["NOT_SUBMITTED", "PENDING", "APPROVED", "REJECTED", "PAUSED", "DISABLED"],
      default: "NOT_SUBMITTED",
      index: true
    },
    headerType: {
      type: String,
      enum: ["NONE", "TEXT", "IMAGE", "VIDEO", "DOCUMENT"],
      default: "TEXT"
    },
    headerMediaUrl: {
      type: String,
      default: "",
      maxlength: 500
    },
    buttons: [
      {
        type: {
          type: String,
          enum: ["URL", "PHONE_NUMBER", "QUICK_REPLY"],
          required: true
        },
        text: { type: String, required: true, maxlength: 25 },
        url: { type: String, maxlength: 500 },
        phoneNumber: { type: String, maxlength: 20 }
      }
    ],
    components: [{ type: import_mongoose50.Schema.Types.Mixed }],
    variables: [
      {
        position: {
          type: Number,
          required: true,
          min: 1,
          max: 99
        },
        description: {
          type: String,
          default: "",
          maxlength: 200
        },
        sampleValue: {
          type: String,
          default: "",
          maxlength: 100
        },
        fieldMapping: {
          type: String,
          enum: [
            "user.name",
            "user.mobile",
            "user.email",
            "personalProfile.name",
            "personalProfile.designation",
            "businessProfile.businessName",
            "businessProfile.cityName",
            "businessProfile.industryName",
            "plan.planName",
            "plan.expiryDate",
            "custom"
          ],
          default: "custom"
        },
        customValue: {
          type: String,
          default: "",
          maxlength: 200
        }
      }
    ],
    status: {
      type: String,
      enum: ["active", "paused", "deleted"],
      default: "active",
      index: true
    },
    lastSyncedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    collection: "BM-WhatsAppTemplates"
  }
);
WhatsAppTemplateSchema.index({ metaTemplateName: 1, language: 1 }, { unique: true });
WhatsAppTemplateSchema.index({ status: 1 });
WhatsAppTemplateSchema.index({ category: 1 });
WhatsAppTemplateSchema.index({ metaStatus: 1 });
WhatsAppTemplateSchema.index({ metaStatus: 1, category: 1, status: 1 });
var WhatsAppTemplateModel = import_mongoose50.default.models.WhatsAppTemplate ?? import_mongoose50.default.model("WhatsAppTemplate", WhatsAppTemplateSchema);

// src/modules/whatsapp/models/audience-type.model.ts
var import_mongoose51 = __toESM(require("mongoose"), 1);
var AudienceTypeSchema = new import_mongoose51.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      unique: true
      // Prevent duplicate audience type names
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500
    },
    conditions: {
      userTypes: {
        type: [String],
        enum: ["prospect", "organic", "member", "premium"],
        default: []
      },
      profileCompleteness: {
        type: String,
        enum: ["any", "complete", "incomplete"],
        default: "any"
      },
      cityIds: [{ type: import_mongoose51.Schema.Types.ObjectId, ref: "City" }],
      // TODO: CHANGE THIS
      stateIds: [{ type: import_mongoose51.Schema.Types.ObjectId, ref: "State" }],
      // TODO: CHANGE THIS
      industryIds: [{ type: import_mongoose51.Schema.Types.ObjectId, ref: "Industry" }],
      // TODO: CHANGE THIS
      planIds: [{ type: import_mongoose51.Schema.Types.ObjectId, ref: "PlanMaster" }],
      // TODO: CHANGE THIS
      planExpiryBefore: { type: Date, default: null },
      planExpiryAfter: { type: Date, default: null },
      registeredBefore: { type: Date, default: null },
      registeredAfter: { type: Date, default: null },
      lastActiveBefore: { type: Date, default: null },
      lastActiveAfter: { type: Date, default: null },
      excludeRecentlyMessaged: { type: Number, default: 0, min: 0 }
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    estimatedCount: {
      type: Number,
      default: 0,
      min: 0
    },
    lastCountRefreshedAt: {
      type: Date,
      default: null
    },
    createdBy: {
      type: import_mongoose51.Schema.Types.ObjectId,
      ref: "User"
      // TODO: CHANGE THIS - Update if your user model has different name
    }
  },
  {
    timestamps: true,
    collection: "BM-AudienceTypes"
  }
);
AudienceTypeSchema.index({ isActive: 1 });
AudienceTypeSchema.index({ name: 1 }, { unique: true });
AudienceTypeSchema.index({ createdAt: -1 });
var AudienceTypeModel = import_mongoose51.default.models.AudienceType ?? import_mongoose51.default.model("AudienceType", AudienceTypeSchema);

// src/modules/whatsapp/models/whatsapp-log.model.ts
var import_mongoose52 = __toESM(require("mongoose"), 1);
var WhatsAppLogSchema = new import_mongoose52.Schema(
  {
    userId: {
      type: import_mongoose52.Schema.Types.ObjectId,
      ref: "RegisteredUser"
      // TODO: CHANGE THIS
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20
    },
    templateName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    relatedTo: {
      model: {
        type: String,
        enum: ["ConnectionRequest", "Meeting", "BulkMessaging"]
      },
      id: { type: import_mongoose52.Schema.Types.ObjectId }
    },
    messageId: {
      type: String,
      trim: true,
      maxlength: 100
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "read", "failed"],
      default: "sent",
      index: true
    },
    error: {
      type: String,
      maxlength: 500
    },
    errorCode: {
      type: Number,
      default: null
    },
    cost: {
      type: Number,
      default: 0,
      min: 0
    },
    sentAt: {
      type: Date,
      required: true,
      index: true
    }
  },
  {
    timestamps: true,
    collection: "BM-WhatsAppLogs",
    strict: false
    // Allow additional fields for flexibility
  }
);
WhatsAppLogSchema.index({ messageId: 1 }, { sparse: true });
WhatsAppLogSchema.index({ userId: 1, sentAt: -1 });
WhatsAppLogSchema.index({ phoneNumber: 1, sentAt: -1 });
WhatsAppLogSchema.index({ "relatedTo.model": 1, "relatedTo.id": 1 });
WhatsAppLogSchema.index({ sentAt: -1 });
WhatsAppLogSchema.index({ status: 1, sentAt: -1 });
var WhatsAppLogModel = import_mongoose52.default.models.WhatsAppLog ?? import_mongoose52.default.model("WhatsAppLog", WhatsAppLogSchema);

// src/modules/whatsapp/models/trigger.model.ts
var import_mongoose53 = __toESM(require("mongoose"), 1);
var WhatsAppTriggerSchema = new import_mongoose53.Schema(
  {
    eventKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: 100
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    description: {
      type: String,
      default: "",
      maxlength: 500
    },
    template: {
      type: import_mongoose53.Schema.Types.ObjectId,
      ref: "WhatsAppTemplate",
      // TODO: CHANGE THIS
      default: null
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    availableParams: [
      {
        key: { type: String, required: true, trim: true, maxlength: 50 },
        label: { type: String, required: true, trim: true, maxlength: 100 },
        description: { type: String, default: "", maxlength: 300 }
      }
    ],
    variableMapping: [
      {
        position: {
          type: Number,
          required: true,
          min: 1,
          max: 99
        },
        source: {
          type: String,
          enum: ["context", "user_field", "static"],
          required: true
        },
        contextKey: { type: String, default: "", trim: true, maxlength: 50 },
        fieldPath: { type: String, default: "", trim: true, maxlength: 100 },
        staticValue: { type: String, default: "", maxlength: 200 }
      }
    ]
  },
  {
    timestamps: true,
    collection: "BM-WhatsAppTriggers"
  }
);
WhatsAppTriggerSchema.index({ eventKey: 1 }, { unique: true });
WhatsAppTriggerSchema.index({ isActive: 1 });
WhatsAppTriggerSchema.index({ template: 1 });
var WhatsAppTriggerModel = import_mongoose53.default.models.WhatsAppTrigger ?? import_mongoose53.default.model("WhatsAppTrigger", WhatsAppTriggerSchema);

// src/modules/whatsapp/models/conversation.model.ts
var import_mongoose54 = __toESM(require("mongoose"), 1);
var WAConversationSchema = new import_mongoose54.Schema(
  {
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 20
    },
    contactName: {
      type: String,
      default: "",
      trim: true,
      maxlength: 200
    },
    lastMessage: {
      content: { type: String, default: "", maxlength: 500 },
      direction: { type: String, enum: ["inbound", "outbound"] },
      type: { type: String, default: "text", maxlength: 50 },
      timestamp: { type: Date }
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    lastInboundAt: {
      type: Date,
      default: null
    },
    unreadCount: {
      type: Number,
      default: 0,
      min: 0
    },
    campaignIds: [{ type: import_mongoose54.Schema.Types.ObjectId }],
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
      index: true
    },
    metadata: {
      waId: { type: String, default: "", maxlength: 100 }
    }
  },
  {
    timestamps: true,
    collection: "WA-Conversations"
  }
);
WAConversationSchema.index({ phoneNumber: 1 }, { unique: true });
WAConversationSchema.index({ status: 1, lastMessageAt: -1 });
WAConversationSchema.index({ campaignIds: 1 });
WAConversationSchema.index({ lastInboundAt: -1 });
WAConversationSchema.index({ status: 1, unreadCount: 1 });
var WAConversationModel = import_mongoose54.default.models.WAConversation ?? import_mongoose54.default.model("WAConversation", WAConversationSchema);

// src/modules/whatsapp/models/message.model.ts
var import_mongoose55 = __toESM(require("mongoose"), 1);
var WAMessageSchema = new import_mongoose55.Schema(
  {
    conversationId: {
      type: import_mongoose55.Schema.Types.ObjectId,
      ref: "WAConversation",
      required: true,
      index: true
    },
    waMessageId: {
      type: String,
      default: null,
      trim: true,
      maxlength: 100
    },
    direction: {
      type: String,
      enum: ["inbound", "outbound"],
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: [
        "text",
        "image",
        "video",
        "document",
        "audio",
        "sticker",
        "location",
        "reaction",
        "interactive",
        "template",
        "unsupported"
      ],
      default: "text"
    },
    content: {
      text: { type: String, default: "", maxlength: 4e3 },
      mediaUrl: { type: String, maxlength: 500 },
      mimeType: { type: String, maxlength: 100 },
      filename: { type: String, maxlength: 255 },
      latitude: { type: Number },
      longitude: { type: Number },
      templateName: { type: String, maxlength: 100 },
      templateData: { type: import_mongoose55.Schema.Types.Mixed }
    },
    replyToWaMessageId: {
      type: String,
      default: null,
      maxlength: 100
    },
    replyToId: {
      type: import_mongoose55.Schema.Types.ObjectId,
      ref: "WAMessage",
      default: null
    },
    status: {
      type: String,
      enum: ["pending", "sent", "delivered", "read", "failed"],
      default: "sent",
      index: true
    },
    statusTimestamps: {
      sentAt: { type: Date },
      deliveredAt: { type: Date },
      readAt: { type: Date },
      failedAt: { type: Date }
    },
    error: {
      type: String,
      default: null,
      maxlength: 500
    },
    sentBy: {
      type: String,
      default: null,
      maxlength: 200
    },
    timestamp: {
      type: Date,
      required: true,
      index: true
    }
  },
  {
    timestamps: true,
    collection: "WA-Messages"
  }
);
WAMessageSchema.index({ conversationId: 1, timestamp: -1 });
WAMessageSchema.index({ waMessageId: 1 }, { sparse: true, unique: true });
WAMessageSchema.index({ replyToWaMessageId: 1 }, { sparse: true });
WAMessageSchema.index({ direction: 1, status: 1, timestamp: -1 });
var WAMessageModel = import_mongoose55.default.models.WAMessage ?? import_mongoose55.default.model("WAMessage", WAMessageSchema);

// src/modules/whatsapp/types.ts
var META_ERROR_CODES = {
  // Permanent errors (don't retry)
  INVALID_PHONE_NUMBER: 131047,
  PHONE_NOT_WHATSAPP: 131026,
  TEMPLATE_PARAM_COUNT_MISMATCH: 131051,
  TEMPLATE_NOT_EXISTS: 131049,
  RECIPIENT_UNAVAILABLE: 131042,
  // Policy errors (don't retry, flag for review)
  POLICY_VIOLATION: 368,
  SPAM_RATE_LIMIT: 131031,
  // Rate limit errors (back off and retry)
  RATE_LIMIT_HIT: 131056,
  TOO_MANY_MESSAGES: 131057,
  CLOUD_API_RATE_LIMIT: 80007,
  // Transient errors (retry with backoff)
  TEMPORARY_ERROR: 130472,
  TEMPLATE_PAUSED: 131053,
  MEDIA_DOWNLOAD_ERROR: 131021,
  INTERNAL_ERROR: 500,
  GENERIC_ERROR: 131e3
};

// src/modules/whatsapp/webhook.handlers.ts
var STATUS_ORDER = { sent: 1, delivered: 2, read: 3 };
var MESSAGE_TYPE_MAP = {
  text: "text",
  image: "image",
  video: "video",
  document: "document",
  audio: "audio",
  sticker: "sticker",
  location: "location",
  reaction: "reaction",
  interactive: "interactive"
};
var verifyWebhook = (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    logger.info("[WhatsApp Webhook] Verification successful");
    res.status(200).send(challenge);
    return;
  }
  logger.error("[WhatsApp Webhook] Verification failed", {
    mode,
    tokenMatch: token === env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
  });
  res.status(403).send("Forbidden");
};
var validateSignature = (rawBody, signature) => {
  const appSecret = env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    if (env.NODE_ENV === "production") {
      logger.error("[WhatsApp Webhook] WHATSAPP_APP_SECRET not configured in production \u2014 rejecting request");
      return false;
    }
    logger.warn("[WhatsApp Webhook] APP_SECRET not configured, skipping signature validation (dev only)");
    return true;
  }
  if (!signature) {
    logger.error("[WhatsApp Webhook] Missing x-hub-signature-256 header");
    return false;
  }
  const expectedSignature = "sha256=" + import_crypto5.default.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  try {
    return import_crypto5.default.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch (err) {
    logger.error("[WhatsApp Webhook] Signature validation error", { error: err });
    return false;
  }
};
var handleStatusUpdate = async (req, res) => {
  res.status(200).send("OK");
  const rawBody = req.body;
  const signature = req.headers["x-hub-signature-256"];
  if (!validateSignature(rawBody, signature)) {
    logger.error("[WhatsApp Webhook] Invalid signature, ignoring payload");
    return;
  }
  let body;
  try {
    body = JSON.parse(rawBody.toString("utf8"));
  } catch (err) {
    logger.error("[WhatsApp Webhook] Failed to parse JSON payload", { error: err });
    return;
  }
  try {
    const entries = body?.entry || [];
    const io = req.app.get("io");
    for (const entry of entries) {
      const changes = entry?.changes || [];
      for (const change of changes) {
        const value = change?.value;
        if (!value) continue;
        const statuses = value.statuses || [];
        for (const statusUpdate of statuses) {
          await processStatusUpdate(statusUpdate, io);
        }
        const messages = value.messages || [];
        const contacts = value.contacts || [];
        for (const msg of messages) {
          if (msg.type === "text" && msg.text?.body) {
            await handleOptOut(msg.from, msg.text.body);
          }
          await processIncomingMessage(msg, contacts, value.metadata, io);
        }
      }
    }
  } catch (err) {
    logger.error("[WhatsApp Webhook] Processing error", { error: err });
  }
};
var processStatusUpdate = async (statusUpdate, io) => {
  const { id: messageId, status, timestamp, errors } = statusUpdate;
  if (!messageId || !status) return;
  try {
    const queueMsg = await MessageQueueModel.findOne({ messageId });
    if (queueMsg) {
      const currentOrder = STATUS_ORDER[queueMsg.status] || 0;
      const newOrder = STATUS_ORDER[status] || 0;
      if (status === "failed") {
        const errorCode = errors?.[0]?.code || null;
        const errorTitle = errors?.[0]?.title || "Unknown error";
        const category = classifyError(errorCode);
        if (currentOrder < 2) {
          const prevStatus = queueMsg.status;
          await MessageQueueModel.findByIdAndUpdate(queueMsg._id, {
            $set: {
              status: "failed",
              error: errorTitle,
              errorCode,
              errorCategory: category,
              failedAt: new Date(parseInt(timestamp) * 1e3)
            }
          });
          if (prevStatus === "sent") {
            await BulkMessagingModel.findByIdAndUpdate(queueMsg.bulkMessagingId, {
              $inc: { "stats.sent": -1, "stats.failed": 1 }
            });
          }
        }
      } else if (newOrder > currentOrder) {
        const updateData = { status };
        const incData = {};
        if (status === "sent" && !queueMsg.sentAt) {
          updateData.sentAt = new Date(parseInt(timestamp) * 1e3);
        }
        if (status === "delivered") {
          updateData.deliveredAt = new Date(parseInt(timestamp) * 1e3);
          if (queueMsg.status === "sent") {
            incData["stats.sent"] = -1;
            incData["stats.delivered"] = 1;
          }
        }
        if (status === "read") {
          updateData.readAt = new Date(parseInt(timestamp) * 1e3);
          if (queueMsg.status === "delivered") {
            incData["stats.delivered"] = -1;
            incData["stats.read"] = 1;
          } else if (queueMsg.status === "sent") {
            incData["stats.sent"] = -1;
            incData["stats.read"] = 1;
          }
        }
        await MessageQueueModel.findByIdAndUpdate(queueMsg._id, { $set: updateData });
        if (Object.keys(incData).length > 0) {
          await BulkMessagingModel.findByIdAndUpdate(queueMsg.bulkMessagingId, {
            $inc: incData
          });
        }
      }
    }
    const whatsappLog = await WhatsAppLogModel.findOne({ messageId });
    if (whatsappLog) {
      const updateFields = { status };
      if (status === "failed" && errors?.[0]) {
        updateFields.error = errors[0].title || "Unknown error";
        updateFields.errorCode = errors[0].code || null;
      }
      await WhatsAppLogModel.findByIdAndUpdate(whatsappLog._id, { $set: updateFields });
    }
    const waMsg = await WAMessageModel.findOne({ waMessageId: messageId });
    if (waMsg) {
      const waStatusUpdate = {};
      const tsDate = new Date(parseInt(timestamp) * 1e3);
      if (status === "sent") {
        waStatusUpdate.status = "sent";
        waStatusUpdate["statusTimestamps.sentAt"] = tsDate;
      } else if (status === "delivered") {
        waStatusUpdate.status = "delivered";
        waStatusUpdate["statusTimestamps.deliveredAt"] = tsDate;
      } else if (status === "read") {
        waStatusUpdate.status = "read";
        waStatusUpdate["statusTimestamps.readAt"] = tsDate;
      } else if (status === "failed") {
        waStatusUpdate.status = "failed";
        waStatusUpdate["statusTimestamps.failedAt"] = tsDate;
        waStatusUpdate.error = errors?.[0]?.title || "Unknown error";
      }
      if (Object.keys(waStatusUpdate).length > 0) {
        await WAMessageModel.findByIdAndUpdate(waMsg._id, { $set: waStatusUpdate });
        if (io) {
          io.to("whatsapp_inbox_admin").emit("wa_status_update", {
            conversationId: waMsg.conversationId,
            waMessageId: messageId,
            status
          });
        }
      }
    }
  } catch (err) {
    logger.error(`[WhatsApp Webhook] Error processing status for ${messageId}`, { error: err });
  }
};
var extractMessageContent = (msg) => {
  const content = {};
  const type = MESSAGE_TYPE_MAP[msg.type] || "unsupported";
  switch (msg.type) {
    case "text":
      content.text = msg.text?.body || "";
      break;
    case "image":
      content.text = msg.image?.caption || "";
      content.mediaUrl = msg.image?.id || "";
      content.mimeType = msg.image?.mime_type || "";
      break;
    case "video":
      content.text = msg.video?.caption || "";
      content.mediaUrl = msg.video?.id || "";
      content.mimeType = msg.video?.mime_type || "";
      break;
    case "document":
      content.text = msg.document?.caption || "";
      content.mediaUrl = msg.document?.id || "";
      content.mimeType = msg.document?.mime_type || "";
      content.filename = msg.document?.filename || "";
      break;
    case "audio":
      content.mediaUrl = msg.audio?.id || "";
      content.mimeType = msg.audio?.mime_type || "";
      break;
    case "sticker":
      content.mediaUrl = msg.sticker?.id || "";
      content.mimeType = msg.sticker?.mime_type || "";
      break;
    case "location":
      content.latitude = msg.location?.latitude;
      content.longitude = msg.location?.longitude;
      content.text = msg.location?.name || "";
      break;
    case "reaction":
      content.text = msg.reaction?.emoji || "";
      break;
    case "interactive":
      const interactive = msg.interactive;
      if (interactive?.type === "button_reply") {
        content.text = interactive.button_reply?.title || "";
      } else if (interactive?.type === "list_reply") {
        content.text = interactive.list_reply?.title || "";
      }
      break;
    default:
      content.text = "[Unsupported message type]";
  }
  return { type, content };
};
var processIncomingMessage = async (msg, contacts, metadata, io) => {
  try {
    const phone = normalizePhone(msg.from);
    if (!phone) return;
    const contactName = contacts?.[0]?.profile?.name || "";
    const msgTimestamp = new Date(parseInt(msg.timestamp) * 1e3);
    const { type, content } = extractMessageContent(msg);
    const existing = await WAMessageModel.findOne({ waMessageId: msg.id });
    if (existing) {
      logger.debug(`[WhatsApp Inbox] Duplicate message ${msg.id}, skipping`);
      return;
    }
    const conversation = await WAConversationModel.findOneAndUpdate(
      { phoneNumber: phone },
      {
        $set: {
          contactName: contactName || void 0,
          lastMessage: {
            content: content.text || `[${type}]`,
            direction: "inbound",
            type,
            timestamp: msgTimestamp
          },
          lastMessageAt: msgTimestamp,
          lastInboundAt: msgTimestamp,
          "metadata.waId": msg.from
        },
        $inc: { unreadCount: 1 },
        $setOnInsert: {
          phoneNumber: phone,
          status: "active",
          campaignIds: []
        }
      },
      { upsert: true, new: true }
    );
    let replyToId = null;
    const replyToWaMessageId = msg.context?.id || null;
    if (replyToWaMessageId) {
      const replyMsg = await WAMessageModel.findOne({ waMessageId: replyToWaMessageId });
      if (replyMsg) replyToId = replyMsg._id;
    }
    const waMessage = await WAMessageModel.create({
      conversationId: conversation._id,
      waMessageId: msg.id,
      direction: "inbound",
      type,
      content,
      replyToWaMessageId,
      replyToId,
      status: "delivered",
      statusTimestamps: { deliveredAt: msgTimestamp },
      timestamp: msgTimestamp
    });
    try {
      const queueEntries = await MessageQueueModel.find(
        { phoneNumber: phone },
        { bulkMessagingId: 1 }
      ).lean();
      if (queueEntries.length > 0) {
        const bmIds = [...new Set(queueEntries.map((q) => String(q.bulkMessagingId)))];
        const bms = await BulkMessagingModel.find(
          { _id: { $in: bmIds } },
          { campaignId: 1 }
        ).lean();
        const campaignIds = [...new Set(bms.map((b) => b.campaignId).filter(Boolean))];
        if (campaignIds.length > 0) {
          await WAConversationModel.findByIdAndUpdate(conversation._id, {
            $addToSet: { campaignIds: { $each: campaignIds } }
          });
        }
      }
    } catch (linkErr) {
      logger.error("[WhatsApp Inbox] Campaign link error", { error: linkErr });
    }
    if (io) {
      io.to("whatsapp_inbox_admin").emit("wa_new_message", {
        conversationId: conversation._id,
        message: waMessage.toObject(),
        conversation: {
          _id: conversation._id,
          phoneNumber: conversation.phoneNumber,
          contactName: conversation.contactName,
          lastMessage: {
            content: content.text || `[${type}]`,
            direction: "inbound",
            type,
            timestamp: msgTimestamp
          },
          lastMessageAt: msgTimestamp,
          unreadCount: conversation.unreadCount
        }
      });
    }
    logger.info(`[WhatsApp Inbox] Processed incoming message from ${phone}`);
  } catch (err) {
    logger.error("[WhatsApp Inbox] Error processing incoming message", { error: err });
  }
};
var handleOptOut = async (phoneNumber, messageText) => {
  const textUpper = messageText.trim().toUpperCase();
  const optOutKeywords = ["STOP", "UNSUBSCRIBE", "OPT OUT", "OPTOUT"];
  if (!optOutKeywords.includes(textUpper)) return;
  try {
    const normalized = normalizePhoneNumber(phoneNumber);
    if (!normalized) return;
    await WaOptOutModel.updateOne(
      { phone: normalized, clientCode: env.CLIENT_CODE },
      { $set: { optedOutAt: /* @__PURE__ */ new Date(), keyword: textUpper } },
      { upsert: true }
    );
    logger.info(`[WhatsApp Webhook] Recorded opt-out for ${normalized} (keyword: ${textUpper})`);
  } catch (err) {
    logger.error(`[WhatsApp Webhook] Opt-out persistence error for ${phoneNumber}`, { error: err });
  }
};
var normalizePhone = normalizePhoneNumber;
var classifyError = (errorCode) => {
  if (!errorCode) return "transient";
  const code = Number(errorCode);
  const permanent = [
    META_ERROR_CODES.INVALID_PHONE_NUMBER,
    META_ERROR_CODES.PHONE_NOT_WHATSAPP,
    META_ERROR_CODES.TEMPLATE_PARAM_COUNT_MISMATCH,
    META_ERROR_CODES.TEMPLATE_NOT_EXISTS,
    META_ERROR_CODES.RECIPIENT_UNAVAILABLE
  ];
  if (permanent.includes(code)) return "permanent";
  const policy = [META_ERROR_CODES.POLICY_VIOLATION, META_ERROR_CODES.SPAM_RATE_LIMIT];
  if (policy.includes(code)) return "policy";
  const rateLimit24 = [
    META_ERROR_CODES.RATE_LIMIT_HIT,
    META_ERROR_CODES.TOO_MANY_MESSAGES,
    META_ERROR_CODES.CLOUD_API_RATE_LIMIT
  ];
  if (rateLimit24.includes(code)) return "rate_limit";
  const transient = [
    META_ERROR_CODES.TEMPORARY_ERROR,
    META_ERROR_CODES.TEMPLATE_PAUSED,
    META_ERROR_CODES.MEDIA_DOWNLOAD_ERROR,
    META_ERROR_CODES.INTERNAL_ERROR,
    META_ERROR_CODES.GENERIC_ERROR
  ];
  if (transient.includes(code)) return "transient";
  return "transient";
};

// src/modules/whatsapp/webhook.routes.ts
var webhookRateLimiter = (0, import_express_rate_limit18.default)({
  windowMs: 60 * 1e3,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
});
var router18 = (0, import_express19.Router)();
router18.get("/api/v1/whatsapp/webhook", verifyWebhook);
router18.post(
  "/api/v1/whatsapp/webhook",
  webhookRateLimiter,
  import_express19.default.raw({ type: "application/json" }),
  handleStatusUpdate
);
var whatsappWebhookRoutes = router18;

// src/modules/whatsapp/campaign.routes.ts
var import_express20 = require("express");

// src/modules/whatsapp/campaign.handlers.ts
var import_mongoose56 = __toESM(require("mongoose"), 1);
var import_zod20 = require("zod");
var createCampaignSchema = import_zod20.z.object({
  name: import_zod20.z.string().min(1).max(200).trim(),
  description: import_zod20.z.string().max(1e3).optional(),
  defaultTemplateId: import_zod20.z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  tags: import_zod20.z.array(import_zod20.z.string().max(50)).max(20).optional()
});
var listCampaignsSchema = import_zod20.z.object({
  skip: import_zod20.z.coerce.number().int().min(0).default(0),
  per_page: import_zod20.z.coerce.number().int().min(1).max(100).default(10),
  sorton: import_zod20.z.string().optional(),
  sortdir: import_zod20.z.enum(["asc", "desc"]).optional(),
  match: import_zod20.z.string().max(200).optional(),
  status: import_zod20.z.enum(["draft", "active", "paused", "archived"]).optional()
});
var updateCampaignSchema = import_zod20.z.object({
  name: import_zod20.z.string().min(1).max(200).trim().optional(),
  description: import_zod20.z.string().max(1e3).optional(),
  status: import_zod20.z.enum(["draft", "active", "paused", "archived"]).optional(),
  defaultTemplateId: import_zod20.z.string().regex(/^[0-9a-fA-F]{24}$/).optional().nullable(),
  tags: import_zod20.z.array(import_zod20.z.string().max(50)).max(20).optional()
});
function ensureValidObjectId14(id) {
  if (!import_mongoose56.default.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid campaign ID format");
  }
}
var createCampaign = async (req, res, next) => {
  try {
    const payload = createCampaignSchema.parse(req.body ?? {});
    if (payload.defaultTemplateId) {
      const templateExists = await WhatsAppTemplateModel.exists({
        _id: payload.defaultTemplateId
      });
      if (!templateExists) {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Default template not found");
      }
    }
    const campaign = await CampaignModel.create({
      name: payload.name,
      description: payload.description || "",
      defaultTemplateId: payload.defaultTemplateId || null,
      tags: payload.tags || [],
      createdBy: new import_mongoose56.default.Types.ObjectId(req.user.id),
      status: "draft",
      stats: {
        totalBulkMessagings: 0,
        totalMessages: 0,
        sent: 0,
        delivered: 0,
        read: 0,
        failed: 0
      }
    });
    logger.info("[WhatsApp Campaign] Created campaign", {
      campaignId: campaign._id,
      name: campaign.name,
      userId: req.user.id
    });
    res.status(201).json(campaign.toObject());
  } catch (error) {
    if (error instanceof import_zod20.z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid campaign data"));
      return;
    }
    next(error);
  }
};
var listCampaigns = async (req, res, next) => {
  try {
    const params = listCampaignsSchema.parse(req.body ?? {});
    const pipeline = [];
    const matchStage = { status: { $ne: "archived" } };
    if (params.status) {
      matchStage.status = params.status;
    }
    pipeline.push({ $match: matchStage });
    if (params.match) {
      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: params.match, $options: "i" } },
            { description: { $regex: params.match, $options: "i" } }
          ]
        }
      });
    }
    const sortField = params.sorton || "createdAt";
    const sortDirection = params.sortdir === "asc" ? 1 : -1;
    pipeline.push({ $sort: { [sortField]: sortDirection } });
    pipeline.push({
      $facet: {
        stage1: [{ $group: { _id: null, count: { $sum: 1 } } }],
        stage2: [{ $skip: params.skip }, { $limit: params.per_page }]
      }
    });
    pipeline.push({ $unwind: { path: "$stage1", preserveNullAndEmptyArrays: true } });
    pipeline.push({
      $project: {
        count: { $ifNull: ["$stage1.count", 0] },
        data: "$stage2"
      }
    });
    const result = await CampaignModel.aggregate(pipeline);
    const response = result.length > 0 ? result[0] : { count: 0, data: [] };
    res.status(200).json(response);
  } catch (error) {
    if (error instanceof import_zod20.z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid filter parameters"));
      return;
    }
    next(error);
  }
};
var getCampaignById = async (req, res, next) => {
  try {
    ensureValidObjectId14(req.params.id);
    const campaign = await CampaignModel.findById(req.params.id).populate("defaultTemplateId", "name metaTemplateName category").lean().exec();
    if (!campaign || campaign.status === "archived") {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Campaign not found");
    }
    const bulkMessagings = await BulkMessagingModel.find({ campaignId: campaign._id }).populate("templateId", "name metaTemplateName").sort({ createdAt: -1 }).lean().exec();
    res.status(200).json({
      ...campaign,
      bulkMessagings
    });
  } catch (error) {
    next(error);
  }
};
var updateCampaign = async (req, res, next) => {
  try {
    ensureValidObjectId14(req.params.id);
    const payload = updateCampaignSchema.parse(req.body ?? {});
    if (payload.defaultTemplateId !== void 0 && payload.defaultTemplateId !== null) {
      const templateExists = await WhatsAppTemplateModel.exists({
        _id: payload.defaultTemplateId
      });
      if (!templateExists) {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Default template not found");
      }
    }
    const campaign = await CampaignModel.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          ...payload.name && { name: payload.name },
          ...payload.description !== void 0 && { description: payload.description },
          ...payload.status && { status: payload.status },
          ...payload.defaultTemplateId !== void 0 && {
            defaultTemplateId: payload.defaultTemplateId || null
          },
          ...payload.tags && { tags: payload.tags }
        }
      },
      { new: true, runValidators: true }
    ).exec();
    if (!campaign) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Campaign not found");
    }
    logger.info("[WhatsApp Campaign] Updated campaign", {
      campaignId: campaign._id,
      updates: Object.keys(payload),
      userId: req.user.id
    });
    res.status(200).json(campaign.toObject());
  } catch (error) {
    if (error instanceof import_zod20.z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid update data"));
      return;
    }
    next(error);
  }
};
var deleteCampaign = async (req, res, next) => {
  try {
    ensureValidObjectId14(req.params.id);
    const activeBulkMessagings = await BulkMessagingModel.find({
      campaignId: req.params.id,
      status: { $in: ["queued", "processing"] }
    }).select("_id").lean().exec();
    if (activeBulkMessagings.length > 0) {
      const activeBMIds = activeBulkMessagings.map((bm) => bm._id);
      const pendingMessagesCount = await MessageQueueModel.countDocuments({
        bulkMessagingId: { $in: activeBMIds },
        status: { $in: ["pending", "processing"] }
      }).exec();
      if (pendingMessagesCount > 0) {
        throw new AppError(
          400,
          ERROR_CODES.BAD_REQUEST,
          `Cannot delete campaign \u2014 ${pendingMessagesCount} messages are still being processed. Pause or wait for completion first.`
        );
      }
    }
    const campaign = await CampaignModel.findByIdAndUpdate(
      req.params.id,
      { $set: { status: "archived" } },
      { new: true }
    ).exec();
    if (!campaign) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Campaign not found");
    }
    logger.info("[WhatsApp Campaign] Archived campaign", {
      campaignId: campaign._id,
      name: campaign.name,
      userId: req.user.id
    });
    res.status(200).json({
      message: "Campaign archived successfully"
    });
  } catch (error) {
    next(error);
  }
};
var getCampaignStats = async (req, res, next) => {
  try {
    ensureValidObjectId14(req.params.id);
    const campaign = await CampaignModel.findById(req.params.id).exec();
    if (!campaign) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Campaign not found");
    }
    const stats = await BulkMessagingModel.aggregate([
      { $match: { campaignId: campaign._id } },
      {
        $group: {
          _id: null,
          totalBulkMessagings: { $sum: 1 },
          totalMessages: { $sum: "$stats.totalRecipients" },
          totalSent: { $sum: "$stats.sent" },
          totalDelivered: { $sum: "$stats.delivered" },
          totalRead: { $sum: "$stats.read" },
          totalFailed: { $sum: "$stats.failed" },
          totalQueued: { $sum: "$stats.queued" }
        }
      }
    ]);
    const data = stats.length > 0 ? stats[0] : {
      totalBulkMessagings: 0,
      totalMessages: 0,
      totalSent: 0,
      totalDelivered: 0,
      totalRead: 0,
      totalFailed: 0,
      totalQueued: 0
    };
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

// src/modules/whatsapp/campaign.routes.ts
var router19 = (0, import_express20.Router)();
router19.post("/api/v1/whatsapp/campaigns", ...moduleGuards("whatsapp", "whatsapp.create"), createCampaign);
router19.post("/api/v1/whatsapp/campaigns/list", ...moduleGuards("whatsapp", "whatsapp.read"), listCampaigns);
router19.get("/api/v1/whatsapp/campaigns/:id", ...moduleGuards("whatsapp", "whatsapp.read"), getCampaignById);
router19.put("/api/v1/whatsapp/campaigns/:id", ...moduleGuards("whatsapp", "whatsapp.update"), updateCampaign);
router19.delete("/api/v1/whatsapp/campaigns/:id", ...moduleGuards("whatsapp", "whatsapp.delete"), deleteCampaign);
router19.get("/api/v1/whatsapp/campaigns/:id/stats", ...moduleGuards("whatsapp", "whatsapp.read"), getCampaignStats);
var campaignRoutes = router19;

// src/modules/whatsapp/bulk-messaging.routes.ts
var import_express21 = require("express");

// src/modules/whatsapp/bulk-messaging.handlers.ts
var import_mongoose57 = __toESM(require("mongoose"), 1);
var import_zod21 = require("zod");
var createBulkMessagingSchema = import_zod21.z.object({
  name: import_zod21.z.string().min(1).max(200).trim(),
  templateId: import_zod21.z.string().regex(/^[0-9a-fA-F]{24}$/),
  audienceFilter: import_zod21.z.record(import_zod21.z.any()).optional(),
  variableOverrides: import_zod21.z.array(import_zod21.z.object({
    position: import_zod21.z.number().int().min(1),
    customValue: import_zod21.z.string().optional(),
    fieldPath: import_zod21.z.string().optional()
  })).optional(),
  scheduledFor: import_zod21.z.coerce.date().optional().nullable()
});
var updateBulkMessagingSchema = import_zod21.z.object({
  name: import_zod21.z.string().min(1).max(200).trim().optional(),
  templateId: import_zod21.z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  audienceFilter: import_zod21.z.record(import_zod21.z.any()).optional(),
  variableOverrides: import_zod21.z.array(import_zod21.z.object({
    position: import_zod21.z.number().int().min(1),
    customValue: import_zod21.z.string().optional(),
    fieldPath: import_zod21.z.string().optional()
  })).optional(),
  scheduledFor: import_zod21.z.coerce.date().optional().nullable()
});
var listBulkMessagingsSchema = import_zod21.z.object({
  skip: import_zod21.z.coerce.number().int().min(0).default(0),
  per_page: import_zod21.z.coerce.number().int().min(1).max(100).default(10),
  sorton: import_zod21.z.string().optional(),
  sortdir: import_zod21.z.enum(["asc", "desc"]).optional(),
  match: import_zod21.z.string().max(200).optional(),
  status: import_zod21.z.enum(["draft", "queued", "processing", "paused", "completed", "failed"]).optional()
});
var getFailedMessagesSchema = import_zod21.z.object({
  skip: import_zod21.z.coerce.number().int().min(0).default(0),
  per_page: import_zod21.z.coerce.number().int().min(1).max(100).default(20),
  errorCategory: import_zod21.z.enum(["permanent", "policy", "rate_limit", "transient"]).optional(),
  match: import_zod21.z.string().max(50).optional()
});
var previewAudienceSchema = import_zod21.z.object({
  audienceFilter: import_zod21.z.record(import_zod21.z.any())
});
var testSendSchema = import_zod21.z.object({
  templateId: import_zod21.z.string().regex(/^[0-9a-fA-F]{24}$/),
  variableOverrides: import_zod21.z.array(import_zod21.z.object({
    position: import_zod21.z.number().int().min(1),
    customValue: import_zod21.z.string()
  })).optional(),
  testPhoneNumbers: import_zod21.z.array(import_zod21.z.string().min(10).max(15)).min(1).max(5)
});
var analyticsQuerySchema = import_zod21.z.object({
  campaignId: import_zod21.z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  startDate: import_zod21.z.coerce.date().optional(),
  endDate: import_zod21.z.coerce.date().optional()
});
function ensureValidObjectId15(id) {
  if (!import_mongoose57.default.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid ID format");
  }
}
function normalizePhone2(phone) {
  let cleaned = phone.replace(/[\s\-\(\)\+]/g, "");
  if (cleaned.startsWith("0")) cleaned = cleaned.slice(1);
  if (cleaned.length === 10) cleaned = "91" + cleaned;
  if (cleaned.startsWith("91") && cleaned.length === 12) return cleaned;
  return cleaned;
}
async function publishToRabbitMQ(routingKey, payload) {
  logger.info(`[RabbitMQ] Publishing to ${routingKey}`, { payload });
  logger.warn("[RabbitMQ] Placeholder - implement actual publishing");
}
var createBulkMessaging = async (req, res, next) => {
  try {
    ensureValidObjectId15(req.params.campaignId);
    const payload = createBulkMessagingSchema.parse(req.body ?? {});
    const campaign = await CampaignModel.findById(req.params.campaignId);
    if (!campaign) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Campaign not found");
    }
    const template = await WhatsAppTemplateModel.findById(payload.templateId);
    if (!template) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Template not found");
    }
    const bulkMessaging = await BulkMessagingModel.create({
      campaignId: req.params.campaignId,
      name: payload.name,
      templateId: payload.templateId,
      audienceFilter: payload.audienceFilter || {},
      variableOverrides: payload.variableOverrides || [],
      scheduledFor: payload.scheduledFor || null,
      createdBy: new import_mongoose57.default.Types.ObjectId(req.user.id),
      status: "draft",
      stats: {
        totalRecipients: 0,
        queued: 0,
        sent: 0,
        delivered: 0,
        read: 0,
        failed: 0
      }
    });
    logger.info("[Bulk Messaging] Created bulk messaging", {
      bulkMessagingId: bulkMessaging._id,
      campaignId: campaign._id,
      templateId: template._id
    });
    res.status(201).json(bulkMessaging.toObject());
  } catch (error) {
    if (error instanceof import_zod21.z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid bulk messaging data"));
      return;
    }
    next(error);
  }
};
var updateBulkMessaging = async (req, res, next) => {
  try {
    ensureValidObjectId15(req.params.id);
    const payload = updateBulkMessagingSchema.parse(req.body ?? {});
    const bulkMessaging = await BulkMessagingModel.findById(req.params.id);
    if (!bulkMessaging) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Bulk messaging not found");
    }
    if (bulkMessaging.status === "processing") {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Cannot edit while processing. Pause it first.");
    }
    if (payload.templateId) {
      const templateExists = await WhatsAppTemplateModel.exists({ _id: payload.templateId });
      if (!templateExists) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Template not found");
      }
      bulkMessaging.templateId = new import_mongoose57.default.Types.ObjectId(payload.templateId);
    }
    if (payload.name) bulkMessaging.name = payload.name;
    if (payload.audienceFilter !== void 0) bulkMessaging.audienceFilter = payload.audienceFilter;
    if (payload.variableOverrides !== void 0) bulkMessaging.variableOverrides = payload.variableOverrides;
    if (payload.scheduledFor !== void 0) bulkMessaging.scheduledFor = payload.scheduledFor || null;
    if (bulkMessaging.status !== "draft") {
      bulkMessaging.status = "draft";
      await MessageQueueModel.deleteMany({ bulkMessagingId: bulkMessaging._id });
      bulkMessaging.stats = {
        totalRecipients: 0,
        queued: 0,
        sent: 0,
        delivered: 0,
        read: 0,
        failed: 0
      };
    }
    await bulkMessaging.save();
    logger.info("[Bulk Messaging] Updated bulk messaging", {
      bulkMessagingId: bulkMessaging._id,
      updates: Object.keys(payload)
    });
    res.status(200).json(bulkMessaging.toObject());
  } catch (error) {
    if (error instanceof import_zod21.z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid update data"));
      return;
    }
    next(error);
  }
};
var deleteBulkMessaging = async (req, res, next) => {
  try {
    ensureValidObjectId15(req.params.id);
    const bulkMessaging = await BulkMessagingModel.findById(req.params.id);
    if (!bulkMessaging) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Bulk messaging not found");
    }
    if (bulkMessaging.status === "processing") {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Cannot delete while processing. Pause it first.");
    }
    const queueCount = await MessageQueueModel.countDocuments({ bulkMessagingId: bulkMessaging._id });
    await MessageQueueModel.deleteMany({ bulkMessagingId: bulkMessaging._id });
    await BulkMessagingModel.findByIdAndDelete(req.params.id);
    logger.info("[Bulk Messaging] Deleted bulk messaging", {
      bulkMessagingId: bulkMessaging._id,
      deletedQueueCount: queueCount
    });
    res.status(200).json({ message: "Bulk messaging deleted" });
  } catch (error) {
    next(error);
  }
};
var listBulkMessagings = async (req, res, next) => {
  try {
    ensureValidObjectId15(req.params.campaignId);
    const params = listBulkMessagingsSchema.parse(req.body ?? {});
    const pipeline = [];
    const baseMatch = { campaignId: new import_mongoose57.default.Types.ObjectId(req.params.campaignId) };
    if (params.status) baseMatch.status = params.status;
    pipeline.push({ $match: baseMatch });
    if (params.match) {
      pipeline.push({
        $match: { name: { $regex: params.match, $options: "i" } }
      });
    }
    pipeline.push({
      $lookup: {
        from: "BM-WhatsAppTemplates",
        localField: "templateId",
        foreignField: "_id",
        as: "template"
      }
    });
    pipeline.push({ $unwind: { path: "$template", preserveNullAndEmptyArrays: true } });
    const sortField = params.sorton || "createdAt";
    const sortDirection = params.sortdir === "asc" ? 1 : -1;
    pipeline.push({ $sort: { [sortField]: sortDirection } });
    pipeline.push({
      $facet: {
        stage1: [{ $group: { _id: null, count: { $sum: 1 } } }],
        stage2: [{ $skip: params.skip }, { $limit: params.per_page }]
      }
    });
    pipeline.push({ $unwind: { path: "$stage1", preserveNullAndEmptyArrays: true } });
    pipeline.push({
      $project: {
        count: { $ifNull: ["$stage1.count", 0] },
        data: "$stage2"
      }
    });
    const result = await BulkMessagingModel.aggregate(pipeline);
    const response = result.length > 0 ? result[0] : { count: 0, data: [] };
    res.status(200).json(response);
  } catch (error) {
    if (error instanceof import_zod21.z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid filter parameters"));
      return;
    }
    next(error);
  }
};
var getBulkMessagingById = async (req, res, next) => {
  try {
    ensureValidObjectId15(req.params.id);
    const bulkMessaging = await BulkMessagingModel.findById(req.params.id).populate("templateId", "name metaTemplateName bodyText variables").populate("campaignId", "name").lean();
    if (!bulkMessaging) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Bulk messaging not found");
    }
    res.status(200).json(bulkMessaging);
  } catch (error) {
    next(error);
  }
};
var startBulkMessaging = async (req, res, next) => {
  try {
    ensureValidObjectId15(req.params.id);
    const bulkMessaging = await BulkMessagingModel.findById(req.params.id);
    if (!bulkMessaging) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Bulk messaging not found");
    }
    if (bulkMessaging.status !== "draft") {
      throw new AppError(
        400,
        ERROR_CODES.BAD_REQUEST,
        `Cannot start bulk messaging with status "${bulkMessaging.status}". Only "draft" can be started.`
      );
    }
    if (bulkMessaging.scheduledFor && new Date(bulkMessaging.scheduledFor) > /* @__PURE__ */ new Date()) {
      await BulkMessagingModel.findByIdAndUpdate(bulkMessaging._id, { status: "queued" });
      logger.info("[Bulk Messaging] Scheduled for later", {
        bulkMessagingId: bulkMessaging._id,
        scheduledFor: bulkMessaging.scheduledFor
      });
      res.status(200).json({
        message: `Bulk messaging scheduled for ${bulkMessaging.scheduledFor}`,
        scheduled: true,
        scheduledFor: bulkMessaging.scheduledFor
      });
      return;
    }
    await BulkMessagingModel.findByIdAndUpdate(bulkMessaging._id, { status: "processing" });
    await publishToRabbitMQ("whatsapp.bulk.start", {
      bulkMessagingId: bulkMessaging._id.toString()
    });
    logger.info("[Bulk Messaging] Started bulk messaging", {
      bulkMessagingId: bulkMessaging._id
    });
    res.status(200).json({
      message: "Bulk messaging started successfully",
      bulkMessagingId: bulkMessaging._id,
      status: "processing"
    });
  } catch (error) {
    next(error);
  }
};
var pauseBulkMessaging = async (req, res, next) => {
  try {
    ensureValidObjectId15(req.params.id);
    const bulkMessaging = await BulkMessagingModel.findById(req.params.id);
    if (!bulkMessaging) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Bulk messaging not found");
    }
    if (bulkMessaging.status !== "processing") {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Can only pause a processing bulk messaging");
    }
    await BulkMessagingModel.findByIdAndUpdate(bulkMessaging._id, { status: "paused" });
    logger.info("[Bulk Messaging] Paused bulk messaging", {
      bulkMessagingId: bulkMessaging._id
    });
    res.status(200).json({ message: "Bulk messaging paused" });
  } catch (error) {
    next(error);
  }
};
var resumeBulkMessaging = async (req, res, next) => {
  try {
    ensureValidObjectId15(req.params.id);
    const bulkMessaging = await BulkMessagingModel.findById(req.params.id);
    if (!bulkMessaging) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Bulk messaging not found");
    }
    if (bulkMessaging.status !== "paused") {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Can only resume a paused bulk messaging");
    }
    await BulkMessagingModel.findByIdAndUpdate(bulkMessaging._id, { status: "processing" });
    logger.info("[Bulk Messaging] Resumed bulk messaging", {
      bulkMessagingId: bulkMessaging._id
    });
    res.status(200).json({ message: "Bulk messaging resumed" });
  } catch (error) {
    next(error);
  }
};
var getBulkMessagingProgress = async (req, res, next) => {
  try {
    ensureValidObjectId15(req.params.id);
    const bulkMessaging = await BulkMessagingModel.findById(req.params.id).select("stats status startedAt completedAt").lean();
    if (!bulkMessaging) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Bulk messaging not found");
    }
    const total = bulkMessaging.stats.totalRecipients || 1;
    const processed = bulkMessaging.stats.sent + bulkMessaging.stats.delivered + bulkMessaging.stats.read + bulkMessaging.stats.failed;
    const percentage = Math.round(processed / total * 100);
    res.status(200).json({
      ...bulkMessaging.stats,
      status: bulkMessaging.status,
      percentage,
      startedAt: bulkMessaging.startedAt,
      completedAt: bulkMessaging.completedAt
    });
  } catch (error) {
    next(error);
  }
};
var retryFailedMessages = async (req, res, next) => {
  try {
    ensureValidObjectId15(req.params.id);
    const result = await MessageQueueModel.updateMany(
      {
        bulkMessagingId: new import_mongoose57.default.Types.ObjectId(req.params.id),
        status: "failed",
        errorCategory: { $in: ["transient", "rate_limit"] },
        retryCount: { $lt: 3 }
      },
      {
        $set: {
          status: "pending",
          error: null,
          errorCode: null,
          errorCategory: null,
          failedAt: null,
          nextRetryAt: null,
          lockedAt: null,
          lockedBy: null
        }
      }
    );
    if (result.modifiedCount > 0) {
      const bulkMessaging = await BulkMessagingModel.findById(req.params.id);
      if (bulkMessaging && (bulkMessaging.status === "completed" || bulkMessaging.status === "failed")) {
        await BulkMessagingModel.findByIdAndUpdate(req.params.id, {
          $set: { status: "processing" },
          $inc: {
            "stats.queued": result.modifiedCount,
            "stats.failed": -result.modifiedCount
          }
        });
      }
    }
    logger.info("[Bulk Messaging] Retried failed messages", {
      bulkMessagingId: req.params.id,
      retriedCount: result.modifiedCount
    });
    res.status(200).json({
      message: `${result.modifiedCount} messages queued for retry`,
      retriedCount: result.modifiedCount
    });
  } catch (error) {
    next(error);
  }
};
var getFailedMessages = async (req, res, next) => {
  try {
    ensureValidObjectId15(req.params.id);
    const params = getFailedMessagesSchema.parse(req.body ?? {});
    const filter = {
      bulkMessagingId: new import_mongoose57.default.Types.ObjectId(req.params.id),
      status: "failed"
    };
    if (params.errorCategory) filter.errorCategory = params.errorCategory;
    if (params.match) filter.phoneNumber = { $regex: params.match, $options: "i" };
    const [messages, total] = await Promise.all([
      MessageQueueModel.find(filter).populate("userId", "name mobile email").sort({ failedAt: -1 }).skip(params.skip).limit(params.per_page).lean(),
      MessageQueueModel.countDocuments(filter)
    ]);
    res.status(200).json({
      count: total,
      data: messages
    });
  } catch (error) {
    if (error instanceof import_zod21.z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid filter parameters"));
      return;
    }
    next(error);
  }
};
var previewAudience = async (req, res, next) => {
  try {
    const payload = previewAudienceSchema.parse(req.body ?? {});
    const { audienceFilter } = payload;
    logger.warn("[Bulk Messaging] Using placeholder previewAudience - implement for your user schema");
    res.status(200).json({
      total: 0,
      sample: [],
      message: "Audience preview not yet implemented - update previewAudience handler"
    });
  } catch (error) {
    if (error instanceof import_zod21.z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid audience filter"));
      return;
    }
    next(error);
  }
};
var testSendBulkMessaging = async (req, res, next) => {
  try {
    const payload = testSendSchema.parse(req.body ?? {});
    const template = await WhatsAppTemplateModel.findById(payload.templateId);
    if (!template) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Template not found");
    }
    const sampleComponents = (template.variables || []).sort((a, b) => a.position - b.position).map((v) => {
      const override = payload.variableOverrides?.find((o) => o.position === v.position);
      return {
        type: "text",
        text: override?.customValue || v.sampleValue || v.customValue || "Test"
      };
    });
    const components = sampleComponents.length > 0 ? [{ type: "body", parameters: sampleComponents }] : [];
    if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
      throw new AppError(500, ERROR_CODES.INTERNAL_ERROR, "WhatsApp API not configured");
    }
    const url = `${env.WHATSAPP_GRAPH_BASE_URL}/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const results = [];
    for (const phone of payload.testPhoneNumbers) {
      const cleaned = normalizePhone2(phone);
      try {
        const body = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: cleaned,
          type: "template",
          template: {
            name: template.metaTemplateName,
            language: { code: template.language || "en_US" },
            ...components.length > 0 && { components }
          }
        };
        const response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        });
        const data = await response.json();
        if (response.ok && data.messages?.[0]?.id) {
          results.push({
            phone: cleaned,
            status: "sent",
            messageId: data.messages[0].id,
            sentAt: (/* @__PURE__ */ new Date()).toISOString()
          });
        } else {
          const metaError = data.error || {};
          results.push({
            phone: cleaned,
            status: "failed",
            error: metaError.message || JSON.stringify(data),
            errorCode: metaError.code || null
          });
        }
      } catch (err) {
        results.push({ phone: cleaned, status: "failed", error: err.message });
      }
    }
    const sentCount = results.filter((r) => r.status === "sent").length;
    const failedCount = results.filter((r) => r.status === "failed").length;
    logger.info("[Bulk Messaging] Test send completed", {
      templateId: template._id,
      sentCount,
      failedCount
    });
    res.status(200).json({
      message: `${sentCount} sent, ${failedCount} failed`,
      results,
      templateName: template.metaTemplateName,
      sentAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    if (error instanceof import_zod21.z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid test send data"));
      return;
    }
    next(error);
  }
};
var getCampaignAnalytics = async (req, res, next) => {
  try {
    const params = analyticsQuerySchema.parse(req.query ?? {});
    const bmFilter = {};
    if (params.campaignId) {
      ensureValidObjectId15(params.campaignId);
      bmFilter.campaignId = new import_mongoose57.default.Types.ObjectId(params.campaignId);
    }
    const bulkMessagings = await BulkMessagingModel.find(bmFilter).select("_id").lean();
    const bmIds = bulkMessagings.map((bm) => bm._id);
    if (bmIds.length === 0) {
      res.status(200).json({
        summary: {},
        daily: [],
        templateStats: [],
        deliveryFunnel: {}
      });
      return;
    }
    const mqFilter = { bulkMessagingId: { $in: bmIds } };
    if (params.startDate) {
      mqFilter.createdAt = { ...mqFilter.createdAt, $gte: params.startDate };
    }
    if (params.endDate) {
      mqFilter.createdAt = { ...mqFilter.createdAt, $lte: params.endDate };
    }
    const summary = await MessageQueueModel.aggregate([
      { $match: mqFilter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          sent: { $sum: { $cond: [{ $in: ["$status", ["sent", "delivered", "read"]] }, 1, 0] } },
          delivered: { $sum: { $cond: [{ $in: ["$status", ["delivered", "read"]] }, 1, 0] } },
          read: { $sum: { $cond: [{ $eq: ["$status", "read"] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
          totalCost: { $sum: "$cost" }
        }
      }
    ]);
    const daily = await MessageQueueModel.aggregate([
      { $match: mqFilter },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: { $sum: 1 },
          sent: { $sum: { $cond: [{ $in: ["$status", ["sent", "delivered", "read"]] }, 1, 0] } },
          delivered: { $sum: { $cond: [{ $in: ["$status", ["delivered", "read"]] }, 1, 0] } },
          read: { $sum: { $cond: [{ $eq: ["$status", "read"] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
          cost: { $sum: "$cost" }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    const templateStats = await MessageQueueModel.aggregate([
      { $match: mqFilter },
      {
        $group: {
          _id: "$templateName",
          total: { $sum: 1 },
          sent: { $sum: { $cond: [{ $in: ["$status", ["sent", "delivered", "read"]] }, 1, 0] } },
          delivered: { $sum: { $cond: [{ $in: ["$status", ["delivered", "read"]] }, 1, 0] } },
          read: { $sum: { $cond: [{ $eq: ["$status", "read"] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
          cost: { $sum: "$cost" }
        }
      },
      { $sort: { total: -1 } }
    ]);
    const s = summary[0] || { total: 0, sent: 0, delivered: 0, read: 0, failed: 0, totalCost: 0 };
    const deliveryFunnel = {
      total: s.total,
      sent: s.sent,
      sentRate: s.total > 0 ? (s.sent / s.total * 100).toFixed(1) : "0",
      delivered: s.delivered,
      deliveredRate: s.sent > 0 ? (s.delivered / s.sent * 100).toFixed(1) : "0",
      read: s.read,
      readRate: s.delivered > 0 ? (s.read / s.delivered * 100).toFixed(1) : "0",
      failed: s.failed,
      failedRate: s.total > 0 ? (s.failed / s.total * 100).toFixed(1) : "0"
    };
    res.status(200).json({
      summary: s,
      daily,
      templateStats,
      deliveryFunnel
    });
  } catch (error) {
    if (error instanceof import_zod21.z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid analytics parameters"));
      return;
    }
    next(error);
  }
};

// src/modules/whatsapp/bulk-messaging.routes.ts
var router20 = (0, import_express21.Router)();
router20.post(
  "/api/v1/whatsapp/bulk-messaging/preview-audience",
  ...moduleGuards("whatsapp", "whatsapp.read"),
  previewAudience
);
router20.post(
  "/api/v1/whatsapp/bulk-messaging/test-send",
  ...moduleGuards("whatsapp", "whatsapp.create"),
  testSendBulkMessaging
);
router20.get(
  "/api/v1/whatsapp/bulk-messaging/analytics",
  ...moduleGuards("whatsapp", "whatsapp.read"),
  getCampaignAnalytics
);
router20.post(
  "/api/v1/whatsapp/campaigns/:campaignId/bulk-messaging",
  ...moduleGuards("whatsapp", "whatsapp.create"),
  createBulkMessaging
);
router20.post(
  "/api/v1/whatsapp/campaigns/:campaignId/bulk-messaging/list",
  ...moduleGuards("whatsapp", "whatsapp.read"),
  listBulkMessagings
);
router20.get(
  "/api/v1/whatsapp/bulk-messaging/:id",
  ...moduleGuards("whatsapp", "whatsapp.read"),
  getBulkMessagingById
);
router20.put(
  "/api/v1/whatsapp/bulk-messaging/:id",
  ...moduleGuards("whatsapp", "whatsapp.update"),
  updateBulkMessaging
);
router20.delete(
  "/api/v1/whatsapp/bulk-messaging/:id",
  ...moduleGuards("whatsapp", "whatsapp.delete"),
  deleteBulkMessaging
);
router20.post(
  "/api/v1/whatsapp/bulk-messaging/:id/start",
  ...moduleGuards("whatsapp", "whatsapp.update"),
  startBulkMessaging
);
router20.post(
  "/api/v1/whatsapp/bulk-messaging/:id/pause",
  ...moduleGuards("whatsapp", "whatsapp.update"),
  pauseBulkMessaging
);
router20.post(
  "/api/v1/whatsapp/bulk-messaging/:id/resume",
  ...moduleGuards("whatsapp", "whatsapp.update"),
  resumeBulkMessaging
);
router20.get(
  "/api/v1/whatsapp/bulk-messaging/:id/progress",
  ...moduleGuards("whatsapp", "whatsapp.read"),
  getBulkMessagingProgress
);
router20.post(
  "/api/v1/whatsapp/bulk-messaging/:id/retry-failed",
  ...moduleGuards("whatsapp", "whatsapp.update"),
  retryFailedMessages
);
router20.post(
  "/api/v1/whatsapp/bulk-messaging/:id/failed-messages",
  ...moduleGuards("whatsapp", "whatsapp.read"),
  getFailedMessages
);
var bulkMessagingRoutes = router20;

// src/modules/whatsapp/template.routes.ts
var import_express22 = require("express");

// src/modules/whatsapp/template.handlers.ts
var import_mongoose58 = __toESM(require("mongoose"), 1);
var import_zod22 = require("zod");
var createTemplateSchema = import_zod22.z.object({
  name: import_zod22.z.string().min(1).max(200).trim(),
  metaTemplateName: import_zod22.z.string().min(1).max(200).trim(),
  language: import_zod22.z.string().default("en"),
  category: import_zod22.z.enum(["MARKETING", "UTILITY", "AUTHENTICATION"]).default("MARKETING"),
  bodyText: import_zod22.z.string().max(1024).optional(),
  headerText: import_zod22.z.string().max(60).optional(),
  footerText: import_zod22.z.string().max(60).optional(),
  variables: import_zod22.z.array(import_zod22.z.object({
    position: import_zod22.z.number().int().min(1),
    description: import_zod22.z.string().optional(),
    sampleValue: import_zod22.z.string().optional(),
    fieldMapping: import_zod22.z.string().optional(),
    customValue: import_zod22.z.string().optional()
  })).optional()
});
var listTemplatesSchema = import_zod22.z.object({
  skip: import_zod22.z.coerce.number().int().min(0).default(0),
  per_page: import_zod22.z.coerce.number().int().min(1).max(100).default(10),
  sorton: import_zod22.z.string().optional(),
  sortdir: import_zod22.z.enum(["asc", "desc"]).optional(),
  match: import_zod22.z.string().max(200).optional(),
  category: import_zod22.z.enum(["MARKETING", "UTILITY", "AUTHENTICATION"]).optional(),
  metaStatus: import_zod22.z.string().optional()
});
var updateTemplateSchema = import_zod22.z.object({
  name: import_zod22.z.string().min(1).max(200).trim().optional(),
  metaTemplateName: import_zod22.z.string().min(1).max(200).trim().optional(),
  language: import_zod22.z.string().optional(),
  category: import_zod22.z.enum(["MARKETING", "UTILITY", "AUTHENTICATION"]).optional(),
  bodyText: import_zod22.z.string().max(1024).optional(),
  headerText: import_zod22.z.string().max(60).optional(),
  footerText: import_zod22.z.string().max(60).optional(),
  variables: import_zod22.z.array(import_zod22.z.object({
    position: import_zod22.z.number().int().min(1),
    description: import_zod22.z.string().optional(),
    sampleValue: import_zod22.z.string().optional(),
    fieldMapping: import_zod22.z.string().optional(),
    customValue: import_zod22.z.string().optional()
  })).optional(),
  status: import_zod22.z.string().optional()
});
function ensureValidObjectId16(id) {
  if (!import_mongoose58.default.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid ID format");
  }
}
function extractVariablesFromText(bodyText, existingVariables = []) {
  if (!bodyText) return existingVariables;
  const matches = bodyText.match(/\{\{(\d+)\}\}/g) || [];
  const positions = [...new Set(matches.map((m) => parseInt(m.replace(/[{}]/g, ""), 10)))].sort((a, b) => a - b);
  return positions.map((pos) => {
    const existing = existingVariables.find((v) => v.position === pos);
    return existing || {
      position: pos,
      description: `Variable ${pos}`,
      sampleValue: "",
      fieldMapping: "custom",
      customValue: ""
    };
  });
}
var createTemplate = async (req, res, next) => {
  try {
    const payload = createTemplateSchema.parse(req.body ?? {});
    const resolvedVars = payload.variables && payload.variables.length > 0 ? payload.variables : extractVariablesFromText(payload.bodyText);
    const template = await WhatsAppTemplateModel.create({
      name: payload.name,
      metaTemplateName: payload.metaTemplateName,
      language: payload.language,
      category: payload.category,
      bodyText: payload.bodyText || "",
      headerText: payload.headerText || "",
      footerText: payload.footerText || "",
      variables: resolvedVars
    });
    logger.info("[WhatsApp Template] Created template", { templateId: template._id, name: template.name });
    res.status(201).json(template.toObject());
  } catch (error) {
    if (error.code === 11e3) {
      next(new AppError(409, ERROR_CODES.BAD_REQUEST, "A template with this Meta template name and language already exists"));
      return;
    }
    if (error instanceof import_zod22.z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid template data"));
      return;
    }
    next(error);
  }
};
var listTemplates = async (req, res, next) => {
  try {
    const params = listTemplatesSchema.parse(req.body ?? {});
    const pipeline = [];
    const baseMatch = { status: { $ne: "deleted" } };
    if (params.category) baseMatch.category = params.category;
    if (params.metaStatus) baseMatch.metaStatus = params.metaStatus;
    pipeline.push({ $match: baseMatch });
    if (params.match) {
      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: params.match, $options: "i" } },
            { metaTemplateName: { $regex: params.match, $options: "i" } },
            { bodyText: { $regex: params.match, $options: "i" } }
          ]
        }
      });
    }
    const sortField = params.sorton || "createdAt";
    const sortDirection = params.sortdir === "asc" ? 1 : -1;
    pipeline.push({ $sort: { [sortField]: sortDirection } });
    pipeline.push({
      $facet: {
        stage1: [{ $group: { _id: null, count: { $sum: 1 } } }],
        stage2: [{ $skip: params.skip }, { $limit: params.per_page }]
      }
    });
    pipeline.push({ $unwind: { path: "$stage1", preserveNullAndEmptyArrays: true } });
    pipeline.push({ $project: { count: { $ifNull: ["$stage1.count", 0] }, data: "$stage2" } });
    const result = await WhatsAppTemplateModel.aggregate(pipeline);
    res.status(200).json(result.length > 0 ? result[0] : { count: 0, data: [] });
  } catch (error) {
    if (error instanceof import_zod22.z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid filter parameters"));
      return;
    }
    next(error);
  }
};
var getTemplateById = async (req, res, next) => {
  try {
    ensureValidObjectId16(req.params.id);
    const template = await WhatsAppTemplateModel.findById(req.params.id).lean();
    if (!template || template.status === "deleted") {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Template not found");
    }
    res.status(200).json(template);
  } catch (error) {
    next(error);
  }
};
var updateTemplate = async (req, res, next) => {
  try {
    ensureValidObjectId16(req.params.id);
    const payload = updateTemplateSchema.parse(req.body ?? {});
    const resolvedVars = payload.variables && payload.variables.length > 0 ? payload.variables : extractVariablesFromText(payload.bodyText);
    const template = await WhatsAppTemplateModel.findByIdAndUpdate(
      req.params.id,
      { ...payload, variables: resolvedVars },
      { new: true, runValidators: true }
    );
    if (!template) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Template not found");
    }
    logger.info("[WhatsApp Template] Updated template", { templateId: template._id });
    res.status(200).json(template.toObject());
  } catch (error) {
    if (error instanceof import_zod22.z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid update data"));
      return;
    }
    next(error);
  }
};
var deleteTemplate = async (req, res, next) => {
  try {
    ensureValidObjectId16(req.params.id);
    const template = await WhatsAppTemplateModel.findByIdAndUpdate(
      req.params.id,
      { status: "deleted" },
      { new: true }
    );
    if (!template) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Template not found");
    }
    logger.info("[WhatsApp Template] Deleted template", { templateId: template._id });
    res.status(200).json({ message: "Template deleted successfully" });
  } catch (error) {
    next(error);
  }
};
var submitToMeta = async (req, res, next) => {
  try {
    ensureValidObjectId16(req.params.id);
    if (!env.WHATSAPP_WABA_ID || !env.WHATSAPP_ACCESS_TOKEN) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "WHATSAPP_WABA_ID and WHATSAPP_ACCESS_TOKEN must be configured");
    }
    const template = await WhatsAppTemplateModel.findById(req.params.id);
    if (!template || template.status === "deleted") {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Template not found");
    }
    const components = [];
    if (template.headerText) {
      components.push({ type: "HEADER", format: "TEXT", text: template.headerText });
    }
    if (template.bodyText) {
      const bodyComponent = { type: "BODY", text: template.bodyText };
      const vars = (template.variables || []).sort((a, b) => a.position - b.position);
      if (vars.length > 0) {
        bodyComponent.example = {
          body_text: [vars.map((v) => v.sampleValue || `sample_${v.position}`)]
        };
      }
      components.push(bodyComponent);
    }
    if (template.footerText) {
      components.push({ type: "FOOTER", text: template.footerText });
    }
    const payload = {
      name: template.metaTemplateName,
      language: template.language || "en",
      category: template.category || "MARKETING",
      components
    };
    const url = `${env.WHATSAPP_GRAPH_BASE_URL}/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_WABA_ID}/message_templates`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) {
      throw new AppError(502, ERROR_CODES.INTERNAL_ERROR, `Meta rejected the template: ${data.error?.message || JSON.stringify(data)}`);
    }
    await WhatsAppTemplateModel.findByIdAndUpdate(template._id, {
      metaTemplateId: data.id,
      metaStatus: data.status || "PENDING"
    });
    logger.info("[WhatsApp Template] Submitted to Meta", { templateId: template._id, metaStatus: data.status });
    res.status(200).json({
      message: `Template submitted to Meta - status: ${data.status || "PENDING"}`,
      metaTemplateId: data.id,
      metaStatus: data.status || "PENDING"
    });
  } catch (error) {
    next(error);
  }
};
var syncFromMeta = async (req, res, next) => {
  try {
    if (!env.WHATSAPP_WABA_ID || !env.WHATSAPP_ACCESS_TOKEN) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "WHATSAPP_WABA_ID and WHATSAPP_ACCESS_TOKEN must be configured");
    }
    const url = `${env.WHATSAPP_GRAPH_BASE_URL}/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_WABA_ID}/message_templates?limit=100`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}` }
    });
    const data = await response.json();
    if (!response.ok) {
      throw new AppError(502, ERROR_CODES.INTERNAL_ERROR, `Failed to fetch from Meta: ${data.error?.message || JSON.stringify(data)}`);
    }
    const templates = data.data || [];
    let created = 0;
    let updated = 0;
    for (const metaTemplate of templates) {
      if (metaTemplate.status !== "APPROVED") continue;
      let bodyText = "";
      let headerText = "";
      let footerText = "";
      const variables = [];
      for (const component of metaTemplate.components || []) {
        if (component.type === "BODY") {
          bodyText = component.text || "";
          const matches = bodyText.match(/\{\{(\d+)\}\}/g) || [];
          matches.forEach((match) => {
            const position = parseInt(match.replace(/[{}]/g, ""), 10);
            if (!variables.find((v) => v.position === position)) {
              const example = component.example?.body_text?.[0]?.[position - 1] || "";
              variables.push({
                position,
                description: `Variable ${position}`,
                sampleValue: example,
                fieldMapping: "custom",
                customValue: ""
              });
            }
          });
        } else if (component.type === "HEADER") {
          headerText = component.text || "";
        } else if (component.type === "FOOTER") {
          footerText = component.text || "";
        }
      }
      const existing = await WhatsAppTemplateModel.findOne({
        metaTemplateName: metaTemplate.name,
        language: metaTemplate.language
      });
      if (existing) {
        await WhatsAppTemplateModel.findByIdAndUpdate(existing._id, {
          $set: {
            category: metaTemplate.category || "MARKETING",
            bodyText,
            headerText,
            footerText,
            components: metaTemplate.components || [],
            variables: existing.variables?.length > 0 ? existing.variables : variables,
            metaTemplateId: metaTemplate.id || existing.metaTemplateId,
            metaStatus: "APPROVED",
            lastSyncedAt: /* @__PURE__ */ new Date()
          }
        });
        updated++;
      } else {
        await WhatsAppTemplateModel.create({
          name: metaTemplate.name,
          metaTemplateName: metaTemplate.name,
          language: metaTemplate.language,
          category: metaTemplate.category || "MARKETING",
          bodyText,
          headerText,
          footerText,
          components: metaTemplate.components || [],
          variables,
          metaTemplateId: metaTemplate.id || null,
          metaStatus: "APPROVED",
          lastSyncedAt: /* @__PURE__ */ new Date()
        });
        created++;
      }
    }
    logger.info("[WhatsApp Template] Sync complete", { totalFromMeta: templates.length, created, updated });
    res.status(200).json({
      message: `Sync complete: ${created} created, ${updated} updated`,
      totalFromMeta: templates.length,
      created,
      updated
    });
  } catch (error) {
    next(error);
  }
};

// src/modules/whatsapp/template.routes.ts
var router21 = (0, import_express22.Router)();
router21.post("/api/v1/whatsapp/templates", ...moduleGuards("whatsapp", "whatsapp.create"), createTemplate);
router21.post("/api/v1/whatsapp/templates/list", ...moduleGuards("whatsapp", "whatsapp.read"), listTemplates);
router21.post("/api/v1/whatsapp/templates/sync", ...moduleGuards("whatsapp", "whatsapp.update"), syncFromMeta);
router21.post("/api/v1/whatsapp/templates/:id/submit-to-meta", ...moduleGuards("whatsapp", "whatsapp.update"), submitToMeta);
router21.get("/api/v1/whatsapp/templates/:id", ...moduleGuards("whatsapp", "whatsapp.read"), getTemplateById);
router21.put("/api/v1/whatsapp/templates/:id", ...moduleGuards("whatsapp", "whatsapp.update"), updateTemplate);
router21.delete("/api/v1/whatsapp/templates/:id", ...moduleGuards("whatsapp", "whatsapp.delete"), deleteTemplate);
var templateRoutes = router21;

// src/modules/whatsapp/trigger.routes.ts
var import_express23 = require("express");

// src/modules/whatsapp/trigger.handlers.ts
var import_mongoose59 = __toESM(require("mongoose"), 1);
var import_zod23 = require("zod");
var triggerCache = null;
var triggerCacheExpiry = 0;
var TRIGGER_CACHE_TTL_MS = 5 * 60 * 1e3;
function clearTriggerCache() {
  triggerCache = null;
  triggerCacheExpiry = 0;
  logger.debug("[WhatsApp Trigger] Cache cleared");
}
var createTriggerSchema = import_zod23.z.object({
  eventKey: import_zod23.z.string().min(1).max(100).trim(),
  displayName: import_zod23.z.string().min(1).max(200).trim(),
  description: import_zod23.z.string().max(1e3).optional(),
  template: import_zod23.z.string().regex(/^[0-9a-fA-F]{24}$/),
  isActive: import_zod23.z.boolean().default(true),
  availableParams: import_zod23.z.array(import_zod23.z.object({
    key: import_zod23.z.string(),
    label: import_zod23.z.string(),
    source: import_zod23.z.string().optional()
  })).optional(),
  variableMapping: import_zod23.z.array(import_zod23.z.object({
    position: import_zod23.z.number().int().min(1),
    source: import_zod23.z.enum(["context", "user_field", "static"]),
    key: import_zod23.z.string(),
    fallback: import_zod23.z.string().optional()
  })).optional()
});
var listTriggersSchema = import_zod23.z.object({
  skip: import_zod23.z.coerce.number().int().min(0).default(0),
  per_page: import_zod23.z.coerce.number().int().min(1).max(100).default(20),
  sorton: import_zod23.z.string().optional(),
  sortdir: import_zod23.z.enum(["asc", "desc"]).optional(),
  match: import_zod23.z.string().max(200).optional()
});
var updateTriggerSchema = import_zod23.z.object({
  displayName: import_zod23.z.string().min(1).max(200).trim().optional(),
  description: import_zod23.z.string().max(1e3).optional(),
  template: import_zod23.z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  isActive: import_zod23.z.boolean().optional(),
  availableParams: import_zod23.z.array(import_zod23.z.object({
    key: import_zod23.z.string(),
    label: import_zod23.z.string(),
    source: import_zod23.z.string().optional()
  })).optional(),
  variableMapping: import_zod23.z.array(import_zod23.z.object({
    position: import_zod23.z.number().int().min(1),
    source: import_zod23.z.enum(["context", "user_field", "static"]),
    key: import_zod23.z.string(),
    fallback: import_zod23.z.string().optional()
  })).optional()
});
function ensureValidObjectId17(id) {
  if (!import_mongoose59.default.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid ID format");
  }
}
var createTrigger = async (req, res, next) => {
  try {
    const payload = createTriggerSchema.parse(req.body ?? {});
    const existing = await WhatsAppTriggerModel.findOne({ eventKey: payload.eventKey.toUpperCase() });
    if (existing) {
      throw new AppError(409, ERROR_CODES.BAD_REQUEST, "A trigger with this event key already exists");
    }
    const templateExists = await WhatsAppTemplateModel.exists({ _id: payload.template });
    if (!templateExists) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Template not found");
    }
    const trigger = await WhatsAppTriggerModel.create({
      eventKey: payload.eventKey.toUpperCase(),
      displayName: payload.displayName,
      description: payload.description || "",
      template: payload.template,
      isActive: payload.isActive,
      availableParams: payload.availableParams || [],
      variableMapping: payload.variableMapping || []
    });
    clearTriggerCache();
    logger.info("[WhatsApp Trigger] Created trigger", { triggerId: trigger._id, eventKey: trigger.eventKey });
    res.status(201).json(trigger.toObject());
  } catch (error) {
    if (error.code === 11e3) {
      next(new AppError(409, ERROR_CODES.BAD_REQUEST, "A trigger with this event key already exists"));
      return;
    }
    if (error instanceof import_zod23.z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid trigger data"));
      return;
    }
    next(error);
  }
};
var listTriggers = async (req, res, next) => {
  try {
    const params = listTriggersSchema.parse(req.body ?? {});
    const pipeline = [];
    if (params.match) {
      pipeline.push({
        $match: {
          $or: [
            { eventKey: { $regex: params.match, $options: "i" } },
            { displayName: { $regex: params.match, $options: "i" } },
            { description: { $regex: params.match, $options: "i" } }
          ]
        }
      });
    }
    const sortField = params.sorton || "createdAt";
    const sortDirection = params.sortdir === "asc" ? 1 : -1;
    pipeline.push({ $sort: { [sortField]: sortDirection } });
    pipeline.push({
      $lookup: {
        from: "BM-WhatsAppTemplates",
        localField: "template",
        foreignField: "_id",
        as: "templateData"
      }
    });
    pipeline.push({
      $addFields: { templateInfo: { $arrayElemAt: ["$templateData", 0] } }
    });
    pipeline.push({ $project: { templateData: 0 } });
    pipeline.push({
      $facet: {
        stage1: [{ $group: { _id: null, count: { $sum: 1 } } }],
        stage2: [{ $skip: params.skip }, { $limit: params.per_page }]
      }
    });
    pipeline.push({ $unwind: { path: "$stage1", preserveNullAndEmptyArrays: true } });
    pipeline.push({ $project: { count: { $ifNull: ["$stage1.count", 0] }, data: "$stage2" } });
    const result = await WhatsAppTriggerModel.aggregate(pipeline);
    res.status(200).json(result.length > 0 ? result[0] : { count: 0, data: [] });
  } catch (error) {
    if (error instanceof import_zod23.z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid filter parameters"));
      return;
    }
    next(error);
  }
};
var getTriggerById = async (req, res, next) => {
  try {
    ensureValidObjectId17(req.params.id);
    const trigger = await WhatsAppTriggerModel.findById(req.params.id).populate("template").lean();
    if (!trigger) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Trigger not found");
    }
    res.status(200).json(trigger);
  } catch (error) {
    next(error);
  }
};
var updateTrigger = async (req, res, next) => {
  try {
    ensureValidObjectId17(req.params.id);
    const payload = updateTriggerSchema.parse(req.body ?? {});
    if (payload.template) {
      const templateExists = await WhatsAppTemplateModel.exists({ _id: payload.template });
      if (!templateExists) {
        throw new AppError(404, ERROR_CODES.NOT_FOUND, "Template not found");
      }
    }
    const trigger = await WhatsAppTriggerModel.findByIdAndUpdate(
      req.params.id,
      payload,
      { new: true, runValidators: true }
    ).populate("template");
    if (!trigger) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Trigger not found");
    }
    clearTriggerCache();
    logger.info("[WhatsApp Trigger] Updated trigger", { triggerId: trigger._id, eventKey: trigger.eventKey });
    res.status(200).json(trigger.toObject());
  } catch (error) {
    if (error instanceof import_zod23.z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid update data"));
      return;
    }
    next(error);
  }
};
var deleteTrigger = async (req, res, next) => {
  try {
    ensureValidObjectId17(req.params.id);
    const trigger = await WhatsAppTriggerModel.findByIdAndDelete(req.params.id);
    if (!trigger) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Trigger not found");
    }
    clearTriggerCache();
    logger.info("[WhatsApp Trigger] Deleted trigger", { triggerId: trigger._id, eventKey: trigger.eventKey });
    res.status(200).json({ message: "Trigger deleted successfully" });
  } catch (error) {
    next(error);
  }
};
var listApprovedTemplates = async (req, res, next) => {
  try {
    const templates = await WhatsAppTemplateModel.find({
      metaStatus: "APPROVED",
      status: { $ne: "deleted" }
    }).select("_id name metaTemplateName language category bodyText variables").lean();
    res.status(200).json(templates);
  } catch (error) {
    next(error);
  }
};

// src/modules/whatsapp/trigger.routes.ts
var router22 = (0, import_express23.Router)();
router22.post("/api/v1/whatsapp/triggers", ...moduleGuards("whatsapp", "whatsapp.create"), createTrigger);
router22.post("/api/v1/whatsapp/triggers/list", ...moduleGuards("whatsapp", "whatsapp.read"), listTriggers);
router22.get("/api/v1/whatsapp/triggers/approved-templates", ...moduleGuards("whatsapp", "whatsapp.read"), listApprovedTemplates);
router22.get("/api/v1/whatsapp/triggers/:id", ...moduleGuards("whatsapp", "whatsapp.read"), getTriggerById);
router22.put("/api/v1/whatsapp/triggers/:id", ...moduleGuards("whatsapp", "whatsapp.update"), updateTrigger);
router22.delete("/api/v1/whatsapp/triggers/:id", ...moduleGuards("whatsapp", "whatsapp.delete"), deleteTrigger);
var triggerRoutes = router22;

// src/modules/whatsapp/inbox.routes.ts
var import_express24 = require("express");

// src/modules/whatsapp/inbox.handlers.ts
var import_mongoose60 = __toESM(require("mongoose"), 1);
var import_zod24 = require("zod");
var getConversationsSchema = import_zod24.z.object({
  page: import_zod24.z.coerce.number().int().min(1).default(1),
  limit: import_zod24.z.coerce.number().int().min(1).max(100).default(20),
  search: import_zod24.z.string().max(200).optional(),
  campaignId: import_zod24.z.string().regex(/^[0-9a-fA-F]{24}$/).optional()
});
var getMessagesQuerySchema = import_zod24.z.object({
  before: import_zod24.z.string().optional(),
  limit: import_zod24.z.coerce.number().int().min(1).max(100).default(30)
});
var sendReplySchema = import_zod24.z.object({
  text: import_zod24.z.string().min(1).max(4096).trim(),
  replyToWaMessageId: import_zod24.z.string().optional()
});
var sendTemplateSchema = import_zod24.z.object({
  templateId: import_zod24.z.string().regex(/^[0-9a-fA-F]{24}$/),
  variables: import_zod24.z.array(import_zod24.z.string()).optional()
});
var searchQuerySchema = import_zod24.z.object({
  q: import_zod24.z.string().min(1).max(200).trim(),
  page: import_zod24.z.coerce.number().int().min(1).default(1),
  limit: import_zod24.z.coerce.number().int().min(1).max(100).default(20)
});
function isWithin24hWindow(lastInboundAt) {
  if (!lastInboundAt) return false;
  const windowEnd = new Date(lastInboundAt).getTime() + 24 * 60 * 60 * 1e3;
  return Date.now() < windowEnd;
}
async function resolveConversation(id) {
  if (import_mongoose60.default.Types.ObjectId.isValid(id) && !id.startsWith("user_")) {
    return WAConversationModel.findById(id);
  }
  logger.warn("[WhatsApp Inbox] user_ prefix resolution not yet implemented - update resolveConversation()");
  return null;
}
async function sendFreeTextReply(phoneNumber, text) {
  if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
    return { success: false, error: "WhatsApp API not configured" };
  }
  const url = `${env.WHATSAPP_GRAPH_BASE_URL}/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phoneNumber,
        type: "text",
        text: { body: text }
      })
    });
    const data = await response.json();
    if (response.ok && data.messages?.[0]?.id) {
      return { success: true, messageId: data.messages[0].id };
    }
    return { success: false, error: data.error?.message || JSON.stringify(data) };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
async function sendTemplateFromChat(phoneNumber, templateName, components, language) {
  if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
    return { success: false, error: "WhatsApp API not configured" };
  }
  const url = `${env.WHATSAPP_GRAPH_BASE_URL}/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phoneNumber,
        type: "template",
        template: {
          name: templateName,
          language: { code: language || "en" },
          ...components.length > 0 && { components }
        }
      })
    });
    const data = await response.json();
    if (response.ok && data.messages?.[0]?.id) {
      return { success: true, messageId: data.messages[0].id };
    }
    return { success: false, error: data.error?.message || JSON.stringify(data) };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
var getConversations = async (req, res, next) => {
  try {
    const params = getConversationsSchema.parse(req.body ?? {});
    const skip = (params.page - 1) * params.limit;
    if (params.campaignId) {
      const match2 = {
        status: "active",
        campaignIds: new import_mongoose60.default.Types.ObjectId(params.campaignId)
      };
      if (params.search) {
        match2.$or = [
          { phoneNumber: { $regex: params.search, $options: "i" } },
          { contactName: { $regex: params.search, $options: "i" } }
        ];
      }
      const [conversations2, total2] = await Promise.all([
        WAConversationModel.find(match2).sort({ lastMessageAt: -1 }).skip(skip).limit(params.limit).lean(),
        WAConversationModel.countDocuments(match2)
      ]);
      const data2 = conversations2.map((c) => ({
        ...c,
        isWithin24h: isWithin24hWindow(c.lastInboundAt),
        hasConversation: true
      }));
      res.status(200).json({
        data: data2,
        totalCount: total2,
        totalPages: Math.ceil(total2 / params.limit),
        currentPage: params.page
      });
      return;
    }
    const match = { status: "active" };
    if (params.search) {
      match.$or = [
        { phoneNumber: { $regex: params.search, $options: "i" } },
        { contactName: { $regex: params.search, $options: "i" } }
      ];
    }
    const [conversations, total] = await Promise.all([
      WAConversationModel.find(match).sort({ lastMessageAt: -1 }).skip(skip).limit(params.limit).lean(),
      WAConversationModel.countDocuments(match)
    ]);
    const data = conversations.map((c) => ({
      ...c,
      isWithin24h: isWithin24hWindow(c.lastInboundAt),
      hasConversation: true
    }));
    res.status(200).json({
      data,
      totalCount: total,
      totalPages: Math.ceil(total / params.limit),
      currentPage: params.page
    });
  } catch (error) {
    if (error instanceof import_zod24.z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid filter parameters"));
      return;
    }
    next(error);
  }
};
var getConversationDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (id.startsWith("user_")) {
      throw new AppError(501, ERROR_CODES.INTERNAL_ERROR, "User contact resolution not yet implemented. Update getConversationDetail handler.");
    }
    if (!import_mongoose60.default.Types.ObjectId.isValid(id)) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid conversation ID");
    }
    const conversation = await WAConversationModel.findById(id).lean();
    if (!conversation) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Conversation not found");
    }
    let campaigns = [];
    if (conversation.campaignIds?.length > 0) {
      campaigns = await CampaignModel.find(
        { _id: { $in: conversation.campaignIds } },
        { name: 1 }
      ).lean();
    }
    res.status(200).json({
      ...conversation,
      isWithin24h: isWithin24hWindow(conversation.lastInboundAt),
      hasConversation: true,
      campaigns
    });
  } catch (error) {
    next(error);
  }
};
var getMessages = async (req, res, next) => {
  try {
    const { id } = req.params;
    const params = getMessagesQuerySchema.parse(req.query ?? {});
    if (id.startsWith("user_")) {
      res.status(200).json({ data: [], hasMore: false });
      return;
    }
    if (!import_mongoose60.default.Types.ObjectId.isValid(id)) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid conversation ID");
    }
    const query = { conversationId: new import_mongoose60.default.Types.ObjectId(id) };
    if (params.before) {
      query.timestamp = { $lt: new Date(params.before) };
    }
    const messages = await WAMessageModel.find(query).sort({ timestamp: -1 }).limit(params.limit).populate("replyToId", "content type direction timestamp").lean();
    await WAConversationModel.findByIdAndUpdate(id, { $set: { unreadCount: 0 } });
    res.status(200).json({
      data: messages.reverse(),
      // Chronological order for display
      hasMore: messages.length === params.limit
    });
  } catch (error) {
    if (error instanceof import_zod24.z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid query parameters"));
      return;
    }
    next(error);
  }
};
var sendReply = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payload = sendReplySchema.parse(req.body ?? {});
    const conversation = await resolveConversation(id);
    if (!conversation) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Conversation not found");
    }
    if (!isWithin24hWindow(conversation.lastInboundAt)) {
      throw new AppError(
        403,
        ERROR_CODES.FORBIDDEN,
        "24-hour customer service window has expired. Send a template to re-engage."
      );
    }
    const result = await sendFreeTextReply(conversation.phoneNumber, payload.text);
    if (!result.success) {
      throw new AppError(502, ERROR_CODES.INTERNAL_ERROR, result.error || "Failed to send message");
    }
    let replyToId = null;
    if (payload.replyToWaMessageId) {
      const replyMsg = await WAMessageModel.findOne({ waMessageId: payload.replyToWaMessageId });
      if (replyMsg) replyToId = replyMsg._id;
    }
    const now = /* @__PURE__ */ new Date();
    const waMessage = await WAMessageModel.create({
      conversationId: conversation._id,
      waMessageId: result.messageId,
      direction: "outbound",
      type: "text",
      content: { text: payload.text },
      replyToWaMessageId: payload.replyToWaMessageId || null,
      replyToId,
      status: "pending",
      sentBy: req.user.id,
      timestamp: now
    });
    await WAConversationModel.findByIdAndUpdate(conversation._id, {
      $set: {
        lastMessage: {
          content: payload.text,
          direction: "outbound",
          type: "text",
          timestamp: now
        },
        lastMessageAt: now
      }
    });
    const io = req.app.get("io");
    if (io) {
      io.to("whatsapp_inbox_admin").emit("wa_message_sent", {
        conversationId: conversation._id,
        message: waMessage.toObject()
      });
    }
    res.status(200).json({
      data: waMessage.toObject(),
      conversationId: conversation._id
    });
  } catch (error) {
    if (error instanceof import_zod24.z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid reply data"));
      return;
    }
    next(error);
  }
};
var sendTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payload = sendTemplateSchema.parse(req.body ?? {});
    const conversation = await resolveConversation(id);
    if (!conversation) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Conversation not found");
    }
    const template = await WhatsAppTemplateModel.findById(payload.templateId);
    if (!template) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Template not found");
    }
    if (template.metaStatus !== "APPROVED") {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Template is not approved by Meta");
    }
    const components = [];
    if (payload.variables?.length) {
      components.push({
        type: "body",
        parameters: payload.variables.map((v) => ({ type: "text", text: v }))
      });
    }
    const result = await sendTemplateFromChat(
      conversation.phoneNumber,
      template.metaTemplateName,
      components,
      template.language
    );
    if (!result.success) {
      throw new AppError(502, ERROR_CODES.INTERNAL_ERROR, result.error || "Failed to send template");
    }
    const now = /* @__PURE__ */ new Date();
    const waMessage = await WAMessageModel.create({
      conversationId: conversation._id,
      waMessageId: result.messageId,
      direction: "outbound",
      type: "template",
      content: {
        text: template.bodyText || template.name,
        templateName: template.metaTemplateName,
        templateData: { variables: payload.variables, templateId: payload.templateId }
      },
      status: "pending",
      sentBy: req.user.id,
      timestamp: now
    });
    await WAConversationModel.findByIdAndUpdate(conversation._id, {
      $set: {
        lastMessage: {
          content: `[Template: ${template.name}]`,
          direction: "outbound",
          type: "template",
          timestamp: now
        },
        lastMessageAt: now
      }
    });
    const io = req.app.get("io");
    if (io) {
      io.to("whatsapp_inbox_admin").emit("wa_message_sent", {
        conversationId: conversation._id,
        message: waMessage.toObject()
      });
    }
    res.status(200).json({
      data: waMessage.toObject(),
      conversationId: conversation._id
    });
  } catch (error) {
    if (error instanceof import_zod24.z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid template data"));
      return;
    }
    next(error);
  }
};
var searchMessages = async (req, res, next) => {
  try {
    const params = searchQuerySchema.parse(req.query ?? {});
    const skip = (params.page - 1) * params.limit;
    const [messages, total] = await Promise.all([
      WAMessageModel.find({ "content.text": { $regex: params.q, $options: "i" } }).sort({ timestamp: -1 }).skip(skip).limit(params.limit).lean(),
      WAMessageModel.countDocuments({ "content.text": { $regex: params.q, $options: "i" } })
    ]);
    const convIds = [...new Set(messages.map((m) => m.conversationId.toString()))];
    const convs = await WAConversationModel.find(
      { _id: { $in: convIds } },
      { phoneNumber: 1, contactName: 1 }
    ).lean();
    const convMap = Object.fromEntries(convs.map((c) => [c._id.toString(), c]));
    const data = messages.map((m) => ({
      ...m,
      conversation: convMap[m.conversationId.toString()] || null
    }));
    res.status(200).json({
      data,
      totalCount: total,
      totalPages: Math.ceil(total / params.limit)
    });
  } catch (error) {
    if (error instanceof import_zod24.z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid search parameters"));
      return;
    }
    next(error);
  }
};

// src/modules/whatsapp/inbox.routes.ts
var router23 = (0, import_express24.Router)();
router23.post("/api/v1/whatsapp/inbox/conversations", ...moduleGuards("whatsapp", "whatsapp.read"), getConversations);
router23.get("/api/v1/whatsapp/inbox/conversations/:id", ...moduleGuards("whatsapp", "whatsapp.read"), getConversationDetail);
router23.get("/api/v1/whatsapp/inbox/conversations/:id/messages", ...moduleGuards("whatsapp", "whatsapp.read"), getMessages);
router23.post("/api/v1/whatsapp/inbox/conversations/:id/reply", ...moduleGuards("whatsapp", "whatsapp.create"), sendReply);
router23.post("/api/v1/whatsapp/inbox/conversations/:id/send-template", ...moduleGuards("whatsapp", "whatsapp.create"), sendTemplate);
router23.get("/api/v1/whatsapp/inbox/search", ...moduleGuards("whatsapp", "whatsapp.read"), searchMessages);
var inboxRoutes = router23;

// src/modules/rbac/rbac.routes.ts
var import_bcryptjs4 = __toESM(require("bcryptjs"), 1);
var import_mongoose62 = __toESM(require("mongoose"), 1);
var import_express25 = require("express");
var import_zod25 = require("zod");

// src/modules/rbac/rbac-task.model.ts
var import_mongoose61 = __toESM(require("mongoose"), 1);
var rbacTaskSchema = new import_mongoose61.Schema(
  {
    clientCode: { type: String, required: true },
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, maxlength: 1e3, default: "" },
    status: {
      type: String,
      enum: ["TODO", "IN_PROGRESS", "DONE"],
      required: true,
      default: "TODO"
    },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      required: true,
      default: "MEDIUM"
    },
    assignedTo: { type: import_mongoose61.Schema.Types.ObjectId, ref: "Employee", required: true },
    assignedBy: { type: import_mongoose61.Schema.Types.ObjectId, ref: "Employee", required: true },
    dueDate: { type: Date, default: null },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true }
  },
  { timestamps: true }
);
rbacTaskSchema.index({ clientCode: 1, assignedTo: 1 });
rbacTaskSchema.index({ clientCode: 1, assignedBy: 1 });
var RbacTaskModel = import_mongoose61.default.models.RbacTask ?? import_mongoose61.default.model("RbacTask", rbacTaskSchema);

// src/modules/rbac/rbac.routes.ts
var router24 = (0, import_express25.Router)();
var AUTH = [authenticateJwt, requireRole(["super_admin", "admin"])];
var SUPER_ONLY = [authenticateJwt, requireRole(["super_admin"])];
function buildSearchRegex(raw) {
  const escaped = raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped, "i");
}
async function getEmployeeForUser(userId) {
  return EmployeeModel.findOne(
    { userId: new import_mongoose62.default.Types.ObjectId(userId) }
  ).lean().exec();
}
async function getDescendantIds(employeeId) {
  const descendants = await EmployeeModel.find(
    { ancestorIds: employeeId },
    { _id: 1 }
  ).lean().exec();
  return descendants.map((d) => d._id);
}
async function validateStrictSubset(actorEmployeeId, newPermissions) {
  const actor = await EmployeeModel.findById(actorEmployeeId).lean().exec();
  if (!actor?.roleId) {
    throw new AppError(403, ERROR_CODES.FORBIDDEN, "You have no role assigned, cannot create/update roles.");
  }
  const actorRole = await RoleMasterModel.findById(actor.roleId).lean().exec();
  if (!actorRole) {
    throw new AppError(403, ERROR_CODES.FORBIDDEN, "Your assigned role could not be found.");
  }
  const actorGranted = new Set(
    actorRole.permissions.filter((p) => p.granted).map((p) => `${p.menuId}:${p.actionTypeId}`)
  );
  for (const perm of newPermissions) {
    if (perm.granted && !actorGranted.has(`${perm.menuId}:${perm.actionTypeId}`)) {
      throw new AppError(
        403,
        ERROR_CODES.FORBIDDEN,
        "Cannot save role: contains permissions exceeding your current access level."
      );
    }
  }
}
var menuMasterSchema2 = import_zod25.z.object({
  menuName: import_zod25.z.string().min(1).max(100),
  isParentMenu: import_zod25.z.boolean().default(false),
  parentMenu: import_zod25.z.string().nullable().optional(),
  menuUrl: import_zod25.z.string().max(255).default(""),
  sequence: import_zod25.z.number().int().min(0).default(0),
  icon: import_zod25.z.string().max(100).default(""),
  isActive: import_zod25.z.boolean().default(true)
});
router24.get("/api/v1/rbac/menus", ...AUTH, async (req, res, next) => {
  try {
    const search = req.query.search?.trim();
    const filter = { clientCode: env.CLIENT_CODE };
    if (search) {
      const rx = buildSearchRegex(search);
      filter.$or = [{ menuName: rx }, { menuUrl: rx }];
    }
    const menus = await MenuMasterModel.find(filter).sort({ isRoot: -1, sequence: 1 }).lean().exec();
    res.json(menus);
  } catch (error) {
    next(error);
  }
});
router24.post("/api/v1/rbac/menus", ...SUPER_ONLY, async (req, res, next) => {
  try {
    const data = menuMasterSchema2.parse(req.body);
    const parentId = data.parentMenu ? new import_mongoose62.default.Types.ObjectId(data.parentMenu) : null;
    if (parentId) {
      const parent = await MenuMasterModel.findOne({ _id: parentId, clientCode: env.CLIENT_CODE }).lean().exec();
      if (!parent) throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Parent menu not found.");
      if (!parent.isParentMenu) throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Selected parent menu is not marked as a parent (dropdown).");
    }
    const isRoot = !parentId;
    const menu = await MenuMasterModel.create({
      ...data,
      isRoot,
      parentMenu: parentId,
      clientCode: env.CLIENT_CODE,
      createdBy: req.user.id,
      updatedBy: req.user.id
    });
    res.status(201).json(menu);
  } catch (error) {
    next(error);
  }
});
router24.put("/api/v1/rbac/menus/:id", ...SUPER_ONLY, async (req, res, next) => {
  try {
    const data = menuMasterSchema2.partial().parse(req.body);
    const parentId = data.parentMenu !== void 0 ? data.parentMenu ? new import_mongoose62.default.Types.ObjectId(data.parentMenu) : null : void 0;
    if (parentId) {
      if (parentId.toString() === req.params.id) {
        throw new AppError(400, ERROR_CODES.BAD_REQUEST, "A menu cannot be its own parent.");
      }
      const parent = await MenuMasterModel.findOne({ _id: parentId, clientCode: env.CLIENT_CODE }).lean().exec();
      if (!parent) throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Parent menu not found.");
      if (!parent.isParentMenu) throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Selected parent menu is not marked as a parent (dropdown).");
    }
    const isRoot = parentId === null ? true : parentId === void 0 ? void 0 : false;
    const update = { ...data, updatedBy: req.user.id };
    if (parentId !== void 0) update.parentMenu = parentId;
    if (isRoot !== void 0) update.isRoot = isRoot;
    const menu = await MenuMasterModel.findOneAndUpdate(
      { _id: req.params.id, clientCode: env.CLIENT_CODE },
      update,
      { new: true }
    ).lean().exec();
    if (!menu) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Menu not found.");
    res.json(menu);
  } catch (error) {
    next(error);
  }
});
router24.delete("/api/v1/rbac/menus/:id", ...SUPER_ONLY, async (req, res, next) => {
  try {
    const hasChildren = await MenuMasterModel.exists({
      parentMenu: new import_mongoose62.default.Types.ObjectId(req.params.id),
      clientCode: env.CLIENT_CODE
    });
    if (hasChildren) {
      throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Cannot delete: menu has sub-menus. Remove sub-menus first.");
    }
    await MenuMasterModel.deleteOne({ _id: req.params.id, clientCode: env.CLIENT_CODE });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});
var actionTypeSchema2 = import_zod25.z.object({
  actionName: import_zod25.z.string().min(1).max(60),
  actionCode: import_zod25.z.string().min(1).max(30).toUpperCase(),
  isActive: import_zod25.z.boolean().default(true)
});
router24.get("/api/v1/rbac/actions", ...AUTH, async (req, res, next) => {
  try {
    const search = req.query.search?.trim();
    const filter = { clientCode: env.CLIENT_CODE };
    if (search) {
      const rx = buildSearchRegex(search);
      filter.$or = [{ actionName: rx }, { actionCode: rx }];
    }
    const actions = await ActionTypeModel.find(filter).sort({ actionName: 1 }).lean().exec();
    res.json(actions);
  } catch (error) {
    next(error);
  }
});
router24.post("/api/v1/rbac/actions", ...SUPER_ONLY, async (req, res, next) => {
  try {
    const data = actionTypeSchema2.parse(req.body);
    const action = await ActionTypeModel.create({ ...data, clientCode: env.CLIENT_CODE });
    res.status(201).json(action);
  } catch (error) {
    next(error);
  }
});
router24.put("/api/v1/rbac/actions/:id", ...SUPER_ONLY, async (req, res, next) => {
  try {
    const data = actionTypeSchema2.partial().parse(req.body);
    const action = await ActionTypeModel.findOneAndUpdate(
      { _id: req.params.id, clientCode: env.CLIENT_CODE },
      data,
      { new: true }
    ).lean().exec();
    if (!action) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Action type not found.");
    res.json(action);
  } catch (error) {
    next(error);
  }
});
router24.delete("/api/v1/rbac/actions/:id", ...SUPER_ONLY, async (_req, res, next) => {
  try {
    await ActionTypeModel.deleteOne({ _id: _req.params.id, clientCode: env.CLIENT_CODE });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});
var rolePermissionEntrySchema = import_zod25.z.object({
  menuId: import_zod25.z.string(),
  actionTypeId: import_zod25.z.string(),
  granted: import_zod25.z.boolean()
});
var roleMasterCreateSchema = import_zod25.z.object({
  roleName: import_zod25.z.string().min(1).max(60),
  permissions: import_zod25.z.array(rolePermissionEntrySchema).default([]),
  isActive: import_zod25.z.boolean().default(true)
});
router24.get("/api/v1/rbac/roles", ...AUTH, async (req, res, next) => {
  try {
    const search = req.query.search?.trim();
    const searchFilter = search ? { $or: [{ roleName: buildSearchRegex(search) }] } : {};
    const isSuperAdmin = req.user.role === "super_admin";
    if (isSuperAdmin) {
      const roles2 = await RoleMasterModel.find({ clientCode: env.CLIENT_CODE, ...searchFilter }).sort({ roleName: 1 }).lean().exec();
      return res.json(roles2);
    }
    const employee = await getEmployeeForUser(req.user.id);
    if (!employee) return res.json([]);
    const descendantIds = await getDescendantIds(employee._id);
    const visibleCreators = [
      employee._id.toString(),
      ...descendantIds.map((id) => id.toString())
    ];
    const roles = await RoleMasterModel.find({
      clientCode: env.CLIENT_CODE,
      createdBy: { $in: visibleCreators },
      ...searchFilter
    }).sort({ roleName: 1 }).lean().exec();
    res.json(roles);
  } catch (error) {
    next(error);
  }
});
router24.post("/api/v1/rbac/roles", ...AUTH, async (req, res, next) => {
  try {
    const data = roleMasterCreateSchema.parse(req.body);
    const isSuperAdmin = req.user.role === "super_admin";
    let createdBy = null;
    if (!isSuperAdmin) {
      const employee = await getEmployeeForUser(req.user.id);
      if (!employee) throw new AppError(403, ERROR_CODES.FORBIDDEN, "No employee profile found.");
      await validateStrictSubset(employee._id.toString(), data.permissions);
      createdBy = employee._id.toString();
    }
    const role = await RoleMasterModel.create({
      ...data,
      clientCode: env.CLIENT_CODE,
      createdBy,
      updatedBy: req.user.id
    });
    res.status(201).json(role);
  } catch (error) {
    next(error);
  }
});
router24.put("/api/v1/rbac/roles/:id", ...AUTH, async (req, res, next) => {
  try {
    const data = roleMasterCreateSchema.partial().parse(req.body);
    const isSuperAdmin = req.user.role === "super_admin";
    const existing = await RoleMasterModel.findOne({
      _id: req.params.id,
      clientCode: env.CLIENT_CODE
    }).lean().exec();
    if (!existing) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Role not found.");
    if (!isSuperAdmin) {
      const employee = await getEmployeeForUser(req.user.id);
      if (!employee) throw new AppError(403, ERROR_CODES.FORBIDDEN, "No employee profile found.");
      const descendantIds = await getDescendantIds(employee._id);
      const visibleCreators = [
        employee._id.toString(),
        ...descendantIds.map((id) => id.toString())
      ];
      if (!existing.createdBy || !visibleCreators.includes(existing.createdBy)) {
        throw new AppError(403, ERROR_CODES.FORBIDDEN, "You do not have permission to edit this role.");
      }
      if (data.permissions) {
        await validateStrictSubset(employee._id.toString(), data.permissions);
      }
    }
    const updated = await RoleMasterModel.findByIdAndUpdate(
      req.params.id,
      { ...data, updatedBy: req.user.id },
      { new: true }
    ).lean().exec();
    res.json(updated);
  } catch (error) {
    next(error);
  }
});
router24.delete("/api/v1/rbac/roles/:id", ...AUTH, async (req, res, next) => {
  try {
    const isSuperAdmin = req.user.role === "super_admin";
    const existing = await RoleMasterModel.findOne({
      _id: req.params.id,
      clientCode: env.CLIENT_CODE
    }).lean().exec();
    if (!existing) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Role not found.");
    if (!isSuperAdmin) {
      const employee = await getEmployeeForUser(req.user.id);
      if (!employee) throw new AppError(403, ERROR_CODES.FORBIDDEN, "No employee profile found.");
      const descendantIds = await getDescendantIds(employee._id);
      const visibleCreators = [
        employee._id.toString(),
        ...descendantIds.map((id) => id.toString())
      ];
      if (!existing.createdBy || !visibleCreators.includes(existing.createdBy)) {
        throw new AppError(403, ERROR_CODES.FORBIDDEN, "You do not have permission to delete this role.");
      }
    }
    const assignedCount = await EmployeeModel.countDocuments({
      roleId: new import_mongoose62.default.Types.ObjectId(req.params.id)
    });
    if (assignedCount > 0) {
      throw new AppError(
        400,
        ERROR_CODES.BAD_REQUEST,
        `Cannot delete: ${assignedCount} employee(s) are assigned this role.`
      );
    }
    await RoleMasterModel.deleteOne({ _id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});
router24.get("/api/v1/rbac/roles/:id/impact", ...AUTH, async (req, res, next) => {
  try {
    const roleId = req.params.id;
    const removingParam = req.query.removing;
    const removingPerms = removingParam ? removingParam.split(",") : [];
    let affectedRoles = 0;
    if (removingPerms.length > 0) {
      const orClauses = removingPerms.map((perm) => {
        const [menuId, actionTypeId] = perm.split(":");
        return { permissions: { $elemMatch: { menuId, actionTypeId, granted: true } } };
      });
      affectedRoles = await RoleMasterModel.countDocuments({
        clientCode: env.CLIENT_CODE,
        _id: { $ne: new import_mongoose62.default.Types.ObjectId(roleId) },
        $or: orClauses
      });
    }
    const affectedEmployees = await EmployeeModel.countDocuments({
      roleId: new import_mongoose62.default.Types.ObjectId(roleId)
    });
    res.json({ affectedRoles, affectedEmployees });
  } catch (error) {
    next(error);
  }
});
var employeeCreateSchema = import_zod25.z.object({
  employeeName: import_zod25.z.string().min(1).max(100),
  emailOffice: import_zod25.z.string().email(),
  department: import_zod25.z.string().max(100).default(""),
  contact: import_zod25.z.string().max(20).default(""),
  roleId: import_zod25.z.string().nullable().optional(),
  parentEmployeeId: import_zod25.z.string().nullable().optional(),
  password: import_zod25.z.string().min(8)
});
var employeeUpdateSchema = import_zod25.z.object({
  employeeName: import_zod25.z.string().min(1).max(100).optional(),
  emailOffice: import_zod25.z.string().email().optional(),
  department: import_zod25.z.string().max(100).optional(),
  contact: import_zod25.z.string().max(20).optional(),
  roleId: import_zod25.z.string().nullable().optional()
});
router24.get("/api/v1/rbac/employees", ...AUTH, async (req, res, next) => {
  try {
    const search = req.query.search?.trim();
    const searchFilter = search ? {
      $or: [
        { employeeName: buildSearchRegex(search) },
        { emailOffice: buildSearchRegex(search) },
        { department: buildSearchRegex(search) }
      ]
    } : {};
    const isSuperAdmin = req.user.role === "super_admin";
    if (isSuperAdmin) {
      const employees2 = await EmployeeModel.find({ clientCode: env.CLIENT_CODE, ...searchFilter }).populate("roleId", "roleName").populate("parentEmployeeId", "employeeName").sort({ employeeName: 1 }).lean().exec();
      return res.json(employees2);
    }
    const currentEmployee = await getEmployeeForUser(req.user.id);
    if (!currentEmployee) return res.json([]);
    const descendantIds = await getDescendantIds(currentEmployee._id);
    const visibleIds = [currentEmployee._id, ...descendantIds];
    const employees = await EmployeeModel.find({
      clientCode: env.CLIENT_CODE,
      _id: { $in: visibleIds },
      ...searchFilter
    }).populate("roleId", "roleName").populate("parentEmployeeId", "employeeName").sort({ employeeName: 1 }).lean().exec();
    res.json(employees);
  } catch (error) {
    next(error);
  }
});
router24.post("/api/v1/rbac/employees", ...AUTH, async (req, res, next) => {
  try {
    const data = employeeCreateSchema.parse(req.body);
    const isSuperAdmin = req.user.role === "super_admin";
    let createdBy = null;
    let ancestorIds = [];
    let resolvedParentId = null;
    if (data.parentEmployeeId) {
      const parent = await EmployeeModel.findById(data.parentEmployeeId).lean().exec();
      if (!parent) throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Parent employee not found.");
      if (!isSuperAdmin) {
        const currentEmployee = await getEmployeeForUser(req.user.id);
        if (!currentEmployee) throw new AppError(403, ERROR_CODES.FORBIDDEN, "No employee profile found.");
        const descendantIds = await getDescendantIds(currentEmployee._id);
        const allowedParentIds = [
          currentEmployee._id.toString(),
          ...descendantIds.map((id) => id.toString())
        ];
        if (!allowedParentIds.includes(parent._id.toString())) {
          throw new AppError(403, ERROR_CODES.FORBIDDEN, "Cannot assign this parent: outside your hierarchy.");
        }
        createdBy = currentEmployee._id.toString();
      }
      ancestorIds = [...parent.ancestorIds, parent._id];
      resolvedParentId = parent._id;
    } else if (!isSuperAdmin) {
      const currentEmployee = await getEmployeeForUser(req.user.id);
      if (!currentEmployee) throw new AppError(403, ERROR_CODES.FORBIDDEN, "No employee profile found.");
      createdBy = currentEmployee._id.toString();
      ancestorIds = [...currentEmployee.ancestorIds, currentEmployee._id];
      resolvedParentId = currentEmployee._id;
    }
    if (data.roleId && !isSuperAdmin) {
      const actor = await getEmployeeForUser(req.user.id);
      if (actor) {
        const descendantIds = await getDescendantIds(actor._id);
        const visibleRoleCreators = [
          actor._id.toString(),
          ...descendantIds.map((id) => id.toString())
        ];
        const role = await RoleMasterModel.findById(data.roleId).lean().exec();
        if (role?.createdBy && !visibleRoleCreators.includes(role.createdBy)) {
          throw new AppError(403, ERROR_CODES.FORBIDDEN, "Cannot assign a role outside your visible roles.");
        }
      }
    }
    const existingUser = await UserModel.findOne({ email: data.emailOffice }).lean().exec();
    if (existingUser) throw new AppError(400, ERROR_CODES.BAD_REQUEST, "A user with this email already exists.");
    const passwordHash = await import_bcryptjs4.default.hash(data.password, 10);
    const user = await UserModel.create({
      email: data.emailOffice,
      passwordHash,
      role: "admin"
    });
    const employee = await EmployeeModel.create({
      clientCode: env.CLIENT_CODE,
      userId: user._id,
      employeeName: data.employeeName,
      emailOffice: data.emailOffice,
      department: data.department,
      contact: data.contact,
      roleId: data.roleId ? new import_mongoose62.default.Types.ObjectId(data.roleId) : null,
      parentEmployeeId: resolvedParentId,
      ancestorIds,
      isActive: true,
      createdBy,
      updatedBy: req.user.id
    });
    res.status(201).json(employee);
  } catch (error) {
    next(error);
  }
});
router24.put("/api/v1/rbac/employees/:id", ...AUTH, async (req, res, next) => {
  try {
    const data = employeeUpdateSchema.parse(req.body);
    const isSuperAdmin = req.user.role === "super_admin";
    const existing = await EmployeeModel.findOne({
      _id: req.params.id,
      clientCode: env.CLIENT_CODE
    }).lean().exec();
    if (!existing) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Employee not found.");
    if (!isSuperAdmin) {
      const currentEmployee = await getEmployeeForUser(req.user.id);
      if (!currentEmployee) throw new AppError(403, ERROR_CODES.FORBIDDEN, "No employee profile found.");
      const descendantIds = await getDescendantIds(currentEmployee._id);
      const visibleIds = [
        currentEmployee._id.toString(),
        ...descendantIds.map((id) => id.toString())
      ];
      if (!visibleIds.includes(existing._id.toString())) {
        throw new AppError(403, ERROR_CODES.FORBIDDEN, "You do not have permission to edit this employee.");
      }
      if (data.roleId) {
        const role = await RoleMasterModel.findById(data.roleId).lean().exec();
        const visibleRoleCreators = [
          currentEmployee._id.toString(),
          ...descendantIds.map((id) => id.toString())
        ];
        if (role?.createdBy && !visibleRoleCreators.includes(role.createdBy)) {
          throw new AppError(403, ERROR_CODES.FORBIDDEN, "Cannot assign a role outside your visible roles.");
        }
      }
    }
    const updatePayload = {
      employeeName: data.employeeName,
      department: data.department,
      contact: data.contact,
      updatedBy: req.user.id
    };
    if (data.roleId !== void 0) {
      updatePayload.roleId = data.roleId ? new import_mongoose62.default.Types.ObjectId(data.roleId) : null;
    }
    if (data.emailOffice !== void 0) {
      updatePayload.emailOffice = data.emailOffice;
    }
    const updated = await EmployeeModel.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true }
    ).lean().exec();
    if (data.emailOffice && data.emailOffice !== existing.emailOffice) {
      await UserModel.findByIdAndUpdate(existing.userId, { email: data.emailOffice });
    }
    res.json(updated);
  } catch (error) {
    next(error);
  }
});
router24.get("/api/v1/rbac/employees/:id/cascade-impact", ...AUTH, async (req, res, next) => {
  try {
    const empId = new import_mongoose62.default.Types.ObjectId(req.params.id);
    const descendantIds = await getDescendantIds(empId);
    res.json({ affectedCount: descendantIds.length });
  } catch (error) {
    next(error);
  }
});
router24.put("/api/v1/rbac/employees/:id/status", ...AUTH, async (req, res, next) => {
  try {
    const { isActive } = import_zod25.z.object({ isActive: import_zod25.z.boolean() }).parse(req.body);
    const isSuperAdmin = req.user.role === "super_admin";
    const existing = await EmployeeModel.findOne({
      _id: req.params.id,
      clientCode: env.CLIENT_CODE
    }).lean().exec();
    if (!existing) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Employee not found.");
    if (!isSuperAdmin) {
      const currentEmployee = await getEmployeeForUser(req.user.id);
      if (!currentEmployee) throw new AppError(403, ERROR_CODES.FORBIDDEN, "No employee profile found.");
      const descendantIds2 = await getDescendantIds(currentEmployee._id);
      if (!descendantIds2.map((id) => id.toString()).includes(existing._id.toString())) {
        throw new AppError(403, ERROR_CODES.FORBIDDEN, "You can only change status of your sub-employees.");
      }
    }
    const empId = new import_mongoose62.default.Types.ObjectId(req.params.id);
    const descendantIds = await getDescendantIds(empId);
    const allAffected = [empId, ...descendantIds];
    await EmployeeModel.updateMany(
      { _id: { $in: allAffected } },
      { isActive, updatedBy: req.user.id }
    );
    res.json({ success: true, affected: allAffected.length });
  } catch (error) {
    next(error);
  }
});
var taskCreateSchema = import_zod25.z.object({
  title: import_zod25.z.string().min(1).max(200),
  description: import_zod25.z.string().max(1e3).default(""),
  status: import_zod25.z.enum(["TODO", "IN_PROGRESS", "DONE"]).default("TODO"),
  priority: import_zod25.z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  assignedTo: import_zod25.z.string(),
  dueDate: import_zod25.z.string().nullable().optional()
});
var taskUpdateSchema = import_zod25.z.object({
  title: import_zod25.z.string().min(1).max(200).optional(),
  description: import_zod25.z.string().max(1e3).optional(),
  status: import_zod25.z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  priority: import_zod25.z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  dueDate: import_zod25.z.string().nullable().optional()
});
router24.get("/api/v1/rbac/tasks", ...AUTH, async (req, res, next) => {
  try {
    const search = req.query.search?.trim();
    const isSuperAdmin = req.user.role === "super_admin";
    if (isSuperAdmin) {
      const filter2 = { clientCode: env.CLIENT_CODE };
      if (search) {
        const rx = buildSearchRegex(search);
        filter2.$or = [{ title: rx }, { description: rx }];
      }
      const tasks2 = await RbacTaskModel.find(filter2).populate("assignedTo", "employeeName emailOffice").populate("assignedBy", "employeeName emailOffice").sort({ createdAt: -1 }).lean().exec();
      return res.json(tasks2);
    }
    const currentEmployee = await getEmployeeForUser(req.user.id);
    if (!currentEmployee) return res.json([]);
    const descendantIds = await getDescendantIds(currentEmployee._id);
    const visibleIds = [currentEmployee._id, ...descendantIds];
    const visibilityClause = {
      $or: [
        { assignedBy: currentEmployee._id },
        { assignedTo: { $in: visibleIds } }
      ]
    };
    const filter = search ? {
      clientCode: env.CLIENT_CODE,
      $and: [
        visibilityClause,
        { $or: [{ title: buildSearchRegex(search) }, { description: buildSearchRegex(search) }] }
      ]
    } : { clientCode: env.CLIENT_CODE, ...visibilityClause };
    const tasks = await RbacTaskModel.find(filter).populate("assignedTo", "employeeName emailOffice").populate("assignedBy", "employeeName emailOffice").sort({ createdAt: -1 }).lean().exec();
    res.json(tasks);
  } catch (error) {
    next(error);
  }
});
router24.get("/api/v1/rbac/tasks/assignees", ...AUTH, async (req, res, next) => {
  try {
    const isSuperAdmin = req.user.role === "super_admin";
    if (isSuperAdmin) {
      const employees2 = await EmployeeModel.find({ clientCode: env.CLIENT_CODE, isActive: true }).select("employeeName emailOffice department").sort({ employeeName: 1 }).lean().exec();
      return res.json(employees2);
    }
    const currentEmployee = await getEmployeeForUser(req.user.id);
    if (!currentEmployee) return res.json([]);
    const descendantIds = await getDescendantIds(currentEmployee._id);
    const employees = await EmployeeModel.find({
      _id: { $in: descendantIds },
      clientCode: env.CLIENT_CODE,
      isActive: true
    }).select("employeeName emailOffice department").sort({ employeeName: 1 }).lean().exec();
    res.json(employees);
  } catch (error) {
    next(error);
  }
});
router24.post("/api/v1/rbac/tasks", ...AUTH, async (req, res, next) => {
  try {
    const data = taskCreateSchema.parse(req.body);
    const isSuperAdmin = req.user.role === "super_admin";
    const currentEmployee = await getEmployeeForUser(req.user.id);
    if (!currentEmployee && !isSuperAdmin) {
      throw new AppError(403, ERROR_CODES.FORBIDDEN, "No employee profile found.");
    }
    if (!isSuperAdmin && currentEmployee) {
      const descendantIds = await getDescendantIds(currentEmployee._id);
      const allowedAssigneeIds = descendantIds.map((id) => id.toString());
      if (!allowedAssigneeIds.includes(data.assignedTo)) {
        throw new AppError(403, ERROR_CODES.FORBIDDEN, "Tasks can only be assigned to sub-employees (downward only).");
      }
    }
    const assignedByEmpId = currentEmployee?._id ?? new import_mongoose62.default.Types.ObjectId();
    const task = await RbacTaskModel.create({
      clientCode: env.CLIENT_CODE,
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      assignedTo: new import_mongoose62.default.Types.ObjectId(data.assignedTo),
      assignedBy: assignedByEmpId,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      createdBy: req.user.id,
      updatedBy: req.user.id
    });
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
});
router24.put("/api/v1/rbac/tasks/:id", ...AUTH, async (req, res, next) => {
  try {
    const data = taskUpdateSchema.parse(req.body);
    const existing = await RbacTaskModel.findOne({
      _id: req.params.id,
      clientCode: env.CLIENT_CODE
    }).lean().exec();
    if (!existing) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Task not found.");
    const isSuperAdmin = req.user.role === "super_admin";
    if (!isSuperAdmin) {
      const currentEmployee = await getEmployeeForUser(req.user.id);
      if (!currentEmployee) throw new AppError(403, ERROR_CODES.FORBIDDEN, "No employee profile found.");
      const isAssigner = existing.assignedBy.toString() === currentEmployee._id.toString();
      const isAssignee = existing.assignedTo.toString() === currentEmployee._id.toString();
      if (!isAssigner && !isAssignee) {
        throw new AppError(403, ERROR_CODES.FORBIDDEN, "You can only update tasks you assigned or were assigned.");
      }
    }
    const updatePayload = {
      ...data,
      updatedBy: req.user.id
    };
    if (data.dueDate !== void 0) {
      updatePayload.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }
    const updated = await RbacTaskModel.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true }
    ).lean().exec();
    res.json(updated);
  } catch (error) {
    next(error);
  }
});
router24.delete("/api/v1/rbac/tasks/:id", ...AUTH, async (req, res, next) => {
  try {
    const existing = await RbacTaskModel.findOne({
      _id: req.params.id,
      clientCode: env.CLIENT_CODE
    }).lean().exec();
    if (!existing) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Task not found.");
    const isSuperAdmin = req.user.role === "super_admin";
    if (!isSuperAdmin) {
      const currentEmployee = await getEmployeeForUser(req.user.id);
      if (!currentEmployee) throw new AppError(403, ERROR_CODES.FORBIDDEN, "No employee profile found.");
      if (existing.assignedBy.toString() !== currentEmployee._id.toString()) {
        throw new AppError(403, ERROR_CODES.FORBIDDEN, "You can only delete tasks you created.");
      }
    }
    await RbacTaskModel.deleteOne({ _id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// src/modules/portfolio/portfolio-projects.routes.ts
var import_express_rate_limit19 = __toESM(require("express-rate-limit"), 1);
var import_express26 = require("express");
var import_mongoose64 = __toESM(require("mongoose"), 1);
var import_zod26 = require("zod");

// src/modules/portfolio/portfolio-projects.models.ts
var import_mongoose63 = __toESM(require("mongoose"), 1);
var portfolioProjectSchema = new import_mongoose63.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    metric: { type: String, default: "", trim: true },
    year: { type: String, default: "", trim: true },
    image: { type: String, default: "", trim: true },
    client: { type: String, default: "", trim: true },
    timeframe: { type: String, default: "", trim: true },
    role: { type: String, default: "", trim: true },
    stack: { type: [String], default: [] },
    techStack: { type: [String], default: [] },
    liveUrl: { type: String, trim: true },
    githubUrl: { type: String, trim: true },
    problem: { type: String, default: "" },
    solution: { type: String, default: "" },
    features: {
      type: [{ title: { type: String }, description: { type: String } }],
      default: []
    },
    gallery: {
      type: [{ src: { type: String }, caption: { type: String } }],
      default: []
    },
    roi: {
      type: [{
        value: { type: String, default: "" },
        label: { type: String, default: "" },
        description: { type: String, default: "" },
        icon: { type: String, default: "" }
      }],
      default: []
    },
    roiSectionDescription: { type: String, default: "" },
    screens: {
      type: [{
        label: { type: String, default: "" },
        caption: { type: String, default: "" },
        description: { type: String, default: "" },
        image: { type: String, default: "" }
      }],
      default: []
    },
    workflowSteps: {
      type: [{
        step: { type: String, default: "" },
        title: { type: String, default: "" },
        description: { type: String, default: "" }
      }],
      default: []
    },
    stackSectionDescription: { type: String, default: "" },
    codeSnippet: {
      type: {
        language: { type: String },
        label: { type: String },
        code: { type: String }
      },
      default: void 0
    },
    architecture: { type: String, default: "" },
    isActive: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0, index: true }
  },
  { timestamps: true }
);
portfolioProjectSchema.index({ isActive: 1, order: 1 });
var PortfolioProjectModel = import_mongoose63.default.models.PortfolioProject ?? import_mongoose63.default.model("PortfolioProject", portfolioProjectSchema);

// src/modules/portfolio/portfolio-projects.routes.ts
var router25 = (0, import_express26.Router)();
var writeRateLimiter = (0, import_express_rate_limit19.default)({ windowMs: 60 * 1e3, max: 60, standardHeaders: true, legacyHeaders: false });
var readRateLimiter = (0, import_express_rate_limit19.default)({ windowMs: 60 * 1e3, max: 120, standardHeaders: true, legacyHeaders: false });
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
var slugParamSchema = import_zod26.z.string().min(1).max(200).regex(/^[a-z0-9-]+$/);
function ensureValidObjectId18(id) {
  if (!import_mongoose64.default.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid id");
  }
}
var featureSchema = import_zod26.z.object({ title: import_zod26.z.string(), description: import_zod26.z.string() });
var gallerySchema = import_zod26.z.object({ src: import_zod26.z.string(), caption: import_zod26.z.string() });
var codeSnippetSchema = import_zod26.z.object({ language: import_zod26.z.string(), label: import_zod26.z.string(), code: import_zod26.z.string() });
var roiItemSchema = import_zod26.z.object({
  value: import_zod26.z.string().default(""),
  label: import_zod26.z.string().default(""),
  description: import_zod26.z.string().default(""),
  icon: import_zod26.z.string().default("")
});
var screenSchema = import_zod26.z.object({
  label: import_zod26.z.string().default(""),
  caption: import_zod26.z.string().default(""),
  description: import_zod26.z.string().default(""),
  image: import_zod26.z.string().default("")
});
var workflowStepSchema = import_zod26.z.object({
  step: import_zod26.z.string().default(""),
  title: import_zod26.z.string().default(""),
  description: import_zod26.z.string().default("")
});
var createProjectSchema2 = import_zod26.z.object({
  slug: import_zod26.z.string().min(1).max(200).trim().toLowerCase(),
  title: import_zod26.z.string().min(1).max(300).trim(),
  category: import_zod26.z.string().min(1).max(100).trim(),
  metric: import_zod26.z.string().max(200).default(""),
  year: import_zod26.z.string().max(20).default(""),
  image: import_zod26.z.string().max(2e3).default(""),
  client: import_zod26.z.string().max(300).default(""),
  timeframe: import_zod26.z.string().max(200).default(""),
  role: import_zod26.z.string().max(300).default(""),
  stack: import_zod26.z.array(import_zod26.z.string()).default([]),
  techStack: import_zod26.z.array(import_zod26.z.string()).default([]),
  liveUrl: import_zod26.z.string().url().max(2e3).optional().or(import_zod26.z.literal("")),
  githubUrl: import_zod26.z.string().url().max(2e3).optional().or(import_zod26.z.literal("")),
  problem: import_zod26.z.string().default(""),
  solution: import_zod26.z.string().default(""),
  features: import_zod26.z.array(featureSchema).default([]),
  gallery: import_zod26.z.array(gallerySchema).default([]),
  roi: import_zod26.z.array(roiItemSchema).default([]),
  roiSectionDescription: import_zod26.z.string().default(""),
  screens: import_zod26.z.array(screenSchema).default([]),
  workflowSteps: import_zod26.z.array(workflowStepSchema).default([]),
  stackSectionDescription: import_zod26.z.string().default(""),
  codeSnippet: codeSnippetSchema.nullish(),
  architecture: import_zod26.z.string().default(""),
  isActive: import_zod26.z.boolean().default(true),
  order: import_zod26.z.number().int().default(0)
});
var updateProjectSchema2 = createProjectSchema2.partial();
var listQuerySchema2 = import_zod26.z.object({
  page: import_zod26.z.coerce.number().int().min(1).default(1),
  limit: import_zod26.z.coerce.number().int().min(1).max(100).default(20)
});
var listByParamsQuerySchema = import_zod26.z.object({
  page: import_zod26.z.coerce.number().int().min(1).default(1),
  limit: import_zod26.z.coerce.number().int().min(1).max(100).default(20),
  category: import_zod26.z.string().max(100).optional(),
  year: import_zod26.z.string().max(20).optional(),
  client: import_zod26.z.string().max(300).optional(),
  stack: import_zod26.z.union([import_zod26.z.string(), import_zod26.z.array(import_zod26.z.string())]).optional().transform((v) => {
    if (!v) return void 0;
    return Array.isArray(v) ? v : [v];
  }),
  search: import_zod26.z.string().max(200).optional()
});
router25.get("/api/v1/public/portfolio/projects/listbyparams", readRateLimiter, async (req, res, next) => {
  try {
    const { page, limit, category, year, client, stack, search } = listByParamsQuerySchema.parse(req.query ?? {});
    const filter = { isActive: true };
    if (category) filter["category"] = category;
    if (year) filter["year"] = year;
    if (client) filter["client"] = client;
    if (stack && stack.length > 0) filter["stack"] = { $in: stack };
    if (search) {
      const safeSearch = escapeRegex(search);
      filter["$or"] = [
        { title: { $regex: safeSearch, $options: "i" } },
        { category: { $regex: safeSearch, $options: "i" } }
      ];
    }
    const skip = (page - 1) * limit;
    const [total, items] = await Promise.all([
      PortfolioProjectModel.countDocuments(filter).exec(),
      PortfolioProjectModel.find(filter).sort({ order: 1, createdAt: -1 }).skip(skip).limit(limit).lean().exec()
    ]);
    res.json({ items, page, limit, total });
  } catch (error) {
    next(error);
  }
});
router25.get("/api/v1/public/portfolio/projects", readRateLimiter, async (_req, res, next) => {
  try {
    const items = await PortfolioProjectModel.find({ isActive: true }).sort({ order: 1 }).limit(200).lean().exec();
    res.json({ items, total: items.length });
  } catch (error) {
    next(error);
  }
});
router25.get("/api/v1/public/portfolio/projects/:slug", readRateLimiter, async (req, res, next) => {
  try {
    const slug = slugParamSchema.parse(req.params.slug);
    const project = await PortfolioProjectModel.findOne({ slug, isActive: true }).lean().exec();
    if (!project) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Project not found");
    }
    res.json(project);
  } catch (error) {
    if (error instanceof import_zod26.z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid slug"));
      return;
    }
    next(error);
  }
});
router25.get("/api/v1/portfolio/projects", authenticateJwt, async (req, res, next) => {
  try {
    const { page, limit } = listQuerySchema2.parse(req.query ?? {});
    const skip = (page - 1) * limit;
    const [total, items] = await Promise.all([
      PortfolioProjectModel.countDocuments().exec(),
      PortfolioProjectModel.find().sort({ order: 1, createdAt: -1 }).skip(skip).limit(limit).lean().exec()
    ]);
    res.json({ items, page, limit, total });
  } catch (error) {
    next(error);
  }
});
router25.post("/api/v1/portfolio/projects", writeRateLimiter, authenticateJwt, async (req, res, next) => {
  try {
    const payload = createProjectSchema2.parse(req.body ?? {});
    const created = await PortfolioProjectModel.create(payload);
    res.status(201).json(created.toObject());
  } catch (error) {
    if (error instanceof import_zod26.z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid project payload"));
      return;
    }
    next(error);
  }
});
router25.get("/api/v1/portfolio/projects/:id", authenticateJwt, async (req, res, next) => {
  try {
    ensureValidObjectId18(req.params.id);
    const project = await PortfolioProjectModel.findById(req.params.id).lean().exec();
    if (!project) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Project not found");
    res.json(project);
  } catch (error) {
    next(error);
  }
});
router25.patch("/api/v1/portfolio/projects/:id", writeRateLimiter, authenticateJwt, async (req, res, next) => {
  try {
    ensureValidObjectId18(req.params.id);
    const payload = updateProjectSchema2.parse(req.body ?? {});
    const updated = await PortfolioProjectModel.findByIdAndUpdate(req.params.id, { $set: payload }, { new: true, runValidators: true }).lean().exec();
    if (!updated) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Project not found");
    res.json(updated);
  } catch (error) {
    if (error instanceof import_zod26.z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid project update payload"));
      return;
    }
    next(error);
  }
});
router25.delete("/api/v1/portfolio/projects/:id", writeRateLimiter, authenticateJwt, async (req, res, next) => {
  try {
    ensureValidObjectId18(req.params.id);
    const project = await PortfolioProjectModel.findById(req.params.id).exec();
    if (!project) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Project not found");
    await PortfolioProjectModel.deleteOne({ _id: project._id }).exec();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
var portfolioProjectsRoutes = router25;

// src/modules/portfolio/portfolio-team.routes.ts
var import_express_rate_limit20 = __toESM(require("express-rate-limit"), 1);
var import_express27 = require("express");
var import_mongoose66 = __toESM(require("mongoose"), 1);
var import_zod27 = require("zod");

// src/modules/portfolio/portfolio-team.models.ts
var import_mongoose65 = __toESM(require("mongoose"), 1);
var portfolioMemberSchema = new import_mongoose65.Schema(
  {
    id: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    avatar: { type: String, default: "", trim: true },
    glow: { type: String, default: "#ffffff", trim: true },
    accent: { type: String, default: "from-white to-gray-400", trim: true },
    power: { type: String, default: "", trim: true },
    bio: { type: String, default: "" },
    personal: {
      location: { type: String, default: "" },
      email: { type: String, default: "" },
      languages: { type: [String], default: [] }
    },
    skills: {
      type: [{ name: { type: String }, level: { type: Number, min: 0, max: 100 } }],
      default: []
    },
    education: {
      type: [{ year: { type: String }, degree: { type: String }, school: { type: String } }],
      default: []
    },
    experience: {
      type: [
        {
          period: { type: String },
          role: { type: String },
          company: { type: String },
          desc: { type: String }
        }
      ],
      default: []
    },
    projects: {
      type: [{ type: { type: String }, title: { type: String }, tags: { type: [String], default: [] } }],
      default: []
    },
    certificates: {
      type: [{ title: { type: String } }],
      default: []
    },
    socials: {
      github: { type: String, default: "" },
      linkedin: { type: String, default: "" },
      portfolio: { type: String, default: "" }
    },
    isActive: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0, index: true }
  },
  { timestamps: true }
);
portfolioMemberSchema.index({ isActive: 1, order: 1 });
var PortfolioMemberModel = import_mongoose65.default.models.PortfolioMember ?? import_mongoose65.default.model("PortfolioMember", portfolioMemberSchema);

// src/modules/portfolio/portfolio-team.routes.ts
var router26 = (0, import_express27.Router)();
var writeRateLimiter2 = (0, import_express_rate_limit20.default)({ windowMs: 60 * 1e3, max: 60, standardHeaders: true, legacyHeaders: false });
var readRateLimiter2 = (0, import_express_rate_limit20.default)({ windowMs: 60 * 1e3, max: 120, standardHeaders: true, legacyHeaders: false });
var slugParamSchema2 = import_zod27.z.string().min(1).max(200).regex(/^[a-z0-9-]+$/);
function ensureValidObjectId19(id) {
  if (!import_mongoose66.default.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid id");
  }
}
var skillSchema = import_zod27.z.object({ name: import_zod27.z.string(), level: import_zod27.z.number().min(0).max(100) });
var educationSchema = import_zod27.z.object({ year: import_zod27.z.string(), degree: import_zod27.z.string(), school: import_zod27.z.string() });
var experienceSchema = import_zod27.z.object({ period: import_zod27.z.string(), role: import_zod27.z.string(), company: import_zod27.z.string(), desc: import_zod27.z.string() });
var projectRefSchema = import_zod27.z.object({ type: import_zod27.z.string(), title: import_zod27.z.string(), tags: import_zod27.z.array(import_zod27.z.string()).default([]) });
var certificateSchema = import_zod27.z.object({ title: import_zod27.z.string() });
var urlOrEmpty = import_zod27.z.string().url().optional().or(import_zod27.z.literal(""));
var socialsSchema = import_zod27.z.object({
  github: urlOrEmpty,
  linkedin: urlOrEmpty,
  portfolio: urlOrEmpty
});
var createMemberSchema = import_zod27.z.object({
  id: import_zod27.z.string().min(1).max(50).trim(),
  slug: import_zod27.z.string().min(1).max(200).trim().toLowerCase(),
  name: import_zod27.z.string().min(1).max(200).trim(),
  role: import_zod27.z.string().min(1).max(200).trim(),
  avatar: import_zod27.z.string().max(2e3).default(""),
  glow: import_zod27.z.string().max(50).default("#ffffff"),
  accent: import_zod27.z.string().max(200).default("from-white to-gray-400"),
  power: import_zod27.z.string().max(500).default(""),
  bio: import_zod27.z.string().default(""),
  personal: import_zod27.z.object({
    location: import_zod27.z.string().default(""),
    email: import_zod27.z.string().default(""),
    languages: import_zod27.z.array(import_zod27.z.string()).default([])
  }).default({}),
  skills: import_zod27.z.array(skillSchema).default([]),
  education: import_zod27.z.array(educationSchema).default([]),
  experience: import_zod27.z.array(experienceSchema).default([]),
  projects: import_zod27.z.array(projectRefSchema).default([]),
  certificates: import_zod27.z.array(certificateSchema).default([]),
  socials: socialsSchema.default({}),
  isActive: import_zod27.z.boolean().default(true),
  order: import_zod27.z.number().int().default(0)
});
var updateMemberSchema = createMemberSchema.partial();
var listQuerySchema3 = import_zod27.z.object({
  page: import_zod27.z.coerce.number().int().min(1).default(1),
  limit: import_zod27.z.coerce.number().int().min(1).max(100).default(20)
});
router26.get("/api/v1/public/portfolio/team", readRateLimiter2, async (_req, res, next) => {
  try {
    const items = await PortfolioMemberModel.find({ isActive: true }).lean().exec();
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    res.json({ items, total: items.length });
  } catch (error) {
    next(error);
  }
});
router26.get("/api/v1/public/portfolio/team/:slug", readRateLimiter2, async (req, res, next) => {
  try {
    const slug = slugParamSchema2.parse(req.params.slug);
    const member = await PortfolioMemberModel.findOne({ slug, isActive: true }).lean().exec();
    if (!member) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Team member not found");
    }
    res.json(member);
  } catch (error) {
    if (error instanceof import_zod27.z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid slug"));
      return;
    }
    next(error);
  }
});
router26.get("/api/v1/portfolio/team", authenticateJwt, async (req, res, next) => {
  try {
    const { page, limit } = listQuerySchema3.parse(req.query ?? {});
    const skip = (page - 1) * limit;
    const [total, items] = await Promise.all([
      PortfolioMemberModel.countDocuments().exec(),
      PortfolioMemberModel.find().sort({ order: 1 }).skip(skip).limit(limit).lean().exec()
    ]);
    res.json({ items, page, limit, total });
  } catch (error) {
    next(error);
  }
});
router26.post("/api/v1/portfolio/team", writeRateLimiter2, authenticateJwt, async (req, res, next) => {
  try {
    const payload = createMemberSchema.parse(req.body ?? {});
    const created = await PortfolioMemberModel.create(payload);
    res.status(201).json(created.toObject());
  } catch (error) {
    if (error instanceof import_zod27.z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid team member payload"));
      return;
    }
    next(error);
  }
});
router26.get("/api/v1/portfolio/team/:id", authenticateJwt, async (req, res, next) => {
  try {
    ensureValidObjectId19(req.params.id);
    const member = await PortfolioMemberModel.findById(req.params.id).lean().exec();
    if (!member) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Team member not found");
    res.json(member);
  } catch (error) {
    next(error);
  }
});
router26.patch("/api/v1/portfolio/team/:id", writeRateLimiter2, authenticateJwt, async (req, res, next) => {
  try {
    ensureValidObjectId19(req.params.id);
    const payload = updateMemberSchema.parse(req.body ?? {});
    const updated = await PortfolioMemberModel.findByIdAndUpdate(req.params.id, { $set: payload }, { new: true, runValidators: true }).lean().exec();
    if (!updated) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Team member not found");
    res.json(updated);
  } catch (error) {
    if (error instanceof import_zod27.z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid team member update payload"));
      return;
    }
    next(error);
  }
});
router26.delete("/api/v1/portfolio/team/:id", writeRateLimiter2, authenticateJwt, async (req, res, next) => {
  try {
    ensureValidObjectId19(req.params.id);
    const member = await PortfolioMemberModel.findById(req.params.id).exec();
    if (!member) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Team member not found");
    await PortfolioMemberModel.deleteOne({ _id: member._id }).exec();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
var portfolioTeamRoutes = router26;

// src/modules/portfolio/portfolio-settings.routes.ts
var import_express_rate_limit21 = __toESM(require("express-rate-limit"), 1);
var import_express28 = require("express");
var import_zod28 = require("zod");

// src/modules/portfolio/portfolio-settings.models.ts
var import_mongoose67 = __toESM(require("mongoose"), 1);
var portfolioSettingsSchema = new import_mongoose67.Schema(
  {
    hero: {
      tagline: { type: String, default: "" },
      description: { type: String, default: "" },
      ctaPrimary: { label: { type: String, default: "View Work" }, href: { type: String, default: "/work" } },
      ctaSecondary: { label: { type: String, default: "Contact Us" }, href: { type: String, default: "/contact" } },
      featuredProjects: {
        type: [
          {
            title: { type: String },
            description: { type: String },
            href: { type: String },
            image: { type: String },
            eyebrow: { type: String }
          }
        ],
        default: []
      }
    },
    navbar: {
      brandName: { type: String, default: "FORGE_COLLECTIVE" },
      links: {
        type: [{ label: { type: String }, href: { type: String } }],
        default: []
      }
    },
    footer: {
      description: { type: String, default: "" },
      email: { type: String, default: "" },
      version: { type: String, default: "v1.0" },
      links: {
        type: [{ label: { type: String }, href: { type: String } }],
        default: []
      }
    },
    techMarquee: { type: [String], default: [] },
    services: { type: [String], default: [] },
    callSlots: { type: [String], default: [] },
    about: {
      vision: { type: String, default: "" },
      mission: { type: String, default: "" },
      values: {
        type: [{ icon: { type: String }, title: { type: String }, desc: { type: String } }],
        default: []
      },
      stats: {
        type: [{ label: { type: String }, value: { type: String } }],
        default: []
      }
    },
    process: {
      phases: {
        type: [
          {
            id: { type: String },
            n: { type: String },
            title: { type: String },
            description: { type: String },
            accent: { type: String },
            dot: { type: String }
          }
        ],
        default: []
      },
      perks: {
        type: [
          {
            title: { type: String },
            description: { type: String },
            icon: { type: String },
            gradient: { type: String },
            border: { type: String }
          }
        ],
        default: []
      }
    },
    teamPlaybook: {
      type: [{ phase: { type: String }, name: { type: String }, body: { type: String } }],
      default: []
    },
    contactInfo: {
      email: { type: String, default: "" },
      phone: { type: String, default: "" }
    },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);
var PortfolioSettingsModel = import_mongoose67.default.models.PortfolioSettings ?? import_mongoose67.default.model("PortfolioSettings", portfolioSettingsSchema);

// src/modules/portfolio/portfolio-settings.routes.ts
var router27 = (0, import_express28.Router)();
var writeRateLimiter3 = (0, import_express_rate_limit21.default)({ windowMs: 60 * 1e3, max: 30, standardHeaders: true, legacyHeaders: false });
var linkSchema = import_zod28.z.object({ label: import_zod28.z.string(), href: import_zod28.z.string() });
var featuredProjectSchema = import_zod28.z.object({
  title: import_zod28.z.string(),
  description: import_zod28.z.string(),
  href: import_zod28.z.string(),
  image: import_zod28.z.string(),
  eyebrow: import_zod28.z.string()
});
var valueSchema = import_zod28.z.object({ icon: import_zod28.z.string(), title: import_zod28.z.string(), desc: import_zod28.z.string() });
var statSchema = import_zod28.z.object({ label: import_zod28.z.string(), value: import_zod28.z.string() });
var phaseSchema = import_zod28.z.object({ id: import_zod28.z.string(), n: import_zod28.z.string(), title: import_zod28.z.string(), description: import_zod28.z.string(), accent: import_zod28.z.string(), dot: import_zod28.z.string() });
var perkSchema = import_zod28.z.object({ title: import_zod28.z.string(), description: import_zod28.z.string(), icon: import_zod28.z.string(), gradient: import_zod28.z.string(), border: import_zod28.z.string() });
var playbookSchema = import_zod28.z.object({ phase: import_zod28.z.string(), name: import_zod28.z.string(), body: import_zod28.z.string() });
var settingsSchema = import_zod28.z.object({
  hero: import_zod28.z.object({
    tagline: import_zod28.z.string().default(""),
    description: import_zod28.z.string().default(""),
    ctaPrimary: import_zod28.z.object({ label: import_zod28.z.string(), href: import_zod28.z.string() }).default({ label: "View Work", href: "/work" }),
    ctaSecondary: import_zod28.z.object({ label: import_zod28.z.string(), href: import_zod28.z.string() }).default({ label: "Contact Us", href: "/contact" }),
    featuredProjects: import_zod28.z.array(featuredProjectSchema).default([])
  }).default({}),
  navbar: import_zod28.z.object({
    brandName: import_zod28.z.string().default("FORGE_COLLECTIVE"),
    links: import_zod28.z.array(linkSchema).default([])
  }).default({}),
  footer: import_zod28.z.object({
    description: import_zod28.z.string().default(""),
    email: import_zod28.z.string().default(""),
    version: import_zod28.z.string().default("v1.0"),
    links: import_zod28.z.array(linkSchema).default([])
  }).default({}),
  techMarquee: import_zod28.z.array(import_zod28.z.string()).default([]),
  services: import_zod28.z.array(import_zod28.z.string()).default([]),
  callSlots: import_zod28.z.array(import_zod28.z.string()).default([]),
  about: import_zod28.z.object({
    vision: import_zod28.z.string().default(""),
    mission: import_zod28.z.string().default(""),
    values: import_zod28.z.array(valueSchema).default([]),
    stats: import_zod28.z.array(statSchema).default([])
  }).default({}),
  process: import_zod28.z.object({
    phases: import_zod28.z.array(phaseSchema).default([]),
    perks: import_zod28.z.array(perkSchema).default([])
  }).default({}),
  teamPlaybook: import_zod28.z.array(playbookSchema).default([]),
  contactInfo: import_zod28.z.object({
    email: import_zod28.z.string().default(""),
    phone: import_zod28.z.string().default("")
  }).default({}),
  isActive: import_zod28.z.boolean().default(true)
});
router27.get("/api/v1/public/portfolio/settings", async (_req, res, next) => {
  try {
    const settings = await PortfolioSettingsModel.findOne({ isActive: true }).lean().exec();
    res.json(settings ?? {});
  } catch (error) {
    next(error);
  }
});
router27.get("/api/v1/portfolio/settings", authenticateJwt, async (_req, res, next) => {
  try {
    const settings = await PortfolioSettingsModel.findOne().lean().exec();
    res.json(settings ?? {});
  } catch (error) {
    next(error);
  }
});
router27.put("/api/v1/portfolio/settings", writeRateLimiter3, authenticateJwt, async (req, res, next) => {
  try {
    const payload = settingsSchema.parse(req.body ?? {});
    const updated = await PortfolioSettingsModel.findOneAndUpdate({}, { $set: payload }, { new: true, upsert: true, runValidators: true }).lean().exec();
    res.json(updated);
  } catch (error) {
    if (error instanceof import_zod28.z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid settings payload"));
      return;
    }
    next(error);
  }
});
var portfolioSettingsRoutes = router27;

// src/modules/portfolio/portfolio-contacts.routes.ts
var import_express_rate_limit22 = __toESM(require("express-rate-limit"), 1);
var import_express29 = require("express");
var import_mongoose69 = __toESM(require("mongoose"), 1);
var import_zod29 = require("zod");

// src/modules/portfolio/portfolio-contacts.models.ts
var import_mongoose68 = __toESM(require("mongoose"), 1);
var portfolioContactSchema = new import_mongoose68.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 300 },
    service: { type: String, default: "", trim: true },
    callSlot: { type: String, default: "", trim: true },
    message: { type: String, required: true, maxlength: 5e3 },
    status: {
      type: String,
      enum: ["new", "read", "replied"],
      default: "new",
      index: true
    }
  },
  { timestamps: true }
);
portfolioContactSchema.index({ status: 1, createdAt: -1 });
var PortfolioContactModel = import_mongoose68.default.models.PortfolioContact ?? import_mongoose68.default.model("PortfolioContact", portfolioContactSchema);

// src/modules/portfolio/portfolio-contacts.routes.ts
var router28 = (0, import_express29.Router)();
var submitRateLimiter = (0, import_express_rate_limit22.default)({ windowMs: 60 * 1e3, max: 5, standardHeaders: true, legacyHeaders: false });
function ensureValidObjectId20(id) {
  if (!import_mongoose69.default.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid id");
  }
}
var submitContactSchema = import_zod29.z.object({
  name: import_zod29.z.string().min(1).max(200).trim(),
  email: import_zod29.z.string().email().max(300).trim().toLowerCase(),
  service: import_zod29.z.string().max(200).default(""),
  callSlot: import_zod29.z.string().max(200).default(""),
  message: import_zod29.z.string().min(1).max(5e3).trim()
});
var listQuerySchema4 = import_zod29.z.object({
  page: import_zod29.z.coerce.number().int().min(1).default(1),
  limit: import_zod29.z.coerce.number().int().min(1).max(100).default(20),
  status: import_zod29.z.enum(["new", "read", "replied"]).optional()
});
router28.post("/api/v1/public/portfolio/contact", submitRateLimiter, async (req, res, next) => {
  try {
    const payload = submitContactSchema.parse(req.body ?? {});
    const contact = await PortfolioContactModel.create(payload);
    res.status(201).json({ message: "Message received. We'll get back to you within 12 hours.", id: contact._id });
  } catch (error) {
    if (error instanceof import_zod29.z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid contact form data"));
      return;
    }
    next(error);
  }
});
router28.get("/api/v1/portfolio/contacts", authenticateJwt, async (req, res, next) => {
  try {
    const { page, limit, status } = listQuerySchema4.parse(req.query ?? {});
    const skip = (page - 1) * limit;
    const filter = {};
    if (status) filter.status = status;
    const [total, items] = await Promise.all([
      PortfolioContactModel.countDocuments(filter).exec(),
      PortfolioContactModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec()
    ]);
    res.json({ items, page, limit, total });
  } catch (error) {
    next(error);
  }
});
router28.patch("/api/v1/portfolio/contacts/:id/status", authenticateJwt, async (req, res, next) => {
  try {
    ensureValidObjectId20(req.params.id);
    const { status } = import_zod29.z.object({ status: import_zod29.z.enum(["new", "read", "replied"]) }).parse(req.body ?? {});
    const updated = await PortfolioContactModel.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true }).lean().exec();
    if (!updated) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Contact not found");
    res.json(updated);
  } catch (error) {
    if (error instanceof import_zod29.z.ZodError) {
      next(new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid status value"));
      return;
    }
    next(error);
  }
});
var portfolioContactsRoutes = router28;

// src/modules/portfolio/portfolio-masters.routes.ts
var import_node_fs4 = __toESM(require("node:fs"), 1);
var import_node_path4 = __toESM(require("node:path"), 1);
var import_express_rate_limit23 = __toESM(require("express-rate-limit"), 1);
var import_express30 = require("express");
var import_mongoose71 = __toESM(require("mongoose"), 1);
var import_multer2 = __toESM(require("multer"), 1);
var import_blob = require("@vercel/blob");
var import_zod30 = require("zod");

// src/modules/portfolio/portfolio-masters.models.ts
var import_mongoose70 = __toESM(require("mongoose"), 1);
var techStackSchema = new import_mongoose70.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    image: { type: String, default: "" },
    description: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 }
  },
  { timestamps: true }
);
var TechStackModel = import_mongoose70.default.models.PortfolioTechStack ?? import_mongoose70.default.model("PortfolioTechStack", techStackSchema);
var categorySchema = new import_mongoose70.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 }
  },
  { timestamps: true }
);
var CategoryModel = import_mongoose70.default.models.PortfolioCategory ?? import_mongoose70.default.model("PortfolioCategory", categorySchema);
var yearSchema = new import_mongoose70.Schema(
  {
    year: { type: String, required: true, trim: true, unique: true },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 }
  },
  { timestamps: true }
);
var YearModel = import_mongoose70.default.models.PortfolioYear ?? import_mongoose70.default.model("PortfolioYear", yearSchema);
var clientSchema = new import_mongoose70.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 }
  },
  { timestamps: true }
);
var ClientModel = import_mongoose70.default.models.PortfolioClient ?? import_mongoose70.default.model("PortfolioClient", clientSchema);

// src/modules/portfolio/portfolio-masters.routes.ts
var router29 = (0, import_express30.Router)();
var writeRateLimiter4 = (0, import_express_rate_limit23.default)({ windowMs: 6e4, max: 60, standardHeaders: true, legacyHeaders: false });
var uploadDir = import_node_path4.default.isAbsolute(env.FILE_UPLOAD_DIR) ? import_node_path4.default.join(env.FILE_UPLOAD_DIR, "portfolio") : import_node_path4.default.join(process.cwd(), env.FILE_UPLOAD_DIR, "portfolio");
var useBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
if (!useBlob) {
  try {
    import_node_fs4.default.mkdirSync(uploadDir, { recursive: true });
  } catch {
  }
}
var ALLOWED_IMAGE_MIMES = /* @__PURE__ */ new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]);
var upload2 = (0, import_multer2.default)({
  storage: import_multer2.default.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_MIMES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(400, ERROR_CODES.BAD_REQUEST, "Only image files are allowed"), false);
    }
  }
});
router29.post(
  "/api/v1/portfolio/upload/image",
  writeRateLimiter4,
  authenticateJwt,
  upload2.single("image"),
  async (req, res, next) => {
    try {
      if (!req.file) throw new AppError(400, ERROR_CODES.BAD_REQUEST, "No image uploaded");
      const ext = import_node_path4.default.extname(req.file.originalname).toLowerCase() || ".bin";
      const baseName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
      if (useBlob) {
        const blob = await (0, import_blob.put)(`portfolio/${baseName}`, req.file.buffer, {
          access: "public",
          contentType: req.file.mimetype
        });
        res.json({ url: blob.url });
        return;
      }
      const diskPath = import_node_path4.default.join(uploadDir, baseName);
      import_node_fs4.default.writeFileSync(diskPath, req.file.buffer);
      res.json({ url: `/uploads/portfolio/${baseName}` });
    } catch (error) {
      next(error);
    }
  }
);
function ensureObjectId(id) {
  if (!import_mongoose71.default.Types.ObjectId.isValid(id)) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, "Invalid id");
  }
}
var techStackWriteSchema = import_zod30.z.object({
  name: import_zod30.z.string().min(1).max(100).trim(),
  image: import_zod30.z.string().max(2e3).default(""),
  description: import_zod30.z.string().max(500).default(""),
  isActive: import_zod30.z.boolean().default(true),
  order: import_zod30.z.number().int().default(0)
});
router29.get("/api/v1/public/portfolio/tech-stacks", async (_req, res, next) => {
  try {
    const items = await TechStackModel.find({ isActive: true }).sort({ order: 1, name: 1 }).lean().exec();
    res.json({ items });
  } catch (error) {
    next(error);
  }
});
router29.get("/api/v1/portfolio/tech-stacks", authenticateJwt, async (_req, res, next) => {
  try {
    const items = await TechStackModel.find().sort({ order: 1, name: 1 }).lean().exec();
    res.json({ items });
  } catch (error) {
    next(error);
  }
});
router29.post("/api/v1/portfolio/tech-stacks", writeRateLimiter4, authenticateJwt, async (req, res, next) => {
  try {
    const payload = techStackWriteSchema.parse(req.body ?? {});
    const created = await TechStackModel.create(payload);
    res.status(201).json(created.toObject());
  } catch (error) {
    next(error);
  }
});
router29.patch("/api/v1/portfolio/tech-stacks/:id", writeRateLimiter4, authenticateJwt, async (req, res, next) => {
  try {
    ensureObjectId(req.params.id);
    const payload = techStackWriteSchema.partial().parse(req.body ?? {});
    const updated = await TechStackModel.findByIdAndUpdate(req.params.id, { $set: payload }, { new: true }).lean().exec();
    if (!updated) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Tech stack not found");
    res.json(updated);
  } catch (error) {
    next(error);
  }
});
router29.delete("/api/v1/portfolio/tech-stacks/:id", writeRateLimiter4, authenticateJwt, async (req, res, next) => {
  try {
    ensureObjectId(req.params.id);
    const item = await TechStackModel.findByIdAndDelete(req.params.id).exec();
    if (!item) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Tech stack not found");
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
var categoryWriteSchema = import_zod30.z.object({
  name: import_zod30.z.string().min(1).max(100).trim(),
  isActive: import_zod30.z.boolean().default(true),
  order: import_zod30.z.number().int().default(0)
});
router29.get("/api/v1/public/portfolio/categories", async (_req, res, next) => {
  try {
    const items = await CategoryModel.find({ isActive: true }).sort({ order: 1, name: 1 }).lean().exec();
    res.json({ items });
  } catch (error) {
    next(error);
  }
});
router29.get("/api/v1/portfolio/categories", authenticateJwt, async (_req, res, next) => {
  try {
    const items = await CategoryModel.find().sort({ order: 1, name: 1 }).lean().exec();
    res.json({ items });
  } catch (error) {
    next(error);
  }
});
router29.post("/api/v1/portfolio/categories", writeRateLimiter4, authenticateJwt, async (req, res, next) => {
  try {
    const payload = categoryWriteSchema.parse(req.body ?? {});
    const created = await CategoryModel.create(payload);
    res.status(201).json(created.toObject());
  } catch (error) {
    next(error);
  }
});
router29.patch("/api/v1/portfolio/categories/:id", writeRateLimiter4, authenticateJwt, async (req, res, next) => {
  try {
    ensureObjectId(req.params.id);
    const payload = categoryWriteSchema.partial().parse(req.body ?? {});
    const updated = await CategoryModel.findByIdAndUpdate(req.params.id, { $set: payload }, { new: true }).lean().exec();
    if (!updated) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Category not found");
    res.json(updated);
  } catch (error) {
    next(error);
  }
});
router29.delete("/api/v1/portfolio/categories/:id", writeRateLimiter4, authenticateJwt, async (req, res, next) => {
  try {
    ensureObjectId(req.params.id);
    const item = await CategoryModel.findByIdAndDelete(req.params.id).exec();
    if (!item) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Category not found");
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
var yearWriteSchema = import_zod30.z.object({
  year: import_zod30.z.string().min(1).max(10).trim(),
  isActive: import_zod30.z.boolean().default(true),
  order: import_zod30.z.number().int().default(0)
});
router29.get("/api/v1/public/portfolio/years", async (_req, res, next) => {
  try {
    const items = await YearModel.find({ isActive: true }).sort({ order: 1, year: -1 }).lean().exec();
    res.json({ items });
  } catch (error) {
    next(error);
  }
});
router29.get("/api/v1/portfolio/years", authenticateJwt, async (_req, res, next) => {
  try {
    const items = await YearModel.find().sort({ order: 1, year: -1 }).lean().exec();
    res.json({ items });
  } catch (error) {
    next(error);
  }
});
router29.post("/api/v1/portfolio/years", writeRateLimiter4, authenticateJwt, async (req, res, next) => {
  try {
    const payload = yearWriteSchema.parse(req.body ?? {});
    const created = await YearModel.create(payload);
    res.status(201).json(created.toObject());
  } catch (error) {
    next(error);
  }
});
router29.patch("/api/v1/portfolio/years/:id", writeRateLimiter4, authenticateJwt, async (req, res, next) => {
  try {
    ensureObjectId(req.params.id);
    const payload = yearWriteSchema.partial().parse(req.body ?? {});
    const updated = await YearModel.findByIdAndUpdate(req.params.id, { $set: payload }, { new: true }).lean().exec();
    if (!updated) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Year not found");
    res.json(updated);
  } catch (error) {
    next(error);
  }
});
router29.delete("/api/v1/portfolio/years/:id", writeRateLimiter4, authenticateJwt, async (req, res, next) => {
  try {
    ensureObjectId(req.params.id);
    const item = await YearModel.findByIdAndDelete(req.params.id).exec();
    if (!item) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Year not found");
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
var clientWriteSchema = import_zod30.z.object({
  name: import_zod30.z.string().min(1).max(200).trim(),
  isActive: import_zod30.z.boolean().default(true),
  order: import_zod30.z.number().int().default(0)
});
router29.get("/api/v1/public/portfolio/clients", async (_req, res, next) => {
  try {
    const items = await ClientModel.find({ isActive: true }).sort({ order: 1, name: 1 }).lean().exec();
    res.json({ items });
  } catch (error) {
    next(error);
  }
});
router29.get("/api/v1/portfolio/clients", authenticateJwt, async (_req, res, next) => {
  try {
    const items = await ClientModel.find().sort({ order: 1, name: 1 }).lean().exec();
    res.json({ items });
  } catch (error) {
    next(error);
  }
});
router29.post("/api/v1/portfolio/clients", writeRateLimiter4, authenticateJwt, async (req, res, next) => {
  try {
    const payload = clientWriteSchema.parse(req.body ?? {});
    const created = await ClientModel.create(payload);
    res.status(201).json(created.toObject());
  } catch (error) {
    next(error);
  }
});
router29.patch("/api/v1/portfolio/clients/:id", writeRateLimiter4, authenticateJwt, async (req, res, next) => {
  try {
    ensureObjectId(req.params.id);
    const payload = clientWriteSchema.partial().parse(req.body ?? {});
    const updated = await ClientModel.findByIdAndUpdate(req.params.id, { $set: payload }, { new: true }).lean().exec();
    if (!updated) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Client not found");
    res.json(updated);
  } catch (error) {
    next(error);
  }
});
router29.delete("/api/v1/portfolio/clients/:id", writeRateLimiter4, authenticateJwt, async (req, res, next) => {
  try {
    ensureObjectId(req.params.id);
    const item = await ClientModel.findByIdAndDelete(req.params.id).exec();
    if (!item) throw new AppError(404, ERROR_CODES.NOT_FOUND, "Client not found");
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
var portfolioMastersRoutes = router29;

// src/app.ts
async function createApp() {
  const app = (0, import_express31.default)();
  const allowedOrigins = env.CORS_ORIGINS.split(",").map((item) => item.trim());
  let trustProxyValue = false;
  if (env.TRUST_PROXY === "true") {
    trustProxyValue = true;
  } else if (env.TRUST_PROXY === "false") {
    trustProxyValue = false;
  } else {
    const parsedValue = Number.parseInt(env.TRUST_PROXY, 10);
    trustProxyValue = Number.isNaN(parsedValue) ? false : parsedValue;
  }
  app.set("trust proxy", trustProxyValue);
  app.use(requestId);
  app.use(requestLogger);
  app.use((0, import_helmet.default)({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    (0, import_cors.default)({
      origin: allowedOrigins.length > 0 ? allowedOrigins : true,
      credentials: true
    })
  );
  app.use("/uploads", import_express31.default.static(import_node_path5.default.join(process.cwd(), env.FILE_UPLOAD_DIR)));
  app.use(paymentWebhookRoutes);
  app.use(whatsappWebhookRoutes);
  app.use(import_express31.default.json({ limit: "256kb" }));
  await mountSwagger(app);
  app.use(healthRoutes);
  app.use(authRoutes);
  app.use(systemRoutes);
  app.use(menuRoutes);
  app.use(ecommerceRoutes);
  app.use(paymentRoutes);
  app.use(crmRoutes);
  app.use(invoiceRoutes);
  app.use(apiManagementRoutes);
  app.use(supportTicketRoutes);
  app.use(fileManagerRoutes);
  app.use(chatRoutes);
  app.use(mailboxRoutes);
  app.use(projectRoutes);
  app.use(taskRoutes);
  app.use(calendarRoutes);
  app.use(todoRoutes);
  app.use(jobRoutes);
  app.use(campaignRoutes);
  app.use(bulkMessagingRoutes);
  app.use(templateRoutes);
  app.use(triggerRoutes);
  app.use(inboxRoutes);
  app.use(router24);
  app.use(portfolioProjectsRoutes);
  app.use(portfolioTeamRoutes);
  app.use(portfolioSettingsRoutes);
  app.use(portfolioContactsRoutes);
  app.use(portfolioMastersRoutes);
  registerModuleRoutes(app, moduleManifests);
  app.use(errorHandler);
  return app;
}

// src/config/db.ts
var import_mongoose72 = __toESM(require("mongoose"), 1);
var globalCache = globalThis;
if (!globalCache.__mongooseCache) {
  globalCache.__mongooseCache = { connection: null, promise: null };
}
async function connectDatabase() {
  const cache = globalCache.__mongooseCache;
  if (cache.connection) {
    return;
  }
  if (!cache.promise) {
    import_mongoose72.default.connection.on("error", (err) => {
      logger.error("MongoDB connection error", { error: err });
    });
    import_mongoose72.default.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected");
      cache.connection = null;
    });
    import_mongoose72.default.connection.on("reconnected", () => {
      logger.info("MongoDB reconnected");
    });
    cache.promise = import_mongoose72.default.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 8e3,
      socketTimeoutMS: 45e3
    }).catch((err) => {
      cache.promise = null;
      throw err;
    });
  }
  cache.connection = await cache.promise;
}

// src/modules/menu/menu.seed.ts
var SEED_MENU_GROUPS = [
  {
    name: "Modules",
    slug: "modules",
    order: 0,
    isLink: false,
    icon: "grid",
    menus: [
      { name: "Calendar", slug: "calendar", route: "/calendar", icon: "calendar" },
      { name: "Chat", slug: "chat", route: "/chat", icon: "chat" },
      { name: "Mailbox", slug: "mailbox", route: "/mailbox", icon: "mail" },
      {
        name: "eCommerce",
        slug: "ecommerce",
        route: "/ecommerce",
        icon: "shopping-cart",
        isParent: true,
        children: [
          { name: "Products", slug: "ecommerce-products", route: "/ecommerce/products", icon: "" },
          { name: "Orders", slug: "ecommerce-orders", route: "/ecommerce/orders", icon: "" }
        ]
      },
      { name: "Projects", slug: "projects", route: "/projects", icon: "folder" },
      { name: "Tasks", slug: "tasks", route: "/tasks", icon: "check-square" },
      {
        name: "CRM",
        slug: "crm",
        route: "/crm",
        icon: "users",
        isParent: true,
        children: [
          { name: "Contacts", slug: "crm-contacts", route: "/crm/contacts", icon: "" },
          { name: "Deals", slug: "crm-deals", route: "/crm/deals", icon: "" },
          { name: "Pipelines", slug: "crm-pipelines", route: "/crm/pipelines", icon: "" }
        ]
      },
      { name: "Invoices", slug: "invoices", route: "/invoices", icon: "file-text" },
      { name: "Support Tickets", slug: "support-tickets", route: "/support-tickets", icon: "headphones" },
      { name: "File Manager", slug: "file-manager", route: "/file-manager", icon: "hard-drive" },
      { name: "ToDo", slug: "todo", route: "/todo", icon: "list" },
      {
        name: "Job",
        slug: "job",
        route: "/job",
        icon: "briefcase",
        isParent: true,
        children: [
          { name: "Job Postings", slug: "job-postings", route: "/job/postings", icon: "" },
          { name: "Applications", slug: "job-applications", route: "/job/applications", icon: "" }
        ]
      },
      { name: "API Management", slug: "api-management", route: "/api-management", icon: "code" }
    ]
  },
  {
    name: "Charts",
    slug: "charts",
    order: 1,
    isLink: false,
    icon: "bar-chart",
    menus: [
      { name: "Apex Charts", slug: "apex-charts", route: "/charts/apex", icon: "" },
      { name: "Chart.js", slug: "chartjs", route: "/charts/chartjs", icon: "" }
    ]
  },
  {
    name: "Forms",
    slug: "forms",
    order: 2,
    isLink: false,
    icon: "edit",
    menus: [
      { name: "Basic Elements", slug: "forms-basic", route: "/forms/basic", icon: "" },
      { name: "Advanced Elements", slug: "forms-advanced", route: "/forms/advanced", icon: "" },
      { name: "Validation", slug: "forms-validation", route: "/forms/validation", icon: "" },
      { name: "Rich Editor", slug: "forms-editor", route: "/forms/editor", icon: "" }
    ]
  },
  {
    name: "Maps",
    slug: "maps",
    order: 3,
    isLink: false,
    icon: "map",
    menus: [
      { name: "Google Maps", slug: "google-maps", route: "/maps/google", icon: "" },
      { name: "Vector Maps", slug: "vector-maps", route: "/maps/vector", icon: "" }
    ]
  },
  {
    name: "Pages",
    slug: "pages",
    order: 4,
    isLink: false,
    icon: "file",
    menus: [
      { name: "Profile", slug: "profile", route: "/pages/profile", icon: "" },
      { name: "Timeline", slug: "timeline", route: "/pages/timeline", icon: "" },
      { name: "Gallery", slug: "gallery", route: "/pages/gallery", icon: "" },
      { name: "Search Results", slug: "search-results", route: "/pages/search", icon: "" }
    ]
  },
  {
    name: "UI Components",
    slug: "ui-components",
    order: 5,
    isLink: false,
    icon: "layers",
    menus: [
      { name: "Alerts", slug: "ui-alerts", route: "/ui/alerts", icon: "" },
      { name: "Badges", slug: "ui-badges", route: "/ui/badges", icon: "" },
      { name: "Buttons", slug: "ui-buttons", route: "/ui/buttons", icon: "" },
      { name: "Cards", slug: "ui-cards", route: "/ui/cards", icon: "" },
      { name: "Modals", slug: "ui-modals", route: "/ui/modals", icon: "" },
      { name: "Advanced UI", slug: "ui-advanced", route: "/ui/advanced", icon: "" }
    ]
  }
];
async function seedMenuItems(groupId, items, clientCode, userId, parentId = null) {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const doc = await MenuItemModel.create({
      clientCode,
      groupId,
      name: item.name,
      slug: item.slug,
      route: item.route,
      icon: item.icon,
      parentId,
      order: i,
      isParent: item.isParent ?? false,
      createdBy: userId,
      updatedBy: userId
    });
    if (item.children && item.children.length > 0) {
      await seedMenuItems(groupId, item.children, clientCode, userId, String(doc._id));
    }
  }
}
async function seedMenusIfEmpty(userId = "system") {
  const clientCode = env.CLIENT_CODE;
  const existingCount = await MenuGroupModel.countDocuments({ clientCode }).exec();
  if (existingCount > 0) {
    return false;
  }
  for (const group of SEED_MENU_GROUPS) {
    const groupDoc = await MenuGroupModel.create({
      clientCode,
      name: group.name,
      slug: group.slug,
      order: group.order,
      isLink: group.isLink,
      route: group.route,
      icon: group.icon,
      createdBy: userId,
      updatedBy: userId
    });
    if (group.menus.length > 0) {
      await seedMenuItems(String(groupDoc._id), group.menus, clientCode, userId);
    }
  }
  return true;
}

// api-src/entry.ts
var globalState = globalThis;
if (!globalState.__serverState) {
  globalState.__serverState = { appPromise: null };
}
async function getApp() {
  const state = globalState.__serverState;
  if (!state.appPromise) {
    state.appPromise = (async () => {
      await connectDatabase();
      try {
        await seedMenusIfEmpty();
      } catch (err) {
        logger.warn("Menu seed skipped on cold start", { error: err });
      }
      return await createApp();
    })().catch((err) => {
      state.appPromise = null;
      throw err;
    });
  }
  return state.appPromise;
}
async function handler(req, res) {
  const app = await getApp();
  return app(req, res);
}
var config = {
  api: {
    bodyParser: false
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  config
});
