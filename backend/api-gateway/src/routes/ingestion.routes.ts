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

/**
 * @swagger
 * /api/ingestion/stream:
 *   post:
 *     summary: Ingest AI/ML event stream data
 *     description: Accept hazard or cyber threat event stream data from AI/ML ingestion sources.
 *     tags:
 *       - Data Ingestion
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - event_id
 *               - timestamp
 *               - event_type
 *               - source
 *               - location
 *               - payload
 *             properties:
 *               event_id:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-05-06T15:30:00Z"
 *
 *               event_type:
 *                 type: string
 *                 enum:
 *                   - hazard_only
 *                   - cyber_only
 *                   - combined_correlation
 *                 example: "hazard_only"
 *
 *               source:
 *                 type: string
 *                 example: "AI/ML Detection Engine"
 *
 *               location:
 *                 type: object
 *                 required:
 *                   - state_region
 *                   - local_government_area
 *                   - suburb
 *                 properties:
 *                   state_region:
 *                     type: string
 *                     example: "Victoria"
 *
 *                   local_government_area:
 *                     type: string
 *                     example: "Melbourne"
 *
 *                   suburb:
 *                     type: string
 *                     example: "Docklands"
 *
 *               payload:
 *                 type: object
 *                 required:
 *                   - event_type
 *                   - risk_score
 *                   - severity
 *                   - confidence
 *                   - timestamp
 *                   - model_version
 *                 properties:
 *                   event_type:
 *                     type: string
 *                     enum:
 *                       - hazard
 *                       - cyber
 *                     example: "hazard"
 *
 *                   risk_score:
 *                     type: number
 *                     format: float
 *                     example: 0.92
 *
 *                   severity:
 *                     type: string
 *                     example: "high"
 *
 *                   confidence:
 *                     type: number
 *                     format: float
 *                     example: 0.97
 *
 *                   hazard_type:
 *                     type: string
 *                     example: "flood"
 *
 *                   cyber_threat:
 *                     type: string
 *                     example: "phishing"
 *
 *                   recommended_action:
 *                     type: string
 *                     example: "Notify emergency response team"
 *
 *                   top_risk_factors:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example:
 *                       - "Heavy rainfall"
 *                       - "River overflow"
 *
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *                     example: "2026-05-06T15:30:00Z"
 *
 *                   model_version:
 *                     type: string
 *                     example: "v1.2.0"
 *
 *     responses:
 *       200:
 *         description: Data ingestion successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                   example: 200
 *
 *                 message:
 *                   type: string
 *                   example: "Data ingestion successful"
 *
 *                 data:
 *                   type: array
 *                   example: []
 *
 *       400:
 *         description: Invalid request payload
 *
 *       500:
 *         description: Internal server error
 */
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

/**
 * @swagger
 * /api/ingestion/core:
 *   post:
 *     summary: Submit hazard context for asynchronous M7 model analysis
 *     description: Runs the packaged M7 hazard-severity baseline. This model is not production-eligible and is not the final phishing model.
 *     tags:
 *       - Data Ingestion
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *               - hazard_type
 *               - hazard_location
 *               - hazard_status
 *               - source
 *             properties:
 *               text:
 *                 type: string
 *                 maxLength: 5000
 *                 example: Urgent flood relief payment
 *               hazard_type:
 *                 type: string
 *                 example: flood
 *               hazard_location:
 *                 type: string
 *                 example: Victoria
 *               hazard_status:
 *                 type: string
 *                 example: active
 *               source:
 *                 type: string
 *                 example: OpenPhish
 *               url:
 *                 type: string
 *                 format: uri
 *                 maxLength: 2048
 *                 description: Optional reference URL
 *     responses:
 *       202:
 *         description: Analysis accepted; poll status_url for the result
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Request could not be queued
 */
router.post("/core", authenticate, coreModelIntegration);

export default router;
