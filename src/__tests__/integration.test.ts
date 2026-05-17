import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import jwt from "jsonwebtoken";
import request from "supertest";

let mongoServer: MongoMemoryReplSet;

const JWT_SECRET_SUPER_ADMIN = "integration_test_super_secret";
const JWT_SECRET_ADMIN = "integration_test_admin_secret";

process.env.NODE_ENV = "test";
process.env.PORT = "0";
process.env.MONGO_URI = "placeholder";
process.env.JWT_SECRET_SUPER_ADMIN = JWT_SECRET_SUPER_ADMIN;
process.env.JWT_SECRET_ADMIN = JWT_SECRET_ADMIN;
process.env.JWT_EXPIRES_IN = "1d";
process.env.CLIENT_CODE = "integration-test";
process.env.CORS_ORIGINS = "http://localhost:3000";
process.env.TRUST_PROXY = "0";
process.env.ENABLE_SEED = "false";

function superAdminToken(): string {
  return jwt.sign(
    { sub: "sa-001", email: "superadmin@test.local", role: "super_admin" },
    JWT_SECRET_SUPER_ADMIN,
    { expiresIn: "1h" }
  );
}

function adminToken(): string {
  return jwt.sign(
    { sub: "a-001", email: "admin@test.local", role: "admin" },
    JWT_SECRET_ADMIN,
    { expiresIn: "1h" }
  );
}

let app: any;

before(async () => {
  mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = mongoServer.getUri();
  process.env.MONGO_URI = uri;
  await mongoose.connect(uri);
  const { createApp } = await import("../app");
  app = await createApp();
});

after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// ── System endpoints ────────────────────────────────────────────

describe("integration: system endpoints", () => {
  it("GET /api/v1/system/session-bootstrap returns user + features", async () => {
    const res = await request(app)
      .get("/api/v1/system/session-bootstrap")
      .set("Authorization", `Bearer ${superAdminToken()}`);
    assert.equal(res.status, 200);
    assert.ok(res.body.user);
    assert.ok(res.body.features);
    assert.ok(res.body.permissions);
  });

  it("GET /api/v1/system/dashboard-kpis returns KPI counts", async () => {
    const res = await request(app)
      .get("/api/v1/system/dashboard-kpis")
      .set("Authorization", `Bearer ${superAdminToken()}`);
    assert.equal(res.status, 200);
    assert.equal(typeof res.body.openTickets, "number");
    assert.equal(typeof res.body.activeTasks, "number");
    assert.equal(typeof res.body.todayEvents, "number");
    assert.equal(typeof res.body.openDeals, "number");
    assert.equal(typeof res.body.pipelineValue, "number");
  });

  it("PUT + GET /api/v1/system/settings round-trip", async () => {
    const payload = { timezone: "Asia/Kolkata", defaultCurrency: "INR", locale: "hi-IN" };
    const putRes = await request(app)
      .put("/api/v1/system/settings")
      .set("Authorization", `Bearer ${superAdminToken()}`)
      .send(payload);

    assert.equal(putRes.status, 200);
    assert.equal(putRes.body.timezone, "Asia/Kolkata");

    const getRes = await request(app)
      .get("/api/v1/system/settings")
      .set("Authorization", `Bearer ${superAdminToken()}`);
    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.defaultCurrency, "INR");
  });

  it("PUT /api/v1/system/feature-config creates audit log entry", async () => {
    await request(app)
      .put("/api/v1/system/feature-config")
      .set("Authorization", `Bearer ${superAdminToken()}`)
      .send({ enabledModules: ["calendar", "chat"] });

    const auditRes = await request(app)
      .get("/api/v1/system/audit-log")
      .set("Authorization", `Bearer ${superAdminToken()}`);
    assert.equal(auditRes.status, 200);
    assert.ok(auditRes.body.items.length > 0);
    assert.equal(auditRes.body.items[0].action, "feature_config.update");
  });
});

// ── Support tickets CRUD ────────────────────────────────────────

