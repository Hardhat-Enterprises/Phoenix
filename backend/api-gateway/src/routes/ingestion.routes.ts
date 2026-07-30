import { Router } from "express";
import {
  coreModelIntegration,
  getHealth,
  ingestHazardData,
  ingestCyberData,
} from "../controllers/ingestion.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();

/**
 * @swagger
 * /api/ingestion/health:
 *   get:
 *     summary: Check Data Ingestion Service health
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: API service is running
 */
router.get("/health", getHealth);

router.post(
  "/hazard",
  authenticate,
  authorize(["ingestion service"]),
  ingestHazardData,
);

router.post(
  "/cyber",
  authenticate,
  authorize(["ingestion service"]),
  ingestCyberData,
);

router.post("/core", authenticate, coreModelIntegration);

export default router;
