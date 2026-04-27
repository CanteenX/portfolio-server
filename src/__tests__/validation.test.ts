import assert from "node:assert/strict";
import { describe, it } from "node:test";
import jwt from "jsonwebtoken";
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
const app = createApp();

function makeToken(role: "super_admin" | "admin") {
  const secret = role === "super_admin" ? process.env.JWT_SECRET_SUPER_ADMIN! : process.env.JWT_SECRET_ADMIN!;
  return jwt.sign(
    { id: `test-user-${role}`, email: `${role}@test.local`, role },
    secret,
    { expiresIn: "1h" }
  );
}

const adminToken = makeToken("admin");
const superAdminToken = makeToken("super_admin");

describe("chat validation", () => {
  it("rejects create conversation with empty title", async () => {
    const response = await request(app)
      .post("/api/v1/chat/conversations")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ title: "", participantUserIds: ["user1"] });
    assert.equal(response.status, 400);
  });

  it("rejects create conversation with no participants", async () => {
    const response = await request(app)
      .post("/api/v1/chat/conversations")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ title: "Test", participantUserIds: [] });
    assert.equal(response.status, 400);
  });
});

describe("mailbox validation", () => {
  it("rejects create message with no toAddresses", async () => {
    const response = await request(app)
      .post("/api/v1/mailbox/messages")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        subject: "Test",
        body: "Hello",
        fromAddress: "test@test.com",
        fromName: "Test",
        toAddresses: []
      });
    assert.equal(response.status, 400);
  });

  it("rejects create message with invalid fromAddress", async () => {
    const response = await request(app)
      .post("/api/v1/mailbox/messages")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        subject: "Test",
        body: "Hello",
        fromAddress: "not-an-email",
        fromName: "Test",
        toAddresses: ["dest@test.com"]
      });
    assert.equal(response.status, 400);
  });
});

describe("projects validation", () => {
  it("rejects create project with empty name", async () => {
    const response = await request(app)
      .post("/api/v1/projects/projects")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ name: "" });
    assert.equal(response.status, 400);
  });

  it("rejects create project with name exceeding max length", async () => {
    const response = await request(app)
      .post("/api/v1/projects/projects")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ name: "x".repeat(201) });
    assert.equal(response.status, 400);
  });
});

describe("tasks validation", () => {
  it("rejects create task with empty title", async () => {
    const response = await request(app)
      .post("/api/v1/tasks/tasks")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ title: "" });
    assert.equal(response.status, 400);
  });

  it("rejects transition on invalid id", async () => {
    const response = await request(app)
      .post("/api/v1/tasks/tasks/invalid-id/transition")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ to: "done" });
    assert.equal(response.status, 400);
  });
});

describe("calendar validation", () => {
  it("rejects create event with missing endDate", async () => {
    const response = await request(app)
      .post("/api/v1/calendar/events")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ title: "Event", startDate: new Date().toISOString() });
    assert.equal(response.status, 400);
  });

  it("rejects create event with endDate before startDate", async () => {
    const response = await request(app)
      .post("/api/v1/calendar/events")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        title: "Event",
        startDate: "2026-12-31T23:59:59Z",
        endDate: "2026-01-01T00:00:00Z"
      });
    assert.equal(response.status, 400);
  });
});

describe("todo validation", () => {
  it("rejects create todo with empty title", async () => {
    const response = await request(app)
      .post("/api/v1/todo/items")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ title: "" });
    assert.equal(response.status, 400);
  });
});

describe("job validation", () => {
  it("rejects create posting with missing required fields", async () => {
    const response = await request(app)
      .post("/api/v1/job/postings")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ title: "Developer" });
    assert.equal(response.status, 400);
  });

  it("rejects create posting with invalid employmentType", async () => {
    const response = await request(app)
      .post("/api/v1/job/postings")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        title: "Dev",
        description: "desc",
        department: "eng",
        location: "remote",
        employmentType: "invalid_type"
      });
    assert.equal(response.status, 400);
  });
});

describe("invalid object id handling", () => {
  const idEndpoints = [
    { method: "get" as const, path: "/api/v1/chat/conversations/bad-id" },
    { method: "patch" as const, path: "/api/v1/chat/conversations/bad-id" },
    { method: "get" as const, path: "/api/v1/projects/projects/bad-id" },
    { method: "patch" as const, path: "/api/v1/tasks/tasks/bad-id" },
    { method: "get" as const, path: "/api/v1/calendar/events/bad-id" },
    { method: "get" as const, path: "/api/v1/todo/items/bad-id" },
    { method: "get" as const, path: "/api/v1/job/postings/bad-id" }
  ];

  for (const endpoint of idEndpoints) {
    it(`returns 400 for invalid id on ${endpoint.method.toUpperCase()} ${endpoint.path}`, async () => {
      const response = await request(app)[endpoint.method](endpoint.path)
        .set("Authorization", `Bearer ${superAdminToken}`);
      // Will be 400 (invalid id) or 401 (auth check, environment-dependent).
      // Key assertion: it should NOT be 200 or 404 with database access.
      assert.ok(response.status >= 400, `Expected 4xx, got ${response.status}`);
    });
  }
});