describe("integration: support tickets CRUD", () => {
  let ticketId: string;

  it("creates a ticket", async () => {
    // First enable the module
    await request(app)
      .put("/api/v1/system/feature-config")
      .set("Authorization", `Bearer ${superAdminToken()}`)
      .send({ enabledModules: ["support-tickets"] });

    const res = await request(app)
      .post("/api/v1/support-tickets/tickets")
      .set("Authorization", `Bearer ${superAdminToken()}`)
      .send({
        subject: "Integration test ticket",
        description: "Created during integration test",
        requesterName: "Test User",
        requesterEmail: "test@example.com",
      });

    assert.equal(res.status, 201);
    assert.ok(res.body._id);
    assert.equal(res.body.subject, "Integration test ticket");
    ticketId = res.body._id;
  });

  it("lists tickets", async () => {
    const res = await request(app)
      .get("/api/v1/support-tickets/tickets")
      .set("Authorization", `Bearer ${superAdminToken()}`);
    assert.equal(res.status, 200);
    assert.ok(res.body.items.length >= 1);
    assert.equal(res.body.items[0].subject, "Integration test ticket");
  });

  it("updates a ticket", async () => {
    const res = await request(app)
      .patch(`/api/v1/support-tickets/tickets/${ticketId}`)
      .set("Authorization", `Bearer ${superAdminToken()}`)
      .send({ priority: "high" });
    assert.equal(res.status, 200);
    assert.equal(res.body.priority, "high");
  });

  it("transitions a ticket", async () => {
    const res = await request(app)
      .post(`/api/v1/support-tickets/tickets/${ticketId}/transition`)
      .set("Authorization", `Bearer ${superAdminToken()}`)
      .send({ to: "in_progress" });
    assert.equal(res.status, 200);
    assert.equal(res.body.status, "in_progress");
  });
});

// ── CRM contacts + deals CRUD ───────────────────────────────────

describe("integration: CRM CRUD", () => {
  let contactId: string;
  let pipelineId: string;

  it("creates a contact", async () => {
    await request(app)
      .put("/api/v1/system/feature-config")
      .set("Authorization", `Bearer ${superAdminToken()}`)
      .send({ enabledModules: ["crm"] });

    const res = await request(app)
      .post("/api/v1/crm/contacts")
      .set("Authorization", `Bearer ${superAdminToken()}`)
      .send({ displayName: "Test Contact", primaryEmail: "crm@test.local" });
    assert.equal(res.status, 201);
    contactId = res.body._id;
  });

  it("creates a pipeline", async () => {
    const res = await request(app)
      .post("/api/v1/crm/pipelines")
      .set("Authorization", `Bearer ${superAdminToken()}`)
      .send({
        name: "Test Pipeline",
        stages: [
          { key: "lead", label: "Lead", order: 1 },
          { key: "won", label: "Won", order: 2, isTerminalWon: true },
        ],
      });
    assert.equal(res.status, 201);
    pipelineId = res.body._id;
  });

  it("creates a deal", async () => {
    const res = await request(app)
      .post("/api/v1/crm/deals")
      .set("Authorization", `Bearer ${superAdminToken()}`)
      .send({
        title: "Test Deal",
        contactId,
        pipelineId,
        stageKey: "lead",
        amountValue: 5000,
        currency: "USD",
      });
    assert.equal(res.status, 201);
    assert.equal(res.body.title, "Test Deal");
    assert.equal(res.body.amountValue, 5000);
  });
});

// ── Tasks CRUD ──────────────────────────────────────────────────

