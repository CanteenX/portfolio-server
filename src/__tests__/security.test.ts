import assert from "node:assert/strict";
import { describe, it } from "node:test";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.PORT = "7002";
process.env.MONGO_URI = "mongodb://127.0.0.1:27017/admin_platform_test";
process.env.JWT_SECRET_SUPER_ADMIN = "test_super_secret_123";
process.env.JWT_SECRET_ADMIN = "test_admin_secret_123";
process.env.JWT_EXPIRES_IN = "1d";
process.env.CLIENT_CODE = "test-client";
process.env.CORS_ORIGINS = "http://localhost:3000";
process.env.TRUST_PROXY = "1";
process.env.ENABLE_SEED = "false";

const { createApp } = await import("../app");
const app = await createApp();

describe("security baseline", () => {
  it("returns health response without auth", async () => {
    const response = await request(app).get("/api/v1/system/health");
    // No MongoDB connection in unit tests → 503 degraded is expected
    assert.equal(response.status, 503);
    assert.equal(response.body.status, "degraded");
    assert.equal(response.body.mongo, "disconnected");
    assert.ok(response.body.timestamp);
    assert.ok(typeof response.body.uptime === "number");
  });

  it("blocks protected module route without token", async () => {
    const response = await request(app).get("/api/v1/crm/items");
    assert.equal(response.status, 401);
    assert.equal(response.body.code, "UNAUTHORIZED");
  });

  it("blocks feature config update without token", async () => {
    const response = await request(app).put("/api/v1/system/feature-config").send({
      enabledModules: ["crm"]
    });
    assert.equal(response.status, 401);
    assert.equal(response.body.code, "UNAUTHORIZED");
  });
});
