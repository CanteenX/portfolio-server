import { MODULE_KEYS } from "@admin-platform/shared-types";
import type { ModuleKey } from "@admin-platform/shared-types";
import type { ModuleManifest } from "../bootstrap/module.types";
import {
  createModuleRecordHandler,
  deleteModuleRecordHandler,
  getModuleRecordByIdHandler,
  listModuleRecordsHandler,
  updateModuleRecordHandler
} from "./resource/resource.handlers";

export const moduleManifests: ModuleManifest[] = MODULE_KEYS.map((moduleKey) => ({
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
