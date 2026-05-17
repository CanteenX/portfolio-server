import "dotenv/config";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Express } from "express";
import { createApp } from "../src/app";
import { connectDatabase } from "../src/config/db";
import { seedMenusIfEmpty } from "../src/modules/menu/menu.seed";
import { logger } from "../src/core/logging/logger";

type CachedState = {
  appPromise: Promise<Express> | null;
};

const globalState = globalThis as unknown as { __serverState?: CachedState };
if (!globalState.__serverState) {
  globalState.__serverState = { appPromise: null };
}

async function getApp(): Promise<Express> {
  const state = globalState.__serverState!;
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

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await getApp();
  return (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
}

export const config = {
  api: {
    bodyParser: false,
  },
};
