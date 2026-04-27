import { Router } from "express";
import mongoose from "mongoose";

const router = Router();

router.get("/api/v1/system/health", (_req, res) => {
  const mongoState = mongoose.connection.readyState;
  const mongoOk = mongoState === 1; // 1 = connected
  const status = mongoOk ? "ok" : "degraded";

  res.status(mongoOk ? 200 : 503).json({
    status,
    uptime: Math.floor(process.uptime()),
    mongo: mongoOk ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

export const healthRoutes = router;
