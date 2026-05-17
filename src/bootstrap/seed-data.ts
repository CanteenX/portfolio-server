import { UserModel } from "../core/auth/user.model";
import { CustomRoleModel } from "../core/rbac/custom-role.model";
import { CrmContactModel, CrmPipelineModel, CrmDealModel } from "../modules/crm/crm.models";
import { EcommerceProductModel, EcommerceOrderModel } from "../modules/ecommerce/ecommerce.models";
import { CalendarEventModel } from "../modules/calendar/calendar.models";
import { SupportTicketModel } from "../modules/support-tickets/support-tickets.models";
import { InvoiceDocumentModelRef } from "../modules/invoices/invoice.models";
import { TaskModel } from "../modules/tasks/tasks.models";
import { ProjectModel } from "../modules/projects/projects.models";
import { TodoItemModel } from "../modules/todo/todo.models";
import { ChatConversationModel, ChatMessageModel } from "../modules/chat/chat.models";
import { MailboxMessageModel } from "../modules/mailbox/mailbox.models";
import { JobPostingModel, JobApplicationModel } from "../modules/job/job.models";
import { NotificationModel } from "../modules/system/notification.model";
import { AuditLogModel } from "../core/audit/audit-log.model";
import { env } from "../config/env";
import { logger } from "../core/logging/logger";
import { seedPortfolioData } from "../modules/portfolio/portfolio.seed";

