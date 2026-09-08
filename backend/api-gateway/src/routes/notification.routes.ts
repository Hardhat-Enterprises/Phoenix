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

export default router;
