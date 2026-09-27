import { Router } from "express";
import {
    getHealth,
    getNotifications,
} from "../controllers/notification.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import {
  validatePagination,
  validateReadStatusFilter,
} from "../middleware/notification.validation.middleware";

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
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Notification service is healthy
 *       500:
 *         description: Failed to retrieve the notification service health
 */
router.get("/health", getHealth);

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Retrieve authenticated user's notifications
 *     description: Retrieves paginated notifications for the authenticated user with optional filtering by read status.
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 100
 *         description: Number of notifications per page
 *       - in: query
 *         name: read
 *         schema:
 *           type: boolean
 *         description: Filter by read status (true/false)
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     notifications:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           user_id:
 *                             type: string
 *                             format: uuid
 *                           event_id:
 *                             type: string
 *                           event_type:
 *                             type: string
 *                           title:
 *                             type: string
 *                           message:
 *                             type: string
 *                           metadata:
 *                             type: string
 *                             description: JSON-encoded event metadata. Parse this value to access event-specific fields.
 *                           is_read:
 *                             type: boolean
 *                           read_at:
 *                             type: string
 *                             description: ISO 8601 timestamp, or an empty string when the notification has not been read.
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                           updated_at:
 *                             type: string
 *                             format: date-time
 *                           deleted_at:
 *                             type: string
 *                             description: ISO 8601 timestamp, or an empty string when the notification has not been deleted.
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *       401:
 *         description: Unauthorized - no valid token provided
 *       500:
 *         description: Internal server error
 */
router.get("/", authenticate, validatePagination, validateReadStatusFilter, getNotifications);

/**
 * @swagger
 * /api/notifications/unread-count:
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
router.delete("/:notificationId", authenticate, deleteNotification);

export default router;
