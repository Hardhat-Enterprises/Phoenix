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
 *     summary: Check ingestion service health
 *     description: Returns the operational status of the data ingestion service.
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Data ingestion service is running"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 500
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 */
router.get("/health", getHealth);

/**
 * @swagger
 * /api/ingestion/hazard:
 *   post:
 *     summary: Ingest hazard event data
 *     description: Accepts hazard stream data from AI/ML systems and publishes it for downstream processing.
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
 *               - event_id
 *               - timestamp
 *               - event_type
 *               - source
 *               - location
 *               - payload
 *             properties:
 *               event_id:
 *                 type: string
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-05-06T15:30:00Z"
 *               event_type:
 *                 type: string
 *                 example: "hazard_only"
 *               source:
 *                 type: string
 *                 example: "AI/ML Detection Engine"
 *               location:
 *                 type: object
 *                 properties:
 *                   state_region:
 *                     type: string
 *                     example: "Victoria"
 *                   local_government_area:
 *                     type: string
 *                     example: "Melbourne"
 *                   suburb:
 *                     type: string
 *                     example: "Docklands"
 *               payload:
 *                 type: object
 *                 properties:
 *                   event_type:
 *                     type: string
 *                     example: "hazard"
 *                   risk_score:
 *                     type: number
 *                     example: 0.92
 *                   severity:
 *                     type: string
 *                     example: "high"
 *                   confidence:
 *                     type: number
 *                     example: 0.97
 *                   hazard_type:
 *                     type: string
 *                     example: "flood"
 *                   recommended_action:
 *                     type: string
 *                     example: "Notify emergency response team"
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *                     example: "2026-05-06T15:30:00Z"
 *                   model_version:
 *                     type: string
 *                     example: "v1.2.0"
 *     responses:
 *       202:
 *         description: Hazard data accepted for processing
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 202
 *                 message:
 *                   type: string
 *                   example: "Hazard data ingested successfully"
 *       400:
 *         description: Invalid request payload
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
router.post(
  "/hazard",
  authenticate,
  authorize(["ingestion service"]),
  ingestHazardData,
);

/**
 * @swagger
 * /api/ingestion/cyber:
 *   post:
 *     summary: Ingest cyber threat event data
 *     description: Accepts cyber threat stream data from AI/ML systems and publishes it for downstream processing.
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
 *               - event_id
 *               - timestamp
 *               - event_type
 *               - source
 *               - location
 *               - payload
 *             properties:
 *               event_id:
 *                 type: string
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-05-06T15:30:00Z"
 *               event_type:
 *                 type: string
 *                 example: "cyber_only"
 *               source:
 *                 type: string
 *                 example: "AI/ML Detection Engine"
 *               location:
 *                 type: object
 *                 properties:
 *                   state_region:
 *                     type: string
 *                     example: "Victoria"
 *                   local_government_area:
 *                     type: string
 *                     example: "Melbourne"
 *                   suburb:
 *                     type: string
 *                     example: "Docklands"
 *               payload:
 *                 type: object
 *                 properties:
 *                   event_type:
 *                     type: string
 *                     example: "cyber"
 *                   risk_score:
 *                     type: number
 *                     example: 0.88
 *                   severity:
 *                     type: string
 *                     example: "high"
 *                   confidence:
 *                     type: number
 *                     example: 0.95
 *                   cyber_threat:
 *                     type: string
 *                     example: "phishing"
 *                   recommended_action:
 *                     type: string
 *                     example: "Block suspicious IP range"
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *                     example: "2026-05-06T15:30:00Z"
 *                   model_version:
 *                     type: string
 *                     example: "v1.2.0"
 *     responses:
 *       202:
 *         description: Cyber data accepted for processing
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 202
 *                 message:
 *                   type: string
 *                   example: "Cyber data ingested successfully"
 *       400:
 *         description: Invalid request payload
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
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
 *     summary: Send core model integration payload
 *     description: Sends model integration data to the ingestion service for core inference processing.
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
 *             properties:
 *               input_data:
 *                 type: object
 *                 description: Raw feature payload to be passed to the core model
 *                 example:
 *                   feature_1: 0.42
 *                   feature_2: 0.77
 *               metadata:
 *                 type: object
 *                 description: Optional metadata for the integration request
 *                 example:
 *                   source: "training-pipeline"
 *                   request_id: "req-001"
 *     responses:
 *       202:
 *         description: Core model integration request accepted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 202
 *                 message:
 *                   type: string
 *                   example: "Core model integration data sent successfully"
 *       400:
 *         description: Invalid request payload
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post("/core", authenticate, coreModelIntegration);

export default router;
