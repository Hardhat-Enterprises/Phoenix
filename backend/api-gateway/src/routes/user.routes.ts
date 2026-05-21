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
  getOneTrainingModel,
  getTrainingModels,
  register,
  login,
  refresh,
  logout,
  getUserDashboard,
  getUserDashboardCharts,
  getUserDashboardActivity,
} from "../controllers/user.controller";
import { getThreats, getThreat } from "../controllers/threat.controller";
import { getHazards, getHazard } from "../controllers/hazard.controller";
import {
  getIntegrations,
  getIntegration,
} from "../controllers/integration.controller";

import {
  authenticate,
  authorize,
  authorizeSelfOrRoles,
} from "../middleware/auth.middleware";

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
 * /api/users/meta/locations:
 *   get:
 *     summary: Get location metadata
 *     description: Retrieve all available geographic location metadata used within the system. Response is cached in Redis for 2 minutes.
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
 *                 message:
 *                   type: string
 *                   example: "Locations fetched successfully"
 *                 locations:
 *                   type: array
 *                   example: []
 *                 cached:
 *                   type: boolean
 *                   example: true
 *       500:
 *         description: Internal server error
 */
router.get("/meta/locations", authenticate, getLocations);

/**
 * @swagger
 * /api/users/meta/event-statuses:
 *   get:
 *     summary: Get event status metadata
 *     description: Retrieve all event status values used in the system. Response is cached in Redis for 2 minutes.
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
 *                 message:
 *                   type: string
 *                   example: "Event statuses fetched successfully"
 *                 eventStatuses:
 *                   type: array
 *                   example: []
 *                 cached:
 *                   type: boolean
 *                   example: true
 *       500:
 *         description: Internal server error
 */
router.get("/meta/event-statuses", authenticate, getEventStatuses);

/**
 * @swagger
 * /api/users/meta/linked-event-types:
 *   get:
 *     summary: Get linked event type metadata
 *     description: Retrieve all linked event type values used within the system. Response is cached in Redis for 2 minutes.
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
 *                 message:
 *                   type: string
 *                   example: "Linked event types fetched successfully"
 *                 linkedEventTypes:
 *                   type: array
 *                   example: []
 *                 cached:
 *                   type: boolean
 *                   example: true
 *       500:
 *         description: Internal server error
 */
router.get("/meta/linked-event-types", authenticate, getLinkedEventTypes);

router.get("/meta/seasons", authenticate, getSeasons);
router.get("/meta/reference-days", authenticate, getReferenceDays);
router.get("/meta/reference-times", authenticate, getReferenceTimes);

router.get("/integration", authenticate, getIntegrations);
router.get("/integration/:integrationId", authenticate, getIntegration);

router.get("/training-models", authenticate, getTrainingModels);
router.get("/training-models/:file_id", authenticate, getOneTrainingModel);

/**
 * Authentication Routes
 */
router.post("/auth/register", authenticate, authorize(["admin"]), register);
router.post("/auth/login", login);
router.post("/auth/refresh", refresh);
router.post(
  "/auth/logout/:userId",
  authenticate,
  authorizeSelfOrRoles(["admin"]),
  logout,
);

/**
 * @swagger
 * /api/users/user:
 *   get:
 *     summary: Get users information
 *     tags:
 *       - Users
 *     responses:
 *       200:
 *         description: User retrieved successfully
 */
router.get("/user", authenticate, authorize(["admin"]), getUser);

/**
 * Dashboard Routes
 */
router.get("/dashboard/overview", authenticate, getUserDashboard);
router.get("/dashboard/charts", authenticate, getUserDashboardCharts);
router.get("/dashboard/activity", authenticate, getUserDashboardActivity);

/**
 * Hazard Routes
 */
router.get("/hazards", authenticate, getHazards);
router.get("/hazards/:hazardId", authenticate, getHazard);

/**
 * Threat Routes
 */
router.get("/threats", authenticate, getThreats);
router.get("/threats/:threatId", authenticate, getThreat);

export default router;