import { Router } from "express";
import {
  getHealth,
  getUser,
  getLocations,
  getEventStatuses,
  getLinkedEventTypes,
  getSeasons,
  getReferenceDays,
  getReferenceTimes,
} from "../controllers/user.controller";

const router = Router();

/**
 * @swagger
 * /api/users/health:
 *   get:
 *     summary: Check User Service health
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: User service is running
 */
router.get("/health", getHealth);

/**
 * @swagger
 * /api/users/user:
 *   get:
 *     summary: Get users information
 *     tags:
 *       - User
 *     responses:
 *       200:
 *         description: User data retrieved successfully
 */
router.get("/user", getUser);

/**
 * @swagger
 * /api/users/meta/locations:
 *   get:
 *     summary: Get location metadata
 *     description: Retrieve all available geographic location metadata used within the system.
 *     tags:
 *       - Metadata
 *     responses:
 *       200:
 *         description: Locations fetched successfully
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
 *                   example: "Locations fetched successfully"
 *
 *                 locations:
 *                   type: array
 *                   example: []
 *
 *                 cached:
 *                   type: boolean
 *                   example: true
 *
 *       500:
 *         description: Internal server error
 */
router.get("/meta/locations", getLocations);

/**
 * @swagger
 * /api/users/meta/event-statuses:
 *   get:
 *     summary: Get event status metadata
 *     description: Retrieve all event status values used in the system.
 *     tags:
 *       - Metadata
 *     responses:
 *       200:
 *         description: Event statuses fetched successfully
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
 *                   example: "Event statuses fetched successfully"
 *
 *                 eventStatuses:
 *                   type: array
 *                   example: []
 *
 *                 cached:
 *                   type: boolean
 *                   example: true
 *
 *       500:
 *         description: Internal server error
 */
router.get("/meta/event-statuses", getEventStatuses);

/**
 * @swagger
 * /api/users/meta/linked-event-types:
 *   get:
 *     summary: Get linked event type metadata
 *     description: Retrieve all linked event type values used within the system.
 *     tags:
 *       - Metadata
 *     responses:
 *       200:
 *         description: Linked event types fetched successfully
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
 *                   example: "Linked event types fetched successfully"
 *
 *                 linkedEventTypes:
 *                   type: array
 *                   example: []
 *
 *                 cached:
 *                   type: boolean
 *                   example: true
 *
 *       500:
 *         description: Internal server error
 */
router.get("/meta/linked-event-types", getLinkedEventTypes);

router.get("/meta/seasons", getSeasons);
router.get("/meta/reference-days", getReferenceDays);
router.get("/meta/reference-times", getReferenceTimes);

export default router;