describe("integration: tasks CRUD", () => {
  it("creates and lists tasks", async () => {
    await request(app)
      .put("/api/v1/system/feature-config")
      .set("Authorization", `Bearer ${superAdminToken()}`)
      .send({ enabledModules: ["tasks"] });

    const createRes = await request(app)
      .post("/api/v1/tasks/tasks")
      .set("Authorization", `Bearer ${superAdminToken()}`)
      .send({ title: "Integration test task", priority: "high" });

    assert.equal(createRes.status, 201);

    const listRes = await request(app)
      .get("/api/v1/tasks/tasks")
      .set("Authorization", `Bearer ${superAdminToken()}`);
    assert.equal(listRes.status, 200);
    assert.ok(listRes.body.items.length >= 1);
  });
});

// ── File Manager quota ──────────────────────────────────────────

describe("integration: file manager quota", () => {
  it("returns quota info", async () => {
    await request(app)
      .put("/api/v1/system/feature-config")
      .set("Authorization", `Bearer ${superAdminToken()}`)
      .send({ enabledModules: ["file-manager"] });

    const res = await request(app)
      .get("/api/v1/file-manager/quota")
      .set("Authorization", `Bearer ${superAdminToken()}`);
    assert.equal(res.status, 200);
    assert.equal(typeof res.body.usedBytes, "number");
    assert.equal(typeof res.body.quotaBytes, "number");
    assert.equal(typeof res.body.usedPercent, "number");
  });
});

// ── Guard chain tests ───────────────────────────────────────────

describe("integration: guard chain — no auth", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).get("/api/v1/support-tickets/tickets");
    assert.equal(res.status, 401);
  });

  it("returns 401 with a malformed token", async () => {
    const res = await request(app)
      .get("/api/v1/tasks/tasks")
      .set("Authorization", "Bearer invalid.jwt.token");
    assert.equal(res.status, 401);
  });
});

describe("integration: guard chain — feature disabled", () => {
  it("admin gets 403 FEATURE_DISABLED when module is off", async () => {
    // Disable calendar module
    await request(app)
      .put("/api/v1/system/feature-config")
      .set("Authorization", `Bearer ${superAdminToken()}`)
      .send({ enabledModules: [] });

    const res = await request(app)
      .get("/api/v1/calendar/events")
      .set("Authorization", `Bearer ${adminToken()}`);
    assert.equal(res.status, 403);
    assert.equal(res.body.code, "FEATURE_DISABLED");

    // Re-enable for subsequent tests
    await request(app)
      .put("/api/v1/system/feature-config")
      .set("Authorization", `Bearer ${superAdminToken()}`)
      .send({ enabledModules: ["calendar", "support-tickets", "crm", "tasks", "file-manager", "ecommerce", "todo", "chat", "mailbox", "projects"] });
  });

  it("super_admin bypasses feature flag", async () => {
    // Disable todo module
    await request(app)
      .put("/api/v1/system/feature-config")
      .set("Authorization", `Bearer ${superAdminToken()}`)
      .send({ enabledModules: [] });

    const res = await request(app)
      .get("/api/v1/todo/items")
      .set("Authorization", `Bearer ${superAdminToken()}`);
    assert.equal(res.status, 200);

    // Re-enable
    await request(app)
      .put("/api/v1/system/feature-config")
      .set("Authorization", `Bearer ${superAdminToken()}`)
      .send({ enabledModules: ["calendar", "support-tickets", "crm", "tasks", "file-manager", "ecommerce", "todo", "chat", "mailbox", "projects"] });
  });
});

describe("integration: guard chain — role restrictions", () => {
  it("admin cannot access audit log (super_admin only)", async () => {
    const res = await request(app)
      .get("/api/v1/system/audit-log")
      .set("Authorization", `Bearer ${adminToken()}`);
    assert.equal(res.status, 403);
  });

  it("admin can access dashboard KPIs", async () => {
    const res = await request(app)
      .get("/api/v1/system/dashboard-kpis")
      .set("Authorization", `Bearer ${adminToken()}`);
    assert.equal(res.status, 200);
  });

  it("admin cannot update system settings (super_admin only)", async () => {
    const res = await request(app)
      .put("/api/v1/system/settings")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ timezone: "UTC", defaultCurrency: "USD", locale: "en-US" });
    assert.equal(res.status, 403);
  });
});

