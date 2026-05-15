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

router.get("/health", getHealth);
router.get("/user", getUser);
router.get("/meta/locations", getLocations);
router.get("/meta/event-statuses", getEventStatuses);
router.get("/meta/linked-event-types", getLinkedEventTypes);
router.get("/meta/seasons", getSeasons);
router.get("/meta/reference-days", getReferenceDays);
router.get("/meta/reference-times", getReferenceTimes);

router.get("/threats", getThreats);
router.get("/threats/:threatId", getThreat);

router.get("/hazards", getHazards);
router.get("/hazards/:hazardId", getHazard);

router.get("/integration", getIntegrations);
router.get("/integration/:integration", getIntegration);

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
 * Threat Routes
 */
router.get("/threats", authenticate, getThreats);

router.get("/threats/:threatId", authenticate, getThreat);

/**
 * Hazard Routes
 */
router.get("/hazards", authenticate, getHazards);

router.get("/hazards/:hazardId", authenticate, getHazard);

export default router;
