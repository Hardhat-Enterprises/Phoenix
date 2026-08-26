import { Router } from "express";
import {
  getHealth,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
} from "../controllers/notification.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import {
  validateCreateNotification,
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
 *                           notification_id:
 *                             type: string
 *                             format: uuid
 *                           user_id:
 *                             type: string
 *                             format: uuid
 *                           title:
 *                             type: string
 *                           message:
 *                             type: string
 *                           type:
 *                             type: string
 *                             enum: [hazard_alert, cyber_threat, system, info, warning, error]
 *                           is_read:
 *                             type: boolean
 *                           data:
 *                             type: object
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *                           updated_at:
 *                             type: string
 *                             format: date-time
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
 *     summary: Get unread notification count
 *     description: Retrieves the count of unread notifications for the authenticated user.
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count retrieved successfully
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
 *                     unreadCount:
 *                       type: integer
 *       401:
 *         description: Unauthorized - no valid token provided
 *       500:
 *         description: Internal server error
 */
router.get("/unread-count", authenticate, getUnreadCount);

/**
 * @swagger
 * /api/notifications/{notificationId}/read:
 *   patch:
 *     summary: Mark notification as read
 *     description: Marks a single notification as read for the authenticated user.
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The notification ID to mark as read
 *     responses:
 *       200:
 *         description: Notification marked as read successfully
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
 *                     notification:
 *                       type: object
 *       400:
 *         description: Bad request - notification ID is required
 *       401:
 *         description: Unauthorized - no valid token provided
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Internal server error
 */
router.patch("/:notificationId/read", authenticate, markAsRead);

/**
 * @swagger
 * /api/notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     description: Marks all unread notifications as read for the authenticated user.
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read successfully
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
 *                     updatedCount:
 *                       type: integer
 *       401:
 *         description: Unauthorized - no valid token provided
 *       500:
 *         description: Internal server error
 */
router.patch("/read-all", authenticate, markAllAsRead);

/**
 * @swagger
 * /api/notifications/{notificationId}:
 *   delete:
 *     summary: Delete a notification
 *     description: Deletes a notification for the authenticated user. Only the notification owner can delete it.
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The notification ID to delete
 *     responses:
 *       200:
 *         description: Notification deleted successfully
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
 *       400:
 *         description: Bad request - notification ID is required
 *       401:
 *         description: Unauthorized - no valid token provided
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Internal server error
 */
router.delete("/:notificationId", authenticate, deleteNotification);

/**
 * @swagger
 * /api/notifications/create:
 *   post:
 *     summary: Create a new notification
 *     description: Creates a new notification. Typically used by admin or system services to send notifications to users.
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - title
 *               - message
 *             properties:
 *               user_id:
 *                 type: string
 *                 format: uuid
 *                 description: The user ID to send the notification to
 *               title:
 *                 type: string
 *                 description: Notification title
 *               message:
 *                 type: string
 *                 description: Notification message
 *               type:
 *                 type: string
 *                 enum: [hazard_alert, cyber_threat, system, info, warning, error]
 *                 default: info
 *               data:
 *                 type: object
 *                 description: Additional notification data
 *     responses:
 *       201:
 *         description: Notification created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 201
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     notification:
 *                       type: object
 *       400:
 *         description: Bad request - missing required fields
 *       401:
 *         description: Unauthorized - no valid token provided
 *       500:
 *         description: Internal server error
 */
router.post("/create", authenticate, validateCreateNotification, createNotification);

export default router;