// ── eCommerce CRUD ─────────────────────────────────────────────

describe("integration: eCommerce CRUD", () => {
  let productId: string;
  let orderId: string;

  it("creates a product", async () => {
    await request(app)
      .put("/api/v1/system/feature-config")
      .set("Authorization", `Bearer ${superAdminToken()}`)
      .send({ enabledModules: ["ecommerce"] });

    const res = await request(app)
      .post("/api/v1/ecommerce/products")
      .set("Authorization", `Bearer ${superAdminToken()}`)
      .send({ title: "Test Widget", sku: "TST-001", priceMinor: 1999, stock: 50 });
    assert.equal(res.status, 201);
    assert.equal(res.body.title, "Test Widget");
    assert.equal(res.body.priceMinor, 1999);
    productId = res.body._id;
  });

  it("lists products", async () => {
    const res = await request(app)
      .get("/api/v1/ecommerce/products")
      .set("Authorization", `Bearer ${superAdminToken()}`);
    assert.equal(res.status, 200);
    assert.ok(res.body.items.length >= 1);
  });

  it("creates an order", async () => {
    const res = await request(app)
      .post("/api/v1/ecommerce/orders")
      .set("Authorization", `Bearer ${superAdminToken()}`)
      .send({
        customerName: "Test Customer",
        customerEmail: "customer@test.local",
        items: [{ productId, qty: 2 }],
      });
    assert.equal(res.status, 201);
    assert.equal(res.body.customerName, "Test Customer");
    orderId = res.body._id;
  });

  it("transitions order to paid", async () => {
    const res = await request(app)
      .post(`/api/v1/ecommerce/orders/${orderId}/transition`)
      .set("Authorization", `Bearer ${superAdminToken()}`)
      .send({ to: "paid" });
    assert.equal(res.status, 200);
    assert.equal(res.body.status, "paid");
  });
});

// ── Calendar CRUD ──────────────────────────────────────────────

