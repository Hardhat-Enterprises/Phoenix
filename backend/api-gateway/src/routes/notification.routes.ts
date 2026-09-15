import { Router } from "express";
import {
  getHealth,
  getNotifications,
  createNotificationFromThreatAnalysis,
} from "../controllers/notification.controller";

const router = Router();

/**
 * @swagger
 * /api/notifications/health:
 *   get:
 *     summary: Check the health of the notification service
 *     description: Returns the current operational status of the notification service.
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: Notification service is running successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Notification service is healthy
 *       500:
 *         description: Failed to retrieve the notification service health
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Error fetching notification health
 */
router.get("/health", getHealth);

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Retrieve all notifications
 *     description: Retrieves the available notifications from the notification service.
 *     tags:
 *       - Notifications
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Notifications retrieved successfully
 *                 notifications:
 *                   type: array
 *                   items:
 *                     type: object
 *                     additionalProperties: true
 *       500:
 *         description: Failed to retrieve notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Error fetching notifications
 */
router.get("/", getNotifications);

/**
 * @swagger
 * /api/notifications/from-threat-analysis:
 *   post:
 *     summary: Combine a rule-engine result and an ADCRS result and notify if required
 *     description: Runs the Response Decision Manager against one rule-engine result and one ADCRS result, then creates a notification if the combined severity requires one.
 *     tags:
 *       - Notifications
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - event_id
 *               - ruleResult
 *               - adcrsOutput
 *             properties:
 *               event_id:
 *                 type: string
 *                 example: EVT-001
 *               ruleResult:
 *                 type: object
 *                 properties:
 *                   threat:
 *                     type: string
 *                     example: Login Attack
 *                   severity:
 *                     type: string
 *                     example: Critical
 *                   action:
 *                     type: string
 *                     nullable: true
 *                     example: lock_account
 *               adcrsOutput:
 *                 type: object
 *                 properties:
 *                   risk_score:
 *                     type: number
 *                     example: 0.82
 *                   confidence_score:
 *                     type: number
 *                     example: 0.91
 *               recipient:
 *                 type: string
 *                 example: security-team@phoenix.local
 *     responses:
 *       200:
 *         description: Combined result produced; notification created if required
 *       400:
 *         description: Missing or invalid input
 *       500:
 *         description: Error creating notification
 */
router.post("/from-threat-analysis", createNotificationFromThreatAnalysis);

export default router;
