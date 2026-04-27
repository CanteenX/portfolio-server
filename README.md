# Admin Panel Server

Express + TypeScript + MongoDB backend for the Admin Panel. Ships with 13 business modules, JWT authentication, role-based access control, feature flags, and a dynamic menu system.

## Table of Contents

- [Quick Start](#quick-start)
- [First Run & Seeding](#first-run--seeding)
- [How It Works](#how-it-works)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Modules](#modules)
- [Authentication & Roles](#authentication--roles)
- [Permission System](#permission-system)
- [Feature Flags](#feature-flags)
- [API Reference](#api-reference)
- [Pairing with a Frontend](#pairing-with-a-frontend)
- [Deployment](#deployment)

---

## Quick Start

### Prerequisites

| Tool    | Version |
|---------|---------|
| Node.js | >= 22   |
| pnpm    | >= 9.15 |
| MongoDB | >= 6.0  |

> A free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster works for development.

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/admin-panel
JWT_SECRET_SUPER_ADMIN=change-me-super-secret-min-8
JWT_SECRET_ADMIN=change-me-admin-secret-min-8
ENABLE_SEED=true
SUPER_ADMIN_SEED_PASSWORD=SuperAdmin@123
ADMIN_SEED_PASSWORD=Admin@123
```

### 3. Start the server

```bash
pnpm dev
```

The server starts on `http://localhost:7002`. API base path is `/api/v1`.

---

## First Run & Seeding

On first run with `ENABLE_SEED=true`, the server automatically:
1. Connects to MongoDB
2. Seeds a super admin and admin user
3. Seeds the default menu structure (sidebar groups and items)

Default login credentials after seeding:

| Email                    | Password                         | Role          |
|--------------------------|----------------------------------|---------------|
| `superadmin@admin.local` | your `SUPER_ADMIN_SEED_PASSWORD` | `super_admin` |
| `admin@admin.local`      | your `ADMIN_SEED_PASSWORD`       | `admin`       |

> Set `ENABLE_SEED=false` after first run to skip re-seeding on subsequent boots.

---

## How It Works

### Request Flow

```
Client (browser)
  │
  ▼
Express Server (port 7002)
  │
  ├─ Middleware chain:
  │   requestId → requestLogger → helmet → CORS → express.json
  │
  ├─ Public routes:
  │   POST /api/v1/auth/login
  │   GET  /api/v1/health
  │
  ├─ Protected routes (require JWT):
  │   authenticateJwt → requireRole → requireFeatureEnabled → requirePermission
  │   │
  │   ├─ GET /api/v1/system/session-bootstrap  (returns user, permissions, flags, menus)
  │   ├─ GET /api/v1/crm/contacts              (module CRUD)
  │   ├─ POST /api/v1/ecommerce/products       (module CRUD)
  │   └─ ... (all module endpoints)
  │
  └─ Error handler (catches all errors, returns structured JSON)
```

### Session Bootstrap

After login, the frontend calls `GET /api/v1/system/session-bootstrap` which returns everything the UI needs in a single request:

```json
{
  "user":        { "name": "...", "email": "...", "role": "admin" },
  "permissions": { "crm.read": true, "crm.create": true, ... },
  "features":    { "crm": true, "ecommerce": true, "chat": false, ... },
  "uiFlags":     { "darkMode": true, "compactSidebar": false, ... },
  "menuGroups":  [ { "label": "Apps", "menus": [...] }, ... ],
  "modules":     [ { "key": "crm", "label": "CRM", ... }, ... ]
}
```

### Middleware Guard Chain

Every protected module endpoint passes through 4 middleware layers:

1. **authenticateJwt** - Verifies Bearer token, attaches `req.user`
2. **requireRole** - Checks user role meets minimum (admin or super_admin)
3. **requireFeatureEnabled** - Checks if the module is enabled in feature config
4. **requirePermission** - Checks user has the specific permission (e.g. `crm.create`)

Super admins bypass feature and permission checks.

---

## Environment Variables

### Required

| Variable                 | Description                                                   |
|--------------------------|---------------------------------------------------------------|
| `MONGO_URI`              | MongoDB connection string                                     |
| `JWT_SECRET_SUPER_ADMIN` | JWT signing secret for super admins                           |
| `JWT_SECRET_ADMIN`       | JWT signing secret for admins (must differ from super admin)  |

### Seeding

| Variable                    | Default | Description                          |
|-----------------------------|---------|--------------------------------------|
| `ENABLE_SEED`               | `false` | `true` / `false` - seed default users |
| `SUPER_ADMIN_SEED_PASSWORD` | -       | Password for seeded super admin       |
| `ADMIN_SEED_PASSWORD`       | -       | Password for seeded admin             |

### Server

| Variable       | Default                                      | Description                        |
|----------------|----------------------------------------------|------------------------------------|
| `PORT`         | `7002`                                       | HTTP port                          |
| `NODE_ENV`     | `development`                                | `development`, `test`, `production` |
| `CLIENT_CODE`  | `default-client`                             | Multi-tenant client identifier     |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Comma-separated allowed origins    |
| `TRUST_PROXY`  | `0`                                          | Express trust proxy setting        |

### File Storage

| Variable                | Default    | Description                      |
|-------------------------|------------|----------------------------------|
| `STORAGE_BACKEND`       | `local`    | `local` or `s3`                 |
| `FILE_UPLOAD_DIR`       | `uploads`  | Local upload directory           |
| `FILE_UPLOAD_MAX_BYTES` | `52428800` | Max file size (50 MB)            |
| `S3_BUCKET`             | -          | S3 bucket name (if s3 backend)   |
| `S3_REGION`             | `us-east-1`| AWS region                      |
| `S3_ACCESS_KEY_ID`      | -          | AWS access key                   |
| `S3_SECRET_ACCESS_KEY`  | -          | AWS secret key                   |
| `S3_ENDPOINT`           | -          | Custom S3 endpoint (MinIO, etc.) |

### Payment Providers (all optional)

| Variable                  | Description              |
|---------------------------|--------------------------|
| `STRIPE_SECRET_KEY`       | Stripe secret key        |
| `STRIPE_WEBHOOK_SECRET`   | Stripe webhook signing   |
| `RAZORPAY_KEY_ID`         | Razorpay key ID          |
| `RAZORPAY_KEY_SECRET`     | Razorpay key secret      |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook secret  |
| `PAYPAL_CLIENT_ID`        | PayPal client ID         |
| `PAYPAL_CLIENT_SECRET`    | PayPal client secret     |
| `PAYPAL_WEBHOOK_ID`       | PayPal webhook ID        |
| `PAYPAL_MODE`             | `sandbox` or `live`      |

### Email (optional)

| Variable      | Default | Description      |
|---------------|---------|------------------|
| `SMTP_HOST`   | -       | SMTP server host |
| `SMTP_PORT`   | `587`   | SMTP server port |
| `SMTP_SECURE` | `false` | Use TLS          |
| `SMTP_USER`   | -       | SMTP username    |
| `SMTP_PASS`   | -       | SMTP password    |

### API Documentation

| Variable          | Default | Description                  |
|-------------------|---------|------------------------------|
| `ENABLE_API_DOCS` | `false` | Serve Swagger UI at `/docs`  |
| `API_KEY_HASH_SALT`| (auto) | Salt for hashing API keys (must set in production) |

---

## Available Scripts

| Script                  | Description                          |
|-------------------------|--------------------------------------|
| `pnpm dev`              | Start with hot reload (tsx watch)    |
| `pnpm build`            | Compile TypeScript to `dist/`        |
| `pnpm start`            | Run compiled server from `dist/`     |
| `pnpm typecheck`        | Type-check without emitting files    |
| `pnpm test`             | Run unit tests                       |
| `pnpm test:unit`        | Run unit tests (same as test)        |
| `pnpm test:integration` | Run integration tests (needs MongoDB)|
| `pnpm validate:openapi` | Validate OpenAPI spec                |

---

## Project Structure

```
src/
├── config/                 # Environment validation (Zod), DB connection
├── core/
│   ├── auth/               # User model, JWT sign/verify, auth middleware
│   ├── rbac/               # Roles, permissions, custom roles, permission middleware
│   ├── audit/              # Audit log model and service
│   ├── feature-flags/      # Module feature config + UI feature flags
│   ├── payments/           # Stripe, PayPal, Razorpay adapters
│   ├── errors/             # AppError class
│   ├── http/               # Module guard composer
│   └── logging/            # Pino logger
├── middleware/              # Error handler, request ID, request logger, Swagger
├── modules/
│   ├── system/             # Auth routes, system settings, branding, notifications
│   ├── menu/               # Dynamic menu groups and items
│   ├── resource/           # Generic CRUD handler for simple modules
│   ├── calendar/           # Calendar events
│   ├── chat/               # Chat conversations and messages
│   ├── mailbox/            # Email-like inbox
│   ├── ecommerce/          # Products, orders, payments
│   ├── projects/           # Project tracking
│   ├── tasks/              # Task management
│   ├── crm/                # Contacts and deals
│   ├── invoices/           # Invoice creation
│   ├── support-tickets/    # Helpdesk tickets
│   ├── file-manager/       # File upload and management (local/S3)
│   ├── todo/               # Personal todo items
│   ├── job/                # Job postings and applications
│   └── api-management/     # API key management
├── bootstrap/              # Seed scripts, module registry
├── shared/types/           # Inlined TypeScript types and constants
├── __tests__/              # Unit and integration tests
├── app.ts                  # Express app setup (middleware + routes)
└── main.ts                 # Entry point (DB connect, seed, start server)
```

---

## Modules

13 business modules, each with its own Mongoose models, Express routes, and validation:

| Module             | API Path              | Description                              |
|--------------------|-----------------------|------------------------------------------|
| **Calendar**       | `/api/v1/calendar`    | Event scheduling with start/end times    |
| **Chat**           | `/api/v1/chat`        | Conversations and messages               |
| **Mailbox**        | `/api/v1/mailbox`     | Email-like inbox with folders            |
| **eCommerce**      | `/api/v1/ecommerce`   | Products, orders, payment processing     |
| **Projects**       | `/api/v1/projects`    | Project tracking with status and members |
| **Tasks**          | `/api/v1/tasks`       | Task board with assignees and priorities  |
| **CRM**            | `/api/v1/crm`         | Contacts, deals, pipeline management     |
| **Invoices**       | `/api/v1/invoices`    | Invoice creation and tracking            |
| **Support Tickets**| `/api/v1/support-tickets` | Helpdesk ticket system              |
| **File Manager**   | `/api/v1/file-manager`| File upload and browsing (local/S3)      |
| **ToDo**           | `/api/v1/todo`        | Personal todo list                       |
| **Job**            | `/api/v1/job`         | Job postings and application tracking    |
| **API Management** | `/api/v1/api-management` | API key generation and audit          |

Modules can be individually enabled/disabled via feature config (Settings > Feature Config in the frontend).

---

## Authentication & Roles

### Login Flow

1. `POST /api/v1/auth/login` with `{ email, password }` - returns JWT token
2. Frontend stores token in localStorage
3. `GET /api/v1/system/session-bootstrap` with Bearer token - returns full session
4. All subsequent API calls include the token in `Authorization: Bearer <token>` header

### Role Hierarchy

| Role          | Access Level                                              |
|---------------|-----------------------------------------------------------|
| `super_admin` | Full access - all modules, all settings, user management  |
| `admin`       | Access controlled by assigned custom role permissions      |

### Custom Roles

Super admins can create custom roles and assign them to admin users. Each custom role has a granular permission matrix defining exactly which actions each user can perform on each menu item.

---

## Permission System

5 actions per menu item, controlled via the Permission Matrix:

| Action   | Description            |
|----------|------------------------|
| `read`   | View the page/data     |
| `create` | Create new records     |
| `update` | Edit existing records  |
| `delete` | Remove records         |
| `export` | Export data (CSV, etc.)|

The backend enforces permissions via `requirePermission` middleware on every route. A request to `POST /api/v1/crm/contacts` checks that the user has `crm.create` permission.

---

## Feature Flags

### Module Flags

Each of the 13 modules can be toggled on/off. When disabled:
- API routes return 403 Forbidden
- Frontend hides the module from sidebar and routes

### UI Feature Flags

30+ fine-grained UI toggles for header elements, layout options, sidebar sections, page visibility, and feature availability. Managed via `GET/PUT /api/v1/system/ui-feature-flags`.

---

## API Reference

Base URL: `http://localhost:7002/api/v1`

> Set `ENABLE_API_DOCS=true` to browse the full Swagger UI at `http://localhost:7002/docs`.

### Core Endpoints

| Method | Endpoint                               | Auth       | Description              |
|--------|----------------------------------------|------------|--------------------------|
| POST   | `/auth/login`                          | Public     | Login, returns JWT       |
| GET    | `/system/session-bootstrap`            | Admin+     | Full session data        |
| GET    | `/system/dashboard-kpis`               | Admin+     | Dashboard statistics     |
| GET    | `/system/search?q=term`                | Admin+     | Global search            |
| GET    | `/health`                              | Public     | Server health check      |

### Settings Endpoints (super_admin only)

| Method  | Endpoint                              | Description                        |
|---------|---------------------------------------|------------------------------------|
| GET/PUT | `/system/settings`                    | System settings (timezone, currency)|
| GET/PUT | `/system/branding`                    | Company name, logo, colors         |
| GET/PUT | `/system/feature-config`              | Enable/disable modules             |
| GET/PUT | `/system/ui-feature-flags`            | UI feature toggles                 |
| GET     | `/system/audit-log`                   | Audit trail                        |
| CRUD    | `/system/custom-roles`                | Manage custom roles                |
| GET/PUT | `/system/custom-roles/:id/permissions`| Permission matrix per role         |

### Module Endpoints (standard REST pattern)

```
GET    /api/v1/{module}          # List (paginated)
POST   /api/v1/{module}          # Create
GET    /api/v1/{module}/:id      # Get by ID
PUT    /api/v1/{module}/:id      # Update
DELETE /api/v1/{module}/:id      # Delete
```

### Menu Endpoints (super_admin only)

| Method | Endpoint                       | Description          |
|--------|--------------------------------|----------------------|
| GET    | `/menus/groups`                | List menu groups     |
| POST   | `/menus/groups`                | Create menu group    |
| PUT    | `/menus/groups/:id`            | Update menu group    |
| DELETE | `/menus/groups/:id`            | Delete menu group    |
| POST   | `/menus/items`                 | Create menu item     |
| PUT    | `/menus/items/:id`             | Update menu item     |
| DELETE | `/menus/items/:id`             | Delete menu item     |

---

## Pairing with a Frontend

This server works with either frontend:

- [AdminPanel-MUI](https://github.com/CanteenX/AdminPanel-MUI) - Material UI (React + TypeScript + Vite)
- [AdminPanel-Classic](https://github.com/CanteenX/AdminPanel-Classic) - Tailwind + shadcn/ui (React + JSX + CRA)

Set `CORS_ORIGINS` in `.env` to match the frontend's URL (e.g. `http://localhost:5173` for MUI, `http://localhost:3000` for Classic).

---

## Deployment

### Build

```bash
pnpm build
```

Outputs compiled JavaScript to `dist/`.

### Run in production

```bash
NODE_ENV=production node dist/main.js
```

### Docker example

```dockerfile
FROM node:22-slim
WORKDIR /app
COPY dist ./dist
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --prod --frozen-lockfile
EXPOSE 7002
CMD ["node", "dist/main.js"]
```

---

## License

Private - all rights reserved.
