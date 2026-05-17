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

const moduleEndpoints = [
  { module: "chat", path: "/api/v1/chat/conversations" },
  { module: "chat", path: "/api/v1/chat/insights" },
  { module: "mailbox", path: "/api/v1/mailbox/messages" },
  { module: "mailbox", path: "/api/v1/mailbox/insights" },
  { module: "projects", path: "/api/v1/projects/projects" },
  { module: "projects", path: "/api/v1/projects/insights" },
  { module: "tasks", path: "/api/v1/tasks/tasks" },
  { module: "tasks", path: "/api/v1/tasks/insights" },
  { module: "calendar", path: "/api/v1/calendar/events" },
  { module: "calendar", path: "/api/v1/calendar/insights" },
  { module: "todo", path: "/api/v1/todo/items" },
  { module: "todo", path: "/api/v1/todo/insights" },
  { module: "job", path: "/api/v1/job/postings" },
  { module: "job", path: "/api/v1/job/insights" }
];

describe("new module route protection", () => {
  for (const endpoint of moduleEndpoints) {
    it(`blocks ${endpoint.module} GET ${endpoint.path} without token`, async () => {
      const response = await request(app).get(endpoint.path);
      assert.equal(response.status, 401);
      assert.equal(response.body.code, "UNAUTHORIZED");
    });
  }

  const writeEndpoints = [
    { module: "chat", method: "post" as const, path: "/api/v1/chat/conversations" },
    { module: "mailbox", method: "post" as const, path: "/api/v1/mailbox/messages" },
    { module: "projects", method: "post" as const, path: "/api/v1/projects/projects" },
    { module: "tasks", method: "post" as const, path: "/api/v1/tasks/tasks" },
    { module: "calendar", method: "post" as const, path: "/api/v1/calendar/events" },
    { module: "todo", method: "post" as const, path: "/api/v1/todo/items" },
    { module: "job", method: "post" as const, path: "/api/v1/job/postings" }
  ];

  for (const endpoint of writeEndpoints) {
    it(`blocks ${endpoint.module} POST ${endpoint.path} without token`, async () => {
      const response = await request(app)[endpoint.method](endpoint.path).send({});
      assert.equal(response.status, 401);
      assert.equal(response.body.code, "UNAUTHORIZED");
    });
  }
});

describe("new module generic resource routes protected", () => {
  const genericRoutes = [
    "/api/v1/chat/items",
    "/api/v1/mailbox/items",
    "/api/v1/projects/items",
    "/api/v1/tasks/items",
    "/api/v1/calendar/items",
    "/api/v1/todo/items",
    "/api/v1/job/items"
  ];

  for (const path of genericRoutes) {
    it(`blocks generic GET ${path} without token`, async () => {
      const response = await request(app).get(path);
      assert.equal(response.status, 401);
      assert.equal(response.body.code, "UNAUTHORIZED");
    });
  }
});
