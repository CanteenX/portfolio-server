import type { ModuleKey } from "./modules.js";

export type ModuleRecord = {
  id: string;
  moduleKey: ModuleKey;
  title: string;
  description?: string;
  status: "active" | "inactive" | "archived";
  data?: Record<string, unknown>;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
};

export type ListModuleRecordsResponse = {
  items: ModuleRecord[];
  page: number;
  limit: number;
  total: number;
};

export type CreateModuleRecordPayload = {
  title: string;
  description?: string;
  status?: "active" | "inactive" | "archived";
  data?: Record<string, unknown>;
};

export type UpdateModuleRecordPayload = Partial<CreateModuleRecordPayload>;