export async function seedModuleData(): Promise<void> {
  logger.info("Starting module data seeding...");

  // Look up existing users by role (any super_admin / any admin)
  const superadmin = await UserModel.findOne({ role: "super_admin" }).exec();
  const admin = await UserModel.findOne({ role: "admin" }).exec();

  if (!superadmin || !admin) {
    logger.warn("No super_admin/admin users found. Skipping module data seed.");
    return;
  }

  const superadminId = superadmin._id.toString();
  const adminId = admin._id.toString();
  // Re-use the two real users for legacy seed references
  const sarahId = adminId;
  const jamesId = adminId;

  // Seed Custom Roles
  if ((await CustomRoleModel.countDocuments()) === 0) {
    await CustomRoleModel.create([
      {
        clientCode: env.CLIENT_CODE,
        name: "Support Manager",
        permissions: [
          "support-tickets:read",
          "support-tickets:create",
          "support-tickets:update",
          "tasks:read",
          "tasks:create",
          "tasks:update"
        ],
        structuredPermissions: [],
        createdBy: "seed",
        updatedBy: "seed"
      },
      {
        clientCode: env.CLIENT_CODE,
        name: "Sales Representative",
        permissions: [
          "crm:read",
          "crm:create",
          "crm:update",
          "invoices:read",
          "invoices:create"
        ],
        structuredPermissions: [],
        createdBy: "seed",
        updatedBy: "seed"
      }
    ]);
    logger.info("Seeded custom roles");
  }

  // Seed CRM Contacts
  if ((await CrmContactModel.countDocuments()) === 0) {
    const contacts = await CrmContactModel.create([
      {
        displayName: "John Reynolds",
        companyName: "Acme Corp",
        primaryEmail: "john.reynolds@acmecorp.com",
        ownerUserId: superadminId,
        tags: ["prospect", "enterprise"]
      },
      {
        displayName: "Emily Zhang",
        companyName: "Globex Inc",
        primaryEmail: "emily.zhang@globex.io",
        ownerUserId: adminId,
        tags: ["customer", "high-value"]
      },
      {
        displayName: "Michael Torres",
        companyName: "Initech LLC",
        primaryEmail: "michael.t@initech.com",
        ownerUserId: sarahId,
        tags: ["customer"]
      },
      {
        displayName: "Sarah Patel",
        companyName: "Soylent Corp",
        primaryEmail: "s.patel@soylent.co",
        ownerUserId: jamesId,
        tags: ["lead"]
      },
      {
        displayName: "David Kim",
        companyName: "Umbrella Inc",
        primaryEmail: "d.kim@umbrella.net",
        ownerUserId: superadminId,
        tags: ["prospect"]
      },
      {
        displayName: "Lisa Anderson",
        companyName: "Wayne Tech",
        primaryEmail: "l.anderson@waynetech.com",
        ownerUserId: adminId,
        tags: ["customer", "enterprise"]
      }
    ]);
    logger.info(`Seeded ${contacts.length} CRM contacts`);
  }

  // Get contacts for later reference
  const johnReynolds = await CrmContactModel.findOne({ primaryEmail: "john.reynolds@acmecorp.com" }).exec();
  const emilyZhang = await CrmContactModel.findOne({ primaryEmail: "emily.zhang@globex.io" }).exec();
  const michaelTorres = await CrmContactModel.findOne({ primaryEmail: "michael.t@initech.com" }).exec();
  const lisaAnderson = await CrmContactModel.findOne({ primaryEmail: "l.anderson@waynetech.com" }).exec();

  // Seed CRM Pipeline
  let pipeline;
  if ((await CrmPipelineModel.countDocuments()) === 0) {
    pipeline = await CrmPipelineModel.create({
      name: "Sales Pipeline",
      isDefault: true,
      stages: [
        { key: "lead", label: "Lead", order: 0 },
        { key: "qualified", label: "Qualified", order: 1 },
        { key: "proposal", label: "Proposal", order: 2 },
        { key: "negotiation", label: "Negotiation", order: 3 },
        { key: "closed_won", label: "Closed Won", order: 4, isTerminalWon: true },
        { key: "closed_lost", label: "Closed Lost", order: 5, isTerminalLost: true }
      ]
    });
    logger.info("Seeded CRM pipeline");
  } else {
    pipeline = await CrmPipelineModel.findOne({ isDefault: true }).exec();
  }

  // Seed CRM Deals
  if ((await CrmDealModel.countDocuments()) === 0 && pipeline && johnReynolds && emilyZhang && michaelTorres && lisaAnderson) {
    await CrmDealModel.create([
      {
        title: "Acme Enterprise License",
        contactId: johnReynolds._id,
        pipelineId: pipeline._id,
        stageKey: "proposal",
        amountValue: 45000,
        currency: "USD",
        status: "open",
        ownerUserId: superadminId
      },
      {
        title: "Globex Platform Upgrade",
        contactId: emilyZhang._id,
        pipelineId: pipeline._id,
        stageKey: "negotiation",
        amountValue: 120000,
        currency: "USD",
        status: "open",
        ownerUserId: adminId
      },
      {
        title: "Initech Consulting Package",
        contactId: michaelTorres._id,
        pipelineId: pipeline._id,
        stageKey: "qualified",
        amountValue: 12500,
        currency: "USD",
        status: "open",
        ownerUserId: sarahId
      },
      {
        title: "Wayne Tech Security Suite",
        contactId: lisaAnderson._id,
        pipelineId: pipeline._id,
        stageKey: "closed_won",
        amountValue: 85000,
        currency: "USD",
        status: "won",
        ownerUserId: adminId
      }
    ]);
    logger.info("Seeded CRM deals");
  }

  // Seed E-Commerce Products
  if ((await EcommerceProductModel.countDocuments()) === 0) {
    const products = await EcommerceProductModel.create([
      {
        title: "Premium Wireless Headphones",
        sku: "PWH-001",
        description: "High-quality wireless headphones with active noise cancellation",
        priceMinor: 12999,
        currency: "USD",
        stock: 145,
        status: "active"
      },
      {
        title: "Mechanical Gaming Keyboard",
        sku: "MGK-002",
        description: "RGB backlit mechanical keyboard with customizable keys",
        priceMinor: 8999,
        currency: "USD",
        stock: 89,
        status: "active"
      },
      {
        title: "4K Ultra HD Monitor",
        sku: "UHD-003",
        description: "27-inch 4K monitor with HDR support",
        priceMinor: 49999,
        currency: "USD",
        stock: 32,
        status: "active"
      },
      {
        title: "Ergonomic Office Chair",
        sku: "EOC-004",
        description: "Adjustable ergonomic chair with lumbar support",
        priceMinor: 34999,
        currency: "USD",
        stock: 56,
        status: "active"
      },
      {
        title: "USB-C Docking Station",
        sku: "UCD-005",
        description: "Multi-port USB-C hub with power delivery",
        priceMinor: 7499,
        currency: "USD",
        stock: 210,
        status: "active"
      },
      {
        title: "Noise Cancelling Earbuds",
        sku: "NCE-006",
        description: "True wireless earbuds with active noise cancellation",
        priceMinor: 5999,
        currency: "USD",
        stock: 178,
        status: "active"
      }
    ]);
    logger.info(`Seeded ${products.length} e-commerce products`);
  }

  // Get products for orders
  const headphones = await EcommerceProductModel.findOne({ sku: "PWH-001" }).exec();
  const keyboard = await EcommerceProductModel.findOne({ sku: "MGK-002" }).exec();
  const monitor = await EcommerceProductModel.findOne({ sku: "UHD-003" }).exec();
  const earbuds = await EcommerceProductModel.findOne({ sku: "NCE-006" }).exec();

  // Seed E-Commerce Orders
  if ((await EcommerceOrderModel.countDocuments()) === 0 && headphones && keyboard && monitor && earbuds) {
    // Order 1: headphones + keyboard
    const order1Subtotal = 12999 + 8999;
    const order1Tax = Math.floor(order1Subtotal * 0.1);
    const order1Total = order1Subtotal + order1Tax;

    // Order 2: monitor
    const order2Subtotal = 49999;
    const order2Tax = Math.floor(order2Subtotal * 0.1);
    const order2Total = order2Subtotal + order2Tax;

    // Order 3: earbuds x2
    const order3Subtotal = 5999 * 2;
    const order3Tax = Math.floor(order3Subtotal * 0.1);
    const order3Total = order3Subtotal + order3Tax;

    await EcommerceOrderModel.create([
      {
        orderNumber: "ORD-2026-001",
        customerName: "John Doe",
        customerEmail: "john.doe@example.com",
        status: "paid",
        currency: "USD",
        lineItems: [
          {
            productId: headphones._id,
            title: headphones.title,
            sku: headphones.sku,
            qty: 1,
            unitPriceMinor: 12999,
            lineTotalMinor: 12999
          },
          {
            productId: keyboard._id,
            title: keyboard.title,
            sku: keyboard.sku,
            qty: 1,
            unitPriceMinor: 8999,
            lineTotalMinor: 8999
          }
        ],
        subtotalMinor: order1Subtotal,
        taxMinor: order1Tax,
        shippingMinor: 0,
        grandTotalMinor: order1Total,
        payment: {
          status: "succeeded",
          amountMinor: order1Total,
          currency: "USD",
          succeededAt: new Date()
        }
      },
      {
        orderNumber: "ORD-2026-002",
        customerName: "Jane Smith",
        customerEmail: "jane.smith@example.com",
        status: "shipped",
        currency: "USD",
        lineItems: [
          {
            productId: monitor._id,
            title: monitor.title,
            sku: monitor.sku,
            qty: 1,
            unitPriceMinor: 49999,
            lineTotalMinor: 49999
          }
        ],
        subtotalMinor: order2Subtotal,
        taxMinor: order2Tax,
        shippingMinor: 0,
        grandTotalMinor: order2Total,
        payment: {
          status: "succeeded",
          amountMinor: order2Total,
          currency: "USD",
          succeededAt: new Date()
        }
      },
      {
        orderNumber: "ORD-2026-003",
        customerName: "Bob Johnson",
        customerEmail: "bob.johnson@example.com",
        status: "open",
        currency: "USD",
        lineItems: [
          {
            productId: earbuds._id,
            title: earbuds.title,
            sku: earbuds.sku,
            qty: 2,
            unitPriceMinor: 5999,
            lineTotalMinor: 11998
          }
        ],
        subtotalMinor: order3Subtotal,
        taxMinor: order3Tax,
        shippingMinor: 0,
        grandTotalMinor: order3Total,
        payment: {
          status: "none",
          amountMinor: 0,
          currency: "USD"
        }
      }
    ]);
    logger.info("Seeded e-commerce orders");
  }

  // Seed Calendar Events
  if ((await CalendarEventModel.countDocuments()) === 0) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Helper to get next day of week
    const getNextDayOfWeek = (dayOfWeek: number): Date => {
      const result = new Date(today);
      const currentDay = result.getDay();
      const daysUntil = (dayOfWeek - currentDay + 7) % 7 || 7;
      result.setDate(result.getDate() + daysUntil);
      return result;
    };

    const getLastFridayOfMonth = (): Date => {
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const lastFriday = new Date(lastDay);
      const dayOfWeek = lastDay.getDay();
      const daysToSubtract = dayOfWeek >= 5 ? dayOfWeek - 5 : dayOfWeek + 2;
      lastFriday.setDate(lastDay.getDate() - daysToSubtract);
      return lastFriday;
    };

    const getEndOfMonth = (): Date => {
      return new Date(now.getFullYear(), now.getMonth() + 1, 0);
    };

    const nextMonday = getNextDayOfWeek(1);
    const nextTuesday = getNextDayOfWeek(2);
    const nextThursday = getNextDayOfWeek(4);
    const nextFriday = getNextDayOfWeek(5);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    await CalendarEventModel.create([
      {
        title: "Sprint Planning",
        description: "Plan tasks for the next 2-week sprint",
        startDate: new Date(nextMonday.setHours(10, 0, 0, 0)),
        endDate: new Date(nextMonday.setHours(11, 0, 0, 0)),
        allDay: false,
        recurrence: "weekly",
        color: "#3b82f6",
        createdByUserId: superadminId,
        attendeeUserIds: [superadminId, adminId],
        status: "scheduled"
      },
      {
        title: "Client Demo - Acme Corp",
        description: "Product demonstration for Acme Corp team",
        startDate: new Date(tomorrow.setHours(14, 0, 0, 0)),
        endDate: new Date(tomorrow.setHours(15, 0, 0, 0)),
        allDay: false,
        recurrence: "none",
        color: "#10b981",
        createdByUserId: superadminId,
        attendeeUserIds: [superadminId, adminId, sarahId],
        status: "scheduled"
      },
      {
        title: "Q2 Budget Review",
        description: "Review Q2 financials and plan Q3 budget",
        startDate: new Date(nextTuesday.setHours(13, 0, 0, 0)),
        endDate: new Date(nextTuesday.setHours(14, 30, 0, 0)),
        allDay: false,
        recurrence: "none",
        color: "#f59e0b",
        createdByUserId: superadminId,
        attendeeUserIds: [superadminId],
        status: "scheduled"
      },
      {
        title: "Team Standup",
        description: "Daily team sync",
        startDate: new Date(today.setHours(9, 15, 0, 0)),
        endDate: new Date(today.setHours(9, 30, 0, 0)),
        allDay: false,
        recurrence: "daily",
        color: "#8b5cf6",
        createdByUserId: superadminId,
        attendeeUserIds: [superadminId, adminId, sarahId, jamesId],
        status: "scheduled"
      },
      {
        title: "Product Launch Deadline",
        description: "Final deadline for v2.0 product launch",
        startDate: new Date(nextFriday.setHours(0, 0, 0, 0)),
        endDate: new Date(nextFriday.setHours(23, 59, 59, 999)),
        allDay: true,
        recurrence: "none",
        color: "#ef4444",
        createdByUserId: superadminId,
        attendeeUserIds: [superadminId, adminId],
        status: "scheduled"
      },
      {
        title: "1:1 with Sarah",
        description: "Weekly one-on-one meeting",
        startDate: new Date(nextThursday.setHours(15, 0, 0, 0)),
        endDate: new Date(nextThursday.setHours(15, 30, 0, 0)),
        allDay: false,
        recurrence: "weekly",
        color: "#06b6d4",
        createdByUserId: superadminId,
        attendeeUserIds: [superadminId, sarahId],
        status: "scheduled"
      },
      {
        title: "Code Freeze",
        description: "Code freeze for upcoming release",
        startDate: new Date(getEndOfMonth().setHours(0, 0, 0, 0)),
        endDate: new Date(getEndOfMonth().setHours(23, 59, 59, 999)),
        allDay: true,
        recurrence: "none",
        color: "#f97316",
        createdByUserId: superadminId,
        attendeeUserIds: [superadminId, adminId, jamesId],
        status: "scheduled"
      },
      {
        title: "Company All-Hands",
        description: "Monthly company-wide meeting",
        startDate: new Date(getLastFridayOfMonth().setHours(16, 0, 0, 0)),
        endDate: new Date(getLastFridayOfMonth().setHours(17, 0, 0, 0)),
        allDay: false,
        recurrence: "monthly",
        color: "#ec4899",
        createdByUserId: superadminId,
        attendeeUserIds: [superadminId, adminId, sarahId, jamesId],
        status: "scheduled"
      }
    ]);
    logger.info("Seeded calendar events");
  }

  // Seed Support Tickets
  if ((await SupportTicketModel.countDocuments()) === 0) {
    await SupportTicketModel.create([
      {
        ticketNumber: "TKT-001",
        subject: "Login not loading on Safari",
        description: "When I try to login using Safari browser, the page just keeps spinning and doesn't load.",
        requesterName: "John Reynolds",
        requesterEmail: "john.reynolds@acmecorp.com",
        channel: "web",
        priority: "high",
        status: "open",
        tags: ["browser", "login"],
        assignedToUserId: adminId
      },
      {
        ticketNumber: "TKT-002",
        subject: "Cannot export CSV from reports",
        description: "The export button in the reports section doesn't generate a CSV file.",
        requesterName: "Emily Zhang",
        requesterEmail: "emily.zhang@globex.io",
        channel: "email",
        priority: "medium",
        status: "in_progress",
        tags: ["reports", "export"],
        assignedToUserId: sarahId,
        firstResponseAt: new Date()
      },
      {
        ticketNumber: "TKT-003",
        subject: "Password reset email not arriving",
        description: "I requested a password reset but haven't received the email after 30 minutes.",
        requesterName: "Sarah Patel",
        requesterEmail: "s.patel@soylent.co",
        channel: "chat",
        priority: "high",
        status: "pending_customer",
        tags: ["email", "password"],
        assignedToUserId: adminId,
        firstResponseAt: new Date()
      },
      {
        ticketNumber: "TKT-004",
        subject: "Charts not rendering in dark mode",
        description: "Dashboard charts appear blank when dark mode is enabled.",
        requesterName: "David Kim",
        requesterEmail: "d.kim@umbrella.net",
        channel: "web",
        priority: "low",
        status: "resolved",
        tags: ["ui", "dark-mode"],
        assignedToUserId: jamesId,
        firstResponseAt: new Date(),
        resolvedAt: new Date()
      },
      {
        ticketNumber: "TKT-005",
        subject: "API rate limit exceeded on batch import",
        description: "Getting 429 errors when trying to import a large dataset via the API.",
        requesterName: "Michael Torres",
        requesterEmail: "michael.t@initech.com",
        channel: "email",
        priority: "medium",
        status: "open",
        tags: ["api", "rate-limit"],
        assignedToUserId: jamesId
      },
      {
        ticketNumber: "TKT-006",
        subject: "Mobile layout broken on iPhone 14",
        description: "The sidebar overlaps content on iPhone 14 in portrait mode.",
        requesterName: "Lisa Anderson",
        requesterEmail: "l.anderson@waynetech.com",
        channel: "phone",
        priority: "urgent",
        status: "open",
        tags: ["mobile", "layout"],
        assignedToUserId: superadminId
      }
    ]);
    logger.info("Seeded support tickets");
  }

  // Seed Invoices
  if ((await InvoiceDocumentModelRef.countDocuments()) === 0 && michaelTorres && johnReynolds && emilyZhang && lisaAnderson) {
    await InvoiceDocumentModelRef.create([
      {
        invoiceNumber: "INV-2026-001",
        status: "issued",
        contactId: michaelTorres._id,
        currency: "USD",
        lineItems: [
          {
            description: "Consulting Services - March 2026",
            quantity: 50,
            unitPriceMinor: 25000,
            lineTotalMinor: 1250000
          }
        ],
        subtotalMinor: 1250000,
        taxMinor: 125000,
        discountMinor: 0,
        grandTotalMinor: 1375000,
        amountPaidMinor: 0,
        issuedAt: new Date(),
        dueAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      {
        invoiceNumber: "INV-2026-002",
        status: "sent",
        contactId: johnReynolds._id,
        currency: "USD",
        lineItems: [
          {
            description: "Enterprise License - Annual",
            quantity: 1,
            unitPriceMinor: 4500000,
            lineTotalMinor: 4500000
          }
        ],
        subtotalMinor: 4500000,
        taxMinor: 450000,
        discountMinor: 0,
        grandTotalMinor: 4950000,
        amountPaidMinor: 0,
        sentAt: new Date()
      },
      {
        invoiceNumber: "INV-2026-003",
        status: "paid",
        contactId: emilyZhang._id,
        currency: "USD",
        lineItems: [
          {
            description: "Platform Setup Fee",
            quantity: 1,
            unitPriceMinor: 875000,
            lineTotalMinor: 875000
          }
        ],
        subtotalMinor: 875000,
        taxMinor: 87500,
        discountMinor: 0,
        grandTotalMinor: 962500,
        amountPaidMinor: 962500,
        issuedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        sentAt: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000),
        paidAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        invoiceNumber: "INV-2026-004",
        status: "draft",
        contactId: lisaAnderson._id,
        currency: "USD",
        lineItems: [
          {
            description: "Security Suite - Annual License",
            quantity: 100,
            unitPriceMinor: 120000,
            lineTotalMinor: 12000000
          }
        ],
        subtotalMinor: 12000000,
        taxMinor: 1200000,
        discountMinor: 0,
        grandTotalMinor: 13200000,
        amountPaidMinor: 0
      }
    ]);
    logger.info("Seeded invoices");
  }

  // Seed Projects
  if ((await ProjectModel.countDocuments()) === 0) {
    const projects = await ProjectModel.create([
      {
        name: "Platform v2.0 Launch",
        description: "Complete redesign and feature overhaul for the next major version",
        status: "active",
        priority: "high",
        ownerUserId: superadminId,
        memberUserIds: [superadminId, adminId, sarahId, jamesId],
        startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        targetEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        tags: ["product", "launch"]
      },
      {
        name: "Mobile App Development",
        description: "Native mobile apps for iOS and Android",
        status: "planning",
        priority: "medium",
        ownerUserId: adminId,
        memberUserIds: [adminId, jamesId],
        tags: ["mobile", "development"]
      },
      {
        name: "Infrastructure Migration",
        description: "Migrate from on-premise to cloud infrastructure",
        status: "on_hold",
        priority: "critical",
        ownerUserId: superadminId,
        memberUserIds: [superadminId, jamesId],
        tags: ["infrastructure", "cloud"]
      }
    ]);
    logger.info(`Seeded ${projects.length} projects`);
  }

  // Get project references
  const platformProject = await ProjectModel.findOne({ name: "Platform v2.0 Launch" }).exec();

  // Seed Tasks
  if ((await TaskModel.countDocuments()) === 0) {
    await TaskModel.create([
      {
        title: "Implement user onboarding flow",
        description: "Create step-by-step onboarding wizard for new users",
        projectId: platformProject?._id,
        status: "in_progress",
        priority: "high",
        assigneeUserId: superadminId,
        reporterUserId: superadminId,
        estimatedHours: 16,
        tags: ["frontend", "ux"]
      },
      {
        title: "Fix mobile responsive layout",
        description: "Address layout issues on mobile devices",
        projectId: platformProject?._id,
        status: "todo",
        priority: "critical",
        assigneeUserId: adminId,
        reporterUserId: superadminId,
        estimatedHours: 8,
        tags: ["bug", "mobile"]
      },
      {
        title: "Write API documentation",
        description: "Document all public API endpoints with examples",
        status: "review",
        priority: "medium",
        assigneeUserId: sarahId,
        reporterUserId: adminId,
        estimatedHours: 12,
        tags: ["documentation", "api"]
      },
      {
        title: "Setup CI/CD pipeline",
        description: "Configure automated testing and deployment pipeline",
        status: "done",
        priority: "high",
        assigneeUserId: jamesId,
        reporterUserId: superadminId,
        completedAt: new Date(),
        estimatedHours: 20,
        tags: ["devops", "infrastructure"]
      },
      {
        title: "Database backup automation",
        description: "Implement automated daily database backups",
        status: "todo",
        priority: "medium",
        assigneeUserId: superadminId,
        reporterUserId: jamesId,
        estimatedHours: 6,
        tags: ["database", "automation"]
      },
      {
        title: "Performance audit report",
        description: "Conduct comprehensive performance analysis and optimization",
        projectId: platformProject?._id,
        status: "in_progress",
        priority: "high",
        assigneeUserId: adminId,
        reporterUserId: superadminId,
        estimatedHours: 24,
        tags: ["performance", "optimization"]
      },
      {
        title: "Dark mode email templates",
        description: "Update email templates to support dark mode",
        status: "todo",
        priority: "low",
        assigneeUserId: sarahId,
        reporterUserId: adminId,
        estimatedHours: 4,
        tags: ["email", "design"]
      },
      {
        title: "Security penetration testing",
        description: "Conduct security audit and penetration testing",
        status: "todo",
        priority: "critical",
        assigneeUserId: jamesId,
        reporterUserId: superadminId,
        estimatedHours: 40,
        tags: ["security", "testing"]
      }
    ]);
    logger.info("Seeded tasks");
  }

  // Seed Todo Items
  if ((await TodoItemModel.countDocuments()) === 0) {
    await TodoItemModel.create([
      // Superadmin todos
      {
        title: "Review PR #142",
        description: "Code review for authentication refactoring",
        status: "pending",
        priority: "high",
        ownerUserId: superadminId,
        tags: ["code-review"]
      },
      {
        title: "Update deployment docs",
        description: "Add new environment variables to deployment guide",
        status: "pending",
        priority: "medium",
        ownerUserId: superadminId,
        tags: ["documentation"]
      },
      {
        title: "Schedule sprint planning",
        description: "Send calendar invites for next sprint planning session",
        status: "completed",
        priority: "medium",
        ownerUserId: superadminId,
        completedAt: new Date(),
        tags: ["meeting"]
      },
      {
        title: "Order new monitors",
        description: "Purchase 4K monitors for the team",
        status: "pending",
        priority: "low",
        ownerUserId: superadminId,
        tags: ["equipment"]
      },
      {
        title: "Prepare quarterly report",
        description: "Compile Q1 metrics and prepare presentation",
        status: "pending",
        priority: "high",
        ownerUserId: superadminId,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        tags: ["reporting"]
      },
      {
        title: "Renew SSL certificates",
        description: "SSL certs expire next month - renew before deadline",
        status: "pending",
        priority: "high",
        ownerUserId: superadminId,
        dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        tags: ["security"]
      },
      // Admin todos
      {
        title: "Fix login page CSS",
        description: "Alignment issues on the login form",
        status: "pending",
        priority: "medium",
        ownerUserId: adminId,
        tags: ["bug", "frontend"]
      },
      {
        title: "Add export to PDF",
        description: "Implement PDF export functionality for reports",
        status: "pending",
        priority: "high",
        ownerUserId: adminId,
        tags: ["feature"]
      },
      {
        title: "Update user guide",
        description: "Add documentation for new features",
        status: "pending",
        priority: "low",
        ownerUserId: adminId,
        tags: ["documentation"]
      },
      {
        title: "Test payment flow",
        description: "End-to-end testing of new payment integration",
        status: "pending",
        priority: "high",
        ownerUserId: adminId,
        tags: ["testing"]
      },
      {
        title: "Review security audit",
        description: "Review findings from latest security audit",
        status: "completed",
        priority: "critical",
        ownerUserId: adminId,
        completedAt: new Date(),
        tags: ["security"]
      },
      {
        title: "Setup staging environment",
        description: "Configure new staging server for testing",
        status: "pending",
        priority: "medium",
        ownerUserId: adminId,
        tags: ["infrastructure"]
      }
    ]);
    logger.info("Seeded todo items");
  }

  // Seed Chat Conversations and Messages
  if ((await ChatConversationModel.countDocuments()) === 0) {
    const conv1 = await ChatConversationModel.create({
      title: "General Discussion",
      participantUserIds: [superadminId, adminId, sarahId, jamesId],
      status: "active",
      createdByUserId: superadminId,
      messageCount: 6,
      lastMessageAt: new Date()
    });

    const conv2 = await ChatConversationModel.create({
      title: "Project Alpha Updates",
      participantUserIds: [superadminId, adminId],
      status: "active",
      createdByUserId: superadminId,
      messageCount: 4,
      lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
    });

    const conv3 = await ChatConversationModel.create({
      title: "Support Escalations",
      participantUserIds: [adminId, sarahId, jamesId],
      status: "active",
      createdByUserId: adminId,
      messageCount: 5,
      lastMessageAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
    });

    // Messages for conv1
    await ChatMessageModel.create([
      {
        conversationId: conv1._id,
        senderUserId: superadminId,
        senderEmail: "superadmin@admin.local",
        content: "Hey team, welcome to the general discussion channel!",
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000)
      },
      {
        conversationId: conv1._id,
        senderUserId: adminId,
        senderEmail: "admin@admin.local",
        content: "Thanks! Excited to collaborate here.",
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000)
      },
      {
        conversationId: conv1._id,
        senderUserId: sarahId,
        senderEmail: "sarah.wilson@admin.local",
        content: "Looking forward to working with everyone!",
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000)
      },
      {
        conversationId: conv1._id,
        senderUserId: jamesId,
        senderEmail: "james.chen@admin.local",
        content: "Just finished the CI/CD setup - all tests passing!",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        conversationId: conv1._id,
        senderUserId: superadminId,
        senderEmail: "superadmin@admin.local",
        content: "Great work James! That was a critical milestone.",
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
      },
      {
        conversationId: conv1._id,
        senderUserId: adminId,
        senderEmail: "admin@admin.local",
        content: "Anyone available for a quick sync this afternoon?",
        createdAt: new Date()
      }
    ]);

    // Messages for conv2
    await ChatMessageModel.create([
      {
        conversationId: conv2._id,
        senderUserId: superadminId,
        senderEmail: "superadmin@admin.local",
        content: "Project Alpha is progressing well. We're on track for the deadline.",
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000)
      },
      {
        conversationId: conv2._id,
        senderUserId: adminId,
        senderEmail: "admin@admin.local",
        content: "Good to hear. I've completed the performance audit.",
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000)
      },
      {
        conversationId: conv2._id,
        senderUserId: superadminId,
        senderEmail: "superadmin@admin.local",
        content: "Excellent. Can you share the findings in tomorrow's standup?",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        conversationId: conv2._id,
        senderUserId: adminId,
        senderEmail: "admin@admin.local",
        content: "Will do. I'll prepare a summary.",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      }
    ]);

    // Messages for conv3
    await ChatMessageModel.create([
      {
        conversationId: conv3._id,
        senderUserId: adminId,
        senderEmail: "admin@admin.local",
        content: "We have a critical ticket from Lisa Anderson - mobile layout issue.",
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000)
      },
      {
        conversationId: conv3._id,
        senderUserId: sarahId,
        senderEmail: "sarah.wilson@admin.local",
        content: "I saw that. iPhone 14 portrait mode, right?",
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      },
      {
        conversationId: conv3._id,
        senderUserId: adminId,
        senderEmail: "admin@admin.local",
        content: "Correct. Can we prioritize this?",
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      },
      {
        conversationId: conv3._id,
        senderUserId: jamesId,
        senderEmail: "james.chen@admin.local",
        content: "I can take a look after the security testing.",
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      },
      {
        conversationId: conv3._id,
        senderUserId: sarahId,
        senderEmail: "sarah.wilson@admin.local",
        content: "I'll start on it now. Should have a fix by EOD.",
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    ]);

    logger.info("Seeded chat conversations and messages");
  }

  // Seed Mailbox Messages
  if ((await MailboxMessageModel.countDocuments()) === 0) {
    await MailboxMessageModel.create([
      // Inbox messages for superadmin
      {
        subject: "Q2 Revenue Report",
        body: "Please find attached the Q2 revenue report for your review. Key highlights include a 23% increase in ARR and expansion in the enterprise segment.\n\nLet me know if you have any questions.\n\nBest regards,\nCFO",
        fromAddress: "cfo@company.com",
        fromName: "CFO",
        toAddresses: ["superadmin@admin.local"],
        ccAddresses: [],
        bccAddresses: [],
        folder: "inbox",
        status: "unread",
        isStarred: false,
        hasAttachments: false,
        attachments: [],
        ownerUserId: superadminId,
        sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        subject: "High CPU Usage Alert",
        body: "Alert: Server cpu-02 has exceeded 90% CPU usage for the past 15 minutes.\n\nTimestamp: " + new Date().toISOString() + "\nServer: cpu-02\nCurrent Usage: 94%\n\nPlease investigate.",
        fromAddress: "monitoring@infra.local",
        fromName: "Infrastructure Monitor",
        toAddresses: ["superadmin@admin.local"],
        ccAddresses: [],
        bccAddresses: [],
        folder: "inbox",
        status: "read",
        isStarred: false,
        hasAttachments: false,
        attachments: [],
        ownerUserId: superadminId,
        sentAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
      },
      {
        subject: "Partnership Proposal",
        body: "Dear Admin Team,\n\nI hope this email finds you well. We are reaching out to explore a potential partnership opportunity between our organizations.\n\nWe believe there are significant synergies that could benefit both parties. Would you be available for a call next week to discuss further?\n\nBest regards,\nBusiness Development Team",
        fromAddress: "bd@partner.co",
        fromName: "Business Development",
        toAddresses: ["superadmin@admin.local"],
        ccAddresses: [],
        bccAddresses: [],
        folder: "inbox",
        status: "unread",
        isStarred: true,
        hasAttachments: false,
        attachments: [],
        ownerUserId: superadminId,
        sentAt: new Date(Date.now() - 6 * 60 * 60 * 1000)
      },
      // Sent messages for admin
      {
        subject: "Re: Q2 Revenue Report",
        body: "Thank you for the report. The numbers look great! I've reviewed the highlights and will discuss with the team in tomorrow's meeting.\n\nBest,\nAdmin",
        fromAddress: "admin@admin.local",
        fromName: "Admin",
        toAddresses: ["cfo@company.com"],
        ccAddresses: [],
        bccAddresses: [],
        folder: "sent",
        status: "read",
        isStarred: false,
        hasAttachments: false,
        attachments: [],
        ownerUserId: adminId,
        sentAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
      },
      {
        subject: "Team Update - Sprint 14",
        body: "Hi everyone,\n\nHere's our sprint 14 update:\n\n✅ Completed:\n- CI/CD pipeline setup\n- API documentation\n- Performance audit\n\n🚧 In Progress:\n- User onboarding flow\n- Mobile responsive fixes\n\n📅 Next Sprint:\n- Security testing\n- Dark mode email templates\n\nGreat work team! Keep it up.\n\nBest,\nAdmin",
        fromAddress: "admin@admin.local",
        fromName: "Admin",
        toAddresses: ["team@company.com"],
        ccAddresses: ["superadmin@admin.local"],
        bccAddresses: [],
        folder: "sent",
        status: "read",
        isStarred: false,
        hasAttachments: false,
        attachments: [],
        ownerUserId: adminId,
        sentAt: new Date(Date.now() - 12 * 60 * 60 * 1000)
      },
      // Draft message for admin
      {
        subject: "Vendor Contract Review",
        body: "Dear Vendor Team,\n\nI wanted to follow up on the contract we discussed last month. We've reviewed the terms and have a few questions:\n\n1. Can we negotiate the payment terms?\n2. What's the SLA for critical issues?\n3. \n\n[Draft - need to complete]",
        fromAddress: "admin@admin.local",
        fromName: "Admin",
        toAddresses: ["vendor@example.com"],
        ccAddresses: [],
        bccAddresses: [],
        folder: "drafts",
        status: "read",
        isStarred: false,
        hasAttachments: false,
        attachments: [],
        ownerUserId: adminId
      }
    ]);
    logger.info("Seeded mailbox messages");
  }

  // Seed Job Postings and Applications
  if ((await JobPostingModel.countDocuments()) === 0) {
    const job1 = await JobPostingModel.create({
      title: "Senior Full Stack Developer",
      description: "We are seeking an experienced Full Stack Developer to join our engineering team. You will work on building scalable web applications using modern technologies.\n\nResponsibilities:\n- Design and develop full-stack features\n- Collaborate with product and design teams\n- Mentor junior developers\n- Participate in code reviews\n\nRequirements:\n- 5+ years of experience with TypeScript/JavaScript\n- Strong knowledge of React and Node.js\n- Experience with PostgreSQL or MongoDB\n- Excellent problem-solving skills",
      department: "Engineering",
      location: "Remote",
      employmentType: "full_time",
      experienceLevel: "senior",
      salaryMinMinor: 12000000,
      salaryMaxMinor: 18000000,
      currency: "USD",
      status: "open",
      postedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      createdByUserId: superadminId,
      tags: ["engineering", "full-stack", "remote"]
    });

    const job2 = await JobPostingModel.create({
      title: "Product Designer",
      description: "Join our design team to create beautiful, user-friendly interfaces for our platform.\n\nResponsibilities:\n- Create wireframes, prototypes, and high-fidelity designs\n- Conduct user research and usability testing\n- Collaborate with engineers to implement designs\n- Maintain design system\n\nRequirements:\n- 3+ years of product design experience\n- Proficiency in Figma\n- Strong portfolio demonstrating UX/UI skills\n- Experience with design systems",
      department: "Design",
      location: "Hybrid - NYC",
      employmentType: "full_time",
      experienceLevel: "mid",
      salaryMinMinor: 9000000,
      salaryMaxMinor: 13000000,
      currency: "USD",
      status: "open",
      postedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      createdByUserId: superadminId,
      tags: ["design", "ui-ux", "hybrid"]
    });

    const job3 = await JobPostingModel.create({
      title: "DevOps Engineer",
      description: "Help us build and maintain our cloud infrastructure and deployment pipelines.\n\nResponsibilities:\n- Manage cloud infrastructure (AWS/GCP)\n- Build and maintain CI/CD pipelines\n- Monitor system performance and reliability\n- Implement security best practices\n\nRequirements:\n- 3+ years of DevOps experience\n- Strong knowledge of Docker and Kubernetes\n- Experience with Terraform or similar IaC tools\n- Proficiency in scripting (Bash, Python)",
      department: "Infrastructure",
      location: "Remote",
      employmentType: "full_time",
      experienceLevel: "mid",
      salaryMinMinor: 10000000,
      salaryMaxMinor: 15000000,
      currency: "USD",
      status: "draft",
      createdByUserId: superadminId,
      tags: ["devops", "infrastructure", "remote"]
    });

    // Applications for job1
    await JobApplicationModel.create([
      {
        jobId: job1._id,
        applicantName: "Alex Johnson",
        applicantEmail: "alex.johnson@example.com",
        resumeUrl: "https://example.com/resumes/alex-johnson.pdf",
        coverLetter: "I am excited to apply for the Senior Full Stack Developer position. With over 7 years of experience building scalable web applications, I believe I would be a great fit for your team.",
        status: "submitted",
        appliedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        jobId: job1._id,
        applicantName: "Maria Garcia",
        applicantEmail: "maria.garcia@example.com",
        resumeUrl: "https://example.com/resumes/maria-garcia.pdf",
        coverLetter: "I have been following your company for years and am impressed by your commitment to quality. I would love to contribute my full-stack expertise to your team.",
        status: "screening",
        appliedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
      },
      {
        jobId: job1._id,
        applicantName: "Robert Chen",
        applicantEmail: "robert.chen@example.com",
        resumeUrl: "https://example.com/resumes/robert-chen.pdf",
        coverLetter: "As a senior engineer with extensive experience in React and Node.js, I am confident I can make an immediate impact on your engineering team.",
        status: "interview",
        appliedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000)
      },
      {
        jobId: job1._id,
        applicantName: "Emma Wilson",
        applicantEmail: "emma.wilson@example.com",
        resumeUrl: "https://example.com/resumes/emma-wilson.pdf",
        coverLetter: "I am thrilled about the opportunity to join your team. My background in building high-performance web applications aligns perfectly with this role.",
        status: "offered",
        appliedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      }
    ]);

    // Applications for job2
    await JobApplicationModel.create([
      {
        jobId: job2._id,
        applicantName: "James Park",
        applicantEmail: "james.park@example.com",
        resumeUrl: "https://example.com/resumes/james-park.pdf",
        coverLetter: "I am passionate about creating delightful user experiences. My portfolio showcases my work on several successful SaaS products.",
        status: "submitted",
        appliedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      },
      {
        jobId: job2._id,
        applicantName: "Sophie Brown",
        applicantEmail: "sophie.brown@example.com",
        resumeUrl: "https://example.com/resumes/sophie-brown.pdf",
        coverLetter: "As a product designer with a strong background in user research, I would love to help shape the future of your platform.",
        status: "screening",
        appliedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
      }
    ]);

    logger.info("Seeded job postings and applications");
  }

  // Seed Notifications
  if ((await NotificationModel.countDocuments()) === 0) {
    await NotificationModel.create([
      // Superadmin notifications
      {
        userId: superadminId,
        title: "System Update Completed",
        body: "Platform v3.2.1 deployed successfully",
        type: "success",
        read: false,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        userId: superadminId,
        title: "New Ticket Assigned",
        body: "TKT-006 - Mobile layout broken",
        type: "info",
        read: false,
        link: "/modules/support-tickets",
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000)
      },
      {
        userId: superadminId,
        title: "High CPU Usage Detected",
        body: "Server cpu-02 exceeded 90% usage",
        type: "warning",
        read: true,
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000)
      },
      {
        userId: superadminId,
        title: "Payment Failed",
        body: "Subscription renewal failed for Acme Corp",
        type: "error",
        read: false,
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000)
      },
      // Admin notifications
      {
        userId: adminId,
        title: "New User Registration",
        body: "james.chen@admin.local has joined",
        type: "info",
        read: true,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      },
      {
        userId: adminId,
        title: "Monthly Report Ready",
        body: "March 2026 analytics report generated",
        type: "success",
        read: false,
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000)
      },
      {
        userId: adminId,
        title: "SSL Certificate Expiring",
        body: "Certificate for api.admin.local expires in 14 days",
        type: "warning",
        read: false,
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000)
      },
      {
        userId: adminId,
        title: "Backup Completed",
        body: "Daily database backup completed successfully",
        type: "success",
        read: true,
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
      }
    ]);
    logger.info("Seeded notifications");
  }

  // Seed Audit Log
  if ((await AuditLogModel.countDocuments()) === 0) {
    await AuditLogModel.create([
      {
        action: "create",
        entity: "User",
        entityId: sarahId,
        userId: superadminId,
        userEmail: "superadmin@admin.local",
        after: { email: "sarah.wilson@admin.local", role: "admin" },
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      },
      {
        action: "create",
        entity: "User",
        entityId: jamesId,
        userId: superadminId,
        userEmail: "superadmin@admin.local",
        after: { email: "james.chen@admin.local", role: "admin" },
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      },
      {
        action: "update",
        entity: "FeatureConfig",
        userId: superadminId,
        userEmail: "superadmin@admin.local",
        before: { enabledModules: [] },
        after: { enabledModules: ["crm", "ecommerce", "calendar"] },
        createdAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)
      },
      {
        action: "create",
        entity: "Project",
        userId: superadminId,
        userEmail: "superadmin@admin.local",
        after: { name: "Platform v2.0 Launch", status: "active" },
        createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000)
      },
      {
        action: "create",
        entity: "CustomRole",
        userId: superadminId,
        userEmail: "superadmin@admin.local",
        after: { name: "Support Manager", permissions: ["support-tickets:read", "support-tickets:create"] },
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
      },
      {
        action: "update",
        entity: "Task",
        userId: jamesId,
        userEmail: "james.chen@admin.local",
        before: { status: "in_progress" },
        after: { status: "done" },
        metadata: { title: "Setup CI/CD pipeline" },
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        action: "create",
        entity: "Invoice",
        userId: adminId,
        userEmail: "admin@admin.local",
        after: { invoiceNumber: "INV-2026-001", status: "issued", grandTotalMinor: 1375000 },
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
      },
      {
        action: "update",
        entity: "SupportTicket",
        userId: jamesId,
        userEmail: "james.chen@admin.local",
        before: { status: "in_progress" },
        after: { status: "resolved" },
        metadata: { ticketNumber: "TKT-004" },
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      },
      {
        action: "create",
        entity: "CrmDeal",
        userId: adminId,
        userEmail: "admin@admin.local",
        after: { title: "Wayne Tech Security Suite", amountValue: 85000, status: "won" },
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      },
      {
        action: "delete",
        entity: "TodoItem",
        userId: superadminId,
        userEmail: "superadmin@admin.local",
        before: { title: "Old todo item", status: "completed" },
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      }
    ]);
    logger.info("Seeded audit log entries");
  }

  // Seed Portfolio CMS data
  await seedPortfolioData();

  logger.info("Module data seeding completed successfully!");
}
