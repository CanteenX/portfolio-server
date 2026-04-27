export type EcommerceProduct = {
  _id: string;
  title: string;
  sku: string;
  description?: string;
  priceMinor: number;
  currency: string;
  stock: number;
  status: "draft" | "active" | "archived";
};

export type EcommerceOrder = {
  _id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: "open" | "paid" | "shipped" | "completed" | "cancelled" | "refunded";
  currency: string;
  lineItems: Array<{
    productId: string;
    title: string;
    sku: string;
    qty: number;
    unitPriceMinor: number;
    lineTotalMinor: number;
  }>;
  subtotalMinor: number;
  taxMinor: number;
  shippingMinor: number;
  grandTotalMinor: number;
  stockReverted: boolean;
  payment: {
    provider?: "stripe" | "paypal" | "razorpay";
    status: "none" | "initiated" | "pending_capture" | "succeeded" | "failed" | "refunded";
    amountMinor: number;
    currency: string;
    providerOrderId?: string;
    providerPaymentId?: string;
    idempotencyKey?: string;
    lastEventId?: string;
    failureCode?: string;
    failureMessage?: string;
    succeededAt?: string;
    updatedAt?: string;
  };
};

export type CrmContact = {
  _id: string;
  displayName: string;
  primaryEmail?: string;
  primaryPhone?: string;
  companyName?: string;
  ownerUserId?: string;
  tags?: string[];
  notes?: string;
};

export type CrmPipeline = {
  _id: string;
  name: string;
  isDefault: boolean;
  stages: Array<{
    key: string;
    label: string;
    order: number;
    isTerminalWon?: boolean;
    isTerminalLost?: boolean;
  }>;
};

export type CrmDeal = {
  _id: string;
  title: string;
  contactId: string;
  pipelineId: string;
  stageKey: string;
  amountValue: number;
  currency: string;
  status: "open" | "won" | "lost";
  expectedCloseDate?: string;
  ownerUserId?: string;
  lostReason?: string;
};

export type InvoiceDocument = {
  _id: string;
  invoiceNumber: string;
  status:
    | "draft"
    | "issued"
    | "sent"
    | "partially_paid"
    | "overdue"
    | "paid"
    | "void"
    | "uncollectible";
  currency: string;
  subtotalMinor: number;
  taxMinor: number;
  discountMinor: number;
  grandTotalMinor: number;
  amountPaidMinor: number;
};

export type SupportTicket = {
  _id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  requesterName: string;
  requesterEmail: string;
  channel: "email" | "chat" | "phone" | "web";
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "pending_customer" | "resolved" | "closed";
  tags: string[];
  assignedToUserId?: string;
  firstResponseAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  comments: Array<{
    authorUserId: string;
    authorEmail: string;
    message: string;
    isInternal: boolean;
    createdAt: string;
  }>;
};

export type SupportTicketListItem = Omit<SupportTicket, "comments"> & {
  commentsCount?: number;
};

export type FileManagerEntry = {
  _id: string;
  name: string;
  kind: "folder" | "file";
  parentId?: string | null;
  sizeBytes?: number;
  mimeType?: string;
  extension?: string;
  status: "active" | "trashed";
  tags: string[];
  isStarred: boolean;
  createdByUserId: string;
  updatedByUserId: string;
  trashedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type FileManagerInsights = {
  counts: {
    totalFiles: number;
    totalFolders: number;
    trashedEntries: number;
    starredEntries: number;
    totalSizeBytes: number;
  };
};

export type ApiManagementKey = {
  _id: string;
  name: string;
  description?: string;
  scopes: string[];
  status: "active" | "revoked";
  keyPrefix: string;
  keyLast4: string;
  createdByUserId: string;
  revokedAt?: string | null;
  revokedByUserId?: string | null;
  lastUsedAt?: string | null;
  expiresAt?: string | null;
  rotatedFromKeyId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ApiManagementKeyAuditEvent = {
  _id: string;
  keyId: string;
  action: "issued" | "revoked" | "regenerated";
  actorUserId: string;
  metadata: Record<string, unknown>;
  createdAt?: string | null;
};

// ── Chat ────────────────────────────────────────────────────────────────

export type ChatConversation = {
  _id: string;
  title: string;
  participantUserIds: string[];
  status: "active" | "archived";
  lastMessageAt?: string;
  messageCount: number;
  createdByUserId: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ChatMessage = {
  _id: string;
  conversationId: string;
  senderUserId: string;
  senderEmail: string;
  content: string;
  editedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

// ── Mailbox ─────────────────────────────────────────────────────────────

export type MailboxMessage = {
  _id: string;
  subject: string;
  body: string;
  fromAddress: string;
  fromName: string;
  toAddresses: string[];
  ccAddresses: string[];
  bccAddresses: string[];
  folder: "inbox" | "sent" | "drafts" | "trash" | "archive";
  status: "unread" | "read" | "flagged";
  isStarred: boolean;
  hasAttachments: boolean;
  inReplyToId?: string;
  ownerUserId: string;
  sentAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

// ── Projects ────────────────────────────────────────────────────────────

export type Project = {
  _id: string;
  name: string;
  description?: string;
  status: "planning" | "active" | "on_hold" | "completed" | "archived";
  ownerUserId: string;
  memberUserIds: string[];
  startDate?: string;
  targetEndDate?: string;
  actualEndDate?: string;
  tags: string[];
  priority: "low" | "medium" | "high" | "critical";
  createdAt?: string;
  updatedAt?: string;
};

// ── Tasks ───────────────────────────────────────────────────────────────

export type Task = {
  _id: string;
  title: string;
  description?: string;
  projectId?: string;
  status: "todo" | "in_progress" | "review" | "done" | "cancelled";
  priority: "low" | "medium" | "high" | "critical";
  assigneeUserId?: string;
  reporterUserId: string;
  dueDate?: string;
  completedAt?: string;
  tags: string[];
  estimatedHours?: number;
  createdAt?: string;
  updatedAt?: string;
};

// ── Calendar ────────────────────────────────────────────────────────────

export type CalendarEvent = {
  _id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  location?: string;
  status: "scheduled" | "cancelled";
  recurrence: "none" | "daily" | "weekly" | "monthly";
  color?: string;
  createdByUserId: string;
  attendeeUserIds: string[];
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
};

// ── ToDo ────────────────────────────────────────────────────────────────

export type TodoItem = {
  _id: string;
  title: string;
  description?: string;
  status: "pending" | "completed";
  priority: "low" | "medium" | "high";
  dueDate?: string;
  completedAt?: string;
  ownerUserId: string;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
};

// ── Job ─────────────────────────────────────────────────────────────────

export type JobPosting = {
  _id: string;
  title: string;
  description: string;
  department: string;
  location: string;
  employmentType: "full_time" | "part_time" | "contract" | "internship";
  experienceLevel: "entry" | "mid" | "senior" | "lead";
  salaryMinMinor?: number;
  salaryMaxMinor?: number;
  currency: string;
  status: "draft" | "open" | "closed" | "filled";
  postedAt?: string;
  closedAt?: string;
  createdByUserId: string;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type JobApplication = {
  _id: string;
  jobId: string;
  applicantName: string;
  applicantEmail: string;
  resumeUrl?: string;
  coverLetter?: string;
  status: "submitted" | "screening" | "interview" | "offered" | "hired" | "rejected" | "withdrawn";
  notes?: string;
  appliedAt: string;
  createdAt?: string;
  updatedAt?: string;
};