describe("integration: calendar CRUD", () => {
  let eventId: string;

  it("creates an event", async () => {
    await request(app)
      .put("/api/v1/system/feature-config")
      .set("Authorization", `Bearer ${superAdminToken()}`)
      .send({ enabledModules: ["calendar"] });

    const tomorrow = new Date(Date.now() + 86400000).toISOString();
    const dayAfter = new Date(Date.now() + 172800000).toISOString();
    const res = await request(app)
      .post("/api/v1/calendar/events")
      .set("Authorization", `Bearer ${superAdminToken()}`)
      .send({ title: "Team standup", startDate: tomorrow, endDate: dayAfter });
    assert.equal(res.status, 201);
    assert.equal(res.body.title, "Team standup");
    eventId = res.body._id;
  });

  it("lists events", async () => {
    const res = await request(app)
      .get("/api/v1/calendar/events")
      .set("Authorization", `Bearer ${superAdminToken()}`);
    assert.equal(res.status, 200);
    assert.ok(res.body.items.length >= 1);
  });

  it("cancels an event", async () => {
    const res = await request(app)
      .post(`/api/v1/calendar/events/${eventId}/cancel`)
      .set("Authorization", `Bearer ${superAdminToken()}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.status, "cancelled");
  });
});

// ── ToDo CRUD ──────────────────────────────────────────────────

describe("integration: todo CRUD", () => {
  let todoId: string;

  it("creates a todo", async () => {
    await request(app)
      .put("/api/v1/system/feature-config")
      .set("Authorization", `Bearer ${superAdminToken()}`)
      .send({ enabledModules: ["todo"] });

    const res = await request(app)
      .post("/api/v1/todo/items")
      .set("Authorization", `Bearer ${superAdminToken()}`)
      .send({ title: "Integration test todo", priority: "high" });
    assert.equal(res.status, 201);
    assert.equal(res.body.title, "Integration test todo");
    todoId = res.body._id;
  });

  it("completes a todo", async () => {
    const res = await request(app)
      .post(`/api/v1/todo/items/${todoId}/complete`)
      .set("Authorization", `Bearer ${superAdminToken()}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.status, "completed");
    assert.ok(res.body.completedAt);
  });

  it("reopens a todo", async () => {
    const res = await request(app)
      .post(`/api/v1/todo/items/${todoId}/reopen`)
      .set("Authorization", `Bearer ${superAdminToken()}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.status, "pending");
  });
});

// ── Projects CRUD ──────────────────────────────────────────────

describe("integration: projects CRUD", () => {
  let projectId: string;

  it("creates a project", async () => {
    await request(app)
      .put("/api/v1/system/feature-config")
      .set("Authorization", `Bearer ${superAdminToken()}`)
      .send({ enabledModules: ["projects"] });

    const res = await request(app)
      .post("/api/v1/projects/projects")
      .set("Authorization", `Bearer ${superAdminToken()}`)
      .send({ name: "Integration test project", description: "Test" });
    assert.equal(res.status, 201);
    assert.equal(res.body.name, "Integration test project");
    projectId = res.body._id;
  });

  it("transitions project to active", async () => {
    const res = await request(app)
      .post(`/api/v1/projects/projects/${projectId}/transition`)
      .set("Authorization", `Bearer ${superAdminToken()}`)
      .send({ to: "active" });
    assert.equal(res.status, 200);
    assert.equal(res.body.status, "active");
  });

  it("adds a member", async () => {
    const res = await request(app)
      .post(`/api/v1/projects/projects/${projectId}/members`)
      .set("Authorization", `Bearer ${superAdminToken()}`)
      .send({ userId: "member-001" });
    assert.equal(res.status, 200);
    assert.ok(res.body.memberUserIds.includes("member-001"));
  });
});

// ── Chat IDOR + security ───────────────────────────────────────

describe("integration: chat IDOR security", () => {
  let conversationId: string;

  it("super_admin creates a conversation", async () => {
    await request(app)
      .put("/api/v1/system/feature-config")
      .set("Authorization", `Bearer ${superAdminToken()}`)
      .send({ enabledModules: ["chat"] });

    const res = await request(app)
      .post("/api/v1/chat/conversations")
      .set("Authorization", `Bearer ${superAdminToken()}`)
      .send({ title: "Secret conversation", participantUserIds: ["sa-001"] });
    assert.equal(res.status, 201);
    conversationId = res.body._id;
  });

  it("admin (non-participant) cannot read the conversation", async () => {
    const res = await request(app)
      .get(`/api/v1/chat/conversations/${conversationId}`)
      .set("Authorization", `Bearer ${adminToken()}`);
    assert.equal(res.status, 403);
  });

  it("admin (non-participant) cannot send messages", async () => {
    const res = await request(app)
      .post(`/api/v1/chat/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ content: "Unauthorized message" });
    assert.equal(res.status, 403);
  });

  it("admin (non-participant) cannot read messages", async () => {
    const res = await request(app)
      .get(`/api/v1/chat/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${adminToken()}`);
    assert.equal(res.status, 403);
  });

  it("admin (non-participant) cannot access SSE stream", async () => {
    const res = await request(app)
      .get(`/api/v1/chat/conversations/${conversationId}/stream?token=${adminToken()}`);
    assert.equal(res.status, 403);
  });
});

// ── Idempotency ────────────────────────────────────────────────

