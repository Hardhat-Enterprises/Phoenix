import { Router } from "express";
import {
    getHealth,
    getNotifications,
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
 *     summary: Search and filter notifications
 *     description: Returns a paginated notification list derived from Phoenix hazard and cyber-threat records. Results are sorted deterministically by created_at descending, then event_type and id.
 *     tags:
 *       - Notifications
 *     parameters:
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: Case-insensitive keyword search across notification content.
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         description: Filter by normalized severity.
 *       - in: query
 *         name: event_type
 *         schema:
 *           type: string
 *           enum: [hazard, cyber]
 *         description: Filter by the source event type.
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Inclusive start date/date-time in ISO-8601 format.
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Inclusive end date/date-time in ISO-8601 format.
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *     responses:
 *       200:
 *         description: Notifications fetched successfully.
 *       400:
 *         description: Invalid filter or pagination value.
 *       500:
 *         description: Notification service or database error.
 */
router.get("/", getNotifications);

export default router;
