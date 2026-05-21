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

router.get("/health", getHealth);
router.get("/meta/locations", authenticate, getLocations);
router.get("/meta/event-statuses", authenticate, getEventStatuses);
router.get("/meta/linked-event-types", authenticate, getLinkedEventTypes);
router.get("/meta/seasons", authenticate, getSeasons);
router.get("/meta/reference-days", authenticate, getReferenceDays);
router.get("/meta/reference-times", authenticate, getReferenceTimes);

router.get("/hazards", authenticate, getHazards);
router.get("/hazards/:hazardId", authenticate, getHazard);

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

export default router;