describe("integration: idempotency", () => {
  it("PUT system settings is idempotent", async () => {
    const payload = { timezone: "Europe/London", defaultCurrency: "GBP", locale: "en-GB" };

    const first = await request(app)
      .put("/api/v1/system/settings")
      .set("Authorization", `Bearer ${superAdminToken()}`)
      .send(payload);
    assert.equal(first.status, 200);

    const second = await request(app)
      .put("/api/v1/system/settings")
      .set("Authorization", `Bearer ${superAdminToken()}`)
      .send(payload);
    assert.equal(second.status, 200);
    assert.equal(second.body.timezone, first.body.timezone);
    assert.equal(second.body.defaultCurrency, first.body.defaultCurrency);
  });

  it("PUT feature-config is idempotent", async () => {
    const payload = { enabledModules: ["calendar", "tasks"] };

    const first = await request(app)
      .put("/api/v1/system/feature-config")
      .set("Authorization", `Bearer ${superAdminToken()}`)
      .send(payload);
    assert.equal(first.status, 200);

    const second = await request(app)
      .put("/api/v1/system/feature-config")
      .set("Authorization", `Bearer ${superAdminToken()}`)
      .send(payload);
    assert.equal(second.status, 200);
    assert.deepEqual(second.body.features, first.body.features);
  });
});

// ── Branding CRUD ─────────────────────────────────────────────

describe("integration: branding CRUD", () => {
  it("GET /api/v1/system/branding returns defaults", async () => {
    const res = await request(app)
      .get("/api/v1/system/branding")
      .set("Authorization", `Bearer ${superAdminToken()}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.companyName, "Admin Platform");
    assert.equal(res.body.primaryColor, "#1976d2");
  });

  it("PUT /api/v1/system/branding updates and round-trips", async () => {
    const payload = { companyName: "Test Corp", logoUrl: "https://example.com/logo.png", primaryColor: "#ff5722" };
    const putRes = await request(app)
      .put("/api/v1/system/branding")
      .set("Authorization", `Bearer ${superAdminToken()}`)
      .send(payload);
    assert.equal(putRes.status, 200);
    assert.equal(putRes.body.companyName, "Test Corp");
    assert.equal(putRes.body.primaryColor, "#ff5722");

    const getRes = await request(app)
      .get("/api/v1/system/branding")
      .set("Authorization", `Bearer ${superAdminToken()}`);
    assert.equal(getRes.body.companyName, "Test Corp");
  });

  it("admin can read branding but cannot write", async () => {
    const readRes = await request(app)
      .get("/api/v1/system/branding")
      .set("Authorization", `Bearer ${adminToken()}`);
    assert.equal(readRes.status, 200);

    const writeRes = await request(app)
      .put("/api/v1/system/branding")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ companyName: "Hacked", logoUrl: "", primaryColor: "#000000" });
    assert.equal(writeRes.status, 403);
  });

  it("rejects invalid hex color", async () => {
    const res = await request(app)
      .put("/api/v1/system/branding")
      .set("Authorization", `Bearer ${superAdminToken()}`)
      .send({ companyName: "X", logoUrl: "", primaryColor: "red" });
    assert.equal(res.status, 400);
  });
});

// ── Custom roles CRUD ─────────────────────────────────────────

describe("integration: custom roles CRUD", () => {
  let roleId: string;

  it("creates a custom role", async () => {
    const res = await request(app)
      .post("/api/v1/system/custom-roles")
      .set("Authorization", `Bearer ${superAdminToken()}`)
      .send({ name: "Read-Only Viewer", permissions: ["crm.read", "tasks.read"] });
    assert.equal(res.status, 201);
    assert.equal(res.body.name, "Read-Only Viewer");
    assert.deepEqual(res.body.permissions, ["crm.read", "tasks.read"]);
    roleId = res.body.id;
  });

  it("lists custom roles", async () => {
    const res = await request(app)
      .get("/api/v1/system/custom-roles")
      .set("Authorization", `Bearer ${superAdminToken()}`);
    assert.equal(res.status, 200);
    assert.ok(res.body.roles.length >= 1);
  });

  it("updates a custom role", async () => {
    const res = await request(app)
      .put(`/api/v1/system/custom-roles/${roleId}`)
      .set("Authorization", `Bearer ${superAdminToken()}`)
      .send({ name: "CRM Viewer", permissions: ["crm.read"] });
    assert.equal(res.status, 200);
    assert.equal(res.body.name, "CRM Viewer");
  });

  it("admin cannot manage custom roles", async () => {
    const res = await request(app)
      .get("/api/v1/system/custom-roles")
      .set("Authorization", `Bearer ${adminToken()}`);
    assert.equal(res.status, 403);
  });

  it("deletes a custom role", async () => {
    const res = await request(app)
      .delete(`/api/v1/system/custom-roles/${roleId}`)
      .set("Authorization", `Bearer ${superAdminToken()}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.deleted, true);
  });
});

