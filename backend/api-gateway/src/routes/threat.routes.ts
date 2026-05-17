import { Router } from "express";

import {
  getThreatHealth,
  getThreats,
  getThreatStats,
  ingestThreat,
} from "../controllers/threat.controller";

const router = Router();

router.get("/health", getThreatHealth);

router.get("/stats", getThreatStats);

router.get("/", getThreats);

router.post("/ingest", ingestThreat);

export default router;