// ── Notifications ─────────────────────────────────────────────

describe("integration: notifications", () => {
  it("GET /api/v1/system/notifications returns empty initially", async () => {
    const res = await request(app)
      .get("/api/v1/system/notifications")
      .set("Authorization", `Bearer ${superAdminToken()}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.items.length, 0);
    assert.equal(res.body.total, 0);
  });

  it("GET /api/v1/system/notifications/unread-count returns 0", async () => {
    const res = await request(app)
      .get("/api/v1/system/notifications/unread-count")
      .set("Authorization", `Bearer ${superAdminToken()}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.unreadCount, 0);
  });

  it("POST /api/v1/system/notifications/mark-all-read succeeds even with none", async () => {
    const res = await request(app)
      .post("/api/v1/system/notifications/mark-all-read")
      .set("Authorization", `Bearer ${superAdminToken()}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.marked, 0);
  });
});

// ── GDPR export ───────────────────────────────────────────────

describe("integration: GDPR export", () => {
  it("returns JSON bundle with user data", async () => {
    const res = await request(app)
      .get("/api/v1/system/gdpr-export")
      .set("Authorization", `Bearer ${superAdminToken()}`);
    assert.equal(res.status, 200);
    assert.ok(res.body.exportedAt);
    assert.ok(Array.isArray(res.body.supportTickets));
    assert.ok(Array.isArray(res.body.tasks));
    assert.ok(Array.isArray(res.body.calendarEvents));
    assert.ok(Array.isArray(res.body.todoItems));
    assert.ok(Array.isArray(res.body.projects));
    assert.ok(Array.isArray(res.body.crmContacts));
    assert.ok(Array.isArray(res.body.crmDeals));
  });

  it("admin can also export their own data", async () => {
    const res = await request(app)
      .get("/api/v1/system/gdpr-export")
      .set("Authorization", `Bearer ${adminToken()}`);
    assert.equal(res.status, 200);
    assert.ok(res.body.exportedAt);
  });
});

// ── CSV import ────────────────────────────────────────────────

describe("integration: CSV import", () => {
  it("imports CSV rows into support-tickets", async () => {
    await request(app)
      .put("/api/v1/system/feature-config")
      .set("Authorization", `Bearer ${superAdminToken()}`)
      .send({ enabledModules: ["support-tickets"] });

    const csv = [
      "ticketNumber,subject,requesterName,requesterEmail,description",
      "CSV-001,CSV Ticket 1,Alice,alice@test.local,Imported via CSV",
      "CSV-002,CSV Ticket 2,Bob,bob@test.local,Another import",
    ].join("\n");

    const res = await request(app)
      .post("/api/v1/system/import/support-tickets")
      .set("Authorization", `Bearer ${superAdminToken()}`)
      .send({ csv });
    assert.equal(res.status, 200);
    assert.equal(res.body.imported, 2);
    assert.equal(res.body.errors.length, 0);
  });

  it("rejects unknown module", async () => {
    const res = await request(app)
      .post("/api/v1/system/import/unknown-module")
      .set("Authorization", `Bearer ${superAdminToken()}`)
      .send({ csv: "a,b\n1,2" });
    assert.equal(res.status, 400);
  });

  it("admin cannot import (super_admin only)", async () => {
    const res = await request(app)
      .post("/api/v1/system/import/support-tickets")
      .set("Authorization", `Bearer ${adminToken()}`)
      .send({ csv: "subject\nTest" });
    assert.equal(res.status, 403);
  });
});
